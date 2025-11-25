const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

const PORT = process.env.PORT || 3000;

// Data persistence (simple file-backed store for demo)
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
function ensureDataDir(){
  const dir = path.dirname(DATA_FILE);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const defaultUsers = {
  demo: {
    password: '1234',
    email: 'demo@simplebank.com',
    accountNumber: '1234567890',
    balance: 50000.00,
    joined: '2024-01-15T10:30:00Z',
    avatar: null,
    transactions: [
      { id: 1, date: Date.now() - 1000*60*60*24*2, description: 'Deposit', amount: 30000.00 },
      { id: 2, date: Date.now() - 1000*60*60*24, description: 'Coffee Shop', amount: -2500.00 },
      { id: 3, date: Date.now() - 1000*60*60*3, description: 'Electric Bill', amount: -5000.00 }
    ]
  }
};

function loadUsers(){
  try{
    if(fs.existsSync(DATA_FILE)){
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  }catch(e){
    console.warn('Failed to load users:', e && e.message);
  }
  return defaultUsers;
}

function saveUsers(users){
  try{
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
  }catch(e){
    console.warn('Failed to save users:', e && e.message);
  }
}

// In-memory users (loaded from disk)
const users = loadUsers();

// Simple session store: token -> username
const sessions = {};

function createToken(username){
  const token = Buffer.from(username + ':' + Date.now()).toString('base64');
  sessions[token] = username;
  return token;
}

function generateAccountNumber(){
  return Math.floor(Math.random() * 9000000000) + 1000000000;
}

function authMiddleware(req, res, next){
  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  const username = sessions[token];
  if(!username || !users[username]) return res.status(401).json({ error: 'Invalid token' });
  req.username = username;
  req.user = users[username];
  next();
}

app.post('/login', (req, res) => {
  const { credential, password } = req.body || {};
  if(!credential || !password) return res.status(400).json({ error: 'credential and password required' });
  
  // Find user by username, email, or account number
  let foundUser = null;
  let foundUsername = null;
  
  for(const [username, user] of Object.entries(users)){
    if(username === credential || user.email === credential || user.accountNumber === credential){
      foundUser = user;
      foundUsername = username;
      break;
    }
  }
  
  if(!foundUser || foundUser.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
  const token = createToken(foundUsername);
  res.json({ token, user: { username: foundUsername } });
});

app.post('/register', (req, res) => {
  const { username, email, password } = req.body || {};
  if(!username || !email || !password) return res.status(400).json({ error: 'username, email and password required' });
  if(users[username]) return res.status(409).json({ error: 'Username already exists' });
  
  // Check if email already exists
  for(const user of Object.values(users)){
    if(user.email === email) return res.status(409).json({ error: 'Email already exists' });
  }
  
  if(username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if(password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

  const accountNumber = generateAccountNumber().toString();
  users[username] = {
    password,
    email,
    accountNumber,
    balance: 10000.00,
    joined: new Date().toISOString(),
    avatar: null,
    transactions: [{ id: Date.now(), date: Date.now(), description: 'Welcome bonus', amount: 10000.00 }]
  };

  // persist
  saveUsers(users);

  const token = createToken(username);
  res.json({ token, user: { username, accountNumber } });
});

app.get('/balance', authMiddleware, (req, res) => {
  res.json({ balance: req.user.balance });
});

app.get('/transactions', authMiddleware, (req, res) => {
  res.json({ transactions: req.user.transactions });
});

app.post('/transfer', authMiddleware, (req, res) => {
  const { to, amount } = req.body || {};
  const value = Number(amount);
  if(!to || !amount || Number.isNaN(value) || value <= 0) return res.status(400).json({ error: 'Invalid transfer' });
  if(value > req.user.balance) return res.status(400).json({ error: 'Insufficient funds' });

  const tx = { id: Date.now(), date: Date.now(), description: `Transfer to ${to}`, amount: -Math.abs(value) };
  req.user.transactions.push(tx);
  req.user.balance = +(req.user.balance - value).toFixed(2);
  saveUsers(users);
  res.json({ balance: req.user.balance, transaction: tx });
});

app.get('/me', authMiddleware, (req, res) => {
  res.json({ user: { username: req.username } });
});

app.get('/profile', authMiddleware, (req, res) => {
  const profile = { username: req.username, email: req.user.email, accountNumber: req.user.accountNumber, avatar: req.user.avatar || null, joined: req.user.joined || new Date().toISOString() };
  res.json(profile);
});

app.post('/profile/avatar', authMiddleware, (req, res) => {
  const { avatar } = req.body;
  if(!avatar) return res.status(400).json({ error: 'No avatar data provided' });
  req.user.avatar = avatar;
  saveUsers(users);
  res.json({ avatar: req.user.avatar });
});

// Cable/data/airtime purchase endpoints
const cablePlans = {
  dstv: [
    { key: 'padi', label: 'Padi', amount: 4400 },
    { key: 'yanga', label: 'Yanga', amount: 6000 },
    { key: 'confam', label: 'Confam', amount: 11000 },
    { key: 'compact', label: 'Compact', amount: 19000 },
    { key: 'compactplus', label: 'Compact Plus', amount: 30000 },
    { key: 'streampremium', label: 'Stream Premium', amount: 44000 },
    { key: 'premium', label: 'Premium', amount: 44500 }
  ],
  gotv: [
    { key: 'jinja', label: 'Jinja', amount: 3900 },
    { key: 'jolli', label: 'Jolli', amount: 5800 },
    { key: 'max', label: 'Max', amount: 8500 },
    { key: 'supa', label: 'Supa', amount: 11400 },
    { key: 'supaplus', label: 'Supa Plus', amount: 16800 }
  ],
  startimes: [
    { key: 'classic', label: 'Classic', amount: 6000 },
    { key: 'super', label: 'Super', amount: 9800 },
    { key: 'basic', label: 'Basic', amount: 4000 },
    { key: 'nova', label: 'Nova', amount: 2100 }
  ]
};

app.post('/purchase/airtime', authMiddleware, (req, res) => {
  const { network, phone, amount } = req.body || {};
  const value = Number(amount);
  if(!network || !phone || Number.isNaN(value) || value <= 0) return res.status(400).json({ error: 'Invalid airtime purchase' });
  if(value > req.user.balance) return res.status(400).json({ error: 'Insufficient funds' });
  const tx = { id: Date.now(), date: Date.now(), description: `Airtime ${network.toUpperCase()} to ${phone}`, amount: -Math.abs(value) };
  req.user.transactions.push(tx);
  req.user.balance = +(req.user.balance - value).toFixed(2);
  saveUsers(users);
  res.json({ balance: req.user.balance, transaction: tx });
});

app.post('/purchase/data', authMiddleware, (req, res) => {
  const { network, phone, plan, amount } = req.body || {};
  const value = Number(amount);
  if(!network || !phone || !plan || Number.isNaN(value) || value <= 0) return res.status(400).json({ error: 'Invalid data purchase' });
  if(value > req.user.balance) return res.status(400).json({ error: 'Insufficient funds' });
  const tx = { id: Date.now(), date: Date.now(), description: `Data ${network.toUpperCase()} ${plan} to ${phone}`, amount: -Math.abs(value) };
  req.user.transactions.push(tx);
  req.user.balance = +(req.user.balance - value).toFixed(2);
  saveUsers(users);
  res.json({ balance: req.user.balance, transaction: tx });
});

app.post('/purchase/cable', authMiddleware, (req, res) => {
  const { provider, planKey } = req.body || {};
  const smartCard = req.body.smartCard || req.body.smartcard || '';
  if(!provider || !planKey || !smartCard) return res.status(400).json({ error: 'Invalid cable purchase' });
  const plans = cablePlans[provider] || [];
  const plan = plans.find(p => p.key === planKey);
  if(!plan) return res.status(400).json({ error: 'Unknown plan' });
  const value = Number(plan.amount || 0);
  if(value > req.user.balance) return res.status(400).json({ error: 'Insufficient funds' });
  const tx = { id: Date.now(), date: Date.now(), description: `${provider.toUpperCase()} - ${plan.label} subscription (${smartCard})`, amount: -Math.abs(value) };
  req.user.transactions.push(tx);
  req.user.balance = +(req.user.balance - value).toFixed(2);
  saveUsers(users);
  res.json({ balance: req.user.balance, transaction: tx });
});

app.listen(PORT, () => console.log(`SimpleBank demo API running on http://localhost:${PORT}`));
