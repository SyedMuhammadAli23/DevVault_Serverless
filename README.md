# DevVault - Serverless Code Snippet Manager

A full-stack serverless application for managing and organizing code snippets. Perfect for your portfolio and LinkedIn!

## 🚀 Features

- **User Authentication**: Secure sign-up, email verification, and login with Amazon Cognito
- **Code Snippet Management**: Create, read, update, and delete code snippets
- **User Isolation**: Each user only sees their own snippets (secured by Cognito User ID)
- **Multiple Languages**: Support for JavaScript, Python, SQL, HTML, CSS, Bash, JSON, and more
- **Modern UI**: Clean, responsive Tailwind CSS design with smooth animations
- **Fully Serverless**: No servers to manage - scales automatically with AWS
- **JWT Authentication**: API Gateway with Cognito Authorizer for secure endpoints

## 📋 Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **Tailwind CSS** - Modern utility-first styling
- **Vanilla JavaScript** - No frameworks, pure browser APIs
- **Hosted on**: Amazon S3 with static website hosting

### Backend
- **AWS Lambda** - Serverless compute (Python 3.11+)
- **Amazon Cognito** - User authentication and management
- **API Gateway** - REST API with built-in authorizers
- **DynamoDB** - NoSQL database for snippet storage

## 📁 Project Structure

```
DevVault/
├── index.html              # Main application HTML
├── styles.css              # Tailwind CSS + custom styling
├── app.js                  # Frontend JavaScript (Cognito + API calls)
├── lambda_function.py      # Backend Lambda handler (Python)
├── requirements.txt        # Python dependencies for Lambda
├── DEPLOYMENT_GUIDE.md     # Step-by-step AWS deployment guide
└── README.md               # This file
```

## 🔧 Configuration

### Frontend Configuration

Edit the `CONFIG` object in `app.js`:

```javascript
const CONFIG = {
    cognito: {
        userPoolId: 'us-east-1_XXXXXXXXX',          // Your Cognito User Pool ID
        clientId: 'XXXXXXXXXXXXXXXXXXXXXXXX',        // Your Cognito Client ID
        region: 'us-east-1',                         // Your AWS region
    },
    api: {
        endpoint: 'https://xxxxxxx.execute-api.us-east-1.amazonaws.com/prod',
        region: 'us-east-1',
    }
};
```

### Backend Configuration

Set these environment variables in your Lambda function:

| Variable | Description |
|----------|-------------|
| `COGNITO_USER_POOL_ID` | Your Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | Your Cognito App Client ID |
| `COGNITO_CLIENT_SECRET` | Your Cognito Client Secret |
| `DYNAMODB_TABLE_NAME` | DynamoDB table name (default: `DevVaultItems`) |

## 🚀 Getting Started

### Prerequisites
- AWS Account (free tier eligible)
- AWS CLI configured (optional, for manual deployment)
- Cognito User Pool
- DynamoDB Table
- Lambda Function
- API Gateway REST API

### Quick Start

1. **Follow the Deployment Guide**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for step-by-step instructions
2. **Update Configuration**: Update `app.js` with your AWS resources
3. **Upload Frontend**: Upload HTML/CSS/JS files to your S3 bucket
4. **Deploy Backend**: Upload `lambda_function.py` to Lambda
5. **Test**: Visit your S3 website endpoint and test the application

## 🔐 API Endpoints

### Authentication (Public)
- `POST /auth/signup` - Register new user
- `POST /auth/confirm` - Verify email with confirmation code
- `POST /auth/login` - Login and get JWT tokens
- `POST /auth/refresh` - Refresh expired access token

### Snippets (Protected - Cognito Authorizer Required)
- `GET /items` - Get all snippets for logged-in user
- `POST /items` - Create new snippet
- `GET /items/{id}` - Get specific snippet
- `PUT /items/{id}` - Update snippet
- `DELETE /items/{id}` - Delete snippet

## 📊 Database Schema

### DynamoDB Table: `DevVaultItems`

| Attribute | Type | Description |
|-----------|------|-------------|
| `userId` | String (PK) | Cognito User Sub ID |
| `id` | String (SK) | Unique snippet ID (UUID) |
| `title` | String | Snippet title |
| `language` | String | Programming language |
| `code` | String | Code content |
| `description` | String | Optional description |
| `createdAt` | String | ISO timestamp |
| `updatedAt` | String | ISO timestamp |

## 🔒 Security Features

- **JWT Authentication**: API Gateway validates tokens
- **User Isolation**: Cognito `sub` ID ensures data separation
- **CORS Protection**: Configured for S3 and API Gateway
- **HTTPS Only**: All endpoints use HTTPS
- **Email Verification**: Cognito handles email verification
- **Password Policy**: Configurable in Cognito User Pool

## 💰 Cost Estimation (Monthly, Free Tier)

- **Cognito**: 50k MAU free
- **DynamoDB**: 25 GB storage + on-demand capacity
- **Lambda**: 1M free requests
- **API Gateway**: 1M free requests
- **S3**: 5 GB storage free
- **Total**: Usually < $1/month for personal use

## 📱 Responsive Design

- Desktop: Full dashboard layout
- Tablet: Optimized grid layout
- Mobile: Single column, touch-friendly buttons

## 🎨 UI Features

- **Dark Theme**: Professional dark mode with blue accents
- **Smooth Animations**: Slide and fade-in effects
- **Loading States**: Visual feedback for async operations
- **Error Handling**: User-friendly error messages
- **Code Preview**: First 200 characters of snippets displayed
- **Modal Editor**: Edit snippets in a modal dialog

## 🐛 Troubleshooting

### Common Issues

**CORS Error**
- Update S3 CORS configuration
- Update API Gateway CORS headers
- Verify front-end and back-end URLs match

**401 Unauthorized**
- Check Cognito Authorizer configuration
- Verify JWT token is being sent in Authorization header
- Check token hasn't expired

**DynamoDB Errors**
- Verify Lambda IAM role has DynamoDB permissions
- Check table name matches environment variable
- Ensure table exists and has correct keys

**Lambda Timeout**
- Increase timeout in Lambda settings
- Optimize code to reduce cold start time
- Add provisioned concurrency for faster response

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#troubleshooting) for more solutions.

## 📈 Performance Tips

1. Enable CloudFront distribution for S3
2. Add DynamoDB caching with DAX
3. Use Lambda provisioned concurrency
4. Implement pagination for large item lists
5. Enable S3 Transfer Acceleration

## 🚀 Next Steps

1. Add search functionality
2. Implement snippet sharing with read-only links
3. Add code syntax highlighting with Prism.js
4. Implement tags/categories
5. Add export to GitHub Gist
6. Implement dark/light theme toggle
7. Add keyboard shortcuts
8. Implement full-text search with Elasticsearch

## 📚 Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Lambda Python Documentation](https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📝 License

Open source for portfolio and learning purposes.

## 👤 Author

Built as a professional portfolio project demonstrating:
- Serverless architecture on AWS
- Full-stack development
- Cloud database design
- Authentication and security
- Modern frontend development
- RESTful API design

---

**Ready to deploy? Start with [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)! 🎉**
