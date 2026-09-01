"""
DevVault Backend - AWS Lambda Handler
Handles Authentication and CRUD operations with DynamoDB
"""

import json
import boto3
import uuid
import hmac
import hashlib
import base64
import os
from datetime import datetime, timedelta
from decimal import Decimal
import logging

# Initialize AWS clients
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables (set in Lambda configuration)
USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')
CLIENT_ID = os.environ.get('COGNITO_CLIENT_ID')
CLIENT_SECRET = os.environ.get('COGNITO_CLIENT_SECRET')
DYNAMODB_TABLE = os.environ.get('DYNAMODB_TABLE_NAME', 'DevVaultItems')
REGION = os.environ.get('AWS_REGION', 'us-east-1')

# Initialize DynamoDB table
table = dynamodb.Table(DYNAMODB_TABLE)


# ============================================
# Helper Functions
# ============================================

class DecimalEncoder(json.JSONEncoder):
    """Helper class for DynamoDB Decimal to JSON conversion"""
    def default(self, o):
        if isinstance(o, Decimal):
            return str(o)
        return super(DecimalEncoder, self).default(o)


def response(status_code, body, is_error=False):
    """Format Lambda response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }


def get_secret_hash(username, client_id, client_secret):
    """Calculate SECRET_HASH for Cognito API calls"""
    message = bytes(username + client_id, 'utf-8')
    secret = bytes(client_secret, 'utf-8')
    dig = hmac.new(secret, msg=message, digestmod=hashlib.sha256).digest()
    return base64.b64encode(dig).decode()


def verify_cognito_token(token):
    """Verify JWT token and extract claims (simplified - use cognito-jwt in production)"""
    try:
        # In production, implement full JWT verification with Cognito public keys
        # For now, we rely on API Gateway's Cognito Authorizer to verify the token
        # The authorizer passes the claims in the request context
        import jwt
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return None


def get_user_sub_from_event(event):
    """Extract user's sub (subject/ID) from API Gateway request context"""
    try:
        # The Cognito Authorizer adds the claims to the request context
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        
        # The sub claim contains the user's unique ID
        user_sub = authorizer.get('claims', {}).get('sub')
        
        if not user_sub:
            # Fallback: try to extract from the token directly
            auth_header = event.get('headers', {}).get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
                decoded = verify_cognito_token(token)
                if decoded:
                    user_sub = decoded.get('sub')
        
        return user_sub
    except Exception as e:
        logger.error(f"Error extracting user sub: {str(e)}")
        return None


# ============================================
# Authentication Handlers
# ============================================

def handle_signup(event, context):
    """Handle user sign up"""
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email')
        password = body.get('password')
        birthdate = body.get('birthdate')
        phone_number = body.get('phone_number')
        name = body.get('name')


        if not all([email, password, birthdate, phone_number, name]):
            return response(400, {'message': 'All fields are required'}, is_error=True)

        # Sign up user with Cognito
        response_data = cognito.sign_up(
            ClientId=CLIENT_ID,
            Username=email,
            Password=password,
            UserAttributes=[
                {'Name': 'email', 'Value': email},
                {'Name': 'birthdate', 'Value': birthdate},
                {'Name': 'phone_number', 'Value': phone_number},
                {'Name': 'name', 'Value': name}
            ],
            SecretHash=get_secret_hash(email, CLIENT_ID, CLIENT_SECRET)
        )

        return response(200, {
            'message': 'User created successfully. Check your email for verification code.',
            'userSub': response_data['UserSub']
        })

    except cognito.exceptions.UsernameExistsException:
        return response(400, {'message': 'Email already exists'}, is_error=True)
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return response(500, {'message': 'Signup failed', 'error': str(e)}, is_error=True)


def handle_confirm_signup(event, context):
    """Handle email verification"""
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email')
        confirmation_code = body.get('confirmationCode')

        if not email or not confirmation_code:
            return response(400, {'message': 'Email and confirmation code required'}, is_error=True)

        # Confirm sign up
        cognito.confirm_sign_up(
            ClientId=CLIENT_ID,
            Username=email,
            ConfirmationCode=confirmation_code,
            SecretHash=get_secret_hash(email, CLIENT_ID, CLIENT_SECRET)
        )

        return response(200, {'message': 'Email verified successfully'})

    except cognito.exceptions.UserNotFoundException:
        return response(404, {'message': 'User not found'}, is_error=True)
    except cognito.exceptions.CodeMismatchException:
        return response(400, {'message': 'Invalid verification code'}, is_error=True)
    except Exception as e:
        logger.error(f"Confirm signup error: {str(e)}")
        return response(500, {'message': 'Verification failed', 'error': str(e)}, is_error=True)


def handle_login(event, context):
    """Handle user login"""
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email')
        password = body.get('password')

        if not email or not password:
            return response(400, {'message': 'Email and password required'}, is_error=True)

        # Authenticate user
        auth_response = cognito.admin_initiate_auth(
            UserPoolId=USER_POOL_ID,
            ClientId=CLIENT_ID,
            AuthFlow='ADMIN_NO_SRP_AUTH',
            AuthParameters={
                'USERNAME': email,
                'PASSWORD': password,
                'SECRET_HASH': get_secret_hash(email, CLIENT_ID, CLIENT_SECRET)
            }
        )

        tokens = auth_response.get('AuthenticationResult', {})
        
        # Get user details to extract sub
        user_response = cognito.admin_get_user(
            UserPoolId=USER_POOL_ID,
            Username=email
        )
        
        user_sub = None
        for attr in user_response.get('UserAttributes', []):
            if attr['Name'] == 'sub':
                user_sub = attr['Value']
                break

        return response(200, {
            'message': 'Login successful',
            'idToken': tokens.get('IdToken'),
            'accessToken': tokens.get('AccessToken'),
            'refreshToken': tokens.get('RefreshToken'),
            'userSub': user_sub,
            'email': email
        })

    except cognito.exceptions.NotAuthorizedException:
        return response(401, {'message': 'Invalid email or password'}, is_error=True)
    except cognito.exceptions.UserNotConfirmedException:
        return response(400, {'message': 'User email not verified'}, is_error=True)
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return response(500, {'message': 'Login failed', 'error': str(e)}, is_error=True)


def handle_refresh_token(event, context):
    """Handle token refresh"""
    try:
        body = json.loads(event.get('body', '{}'))
        refresh_token = body.get('refreshToken')

        if not refresh_token:
            return response(400, {'message': 'Refresh token required'}, is_error=True)

        # Get new tokens using refresh token
        auth_response = cognito.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow='REFRESH_TOKEN_AUTH',
            AuthParameters={
                'REFRESH_TOKEN': refresh_token
            },
            ClientMetadata={'SECRET_HASH': 'placeholder'}
        )

        tokens = auth_response.get('AuthenticationResult', {})

        return response(200, {
            'message': 'Token refreshed',
            'idToken': tokens.get('IdToken'),
            'accessToken': tokens.get('AccessToken')
        })

    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return response(401, {'message': 'Token refresh failed'}, is_error=True)


# ============================================
# CRUD Operations
# ============================================

def handle_create_item(event, context):
    """Create a new snippet item"""
    try:
        user_sub = get_user_sub_from_event(event)
        if not user_sub:
            return response(401, {'message': 'Unauthorized'}, is_error=True)

        body = json.loads(event.get('body', '{}'))
        
        # Validate required fields
        if not body.get('title') or not body.get('code'):
            return response(400, {'message': 'Title and code are required'}, is_error=True)

        item_id = str(uuid.uuid4())
        
        item = {
            'id': item_id,
            'userId': user_sub,
            'title': body.get('title'),
            'language': body.get('language', 'other'),
            'code': body.get('code'),
            'description': body.get('description', ''),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }

        # Save to DynamoDB
        table.put_item(Item=item)

        return response(201, {
            'message': 'Item created successfully',
            'item': item
        })

    except Exception as e:
        logger.error(f"Create item error: {str(e)}")
        return response(500, {'message': 'Failed to create item', 'error': str(e)}, is_error=True)


def handle_get_items(event, context):
    """Get all items for authenticated user"""
    try:
        user_sub = get_user_sub_from_event(event)
        if not user_sub:
            return response(401, {'message': 'Unauthorized'}, is_error=True)

        # Query items by userId (partition key)
        response_data = table.query(
            KeyConditionExpression='userId = :userId',
            ExpressionAttributeValues={':userId': user_sub}
        )

        items = response_data.get('Items', [])
        
        # Sort by createdAt descending
        items.sort(key=lambda x: x.get('createdAt', ''), reverse=True)

        return response(200, {
            'message': 'Items retrieved successfully',
            'items': items
        })

    except Exception as e:
        logger.error(f"Get items error: {str(e)}")
        return response(500, {'message': 'Failed to retrieve items', 'error': str(e)}, is_error=True)


def handle_get_item(event, context):
    """Get a specific item by ID"""
    try:
        user_sub = get_user_sub_from_event(event)
        if not user_sub:
            return response(401, {'message': 'Unauthorized'}, is_error=True)

        item_id = event.get('pathParameters', {}).get('id')
        
        if not item_id:
            return response(400, {'message': 'Item ID required'}, is_error=True)

        # Get item from DynamoDB
        response_data = table.get_item(
            Key={'userId': user_sub, 'id': item_id}
        )

        item = response_data.get('Item')
        
        if not item:
            return response(404, {'message': 'Item not found'}, is_error=True)

        return response(200, {
            'message': 'Item retrieved successfully',
            'item': item
        })

    except Exception as e:
        logger.error(f"Get item error: {str(e)}")
        return response(500, {'message': 'Failed to retrieve item', 'error': str(e)}, is_error=True)


def handle_update_item(event, context):
    """Update an existing item"""
    try:
        user_sub = get_user_sub_from_event(event)
        if not user_sub:
            return response(401, {'message': 'Unauthorized'}, is_error=True)

        item_id = event.get('pathParameters', {}).get('id')
        
        if not item_id:
            return response(400, {'message': 'Item ID required'}, is_error=True)

        body = json.loads(event.get('body', '{}'))

        # Check if item exists and belongs to user
        existing_item = table.get_item(
            Key={'userId': user_sub, 'id': item_id}
        ).get('Item')

        if not existing_item:
            return response(404, {'message': 'Item not found'}, is_error=True)

        # Update item
        update_data = {
            'userId': user_sub,
            'id': item_id,
            'title': body.get('title', existing_item.get('title')),
            'language': body.get('language', existing_item.get('language')),
            'code': body.get('code', existing_item.get('code')),
            'description': body.get('description', existing_item.get('description', '')),
            'createdAt': existing_item.get('createdAt'),
            'updatedAt': datetime.utcnow().isoformat()
        }

        table.put_item(Item=update_data)

        return response(200, {
            'message': 'Item updated successfully',
            'item': update_data
        })

    except Exception as e:
        logger.error(f"Update item error: {str(e)}")
        return response(500, {'message': 'Failed to update item', 'error': str(e)}, is_error=True)


def handle_delete_item(event, context):
    """Delete an item"""
    try:
        user_sub = get_user_sub_from_event(event)
        if not user_sub:
            return response(401, {'message': 'Unauthorized'}, is_error=True)

        item_id = event.get('pathParameters', {}).get('id')
        
        if not item_id:
            return response(400, {'message': 'Item ID required'}, is_error=True)

        # Check if item exists and belongs to user
        existing_item = table.get_item(
            Key={'userId': user_sub, 'id': item_id}
        ).get('Item')

        if not existing_item:
            return response(404, {'message': 'Item not found'}, is_error=True)

        # Delete item
        table.delete_item(Key={'userId': user_sub, 'id': item_id})

        return response(200, {'message': 'Item deleted successfully'})

    except Exception as e:
        logger.error(f"Delete item error: {str(e)}")
        return response(500, {'message': 'Failed to delete item', 'error': str(e)}, is_error=True)


# ============================================
# Main Lambda Handler Router
# ============================================

def lambda_handler(event, context):
    """
    Main Lambda handler that routes requests based on resource and method
    """
    try:
        http_method = event.get('httpMethod')
        resource = event.get('resource')
        path = event.get('path', '')

        logger.info(f"Received {http_method} request for {resource}")

        # Handle OPTIONS requests for CORS
        if http_method == 'OPTIONS':
            return response(200, {})

        # Authentication routes
        if resource == '/auth/signup':
            return handle_signup(event, context)
        
        elif resource == '/auth/confirm':
            return handle_confirm_signup(event, context)
        
        elif resource == '/auth/login':
            return handle_login(event, context)
        
        elif resource == '/auth/refresh':
            return handle_refresh_token(event, context)

        # CRUD routes (require authentication via Cognito Authorizer)
        elif resource == '/items':
            if http_method == 'POST':
                return handle_create_item(event, context)
            elif http_method == 'GET':
                return handle_get_items(event, context)
        
        elif resource == '/items/{id}':
            if http_method == 'GET':
                return handle_get_item(event, context)
            elif http_method == 'PUT':
                return handle_update_item(event, context)
            elif http_method == 'DELETE':
                return handle_delete_item(event, context)

        # Route not found
        return response(404, {'message': 'Route not found'}, is_error=True)

    except Exception as e:
        logger.error(f"Lambda handler error: {str(e)}")
        return response(500, {'message': 'Internal server error', 'error': str(e)}, is_error=True)
