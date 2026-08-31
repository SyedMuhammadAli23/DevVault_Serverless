# DevVault - Getting Started Guide

Welcome to DevVault! This guide will help you understand the project structure and get you up and running.

## 📚 What is DevVault?

DevVault is a professional serverless application for managing code snippets. It's designed to:
- Showcase your full-stack development skills on your portfolio/LinkedIn
- Demonstrate mastery of AWS serverless architecture
- Provide a real-world example of secure authentication and data isolation
- Show modern frontend and backend development practices

## 🎯 Quick Overview

```
DevVault Architecture:
┌─────────────┐         ┌──────────┐       ┌────────┐      ┌─────────┐
│   Frontend  │────────▶│ Cognito  │──────▶│ Lambda │──────▶│ DynamoDB│
│  (HTML/CSS) │ Login   │ (Auth)   │ Auth  │(Backend)│ CRUD │ (DB)    │
└─────────────┘         └──────────┘       └────────┘      └─────────┘
  Hosted on S3         AWS Service         Python Code      No-SQL DB
  (Static)             User Pool           CRUD Logic       Snippet Store
```

## 📁 Project Files Explained

### Frontend Files (Deploy to S3)

#### `index.html`
- **Purpose**: Main UI with all forms and dashboard
- **Contains**:
  - Sign Up form (email + password)
  - Email verification form (6-digit code)
  - Login form
  - Dashboard with CRUD interface
  - Modal for editing snippets
- **Tech**: HTML5 + Tailwind CSS
- **Responsive**: Works on mobile, tablet, desktop

#### `styles.css`
- **Purpose**: Styling and animations
- **Features**:
  - Dark theme with blue accents
  - Smooth transitions and slide animations
  - Custom card styling for snippets
  - Responsive grid layouts
  - Scrollbar styling
- **Framework**: Built on Tailwind CSS CDN
- **No dependencies**: Pure CSS

#### `app.js`
- **Purpose**: Frontend logic (authentication + API calls)
- **Key functions**:
  - `handleSignUp()` - Send signup to Lambda
  - `handleLogin()` - Authenticate and get JWT
  - `handleCreateItem()` - Call API to save snippet
  - `loadItems()` - Fetch user's snippets
  - `handleEditItem()` - Update snippet
  - `deleteItem()` - Remove snippet
  - `logout()` - Clear tokens and session
- **Configuration**: Update CONFIG object with your AWS values
- **Storage**: Uses localStorage for JWT tokens

### Backend Files (Deploy to Lambda)

#### `lambda_function.py`
- **Purpose**: Backend API handler (Python)
- **Key handlers**:
  - **Auth handlers** (public routes):
    - `handle_signup()` - Register new user with Cognito
    - `handle_confirm_signup()` - Verify email
    - `handle_login()` - Authenticate and return JWT
    - `handle_refresh_token()` - Get new access token
  
  - **CRUD handlers** (protected routes):
    - `handle_create_item()` - Create snippet
    - `handle_get_items()` - Get all user's snippets
    - `handle_get_item()` - Get specific snippet
    - `handle_update_item()` - Edit snippet
    - `handle_delete_item()` - Delete snippet

- **User Isolation**: Extracts Cognito `sub` ID from JWT, ensures users only access their own data
- **Database**: Calls DynamoDB with boto3
- **Error Handling**: Returns appropriate HTTP status codes and error messages

#### `requirements.txt`
- **Purpose**: Python dependencies for Lambda
- **Packages**:
  - `boto3` - AWS SDK
  - `PyJWT` - JWT verification
  - `python-dateutil` - Date utilities

### Documentation Files

#### `README.md`
- Project overview
- Features list
- Tech stack
- Getting started instructions
- Troubleshooting guide

#### `DEPLOYMENT_GUIDE.md` ⭐ **START HERE**
- Step-by-step instructions for deploying to AWS
- Includes:
  - Cognito User Pool setup
  - DynamoDB table creation
  - Lambda function configuration
  - API Gateway setup
  - S3 static website hosting
  - Testing endpoints

#### `ARCHITECTURE.md`
- Deep dive into system design
- Data flow diagrams
- Security explanation
- Scaling considerations
- Cost breakdown

#### `AWS_SETUP_CHECKLIST.md`
- Quick reference checklist
- All values to save
- Troubleshooting quick links
- Can be printed

---

## 🚀 Step-by-Step Deployment

### Step 1: Read the Deployment Guide
Start with **DEPLOYMENT_GUIDE.md** - it has the most detailed instructions.

Time: 5-10 minutes to read

### Step 2: Set Up AWS Resources (Phase 1-2)
1. Create Cognito User Pool
2. Create DynamoDB Table

Time: 15-20 minutes

### Step 3: Deploy Backend (Phase 3-4)
1. Create Lambda function
2. Set up API Gateway
3. Test endpoints with curl

Time: 20-30 minutes

### Step 4: Deploy Frontend (Phase 5)
1. Create S3 bucket
2. Upload HTML/CSS/JS files
3. Update app.js with your AWS values

Time: 10-15 minutes

### Step 5: Test Everything
1. Visit S3 website
2. Sign up, verify email, login
3. Create, edit, delete snippets
4. Test logout and login again

Time: 10 minutes

**Total Time: ~60-90 minutes**

---

## 🔧 Before You Deploy: Configuration

You'll need to update these files with your AWS resource IDs:

### 1. Update `app.js`

Find this section and update with your actual AWS values:

```javascript
const CONFIG = {
    cognito: {
        userPoolId: 'us-east-1_XXXXXXXXX',          // ← Your Cognito User Pool ID
        clientId: 'XXXXXXXXXXXXXXXXXXXXXXXX',        // ← Your Client ID
        region: 'us-east-1',                         // ← Your region
    },
    api: {
        endpoint: 'https://xxxxxxx.execute-api.us-east-1.amazonaws.com/prod', // ← Your API endpoint
        region: 'us-east-1',
    }
};
```

### 2. Set Lambda Environment Variables

When creating the Lambda function, set these env vars:

| Variable | Example Value |
|----------|----------------|
| `COGNITO_USER_POOL_ID` | `us-east-1_abc123xyz` |
| `COGNITO_CLIENT_ID` | `1a2b3c4d5e6f7g8h9i0j` |
| `COGNITO_CLIENT_SECRET` | `your_secret_here` |
| `DYNAMODB_TABLE_NAME` | `DevVaultItems` |

---

## 🧪 Testing After Deployment

### Test Signup & Login
```bash
# 1. Sign up
curl -X POST https://YOUR_API/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# 2. Verify (check email for code)
curl -X POST https://YOUR_API/auth/confirm \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","confirmationCode":"123456"}'

# 3. Login
curl -X POST https://YOUR_API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Test CRUD
```bash
# Create snippet (replace TOKEN with actual token from login)
curl -X POST https://YOUR_API/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "title":"My Snippet",
    "language":"python",
    "code":"print(\"Hello\")",
    "description":"Test snippet"
  }'
```

---

## 🎨 Customization Ideas

### Frontend
- [ ] Add code syntax highlighting with Prism.js
- [ ] Add search/filter functionality
- [ ] Add tags or categories
- [ ] Dark/light theme toggle
- [ ] Export to GitHub Gist

### Backend
- [ ] Add snippet sharing with read-only links
- [ ] Add snippet trending/popular features
- [ ] Add full-text search with Elasticsearch
- [ ] Add GitHub integration
- [ ] Add API rate limiting

### Database
- [ ] Add tags/categories table
- [ ] Add sharing permissions table
- [ ] Add audit log table
- [ ] Add analytics/usage stats

---

## 📊 Understanding the Data Flow

### User Signs Up:
```
User fills form
    ↓
app.js: handleSignUp()
    ↓
POST /auth/signup
    ↓
Lambda: handle_signup()
    ↓
boto3: cognito.sign_up()
    ↓
Cognito User Pool creates user
    ↓
Email sent with verification code
    ↓
Frontend shows "Check your email"
```

### User Creates Snippet:
```
User fills form and clicks "Add"
    ↓
app.js: handleCreateItem()
    ↓
POST /items with Bearer token
    ↓
API Gateway validates token with Cognito
    ↓
Lambda receives event with user's sub ID
    ↓
Lambda: handle_create_item()
    ↓
boto3: table.put_item() with userId = sub
    ↓
DynamoDB stores snippet
    ↓
Lambda returns item
    ↓
Frontend shows snippet in dashboard
```

### User Requests Items:
```
Frontend loads
    ↓
app.js: loadItems()
    ↓
GET /items with Bearer token
    ↓
API Gateway validates token
    ↓
Lambda: handle_get_items()
    ↓
boto3: table.query(userId = sub)
    ↓
DynamoDB returns only user's items
    ↓
Frontend displays items
```

---

## 🔐 Security Model

### User Isolation
- Each user gets unique `sub` ID from Cognito
- All queries filter by this ID
- No cross-user data access possible

### Authentication Flow
1. User logs in → Cognito returns JWT
2. Frontend stores JWT in localStorage
3. Every API call includes JWT in Authorization header
4. API Gateway validates JWT with Cognito
5. Invalid/expired tokens rejected automatically

### JWT Tokens
- **Access Token**: Short-lived (1 hour), used for API calls
- **ID Token**: Contains user info, can decode without validation
- **Refresh Token**: Long-lived, used to get new access token

---

## 📈 Scaling Your Project

### For Portfolio
1. Add project to GitHub with good README
2. Deploy to production (follow this guide)
3. Share link on LinkedIn
4. Write blog post about architecture
5. Add to portfolio website

### For Production
1. Set up custom domain (Route53 + CloudFront)
2. Enable HTTPS everywhere
3. Add monitoring and alerts
4. Set up auto-scaling
5. Implement backup strategy
6. Add API versioning
7. Document API with Swagger/OpenAPI

---

## ❓ Common Questions

**Q: How much will this cost?**
A: ~$0-1/month during development. Covered by AWS free tier for 12 months.

**Q: Can I share code snippets?**
A: Not yet - but you could add this! Create a sharing tokens feature.

**Q: How do I update the frontend?**
A: Edit HTML/CSS/JS files, re-upload to S3. No Lambda restart needed.

**Q: How do I update the backend?**
A: Edit Python code, test locally, deploy to Lambda. Updates apply immediately.

**Q: Can I use a custom domain?**
A: Yes! Use Route53 + CloudFront for both frontend and API.

**Q: How do I monitor errors?**
A: Check CloudWatch Logs in AWS Console under Lambda.

---

## 📚 Learning Resources

### AWS Services
- [Cognito Docs](https://docs.aws.amazon.com/cognito/)
- [API Gateway Docs](https://docs.aws.amazon.com/apigateway/)
- [Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Docs](https://docs.aws.amazon.com/dynamodb/)

### Frontend
- [Tailwind CSS](https://tailwindcss.com/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

### Backend
- [Boto3 Docs](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [Python AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html)

---

## 🚀 Ready? Let's Go!

1. **First**: Open **DEPLOYMENT_GUIDE.md**
2. **Then**: Use **AWS_SETUP_CHECKLIST.md** as reference
3. **Reference**: Check **ARCHITECTURE.md** for questions
4. **Deploy**: Follow steps in deployment guide
5. **Test**: Use testing section above
6. **Celebrate**: You built a serverless app! 🎉

---

## 💡 Pro Tips

- **Start small**: Get basic CRUD working before customizing
- **Use CloudWatch Logs**: Monitor Lambda execution
- **Test with curl**: Before testing in frontend
- **Version your code**: Commit to GitHub
- **Document changes**: Keep notes of what you deploy
- **Monitor costs**: Set AWS billing alerts
- **Backup data**: Enable DynamoDB point-in-time recovery

---

**Questions? Check the docs or AWS documentation!**

Happy coding! 🚀
