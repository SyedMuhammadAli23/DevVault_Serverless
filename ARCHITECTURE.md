# DevVault - AWS Architecture Summary

## System Overview

DevVault is a serverless architecture built entirely on AWS managed services. Zero infrastructure management required.

## Component Breakdown

### 1. Frontend Layer (Amazon S3)

**Purpose**: Host static HTML/CSS/JavaScript assets

**Configuration**:
- **Bucket**: Public read access
- **Hosting**: Static website hosting enabled
- **Index Document**: index.html
- **Files**:
  - index.html (Authentication UI + Dashboard)
  - styles.css (Tailwind CSS + animations)
  - app.js (Cognito integration + API calls)

**User Flow**:
1. Browser requests S3 website endpoint
2. S3 returns index.html
3. JavaScript loads and initializes
4. App checks localStorage for existing JWT token
5. If authenticated: Show dashboard; Otherwise: Show login form

### 2. Authentication Layer (Amazon Cognito)

**Purpose**: Manage user identity and issue JWT tokens

**Components**:
- **User Pool**: Central user directory
  - Stores user credentials (encrypted)
  - Manages password policies
  - Handles email verification
  - Issues JWT tokens
  
- **App Client**: Application integration
  - CLIENT_ID for frontend
  - CLIENT_SECRET for backend
  - Authentication flows enabled

**Authentication Flow**:

```
User Signup/Login
       ↓
   Frontend (app.js)
       ↓
   Cognito API (Lambda calls)
       ↓
   Cognito User Pool
       ↓
   Returns: idToken, accessToken, refreshToken
       ↓
   Frontend stores tokens in localStorage
       ↓
   Frontend sends accessToken in Authorization header
```

**Security**:
- Passwords never sent to frontend
- JWT tokens expire after ~1 hour
- Refresh token can get new access token
- Email verification required before login

### 3. API Layer (Amazon API Gateway)

**Purpose**: Public REST API with authentication and routing

**Configuration**:
- **Type**: REST API (not HTTP API)
- **Stage**: prod
- **Authorizer**: Cognito User Pool

**Routes**:
```
/auth (Public - no authorizer)
├── POST /signup      → Lambda signup handler
├── POST /confirm     → Lambda confirm handler
├── POST /login       → Lambda login handler
└── POST /refresh     → Lambda refresh handler

/items (Protected - Cognito authorizer required)
├── GET               → Get all user's items
├── POST              → Create new item
├── GET /{id}         → Get specific item
├── PUT /{id}         → Update item
└── DELETE /{id}      → Delete item
```

**Authorization Flow**:

```
Frontend sends request:
   POST /items
   Authorization: Bearer eyJhbGc...

                ↓

API Gateway:
   1. Extract token from Authorization header
   2. Send to Cognito Authorizer
   3. Cognito verifies JWT signature
   4. Returns claims (userId, email, sub)
   5. Adds claims to Lambda event

                ↓

Lambda receives:
   event = {
     "requestContext": {
       "authorizer": {
         "claims": {
           "sub": "user-123-abc",  ← Cognito User ID
           "email": "user@example.com"
         }
       }
     }
   }

                ↓

Lambda handler:
   1. Extract 'sub' from event
   2. Query DynamoDB for items WHERE userId = 'sub'
   3. Return only user's items
```

### 4. Compute Layer (AWS Lambda)

**Purpose**: Execute backend logic without managing servers

**Function**: `devvault-backend`

**Runtime**: Python 3.11+

**Handler**: `lambda_handler(event, context)`

**Key Features**:
- Single function handles all routes (via event routing)
- Automatically scales to millions of requests
- Pay only for execution time (100ms granularity)
- Cold start: ~1-2 seconds (first invocation)
- Warm start: <100ms (subsequent invocations)

**Handler Logic**:

```python
def lambda_handler(event, context):
    # Extract HTTP method and resource path
    method = event['httpMethod']
    path = event['path']
    
    # Route to appropriate handler
    if path == '/auth/signup' and method == 'POST':
        return handle_signup(event, context)
    elif path == '/items' and method == 'GET':
        return handle_get_items(event, context)
    # ... etc
```

**Dependencies** (in requirements.txt):
- `boto3`: AWS SDK for Python
- `botocore`: Low-level AWS API
- `PyJWT`: JWT token verification
- `python-dateutil`: Date/time utilities

### 5. Database Layer (Amazon DynamoDB)

**Purpose**: Store code snippets with user isolation

**Table**: `DevVaultItems`

**Keys**:
- **Partition Key** (PK): `userId`
  - Cognito User Sub ID (e.g., "us-east-1:abc123...")
  - Enables querying all items for a user
  
- **Sort Key** (SK): `id`
  - Unique UUID per snippet
  - Enables sorting by creation time (if using GSI)

**Data Structure**:
```json
{
  "userId": "us-east-1:abc123...",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Quick Sort Algorithm",
  "language": "python",
  "code": "def quicksort(arr):\n    ...",
  "description": "Implementation of quicksort with examples",
  "createdAt": "2024-08-31T12:34:56.789Z",
  "updatedAt": "2024-08-31T12:34:56.789Z"
}
```

**User Isolation**:
```
User A                          User B
    ↓                               ↓
  sub: user-a-id              sub: user-b-id
    ↓                               ↓
DynamoDB Query:                DynamoDB Query:
userId = user-a-id            userId = user-b-id
    ↓                               ↓
Returns only User A's items   Returns only User B's items
```

**Billing**: On-demand pricing (no minimum charges)

### 6. Security & Monitoring

**IAM Roles & Permissions**:

Lambda needs permissions for:
- Cognito: `cognito-idp:*` (auth operations)
- DynamoDB: `dynamodb:*` (CRUD operations)
- CloudWatch Logs: `logs:*` (logging)

**CORS Configuration**:

Frontend (S3) to API Gateway:
```
Access-Control-Allow-Origin: https://your-s3-website.s3-website-*.amazonaws.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**CloudWatch Logs**:
- Lambda logs all requests/responses
- Monitor via CloudWatch console
- Set alarms for errors

---

## Data Flow Diagrams

### Sign Up Flow

```
┌─────────────────────────────────────────────┐
│ 1. User fills signup form & clicks "Sign Up" │
│    Email: user@example.com                   │
│    Password: SecurePassword123!              │
└──────────────────┬──────────────────────────┘
                   ↓
        ┌──────────────────────────────────┐
        │ 2. Frontend: Validate input      │
        │    Send POST /auth/signup        │
        │    Body: {email, password}       │
        └──────────────────┬───────────────┘
                           ↓
          ┌────────────────────────────────────┐
          │ 3. API Gateway routes to Lambda    │
          │    No authorization needed         │
          └──────────────────┬─────────────────┘
                             ↓
    ┌────────────────────────────────────────────────┐
    │ 4. Lambda: handle_signup()                     │
    │    Calls: cognito.sign_up()                    │
    │    Cognito sends verification email            │
    └──────────────────┬─────────────────────────────┘
                       ↓
        ┌──────────────────────────────────┐
        │ 5. Cognito: Email Verification   │
        │    User receives 6-digit code    │
        │    in their email                │
        └──────────────────┬───────────────┘
                           ↓
    ┌───────────────────────────────────────┐
    │ 6. User enters code in verification   │
    │    form & clicks "Verify"             │
    └──────────────────┬────────────────────┘
                       ↓
      ┌───────────────────────────────────┐
      │ 7. Lambda: handle_confirm_signup()│
      │    Calls: cognito.confirm_sign_up()
      │    Account is now active!         │
      └──────────────────┬────────────────┘
                         ↓
            ┌────────────────────────────┐
            │ 8. Auto-login user         │
            │    Redirect to dashboard   │
            └────────────────────────────┘
```

### CRUD Operations Flow

```
User in Dashboard
    ↓
Creates/Reads/Updates/Deletes item
    ↓
Frontend JavaScript handler
    ↓
POST/GET/PUT/DELETE /items
with Authorization: Bearer {accessToken}
    ↓
API Gateway
    ↓
1. Extract token from Authorization header
2. Call Cognito Authorizer
3. Cognito verifies JWT (public key)
4. Returns claims: {sub: "user-123", email: "..."}
5. Attaches to event.requestContext.authorizer
    ↓
Lambda receives event with claims
    ↓
Extract userId from claims
    ↓
Query/Update DynamoDB with userId filter
    ↓
Return results to Frontend
    ↓
Frontend updates UI
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] AWS Account created and verified
- [ ] AWS CLI configured (optional)
- [ ] All source files ready (HTML, CSS, JS, Python)

### Phase 1: Cognito
- [ ] User Pool created
- [ ] App Client created with CLIENT_ID and SECRET
- [ ] Email verified (for sending verification codes)
- [ ] Password policy configured

### Phase 2: DynamoDB
- [ ] Table `DevVaultItems` created
- [ ] Partition key: `userId` (String)
- [ ] Sort key: `id` (String)
- [ ] On-demand billing enabled

### Phase 3: Lambda
- [ ] Function `devvault-backend` created
- [ ] Python 3.11+ runtime selected
- [ ] IAM role with Cognito + DynamoDB permissions
- [ ] Environment variables set (see Configuration)
- [ ] Code uploaded and deployed
- [ ] Test basic invocations

### Phase 4: API Gateway
- [ ] REST API created
- [ ] Cognito Authorizer configured
- [ ] All 8 routes created (4 auth + 4 CRUD)
- [ ] Lambda integration tested
- [ ] CORS configured
- [ ] Deployed to `prod` stage
- [ ] Endpoint URL noted

### Phase 5: S3
- [ ] Bucket created (globally unique name)
- [ ] Static website hosting enabled
- [ ] Public read policy applied
- [ ] HTML/CSS/JS files uploaded
- [ ] `app.js` updated with actual config values
- [ ] Website endpoint confirmed working

### Post-Deployment
- [ ] Test full signup → verify → login → create item flow
- [ ] Test all CRUD operations
- [ ] Test logout and login again
- [ ] Check CloudWatch logs for errors
- [ ] Monitor DynamoDB metrics
- [ ] Set up billing alerts

---

## Scaling Strategy

### Current Architecture (Free Tier)
- Cognito: Up to 50k MAU
- DynamoDB: On-demand (scales automatically)
- Lambda: 1M free requests/month
- API Gateway: 1M free requests/month

### Scaling for Production

**If you exceed free tier:**

1. **DynamoDB**:
   - Switch to provisioned capacity
   - Use Global Secondary Indexes
   - Enable point-in-time recovery

2. **Lambda**:
   - Add provisioned concurrency
   - Optimize cold start time
   - Use Lambda Layers for dependencies

3. **API Gateway**:
   - Enable caching
   - Set rate limiting
   - Use API keys for tracking

4. **S3**:
   - Add CloudFront CDN
   - Enable S3 Transfer Acceleration
   - Use S3 Object Lock for compliance

---

## Monitoring & Debugging

### CloudWatch Logs
- Lambda logs automatically sent to CloudWatch
- Search logs: `/aws/lambda/devvault-backend`
- Filter by error level, user ID, etc.

### Metrics to Monitor
- Lambda invocations and errors
- DynamoDB read/write capacity
- API Gateway latency and error rates
- Cognito sign-ups and sign-ins

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| CORS errors | Frontend/API URLs mismatch | Update CORS in API Gateway & S3 |
| 401 Unauthorized | Invalid or expired token | Refresh token or re-login |
| DynamoDB Throttling | Exceeding capacity | Increase provisioned capacity |
| Lambda Timeout | Function takes >900s | Optimize code or increase timeout |
| Cold starts slow | Lambda container initialization | Add provisioned concurrency |

---

## Cost Breakdown (Estimated Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| Cognito | 100 users/month | $0 (free tier) |
| DynamoDB | 1GB, 1k req/day | ~$0.25-1.00 |
| Lambda | 100k invocations | $0 (free tier) |
| API Gateway | 100k requests | $0 (free tier) |
| S3 | 100MB storage | $0.02 |
| **Total** | | **<$1.50** |

Note: Costs vary by region and usage patterns.

---

## References

- [AWS Cognito Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [API Gateway Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-use-lambda-authorizer.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [IAM Roles for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)

---

**DevVault is ready for deployment! Follow DEPLOYMENT_GUIDE.md for step-by-step instructions.**
