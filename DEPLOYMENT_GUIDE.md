# DevVault - AWS Deployment Guide

## Quick Summary

DevVault is a full-stack serverless application with:
- **Frontend**: Static HTML/CSS/JS hosted on S3
- **Auth**: Cognito User Pool with JWT tokens
- **API**: API Gateway (REST) with Cognito Authorizer
- **Backend**: Lambda (Python) with boto3
- **Database**: DynamoDB with user isolation

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (S3)                        │
│  ├─ index.html (Auth & Dashboard)                      │
│  ├─ styles.css (Tailwind CSS)                          │
│  └─ app.js (Cognito & API calls)                       │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTPS
                   ▼
┌──────────────────────────────────────────────────────────┐
│              API Gateway (REST API)                      │
│  ├─ POST /auth/signup                                   │
│  ├─ POST /auth/confirm                                  │
│  ├─ POST /auth/login                                    │
│  ├─ POST /auth/refresh                                  │
│  ├─ GET/POST /items (with Cognito Authorizer)          │
│  └─ GET/PUT/DELETE /items/{id}                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│              Lambda (Python)                             │
│  ├─ Authentication handlers                             │
│  ├─ CRUD operations                                     │
│  └─ User isolation via Cognito sub ID                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  DynamoDB (DevVaultItems table)                         │
│  ├─ Partition Key: userId (Cognito sub)                │
│  ├─ Sort Key: id (Item UUID)                           │
│  └─ GSI for querying by createdAt (optional)          │
└──────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Deployment

### Phase 1: Set Up Cognito User Pool

#### 1.1 Create Cognito User Pool
1. Go to **AWS Console** → **Cognito** → **User pools**
2. Click **Create user pool**
3. **Sign-in experience**: Choose "Email"
4. **Standard attributes**: Keep defaults
5. **Password policy**: Set minimum 8 characters (or your preference)
6. Click **Create user pool**
7. **Note down**: User Pool ID (format: `region_XXXXXXXXX`)

#### 1.2 Create Cognito App Client
1. In your User Pool → **App integration** → **App clients**
2. Click **Create app client**
3. Name: `devvault-app`
4. **Authentication flows**: Enable `ALLOW_ADMIN_USER_PASSWORD_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH`
5. **App client settings**:
   - ✓ Tick "Authorization code grant"
   - ✓ Tick "Implicit grant"
   - ✓ Scopes: select all
6. Click **Create**
7. **Note down**: 
   - Client ID
   - Copy this client to get **Client Secret**

#### 1.3 Add Lambda Trigger (Optional - for custom actions)
1. User Pool → **User lifecycle** → **Sign-up**
2. Select your Lambda function for post-sign-up (if you want to do custom logic)

### Phase 2: Set Up DynamoDB Table

#### 2.1 Create DynamoDB Table
1. Go to **AWS Console** → **DynamoDB** → **Tables**
2. Click **Create table**
3. **Table name**: `DevVaultItems`
4. **Partition key**: `userId` (String)
5. **Sort key**: `id` (String)
6. **Billing mode**: Pay-per-request (or provisioned: 5 read, 5 write units)
7. Click **Create**

#### 2.2 Add Global Secondary Index (Optional but recommended for performance)
1. In the table → **Indexes**
2. Click **Create GSI**
3. **Partition key**: `userId`
4. **Sort key**: `createdAt`
5. Name: `UserCreatedAtIndex`
6. Click **Create**

---

### Phase 3: Set Up Lambda Function

#### 3.1 Create Lambda Function
1. Go to **AWS Console** → **Lambda** → **Functions**
2. Click **Create function**
3. **Name**: `devvault-backend`
4. **Runtime**: Python 3.11 or 3.12
5. Click **Create function**

#### 3.2 Add Lambda Execution Role Permissions
1. In your Lambda → **Configuration** → **Execution role**
2. Click the role name to open it in IAM
3. Click **Add inline policy**
4. **Policy name**: `DevVaultPolicy`
5. Paste this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cognito-idp:SignUp",
                "cognito-idp:ConfirmSignUp",
                "cognito-idp:AdminInitiateAuth",
                "cognito-idp:InitiateAuth",
                "cognito-idp:AdminGetUser",
                "cognito-idp:AdminSetUserPassword",
                "cognito-idp:AdminUserGlobalSignOut"
            ],
            "Resource": "arn:aws:cognito-idp:REGION:ACCOUNT_ID:userpool/REGION_XXXXXXXXX"
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/DevVaultItems"
        }
    ]
}
```

Replace:
- `REGION`: Your AWS region (e.g., `us-east-1`)
- `ACCOUNT_ID`: Your AWS Account ID (12 digits)
- `REGION_XXXXXXXXX`: Your Cognito User Pool ID

#### 3.3 Set Lambda Environment Variables
1. In Lambda → **Configuration** → **Environment variables**
2. Add these variables:

| Key | Value |
|-----|-------|
| `COGNITO_USER_POOL_ID` | `us-east-1_XXXXXXXXX` |
| `COGNITO_CLIENT_ID` | Your Client ID |
| `COGNITO_CLIENT_SECRET` | Your Client Secret |
| `DYNAMODB_TABLE_NAME` | `DevVaultItems` |

#### 3.4 Upload Lambda Code
1. Download your `lambda_function.py`
2. In Lambda function → **Code source**
3. Copy the code to `lambda_function.py` and click **Deploy**

---

### Phase 4: Set Up API Gateway

#### 4.1 Create REST API
1. Go to **AWS Console** → **API Gateway** → **APIs**
2. Click **Create API**
3. Choose **REST API** → **Build**
4. **API name**: `devvault-api`
5. Click **Create API**

#### 4.2 Create Cognito Authorizer
1. In your API → **Authorizers**
2. Click **Create**
3. **Name**: `CognitoAuthorizer`
4. **Type**: Cognito
5. **Cognito User Pool**: Select your user pool
6. **Token source**: `Authorization`
7. Click **Create**

#### 4.3 Create Resources and Methods

##### Authentication Endpoints (NO Authorizer)

**POST /auth/signup**
1. In API → Resources → Create resource: `auth`
2. Create resource: `signup` under `/auth`
3. Create method: **POST**
4. **Integration type**: Lambda function
5. **Lambda function**: `devvault-backend`
6. Click **Save**

**POST /auth/confirm**
1. Create resource: `confirm` under `/auth`
2. Create method: **POST**
3. Same Lambda integration

**POST /auth/login**
1. Create resource: `login` under `/auth`
2. Create method: **POST**
3. Same Lambda integration

**POST /auth/refresh**
1. Create resource: `refresh` under `/auth`
2. Create method: **POST**
3. Same Lambda integration

##### Protected CRUD Endpoints (WITH Cognito Authorizer)

**GET /items**
1. Create resource: `items`
2. Create method: **GET**
3. **Integration type**: Lambda
4. **Lambda function**: `devvault-backend`
5. **Authorization**: CognitoAuthorizer
6. Click **Save**

**POST /items**
1. Same resource, create **POST** method
2. **Integration type**: Lambda
3. **Lambda function**: `devvault-backend`
4. **Authorization**: CognitoAuthorizer

**GET /items/{id}**
1. Create resource: `{id}` under `/items`
2. Create method: **GET**
3. **Integration type**: Lambda
4. **Lambda function**: `devvault-backend`
5. **Authorization**: CognitoAuthorizer

**PUT /items/{id}**
1. Same resource, create **PUT** method
2. **Integration type**: Lambda
3. **Lambda function**: `devvault-backend`
4. **Authorization**: CognitoAuthorizer

**DELETE /items/{id}**
1. Same resource, create **DELETE** method
2. **Integration type**: Lambda
3. **Lambda function**: `devvault-backend`
4. **Authorization**: CognitoAuthorizer

#### 4.4 Deploy API
1. In API → **Stages** → **Deploy**
2. **Stage name**: `prod`
3. Click **Deploy**
4. **Note down API endpoint**: `https://xxxxxxx.execute-api.region.amazonaws.com/prod`

---

### Phase 5: Set Up S3 for Frontend

#### 5.1 Create S3 Bucket
1. Go to **AWS Console** → **S3** → **Buckets**
2. Click **Create bucket**
3. **Bucket name**: `devvault-frontend-XXXXXXX` (must be globally unique)
4. **Region**: Same as API Gateway
5. **Block Public Access**: Uncheck "Block all public access"
6. Click **Create bucket**

#### 5.2 Configure Static Website Hosting
1. In bucket → **Properties**
2. Scroll to **Static website hosting**
3. Click **Edit**
4. Enable **Static website hosting**
5. **Index document**: `index.html`
6. **Error document**: `index.html`
7. Click **Save**

#### 5.3 Create Bucket Policy for Public Access
1. In bucket → **Permissions** → **Bucket policy**
2. Paste this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::devvault-frontend-XXXXXXX/*"
        }
    ]
}
```

Replace `devvault-frontend-XXXXXXX` with your bucket name.

#### 5.4 Upload Frontend Files
1. Download your frontend files:
   - `index.html`
   - `styles.css`
   - `app.js`
2. In bucket → **Objects** → **Upload**
3. Upload all three files
4. Click **Upload**

#### 5.5 Update Frontend Configuration
1. Open `app.js` in S3
2. Edit (or reupload with updated values)
3. Update `CONFIG` object:

```javascript
const CONFIG = {
    cognito: {
        userPoolId: 'us-east-1_XXXXXXXXX',  // Your Cognito User Pool ID
        clientId: 'XXXXXXXXXXXXXXXXXXXXXXXX', // Your Client ID
        region: 'us-east-1',
    },
    api: {
        endpoint: 'https://xxxxxxx.execute-api.us-east-1.amazonaws.com/prod',
        region: 'us-east-1',
    }
};
```

#### 5.6 Get Website URL
1. In bucket → **Properties**
2. Find **Bucket website endpoint**: `http://devvault-frontend-XXXXXXX.s3-website-region.amazonaws.com`

---

### Phase 6: Add CORS Configuration (Important!)

#### 6.1 Configure S3 CORS
1. In bucket → **Permissions** → **CORS**
2. Add:

```json
[
    {
        "AllowedHeaders": [
            "Authorization",
            "Content-Type"
        ],
        "AllowedMethods": [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://devvault-frontend-XXXXXXX.s3-website-region.amazonaws.com",
            "https://devvault-frontend-XXXXXXX.s3-website-region.amazonaws.com"
        ],
        "ExposeHeaders": [
            "ETag"
        ]
    }
]
```

#### 6.2 Configure API Gateway CORS
1. In API Gateway → Resources → /items
2. Select **OPTIONS** method (create if doesn't exist)
3. **Integration type**: Mock
4. In the **Method Response**, add:
   - `Access-Control-Allow-Headers: Content-Type,Authorization`
   - `Access-Control-Allow-Origin: *`
   - `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`
5. Repeat for other resources

---

## Testing the Application

### 1. Test Sign Up
```bash
curl -X POST https://xxxxxxx.execute-api.us-east-1.amazonaws.com/prod/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TempPassword123!"
  }'
```

### 2. Test Confirm
```bash
curl -X POST https://xxxxxxx.execute-api.us-east-1.amazonaws.com/prod/auth/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "confirmationCode": "123456"
  }'
```

### 3. Test Login
```bash
curl -X POST https://xxxxxxx.execute-api.us-east-1.amazonaws.com/prod/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TempPassword123!"
  }'
```

### 4. Test Create Item (Protected)
```bash
curl -X POST https://xxxxxxx.execute-api.us-east-1.amazonaws.com/prod/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "My First Snippet",
    "language": "python",
    "code": "print(\"Hello, World!\")",
    "description": "A simple Python script"
  }'
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check API Gateway and S3 CORS configurations |
| 401 Unauthorized | Verify Cognito Authorizer is attached to protected routes |
| Lambda timeout | Increase timeout in Lambda settings (default: 3 seconds) |
| DynamoDB throttling | Increase capacity or enable on-demand billing |
| Cold start delays | Lambda will be faster after first invocation |

---

## Security Best Practices

1. **Enable HTTPS**: All endpoints should use HTTPS (API Gateway does this automatically)
2. **Use Cognito Hosted UI**: Consider using Cognito Hosted UI for login (more secure than storing passwords)
3. **Enable MFA**: In Cognito User Pool → **Account takeover risk configuration** → **Enable MFA**
4. **Set password requirements**: In Cognito → **Policies** → Set strong password policy
5. **Use WAF**: Attach AWS WAF to API Gateway for DDoS protection
6. **CloudFront**: Add CloudFront distribution in front of S3 for caching and security
7. **Logging**: Enable CloudWatch logs for Lambda, API Gateway, and DynamoDB

---

## Scaling Considerations

- **DynamoDB**: Switch to provisioned capacity if you need predictable performance
- **Lambda**: Add provisioned concurrency for consistent performance
- **CloudFront**: Cache static assets for faster delivery
- **S3 Transfer Acceleration**: Enable for faster uploads
- **API Gateway**: Use caching and throttling

---

## Cost Optimization

- **DynamoDB**: Use on-demand billing for unpredictable workloads
- **Lambda**: Monitor and optimize function memory allocation
- **S3**: Use S3 lifecycle policies to archive old objects
- **API Gateway**: Monitor usage and set throttling limits

---

## Next Steps

1. Test the full application flow
2. Set up CloudWatch monitoring and alarms
3. Configure backup strategy for DynamoDB
4. Set up CI/CD pipeline for frontend updates
5. Consider custom domain with Route53 and CloudFront
6. Add API rate limiting and authentication logging
7. Implement automated backups

---

**Your DevVault is now live! 🚀**

For support and updates, refer to the official AWS documentation:
- [Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
