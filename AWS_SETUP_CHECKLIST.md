# DevVault - AWS Setup Checklist

Quick reference guide for setting up DevVault on AWS. Print or bookmark this for easy access during deployment!

---

## 📋 Phase 1: Cognito Setup

### Create User Pool
- [ ] Go to **AWS Console** → **Cognito** → **User pools**
- [ ] Click **Create user pool**
- [ ] Sign-in with: **Email**
- [ ] Save your **User Pool ID**: `_______________________`

### Create App Client
- [ ] In User Pool → **App integration** → **App clients**
- [ ] Click **Create app client**
- [ ] Name: `devvault-app`
- [ ] Enable: `ALLOW_ADMIN_USER_PASSWORD_AUTH`
- [ ] Enable: `ALLOW_REFRESH_TOKEN_AUTH`
- [ ] Save your **Client ID**: `_______________________`
- [ ] Save your **Client Secret**: `_______________________`

### Configure Email (For Verification Codes)
- [ ] User Pool → **Message customization** → **Email**
- [ ] Choose: Use Amazon SES (free tier: 200/day)

---

## 💾 Phase 2: DynamoDB Setup

### Create Table
- [ ] Go to **AWS Console** → **DynamoDB** → **Tables**
- [ ] Click **Create table**
- [ ] **Table name**: `DevVaultItems`
- [ ] **Partition key**: `userId` (String)
- [ ] **Sort key**: `id` (String)
- [ ] **Billing mode**: On-demand
- [ ] Click **Create**

### Verify Table
- [ ] Table status shows: **Active** ✓
- [ ] Partition key: `userId`
- [ ] Sort key: `id`

---

## ⚙️ Phase 3: Lambda Setup

### Create Function
- [ ] Go to **AWS Console** → **Lambda** → **Functions**
- [ ] Click **Create function**
- [ ] **Name**: `devvault-backend`
- [ ] **Runtime**: Python 3.11 (or 3.12)
- [ ] Click **Create**

### Set Execution Role
- [ ] In Lambda → **Configuration** → **Execution role**
- [ ] Click role name to open IAM
- [ ] **Add inline policy** with name: `DevVaultPolicy`
- [ ] Paste policy from DEPLOYMENT_GUIDE.md (Phase 3.2)
- [ ] Update: `REGION`, `ACCOUNT_ID`, `USER_POOL_ID`

### Set Environment Variables
| Key | Value |
|-----|-------|
| `COGNITO_USER_POOL_ID` | `_______________________` |
| `COGNITO_CLIENT_ID` | `_______________________` |
| `COGNITO_CLIENT_SECRET` | `_______________________` |
| `DYNAMODB_TABLE_NAME` | `DevVaultItems` |

- [ ] Copy-paste values into Lambda environment

### Upload Code
- [ ] Download `lambda_function.py`
- [ ] In Lambda → **Code source**
- [ ] Paste code into `lambda_function.py` file
- [ ] Click **Deploy**

### Test Function
- [ ] Click **Test** tab
- [ ] Create test event for `/auth/signup`
- [ ] Should return **200** status

---

## 🌐 Phase 4: API Gateway Setup

### Create REST API
- [ ] Go to **AWS Console** → **API Gateway** → **APIs**
- [ ] Click **Create API**
- [ ] Choose **REST API** → **Build**
- [ ] **Name**: `devvault-api`
- [ ] Click **Create API**

### Create Cognito Authorizer
- [ ] In API → **Authorizers**
- [ ] Click **Create**
- [ ] **Name**: `CognitoAuthorizer`
- [ ] **Type**: Cognito
- [ ] **Cognito User Pool**: Select your pool
- [ ] **Token source**: `Authorization`
- [ ] Click **Create**

### Create Routes

**Step 1: Create `/auth` resource**
- [ ] Resources → Root → **Create resource**
- [ ] **Resource name**: `auth`
- [ ] Click **Create**

**Step 2: Create auth endpoints**
- [ ] Under `/auth` → **Create resource** → `signup`
  - [ ] **POST method** → Lambda: `devvault-backend` → **Save**
  
- [ ] Under `/auth` → **Create resource** → `confirm`
  - [ ] **POST method** → Lambda: `devvault-backend` → **Save**
  
- [ ] Under `/auth` → **Create resource** → `login`
  - [ ] **POST method** → Lambda: `devvault-backend` → **Save**
  
- [ ] Under `/auth` → **Create resource** → `refresh`
  - [ ] **POST method** → Lambda: `devvault-backend` → **Save**

**Step 3: Create `/items` resource (Protected)**
- [ ] Resources → Root → **Create resource** → `items`
- [ ] For **GET** and **POST**:
  - [ ] Create method → Lambda: `devvault-backend`
  - [ ] **Authorization**: CognitoAuthorizer
  - [ ] Click **Save**

**Step 4: Create `/items/{id}` resource (Protected)**
- [ ] Under `/items` → **Create resource** → `{id}`
- [ ] For **GET**, **PUT**, and **DELETE**:
  - [ ] Create method → Lambda: `devvault-backend`
  - [ ] **Authorization**: CognitoAuthorizer
  - [ ] Click **Save**

### Enable CORS (All Resources)
- [ ] For each resource with methods:
  - [ ] Create **OPTIONS** method
  - [ ] **Integration type**: Mock
  - [ ] Set response headers:
    - `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`
    - `Access-Control-Allow-Headers: Content-Type,Authorization`
    - `Access-Control-Allow-Origin: *`

### Deploy API
- [ ] **Stages** → **Deploy**
- [ ] **Stage name**: `prod`
- [ ] Click **Deploy**
- [ ] **Save API endpoint**: `https://____.execute-api.region.amazonaws.com/prod`

---

## 📦 Phase 5: S3 Setup

### Create Bucket
- [ ] Go to **AWS Console** → **S3** → **Buckets**
- [ ] Click **Create bucket**
- [ ] **Bucket name**: `devvault-frontend-YOUR-UNIQUE-ID`
- [ ] **Region**: Same as API Gateway
- [ ] **Block Public Access**: Uncheck all
- [ ] Click **Create**

### Enable Static Website Hosting
- [ ] In bucket → **Properties**
- [ ] **Static website hosting** → **Edit**
- [ ] Enable
- [ ] **Index document**: `index.html`
- [ ] **Error document**: `index.html`
- [ ] Click **Save**
- [ ] **Note website URL**: `http://devvault-frontend-____s3-website-region.amazonaws.com`

### Set Bucket Policy
- [ ] In bucket → **Permissions** → **Bucket policy**
- [ ] Paste policy from DEPLOYMENT_GUIDE.md (Phase 5.3)
- [ ] Replace bucket name
- [ ] Click **Save**

### Upload Frontend Files
- [ ] In bucket → **Objects** → **Upload**
- [ ] Upload these files:
  - [ ] `index.html`
  - [ ] `styles.css`
  - [ ] `app.js` (UPDATED with config values)
- [ ] Click **Upload**

### Update Frontend Config
- [ ] Download `app.js` from S3 or edit it locally
- [ ] Update `CONFIG` object:

```javascript
const CONFIG = {
    cognito: {
        userPoolId: '_____________________',  // Your Cognito User Pool ID
        clientId: '_____________________',    // Your Client ID
        region: 'us-east-1',                 // Your region
    },
    api: {
        endpoint: 'https://_____.execute-api.us-east-1.amazonaws.com/prod',
        region: 'us-east-1',
    }
};
```

- [ ] Re-upload `app.js` to S3

---

## ✅ Testing Checklist

### Test Sign Up
```bash
curl -X POST https://YOUR_API_ENDPOINT/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```
- [ ] Status: **200** ✓
- [ ] Response includes message

### Test Email Verification
- [ ] Check email for verification code
- [ ] Test confirm endpoint with code
- [ ] Should return **200** ✓

### Test Login
```bash
curl -X POST https://YOUR_API_ENDPOINT/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```
- [ ] Status: **200** ✓
- [ ] Response includes: `idToken`, `accessToken`, `userSub`
- [ ] Save `accessToken` for next test

### Test Protected Route
```bash
curl -X GET https://YOUR_API_ENDPOINT/items \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```
- [ ] Status: **200** ✓
- [ ] Returns empty array initially

### Test Create Item
```bash
curl -X POST https://YOUR_API_ENDPOINT/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title":"Test Snippet",
    "language":"python",
    "code":"print(\"Hello\")",
    "description":"Test"
  }'
```
- [ ] Status: **201** ✓
- [ ] Returns created item

### Test Frontend
- [ ] Visit your S3 website endpoint
- [ ] Sign up with test email
- [ ] Verify email
- [ ] Login
- [ ] Create snippet
- [ ] See snippet in dashboard
- [ ] Edit snippet
- [ ] Delete snippet
- [ ] Logout and login again

---

## 🔐 Security Checklist

- [ ] API endpoints use HTTPS (API Gateway default)
- [ ] Cognito Authorizer protects `/items` routes
- [ ] S3 bucket has public read access only
- [ ] Lambda IAM role follows least privilege
- [ ] Environment variables contain secrets (not in code)
- [ ] DynamoDB uses partition key for user isolation
- [ ] CORS configured for your domains only
- [ ] CloudWatch logging enabled for Lambda

---

## 📊 Values to Save

**Cognito**
- User Pool ID: `_______________________`
- Client ID: `_______________________`
- Client Secret: `_______________________`
- Region: `_______________________`

**DynamoDB**
- Table Name: `DevVaultItems`
- Status: `_______________________`

**Lambda**
- Function Name: `devvault-backend`
- Role ARN: `_______________________`

**API Gateway**
- API ID: `_______________________`
- Endpoint: `https://______.execute-api.region.amazonaws.com/prod`
- Authorizer ID: `_______________________`

**S3**
- Bucket Name: `_______________________`
- Website URL: `_______________________`
- Region: `_______________________`

---

## 💰 Monitor Costs

- [ ] Set up **AWS Billing Alerts**
- [ ] Enable **AWS Cost Explorer**
- [ ] Set monthly budget limit: $1-5
- [ ] Monitor free tier usage

---

## 🚨 Troubleshooting Quick Links

| Issue | Check |
|-------|-------|
| CORS error | API Gateway CORS + S3 CORS policy |
| 401 Unauthorized | Cognito Authorizer attached? Token valid? |
| Lambda timeout | Lambda timeout setting + function code |
| DynamoDB errors | IAM permissions + table exists + keys correct |
| S3 not loading | Static hosting enabled? Public access? |
| Verify code not received | SES limits? Email verified in Cognito? |

---

## 📞 AWS Support

- **AWS Support**: [https://console.aws.amazon.com/support](https://console.aws.amazon.com/support)
- **Service Health Dashboard**: [https://health.aws.amazon.com](https://health.aws.amazon.com)
- **AWS Forums**: [https://forums.aws.amazon.com](https://forums.aws.amazon.com)

---

**Print this checklist and use it during deployment!**

✅ Deployment complete? Time to celebrate! 🎉

Next: Set up billing alerts, enable CloudFront CDN, and promote your project!
