require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const security = require('./middleware/security');
app.use(security.securityHeaders);
app.use(security.xssPrevention);
app.use(security.hppProtection);
app.use(security.requestSizeLimiter);

const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');

app.use('/api/', security.generalLimiter);
app.use('/api/auth/', security.authLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV || 'development' });
});

app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API is working!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// ==================== ADMIN LOGIN PAGE ====================
app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>MovieFlix Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a0a;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(139,0,0,0.15) 0%,transparent 70%),#0a0a0a}
.box{background:#1a1a1a;padding:50px 40px;border-radius:20px;width:100%;max-width:420px;border:1px solid #2a2a2a;box-shadow:0 25px 60px rgba(0,0,0,0.5)}
.box h1{text-align:center;font-size:2rem;font-weight:800;background:linear-gradient(135deg,#8b0000,#cc0000,#ff0000);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:5px}
.box .st{text-align:center;color:#888;margin-bottom:35px;font-size:.9rem}
.fg{margin-bottom:20px}
.fg label{display:block;margin-bottom:8px;color:#bbb;font-weight:500;font-size:.9rem}
.fg input{width:100%;padding:14px 16px;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;color:#fff;font-size:1rem;outline:none;transition:.3s}
.fg input:focus{border-color:#f00;box-shadow:0 0 0 3px rgba(255,0,0,0.1)}
.btn{width:100%;padding:14px;background:linear-gradient(135deg,#8b0000,#cc0000,#ff0000);color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;margin-top:10px;transition:.3s}
.btn:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 10px 30px rgba(255,0,0,0.3)}
.btn:disabled{opacity:.6;cursor:not-allowed}
.msg{text-align:center;margin-top:15px;padding:10px;border-radius:8px;font-size:.9rem;display:none}
.msg.error{background:rgba(255,0,0,0.1);color:#ff4444;display:block}
.msg.success{background:rgba(0,255,0,0.1);color:#44ff44;display:block}
.back{text-align:center;margin-top:25px}
.back a{color:#666;text-decoration:none;font-size:.85rem}.back a:hover{color:#f00}
</style>
</head>
<body>
<div class="box">
<h1>MovieFlix</h1><p class="st">Admin Panel</p>
<form id="lf">
<div class="fg"><label>Username</label><input type="text" id="un" placeholder="Enter username" required></div>
<div class="fg"><label>Password</label><input type="password" id="pw" placeholder="Enter password" required></div>
<button type="submit" class="btn" id="lbtn">Sign In</button>
<div class="msg" id="msg"></div>
</form>
<div class="back"><a href="/">Back to Homepage</a></div>
</div>
<script>
document.getElementById('lf').addEventListener('submit',async e=>{
e.preventDefault();
const u=document.getElementById('un').value,p=document.getElementById('pw').value;
const m=document.getElementById('msg'),b=document.getElementById('lbtn');
m.className='msg';m.style.display='none';b.textContent='Signing in...';b.disabled=true;
try{
const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
const d=await r.json();
if(d.success){
localStorage.setItem('adminToken',d.data.token);
localStorage.setItem('adminData',JSON.stringify(d.data.admin));
m.className='msg success';m.textContent='Login successful!';
setTimeout(()=>{window.location.href='/admin/dashboard'},500);
}else{
m.className='msg error';m.textContent=d.message||'Invalid credentials';b.textContent='Sign In';b.disabled=false;
}
}catch(err){m.className='msg error';m.textContent='Connection error';b.textContent='Sign In';b.disabled=false;}
});
</script>
</body></html>`);
});

// ==================== ADMIN DASHBOARD PAGE ====================
app.get('/admin/dashboard', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>MovieFlix Admin</title>
<style>
:root{--bg:#0a0a0a;--bg2:#111;--card:#1a1a1a;--inp:#0d0d0d;--red:#f00;--rd:#8b0000;--rl:#f44;--t:#fff;--t2:#b3b3b3;--tm:#808080;--b:#2a2a2a;--g:linear-gradient(135deg,#8b0000,#cc0000,#f00)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--t);display:flex;min-height:100vh}
.sidebar{width:250px;background:var(--bg2);border-right:1px solid var(--b);padding:25px 15px;position:fixed;height:100vh;left:0;top:0;z-index:100;display:flex;flex-direction:column}
.sidebar h2{font-size:1.3rem;font-weight:800;text-align:center;margin-bottom:30px;background:var(--g);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav-item{display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:10px;color:var(--t2);cursor:pointer;transition:.3s;font-size:.95rem;font-weight:500;border:none;background:none;width:100%;text-align:left;margin-bottom:5px}
.nav-item:hover{background:rgba(255,0,0,0.1);color:var(--t)}
.nav-item.active{background:var(--g);color:#fff}
.nav-item svg{width:20px;height:20px;flex-shrink:0}
.spacer{flex:1}
.logout-item{display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:10px;color:var(--rl);cursor:pointer;transition:.3s;font-size:.95rem;font-weight:500;border:none;background:none;width:100%;text-align:left;border-top:1px solid var(--b);margin-top:15px;padding-top:20px}
.logout-item:hover{background:rgba(255,0,0,0.1)}
.main-content{flex:1;margin-left:250px;padding:30px}
.top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:30px}
.top-bar h1{font-size:1.8rem;font-weight:700}
.badge{background:rgba(255,0,0,0.1);padding:8px 15px;border-radius:20px;font-size:.85rem;color:var(--rl)}
.tab-content{display:none}
.tab-content.active{display:block}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:30px}
.stat-card{background:var(--card);border:1px solid var(--b);border-radius:15px;padding:25px}
.stat-card h3{font-size:2rem;font-weight:700;margin-bottom:5px}
.stat-card p{color:var(--tm);font-size:.9rem}
.card{background:var(--card);border:1px solid var(--b);border-radius:15px;padding:25px;margin-bottom:30px}
.card h2{font-size:1.2rem;font-weight:700;margin-bottom:20px}
table{width:100%;border-collapse:collapse}
th,td{padding:12px 15px;text-align:left;border-bottom:1px solid var(--b);font-size:.9rem}
th{color:var(--tm);font-weight:600;font-size:.8rem;text-transform:uppercase;letter-spacing:1px}
.badge-sm{padding:4px 10px;border-radius:20px;font-size:.75rem;font-weight:600}
.badge-green{background:rgba(0,255,0,0.1);color:#4f4}
.badge-red{background:rgba(255,0,0,0.1);color:var(--rl)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.fg{display:flex;flex-direction:column}
.fg.full{grid-column:1/-1}
.fg label{margin-bottom:8px;color:var(--t2);font-weight:500;font-size:.9rem}
.fg input,.fg textarea,.fg select{padding:12px 15px;background:var(--inp);border:1px solid var(--b);border-radius:8px;color:#fff;font-size:.9rem;font-family:inherit}
.fg input:focus,.fg textarea:focus{outline:none;border-color:var(--red)}
.fg textarea{resize:vertical;min-height:100px}
.btn{padding:12px 25px;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:.9rem;transition:.3s;display:inline-flex;align-items:center;gap:8px}
.btn-red{background:var(--g);color:#fff}
.btn-red:hover{opacity:.9}
.btn-sm{padding:6px 15px;font-size:.8rem;background:rgba(255,0,0,0.2);color:var(--rl);border:1px solid rgba(255,0,0,0.3);border-radius:6px;cursor:pointer;font-weight:600}
.btn-sm:hover{background:rgba(255,0,0,0.3)}
.msg{padding:15px;border-radius:8px;margin-top:20px;display:none}
.msg.success{background:rgba(0,255,0,0.1);color:#4f4;display:block}
.msg.error{background:rgba(255,0,0,0.1);color:var(--rl);display:block}
.empty{text-align:center;padding:30px;color:var(--tm)}
</style>
</head>
<body>

<div class="sidebar">
<h2>MovieFlix Admin</h2>
<button class="nav-item active" onclick="switchTab('dashboard',this)">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>Dashboard</button>
<button class="nav-item" onclick="switchTab('add',this)">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>Add Movie</button>
<button class="nav-item" onclick="switchTab('movies',this)">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/></svg>Manage Movies</button>
<button class="nav-item" onclick="switchTab('users',this)">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Users</button>
<div class="spacer"></div>
<button class="logout-item" onclick="logout()">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Logout</button>
</div>

<div class="main-content">
<div class="top-bar"><h1 id="pageTitle">Dashboard</h1><span class="badge" id="adminBadge">Admin</span></div>

<div class="tab-content active" id="tab-dashboard">
<div class="stats-grid" id="statsGrid"><div class="stat-card"><h3>--</h3><p>Loading...</p></div></div>
<div class="card"><h2>Recent Movies</h2><table><thead><tr><th>Title</th><th>Views</th><th>Date</th></tr></thead><tbody id="recentTbody"></tbody></table></div>
</div>

<div class="tab-content" id="tab-add">
<div class="card"><h2>Add New Movie</h2>
<form id="addForm"><div class="form-grid">
<div class="fg"><label>Title *</label><input type="text" id="atitle" required></div>
<div class="fg"><label>Release Year</label><input type="number" id="ayear" placeholder="2024"></div>
<div class="fg"><label>Duration (min)</label><input type="number" id="adur" placeholder="120"></div>
<div class="fg"><label>Rating (0-10)</label><input type="number" id="arat" step="0.1" min="0" max="10" placeholder="8.5"></div>
<div class="fg"><label>Thumbnail URL *</label><input type="url" id="athumb" required placeholder="https://..."></div>
<div class="fg"><label>Video URL *</label><input type="url" id="avid" required placeholder="https://youtube.com/watch?v=..."></div>
<div class="fg"><label>Genre (comma separated)</label><input type="text" id="agenre" placeholder="action, sci-fi"></div>
<div class="fg"><label>Featured</label><select id="afeat"><option value="false">No</option><option value="true">Yes</option></select></div>
<div class="fg full"><label>Description *</label><textarea id="adesc" required></textarea></div>
</div><button type="submit" class="btn btn-red" style="margin-top:20px">Add Movie</button></form>
<div class="msg" id="addMsg"></div></div>
</div>

<div class="tab-content" id="tab-movies">
<div class="card"><h2>All Movies</h2><table><thead><tr><th>Title</th><th>Genre</th><th>Views</th><th>Featured</th><th>Action</th></tr></thead><tbody id="moviesTbody"></tbody></table></div>
</div>

<div class="tab-content" id="tab-users">
<div class="card"><h2>Users</h2><table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th></tr></thead><tbody id="usersTbody"></tbody></table></div>
</div>
</div>

<script>
const API='/api/admin';
const token=localStorage.getItem('adminToken');
if(!token)window.location.href='/admin';

const ad=JSON.parse(localStorage.getItem('adminData')||'{}');
document.getElementById('adminBadge').textContent=ad.role||'Admin';

async function api(url,opt={}){
const r=await fetch(API+url,{...opt,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...opt.headers}});
return r.json();
}

function switchTab(tab,btn){
document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
document.getElementById('tab-'+tab).classList.add('active');
var titles={dashboard:'Dashboard',add:'Add Movie',movies:'Manage Movies',users:'Users'};
document.getElementById('pageTitle').textContent=titles[tab];
if(tab==='dashboard')loadDashboard();
if(tab==='movies')loadMovies();
if(tab==='users')loadUsers();
}

async function loadDashboard(){
var d=await api('/dashboard');
if(d.success){
var s=d.data.stats;
document.getElementById('statsGrid').innerHTML='<div class="stat-card"><h3>'+s.totalMovies+'</h3><p>Total Movies</p></div><div class="stat-card"><h3>'+s.totalUsers+'</h3><p>Total Users</p></div><div class="stat-card"><h3>'+s.activeUsers+'</h3><p>Active Users</p></div><div class="stat-card"><h3>'+(s.totalViews||0).toLocaleString()+'</h3><p>Total Views</p></div>';
document.getElementById('recentTbody').innerHTML=(d.data.recentMovies||[]).map(function(m){return'<tr><td>'+m.title+'</td><td>'+m.viewCount+'</td><td>'+new Date(m.createdAt).toLocaleDateString()+'</td></tr>';}).join('')||'<tr><td colspan="3" class="empty">No movies yet</td></tr>';
}
}

document.getElementById('addForm').addEventListener('submit',async function(e){
e.preventDefault();
var msg=document.getElementById('addMsg');msg.className='msg';msg.style.display='none';
var d=await api('/movies',{method:'POST',body:JSON.stringify({
title:document.getElementById('atitle').value,
description:document.getElementById('adesc').value,
thumbnailUrl:document.getElementById('athumb').value,
videoUrl:document.getElementById('avid').value,
duration:parseInt(document.getElementById('adur').value)||null,
releaseYear:parseInt(document.getElementById('ayear').value)||null,
genre:document.getElementById('agenre').value.split(',').map(function(g){return g.trim();}).filter(Boolean),
rating:parseFloat(document.getElementById('arat').value)||null,
featured:document.getElementById('afeat').value
})});
if(d.success){msg.className='msg success';msg.textContent='Movie added successfully!';this.reset();}
else{msg.className='msg error';msg.textContent=d.message||'Failed to add movie';}
});

async function loadMovies(){
var d=await api('/movies?limit=100');
if(d.success){
document.getElementById('moviesTbody').innerHTML=(d.data.movies||[]).map(function(m){return'<tr><td>'+m.title+'</td><td>'+(m.genre||[]).join(', ')+'</td><td>'+m.viewCount+'</td><td>'+(m.featured?'<span class="badge-sm badge-red">Yes</span>':'No')+'</td><td><button class="btn-sm" onclick="delMovie(\''+m.id+'\')">Delete</button></td></tr>';}).join('');
}
}

async function delMovie(id){
if(!confirm('Delete this movie?'))return;
await api('/movies/'+id,{method:'DELETE'});
loadMovies();
loadDashboard();
}

async function loadUsers(){
var d=await api('/users');
if(d.success){
document.getElementById('usersTbody').innerHTML=(d.data.users||[]).map(function(u){return'<tr><td>'+(u.name||'N/A')+'</td><td>'+u.email+'</td><td><span class="badge-sm '+(u.isActive?'badge-green':'')+'">'+(u.isActive?'Active':'Inactive')+'</span></td><td>'+new Date(u.createdAt).toLocaleDateString()+'</td></tr>';}).join('');
}
}

function logout(){localStorage.clear();window.location.href='/admin';}

loadDashboard();
</script>
</body></html>`);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT + '\nAdmin: http://localhost:' + PORT + '/admin'));
}

module.exports = app;
