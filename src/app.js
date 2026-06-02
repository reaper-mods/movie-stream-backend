require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const config = require('./config/environment');
const security = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');

// Initialize express app
const app = express();

// Trust proxy for rate limiting behind reverse proxy (Vercel)
app.set('trust proxy', 1);

// Security middleware
app.use(security.securityHeaders);
app.use(security.mongoSanitize);
app.use(security.xssPrevention);
app.use(security.hppProtection);
app.use(security.sqlInjectionPrevention);
app.use(security.suspiciousActivityLogger);
app.use(security.requestSizeLimiter);

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Standard middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
app.use('/api/', security.generalLimiter);
app.use('/api/auth/', security.authLimiter);

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv 
  });
});

// Test route to verify API is working
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

// Admin panel route (raw HTML login page)
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
            button:hover {
                opacity: 0.9;
            }
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
                <input type="text" id="username" placeholder="Username" required autocomplete="username">
                <input type="password" id="password" placeholder="Password" required autocomplete="current-password">
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
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, password }),
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        successDiv.style.display = 'block';
                        successDiv.textContent = 'Login successful! Token: ' + data.data.token.substring(0, 20) + '...';
                        
                        // Store token
                        localStorage.setItem('adminToken', data.data.token);
                        
                        // Show admin info
                        setTimeout(() => {
                            alert('Login successful! Welcome ' + data.data.admin.username);
                            console.log('Admin Token:', data.data.token);
                            console.log('Admin Data:', data.data.admin);
                        }, 500);
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
    message: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// IMPORTANT: This makes the server actually listen on a port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 MovieStream Backend Server is running!`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
  console.log(`📡 API Test: http://localhost:${PORT}/api/test`);
  console.log(`\n✨ Admin Login Credentials:`);
  console.log(`   Username: superadmin`);
  console.log(`   Password: Admin@123!`);
  console.log(`\n✅ Ready to accept requests!\n`);
});

module.exports = app;