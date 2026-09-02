// ============================================
// DevVault Frontend Application
// AWS Cognito + API Gateway Integration
// ============================================

// Configuration - PUBLIC VALUES ONLY (no secrets exposed)
const CONFIG = {
    // AWS Cognito Configuration (Public - safe to expose in frontend)
    cognito: {
        userPoolId: 'ap-south-1_bnMcGRdEV',         // User Pool ID from AWS
        clientId: '602b1v5b4unceh2n1fts3o0eoc',     // Client ID from AWS
        region: 'ap-south-1',                        // AWS Region
    },
    // API Gateway Configuration
    api: {
        endpoint: 'https://m9oe1oadw9.execute-api.ap-south-1.amazonaws.com/prod',
        region: 'ap-south-1',
    },
    // Cognito Hosted UI (if using Cognito Hosted UI for login)
    hostedUIConfig: {
        domain: 'YOUR_COGNITO_DOMAIN',               // e.g., devvault-prod.auth.us-east-1.amazoncognito.com
        redirectSignIn: 'https://your-s3-bucket.s3.amazonaws.com/index.html',  // Your S3 static site URL
        redirectSignOut: 'https://your-s3-bucket.s3.amazonaws.com/index.html',
    }
};

// Global state
let authState = {
    idToken: null,
    accessToken: null,
    refreshToken: null,
    userEmail: null,
    userSub: null,
    isAuthenticated: false,
};

const passwordVisibility = {
    signupPassword: false,
    loginPassword: false,
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is already logged in
    const storedToken = localStorage.getItem('idToken');
    if (storedToken) {
        authState.idToken = storedToken;
        authState.accessToken = localStorage.getItem('accessToken');
        authState.userEmail = localStorage.getItem('userEmail');
        authState.userSub = localStorage.getItem('userSub');
        authState.isAuthenticated = true;
        showDashboard();
        loadItems();
    }

    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Sign Up
    document.getElementById('signupForm').addEventListener('submit', handleSignUp);

    // Email Verification
    document.getElementById('verificationForm').addEventListener('submit', handleVerification);

    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Create Item
    document.getElementById('createItemForm').addEventListener('submit', handleCreateItem);

    // Edit Item
    document.getElementById('editItemForm').addEventListener('submit', handleEditItem);
}

function togglePasswordVisibility(fieldId, toggleButton) {
    const passwordInput = document.getElementById(fieldId);
    const isVisible = !passwordVisibility[fieldId];

    passwordVisibility[fieldId] = isVisible;
    passwordInput.type = isVisible ? 'text' : 'password';
    toggleButton.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
    toggleButton.setAttribute('title', isVisible ? 'Hide password' : 'Show password');
    toggleButton.querySelector('[data-eye]').classList.toggle('hidden', isVisible);
    toggleButton.querySelector('[data-eye-off]').classList.toggle('hidden', !isVisible);
}

// ============================================
// Authentication Functions
// ============================================

async function handleSignUp(e) {
    e.preventDefault();
    clearErrors('signup');

    const signupData = {
        name: document.getElementById('signupName').value,
        email: document.getElementById('signupEmail').value,
        password: document.getElementById('signupPassword').value,
        phone_number: document.getElementById('signupPhoneNumber').value,
        birthdate: document.getElementById('signupBirthdate').value,
    };

    try {
        showLoading('signup');
        // This would call your backend Lambda to sign up user via Cognito
        const response = await fetch(`${CONFIG.api.endpoint}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signupData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Sign up failed');
        }

        // Store email for verification
        localStorage.setItem('signupEmail', signupData.email);
        localStorage.setItem('signupPassword', signupData.password);

        showSuccess('signup', 'Verification code sent to your email!');
        setTimeout(() => switchToVerification(), 1500);

    } catch (error) {
        console.error('Sign up error:', error);
        showError('signup', error.message);
    }
}

async function handleVerification(e) {
    e.preventDefault();
    clearErrors('verification');

    const code = document.getElementById('verificationCode').value;
    const email = localStorage.getItem('signupEmail');
    const password = localStorage.getItem('signupPassword');

    try {
        showLoading('verification');
        // Confirm sign up with verification code
        const response = await fetch(`${CONFIG.api.endpoint}/auth/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, confirmationCode: code })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Verification failed');
        }

        // Now log in with the verified credentials
        await loginWithCredentials(email, password);

    } catch (error) {
        console.error('Verification error:', error);
        showError('verification', error.message);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    clearErrors('login');

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await loginWithCredentials(email, password);
    } catch (error) {
        console.error('Login error:', error);
        showError('login', error.message);
    }
}

async function loginWithCredentials(email, password) {
    try {
        showLoading('login');
        // Call backend Lambda to authenticate with Cognito
        const response = await fetch(`${CONFIG.api.endpoint}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();
        
        // Store tokens
        authState.idToken = data.idToken;
        authState.accessToken = data.accessToken;
        authState.refreshToken = data.refreshToken;
        authState.userEmail = email;
        authState.userSub = data.userSub;
        authState.isAuthenticated = true;

        // Persist tokens
        localStorage.setItem('idToken', authState.idToken);
        localStorage.setItem('accessToken', authState.accessToken);
        localStorage.setItem('refreshToken', authState.refreshToken);
        localStorage.setItem('userEmail', authState.userEmail);
        localStorage.setItem('userSub', authState.userSub);

        // Clear signup data
        localStorage.removeItem('signupEmail');
        localStorage.removeItem('signupPassword');

        showSuccess('login', 'Login successful!');
        setTimeout(() => {
            showDashboard();
            loadItems();
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        showError('login', error.message);
        throw error;
    }
}

function logout() {
    // Clear tokens
    authState.isAuthenticated = false;
    authState.idToken = null;
    authState.accessToken = null;
    authState.userEmail = null;

    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userSub');

    // Reset forms
    document.getElementById('signupForm').reset();
    document.getElementById('loginForm').reset();
    document.getElementById('createItemForm').reset();

    showAuthPage();
}

// ============================================
// CRUD Operations
// ============================================

async function handleCreateItem(e) {
    e.preventDefault();
    clearErrors('create');

    const title = document.getElementById('itemTitle').value;
    const language = document.getElementById('itemLanguage').value;
    const code = document.getElementById('itemCode').value;
    const description = document.getElementById('itemDescription').value;

    try {
        const response = await fetch(`${CONFIG.api.endpoint}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authState.accessToken}`
            },
            body: JSON.stringify({
                title,
                language,
                code,
                description
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create item');
        }

        const data = await response.json();
        showSuccess('create', 'Snippet created successfully!');
        
        // Reset form and reload items
        document.getElementById('createItemForm').reset();
        await loadItems();

    } catch (error) {
        console.error('Create error:', error);
        showError('create', error.message);
    }
}

async function loadItems() {
    try {
        const response = await fetch(`${CONFIG.api.endpoint}/items`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authState.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load items');
        }

        const data = await response.json();
        displayItems(data.items || []);

    } catch (error) {
        console.error('Load items error:', error);
        document.getElementById('itemsList').innerHTML = '<p class="text-red-400">Error loading items</p>';
    }
}

function displayItems(items) {
    const itemsList = document.getElementById('itemsList');
    const noItems = document.getElementById('noItems');

    if (items.length === 0) {
        itemsList.innerHTML = '';
        noItems.classList.remove('hidden');
        return;
    }

    noItems.classList.add('hidden');
    itemsList.innerHTML = items.map(item => `
        <div class="item-card">
            <h3>${escapeHtml(item.title)}</h3>
            <span class="language-badge">${item.language}</span>
            ${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ''}
            <div class="code-preview">${escapeHtml(item.code.substring(0, 200))}${item.code.length > 200 ? '...' : ''}</div>
            <div class="actions">
                <button class="edit-btn" onclick="openEditModal('${item.id}', ${JSON.stringify(item).replace(/'/g, '&#39;')})">Edit</button>
                <button class="delete-btn" onclick="deleteItem('${item.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function openEditModal(itemId, item) {
    document.getElementById('editItemId').value = itemId;
    document.getElementById('editItemTitle').value = item.title;
    document.getElementById('editItemLanguage').value = item.language;
    document.getElementById('editItemCode').value = item.code;
    document.getElementById('editItemDescription').value = item.description || '';
    
    document.getElementById('editModal').classList.remove('hidden');
    document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    document.getElementById('editModal').classList.remove('show');
    clearErrors('edit');
}

async function handleEditItem(e) {
    e.preventDefault();
    clearErrors('edit');

    const itemId = document.getElementById('editItemId').value;
    const title = document.getElementById('editItemTitle').value;
    const language = document.getElementById('editItemLanguage').value;
    const code = document.getElementById('editItemCode').value;
    const description = document.getElementById('editItemDescription').value;

    try {
        const response = await fetch(`${CONFIG.api.endpoint}/items/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authState.accessToken}`
            },
            body: JSON.stringify({
                title,
                language,
                code,
                description
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update item');
        }

        closeEditModal();
        await loadItems();

    } catch (error) {
        console.error('Edit error:', error);
        showError('edit', error.message);
    }
}

async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this snippet?')) {
        return;
    }

    try {
        const response = await fetch(`${CONFIG.api.endpoint}/items/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authState.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete item');
        }

        await loadItems();

    } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting snippet: ' + error.message);
    }
}

// ============================================
// UI Utilities
// ============================================

function showAuthPage() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('dashboardContainer').classList.add('hidden');
    switchToLogin();
}

function showDashboard() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('dashboardContainer').classList.remove('hidden');
    document.getElementById('userEmail').textContent = authState.userEmail;
}

function switchToSignup() {
    document.getElementById('signupView').classList.remove('hidden');
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('verificationView').classList.add('hidden');
    clearErrors('signup');
}

function switchToLogin() {
    document.getElementById('signupView').classList.add('hidden');
    document.getElementById('loginView').classList.remove('hidden');
    document.getElementById('verificationView').classList.add('hidden');
    clearErrors('login');
}

function switchToVerification() {
    document.getElementById('signupView').classList.add('hidden');
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('verificationView').classList.remove('hidden');
    clearErrors('verification');
}

function showError(section, message) {
    const errorElement = document.getElementById(`${section}Error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
}

function showSuccess(section, message) {
    const successElement = document.getElementById(`${section}Success`);
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.remove('hidden');
    }
}

function clearErrors(section) {
    const errorElement = document.getElementById(`${section}Error`);
    const successElement = document.getElementById(`${section}Success`);
    if (errorElement) errorElement.classList.add('hidden');
    if (successElement) successElement.classList.add('hidden');
}

function showLoading(section) {
    // Add loading state to button if needed
    const button = document.querySelector(`#${section}Form button[type="submit"]`);
    if (button) {
        button.disabled = true;
        button.textContent = 'Loading...';
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// Token Refresh (Optional but recommended)
// ============================================

function setupTokenRefresh() {
    // Refresh token before it expires (typically every 55 minutes)
    setInterval(async () => {
        if (!authState.refreshToken) return;

        try {
            const response = await fetch(`${CONFIG.api.endpoint}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: authState.refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                authState.idToken = data.idToken;
                authState.accessToken = data.accessToken;
                localStorage.setItem('idToken', authState.idToken);
                localStorage.setItem('accessToken', authState.accessToken);
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            // If refresh fails, logout user
            logout();
        }
    }, 55 * 60 * 1000); // 55 minutes
}

// Initialize token refresh if user is logged in
if (authState.isAuthenticated) {
    setupTokenRefresh();
}
