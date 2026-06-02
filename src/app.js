require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');

// Initialize express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// Standard middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Import security middleware
const security = require('./middleware/security');

// Security middleware
app.use(security.securityHeaders);
app.use(security.xssPrevention);
app.use(security.hppProtection);
app.use(security.requestSizeLimiter);

// Import routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');

// Rate limiting
app.use('/api/', security.generalLimiter);
app.use('/api/auth/', security.authLimiter);

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      movies: '/api/movies/*',
      admin: '/api/admin/*',
      user: '/api/user/*'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// Admin panel
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Panel - MovieStream</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #1a1a1a;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                color: white;
            }
            .login-container {
                background: #2d2d2d;
                padding: 2rem;
                border-radius: 8px;
                width: 100%;
                max-width: 400px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            }
            h1 {
                color: #ff4444;
                text-align: center;
                margin-bottom: 0.5rem;
                font-size: 1.8rem;
            }
            .subtitle {
                color: #888;
                text-align: center;
                margin-bottom: 2rem;
                font-size: 0.9rem;
            }
            input {
                width: 100%;
                padding: 12px;
                margin: 8px 0;
                background: #404040;
                border: 1px solid #555;
                border-radius: 4px;
                color: white;
                font-size: 1rem;
                outline: none;
                transition: border-color 0.3s;
            }
            input:focus {
                border-color: #ff4444;
            }
            button {
                width: 100%;
                padding: 12px;
                margin-top: 1rem;
                background: linear-gradient(135deg, #ff0000, #cc0000);
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 1rem;
                font-weight: bold;
                cursor: pointer;
                transition: opacity 0.3s;
            }
            button:hover { opacity: 0.9; }
            .error {
                color: #ff4444;
                text-align: center;
                margin-top: 1rem;
                display: none;
            }
            .success {
                color: #44ff44;
                text-align: center;
                margin-top: 1rem;
                display: none;
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h1>🎬 MovieStream</h1>
            <p class="subtitle">Admin Panel</p>
            <form id="loginForm">
                <input type="text" id="username" placeholder="Username" required>
                <input type="password" id="password" placeholder="Password" required>
                <button type="submit">Login</button>
                <div class="error" id="errorMessage"></div>
                <div class="success" id="successMessage"></div>
            </form>
        </div>
        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const errorDiv = document.getElementById('errorMessage');
                const successDiv = document.getElementById('successMessage');
                errorDiv.style.display = 'none';
                successDiv.style.display = 'none';
                try {
                    const response = await fetch('/api/admin/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password }),
                    });
                    const data = await response.json();
                    if (data.success) {
                        successDiv.style.display = 'block';
                        successDiv.textContent = 'Login successful! Welcome ' + data.data.admin.username;
                        localStorage.setItem('adminToken', data.data.token);
                    } else {
                        errorDiv.style.display = 'block';
                        errorDiv.textContent = data.message || 'Login failed';
                    }
                } catch (error) {
                    errorDiv.style.display = 'block';
                    errorDiv.textContent = 'Network error. Please try again.';
                }
            });
        </script>
    </body>
    </html>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server (for local development)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
