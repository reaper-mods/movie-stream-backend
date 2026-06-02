require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');

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

// Admin Login Page
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MovieFlix - Admin Login</title>
        <style>
            :root { --bg: #0a0a0a; --card: #1a1a1a; --red: #ff0000; --red-dark: #8b0000; --gradient: linear-gradient(135deg, #8b0000, #cc0000, #ff0000); }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                background: var(--bg);
                color: white;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: radial-gradient(ellipse at center, rgba(139,0,0,0.15) 0%, transparent 70%), var(--bg);
            }
            .login-container {
                background: var(--card);
                padding: 50px 40px;
                border-radius: 20px;
                width: 100%;
                max-width: 420px;
                border: 1px solid #2a2a2a;
                box-shadow: 0 25px 60px rgba(0,0,0,0.5);
            }
            .logo {
                text-align: center;
                margin-bottom: 10px;
            }
            .logo svg { width: 50px; height: 50px; }
            .login-container h1 {
                text-align: center;
                font-size: 2rem;
                font-weight: 800;
                background: var(--gradient);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 5px;
            }
            .login-container .subtitle {
                text-align: center;
                color: #888;
                margin-bottom: 35px;
                font-size: 0.9rem;
            }
            .form-group {
                margin-bottom: 20px;
            }
            .form-group label {
                display: block;
                margin-bottom: 8px;
                color: #bbb;
                font-weight: 500;
                font-size: 0.9rem;
            }
            .form-group input {
                width: 100%;
                padding: 14px 16px;
                background: #0d0d0d;
                border: 1px solid #2a2a2a;
                border-radius: 10px;
                color: white;
                font-size: 1rem;
                transition: all 0.3s;
                outline: none;
            }
            .form-group input:focus {
                border-color: var(--red);
                box-shadow: 0 0 0 3px rgba(255,0,0,0.1);
            }
            .login-btn {
                width: 100%;
                padding: 14px;
                background: var(--gradient);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                margin-top: 10px;
                transition: all 0.3s;
                letter-spacing: 0.5px;
            }
            .login-btn:hover {
                opacity: 0.9;
                transform: translateY(-1px);
                box-shadow: 0 10px 30px rgba(255,0,0,0.3);
            }
            .login-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .message {
                text-align: center;
                margin-top: 15px;
                padding: 10px;
                border-radius: 8px;
                font-size: 0.9rem;
                display: none;
            }
            .message.error {
                background: rgba(255,0,0,0.1);
                color: #ff4444;
                display: block;
            }
            .message.success {
                background: rgba(0,255,0,0.1);
                color: #44ff44;
                display: block;
            }
            .back-link {
                text-align: center;
                margin-top: 25px;
            }
            .back-link a {
                color: #666;
                text-decoration: none;
                font-size: 0.85rem;
                transition: color 0.3s;
            }
            .back-link a:hover { color: var(--red); }
        </style>
    </head>
    <body>
        <div class="login-container">
            <div class="logo">
                <svg viewBox="0 0 50 50" fill="none">
                    <rect width="50" height="50" rx="12" fill="url(#g)"/>
                    <polygon points="20,15 35,25 20,35" fill="white"/>
                    <defs><linearGradient id="g" x1="0" y1="0" x2="50" y2="50"><stop stop-color="#8b0000"/><stop offset="1" stop-color="#ff0000"/></linearGradient></defs>
                </svg>
            </div>
            <h1>MovieFlix</h1>
            <p class="subtitle">Admin Panel</p>
            <form id="loginForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" placeholder="Enter your username" required autocomplete="username">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" placeholder="Enter your password" required autocomplete="current-password">
                </div>
                <button type="submit" class="login-btn" id="loginBtn">Sign In</button>
                <div class="message" id="message"></div>
            </form>
            <div class="back-link">
                <a href="/">Back to Homepage</a>
            </div>
        </div>
        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const msgDiv = document.getElementById('message');
                const loginBtn = document.getElementById('loginBtn');
                
                msgDiv.className = 'message';
                msgDiv.style.display = 'none';
                loginBtn.textContent = 'Signing in...';
                loginBtn.disabled = true;
                
                try {
                    const res = await fetch('/api/admin/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        localStorage.setItem('adminToken', data.data.token);
                        localStorage.setItem('adminData', JSON.stringify(data.data.admin));
                        
                        msgDiv.className = 'message success';
                        msgDiv.textContent = 'Login successful! Redirecting...';
                        
                        setTimeout(() => {
                            window.location.href = '/admin/dashboard';
                        }, 800);
                    } else {
                        msgDiv.className = 'message error';
                        msgDiv.textContent = data.message || 'Invalid credentials';
                        loginBtn.textContent = 'Sign In';
                        loginBtn.disabled = false;
                    }
                } catch (error) {
                    msgDiv.className = 'message error';
                    msgDiv.textContent = 'Connection error. Please try again.';
                    loginBtn.textContent = 'Sign In';
                    loginBtn.disabled = false;
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Admin Dashboard Page
app.get('/admin/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MovieFlix - Admin Dashboard</title>
        <style>
            :root {
                --bg: #0a0a0a; --bg-sidebar: #111111; --bg-card: #1a1a1a; --bg-input: #0d0d0d;
                --red: #ff0000; --red-dark: #8b0000; --red-light: #ff4444;
                --text: #ffffff; --text-secondary: #b3b3b3; --text-muted: #808080;
                --border: #2a2a2a; --gradient: linear-gradient(135deg, #8b0000, #cc0000, #ff0000);
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                background: var(--bg); color: var(--text); display: flex; min-height: 100vh;
            }
            .sidebar {
                width: 250px; background: var(--bg-sidebar); border-right: 1px solid var(--border);
                padding: 25px 20px; position: fixed; height: 100vh; left: 0; top: 0;
                display: flex; flex-direction: column; z-index: 100;
            }
            .sidebar-logo {
                font-size: 1.4rem; font-weight: 800;
                background: var(--gradient); -webkit-background-clip: text;
                -webkit-text-fill-color: transparent; margin-bottom: 35px; text-align: center;
            }
            .sidebar-nav { list-style: none; flex: 1; }
            .sidebar-nav li { margin-bottom: 4px; }
            .sidebar-nav a {
                display: flex; align-items: center; gap: 12px; padding: 12px 15px;
                border-radius: 10px; color: var(--text-secondary); transition: all 0.3s;
                font-size: 0.9rem; font-weight: 500; text-decoration: none; cursor: pointer;
            }
            .sidebar-nav a:hover, .sidebar-nav a.active { background: rgba(255,0,0,0.1); color: var(--text); }
            .sidebar-nav a.active { background: var(--gradient); color: white; }
            .sidebar-nav svg { width: 20px; height: 20px; flex-shrink: 0; }
            .sidebar-footer { border-top: 1px solid var(--border); padding-top: 20px; }
            .sidebar-footer a {
                display: flex; align-items: center; gap: 12px; padding: 12px 15px;
                border-radius: 10px; color: var(--red-light); font-weight: 500; text-decoration: none;
            }
            .main-content { flex: 1; margin-left: 250px; padding: 30px; }
            .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
            .top-bar h1 { font-size: 1.8rem; font-weight: 700; }
            .top-bar-right { display: flex; align-items: center; gap: 15px; }
            .admin-badge { background: rgba(255,0,0,0.1); padding: 8px 15px; border-radius: 20px; font-size: 0.85rem; color: var(--red-light); }
            .logout-btn { padding: 8px 20px; background: transparent; border: 1px solid var(--border); color: var(--text-secondary); border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
            .logout-btn:hover { border-color: var(--red); color: var(--red-light); }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 15px; padding: 25px; transition: all 0.3s; }
            .stat-card:hover { border-color: rgba(255,0,0,0.3); transform: translateY(-3px); }
            .stat-card h3 { font-size: 2rem; font-weight: 700; margin-bottom: 5px; }
            .stat-card p { color: var(--text-muted); font-size: 0.9rem; }
            .section { background: var(--bg-card); border: 1px solid var(--border); border-radius: 15px; padding: 30px; margin-bottom: 30px; display: none; }
            .section.active { display: block; }
            .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
            .section-header h2 { font-size: 1.3rem; font-weight: 700; }
            .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.3s; display: inline-flex; align-items: center; gap: 8px; }
            .btn-red { background: var(--gradient); color: white; }
            .btn-red:hover { opacity: 0.9; }
            .btn-danger { background: rgba(255,0,0,0.2); color: var(--red-light); border: 1px solid rgba(255,0,0,0.3); }
            .table-container { overflow-x: auto; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
            th { color: var(--text-muted); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }
            .badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
            .badge-success { background: rgba(0,255,0,0.1); color: #44ff44; }
            .badge-featured { background: rgba(255,0,0,0.1); color: var(--red-light); }
            .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .form-group { display: flex; flex-direction: column; }
            .form-group.full { grid-column: 1 / -1; }
            .form-group label { margin-bottom: 8px; color: var(--text-secondary); font-weight: 500; font-size: 0.9rem; }
            .form-group input, .form-group textarea, .form-group select { padding: 12px 15px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; color: white; font-size: 0.9rem; font-family: inherit; }
            .form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--red); }
            .form-group textarea { resize: vertical; min-height: 100px; }
            .message { padding: 15px; border-radius: 8px; margin-top: 20px; display: none; }
            .message.success { background: rgba(0,255,0,0.1); color: #44ff44; display: block; }
            .message.error { background: rgba(255,0,0,0.1); color: var(--red-light); display: block; }
            .empty-state { text-align: center; padding: 40px; color: var(--text-muted); }
            @media (max-width: 768px) {
                .sidebar { display: none; }
                .main-content { margin-left: 0; }
                .form-grid { grid-template-columns: 1fr; }
                .stats-grid { grid-template-columns: repeat(2, 1fr); }
            }
        </style>
    </head>
    <body>
        <aside class="sidebar">
            <div class="sidebar-logo">MovieFlix Admin</div>
            <ul class="sidebar-nav">
                <li><a class="active" data-page="dashboard">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> Dashboard
                </a></li>
                <li><a data-page="add-movie">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Add Movie
                </a></li>
                <li><a data-page="manage-movies">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/></svg> Manage Movies
                </a></li>
                <li><a data-page="users">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Users
                </a></li>
            </ul>
            <div class="sidebar-footer">
                <a href="/">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/></svg> View Site
                </a>
            </div>
        </aside>
        <main class="main-content">
            <div class="top-bar">
                <h1 id="pageTitle">Dashboard</h1>
                <div class="top-bar-right">
                    <span class="admin-badge" id="adminBadge">Admin</span>
                    <button class="logout-btn" onclick="logout()">Logout</button>
                </div>
            </div>

            <div class="section active" id="dashboard-section">
                <div class="stats-grid" id="statsGrid"></div>
                <div class="section" style="display:block;margin-bottom:0;">
                    <div class="section-header"><h2>Recent Movies</h2></div>
                    <div class="table-container">
                        <table><thead><tr><th>Title</th><th>Views</th><th>Added</th></tr></thead>
                        <tbody id="recentMoviesTbody"></tbody></table>
                    </div>
                </div>
            </div>

            <div class="section" id="add-movie-section">
                <div class="section-header"><h2>Add New Movie</h2></div>
                <form id="addMovieForm">
                    <div class="form-grid">
                        <div class="form-group"><label>Title *</label><input type="text" id="mTitle" required></div>
                        <div class="form-group"><label>Release Year</label><input type="number" id="mYear" placeholder="2024"></div>
                        <div class="form-group"><label>Duration (min)</label><input type="number" id="mDuration" placeholder="120"></div>
                        <div class="form-group"><label>Rating (0-10)</label><input type="number" id="mRating" step="0.1" min="0" max="10" placeholder="8.5"></div>
                        <div class="form-group"><label>Thumbnail URL *</label><input type="url" id="mThumbnail" required></div>
                        <div class="form-group"><label>Video URL (YouTube) *</label><input type="url" id="mVideo" required></div>
                        <div class="form-group"><label>Genre (comma separated)</label><input type="text" id="mGenre" placeholder="action, sci-fi"></div>
                        <div class="form-group"><label>Featured</label><select id="mFeatured"><option value="false">No</option><option value="true">Yes</option></select></div>
                        <div class="form-group full"><label>Description *</label><textarea id="mDescription" required></textarea></div>
                    </div>
                    <button type="submit" class="btn btn-red" style="margin-top:20px;padding:12px 30px;">Add Movie</button>
                </form>
                <div class="message" id="addMovieMsg"></div>
            </div>

            <div class="section" id="manage-movies-section">
                <div class="section-header"><h2>All Movies</h2></div>
                <div class="table-container">
                    <table><thead><tr><th>Title</th><th>Genre</th><th>Views</th><th>Featured</th><th>Action</th></tr></thead>
                    <tbody id="allMoviesTbody"></tbody></table>
                </div>
            </div>

            <div class="section" id="users-section">
                <div class="section-header"><h2>Users</h2></div>
                <div class="table-container">
                    <table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th><th>Watched</th></tr></thead>
                    <tbody id="usersTbody"></tbody></table>
                </div>
            </div>
        </main>

        <script>
            const API = '/api/admin';
            const token = localStorage.getItem('adminToken');
            if (!token) { window.location.href = '/admin'; }

            const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
            document.getElementById('adminBadge').textContent = adminData.role || 'Admin';

            // Navigation
            document.querySelectorAll('.sidebar-nav a').forEach(link => {
                link.addEventListener('click', function() {
                    document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                    const page = this.dataset.page;
                    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                    document.getElementById(page + '-section').classList.add('active');
                    document.getElementById('pageTitle').textContent = this.textContent.trim();
                    if (page === 'dashboard') loadDashboard();
                    if (page === 'manage-movies') loadAllMovies();
                    if (page === 'users') loadUsers();
                });
            });

            async function apiFetch(endpoint, options = {}) {
                const res = await fetch(API + endpoint, {
                    ...options,
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, ...options.headers }
                });
                return res.json();
            }

            async function loadDashboard() {
                try {
                    const data = await apiFetch('/dashboard');
                    if (data.success) {
                        const s = data.data.stats;
                        document.getElementById('statsGrid').innerHTML = [
                            { label: 'Total Movies', value: s.totalMovies },
                            { label: 'Total Users', value: s.totalUsers },
                            { label: 'Active Users', value: s.activeUsers },
                            { label: 'Total Views', value: (s.totalViews || 0).toLocaleString() }
                        ].map(c => '<div class="stat-card"><h3>' + c.value + '</h3><p>' + c.label + '</p></div>').join('');
                        
                        document.getElementById('recentMoviesTbody').innerHTML = (data.data.recentMovies || []).map(m =>
                            '<tr><td>' + m.title + '</td><td>' + m.viewCount + '</td><td>' + new Date(m.createdAt).toLocaleDateString() + '</td></tr>'
                        ).join('') || '<tr><td colspan="3" class="empty-state">No movies yet</td></tr>';
                    }
                } catch(e) { console.error(e); }
            }

            document.getElementById('addMovieForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const msg = document.getElementById('addMovieMsg');
                msg.className = 'message'; msg.style.display = 'none';
                const data = await apiFetch('/movies', {
                    method: 'POST',
                    body: JSON.stringify({
                        title: document.getElementById('mTitle').value,
                        description: document.getElementById('mDescription').value,
                        thumbnailUrl: document.getElementById('mThumbnail').value,
                        videoUrl: document.getElementById('mVideo').value,
                        duration: parseInt(document.getElementById('mDuration').value) || null,
                        releaseYear: parseInt(document.getElementById('mYear').value) || null,
                        genre: document.getElementById('mGenre').value.split(',').map(g => g.trim()).filter(Boolean),
                        rating: parseFloat(document.getElementById('mRating').value) || null,
                        featured: document.getElementById('mFeatured').value
                    })
                });
                if (data.success) {
                    msg.className = 'message success'; msg.textContent = 'Movie added successfully!';
                    this.reset();
                } else {
                    msg.className = 'message error'; msg.textContent = data.message || 'Failed to add movie';
                }
            });

            async function loadAllMovies() {
                try {
                    const data = await apiFetch('/movies?limit=100');
                    document.getElementById('allMoviesTbody').innerHTML = data.success ? (data.data.movies || []).map(m =>
                        '<tr><td>' + m.title + '</td><td>' + (m.genre || []).join(', ') + '</td><td>' + m.viewCount + '</td><td>' + (m.featured ? '<span class="badge badge-featured">Yes</span>' : 'No') + '</td><td><button class="btn btn-danger" onclick="deleteMovie(\'' + m.id + '\')" style="padding:6px 15px;font-size:0.8rem;">Delete</button></td></tr>'
                    ).join('') : '<tr><td colspan="5">Error loading movies</td></tr>';
                } catch(e) { console.error(e); }
            }

            async function deleteMovie(id) {
                if (!confirm('Delete this movie?')) return;
                await apiFetch('/movies/' + id, { method: 'DELETE' });
                loadAllMovies();
                loadDashboard();
            }

            async function loadUsers() {
                try {
                    const data = await apiFetch('/users');
                    document.getElementById('usersTbody').innerHTML = data.success ? (data.data.users || []).map(u =>
                        '<tr><td>' + (u.name || 'N/A') + '</td><td>' + u.email + '</td><td><span class="badge ' + (u.isActive ? 'badge-success' : '') + '">' + (u.isActive ? 'Active' : 'Inactive') + '</span></td><td>' + new Date(u.createdAt).toLocaleDateString() + '</td><td>' + (u._count?.watchHistory || 0) + '</td></tr>'
                    ).join('') : '<tr><td colspan="5">Error loading users</td></tr>';
                } catch(e) { console.error(e); }
            }

            function logout() {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminData');
                window.location.href = '/admin';
            }

            loadDashboard();
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

// Start server (for local development only)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\nServer running on http://localhost:${PORT}`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
  });
}

module.exports = app;
