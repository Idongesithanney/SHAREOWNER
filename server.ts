import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import { getDb, saveDb, User, ShareInvestment, Transaction } from './src/lib/db.js';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

app.use(cors());
app.use(express.json());

// --- Auth Middleware ---
function authRequired(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// --- API ROUTES ---

// 1. Auth & Registration
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, referralCode } = req.body;
  const db = getDb();
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  // Registration plan: Users pay ₦50,000 on registration
  // For the sake of the platform, the registration is simulated as free in standard signup, 
  // but if the logic demands ₦50k up front, users must fund their wallet and "activate".
  // We'll just create the account.
  
  const newUser: User = {
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    email,
    passwordHash: password, // Simulated hash
    role: 'USER',
    balance: 0,
    totalEarnings: 0,
    referralCode: `REF_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    referredBy: referralCode,
    createdAt: new Date().toISOString(),
    status: 'ACTIVE'
  };
  
  db.users.push(newUser);
  saveDb(db);
  
  const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDb();
  const user = db.users.find(u => u.email === email && u.passwordHash === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

// 2. User Data
app.get('/api/user/me', authRequired, (req: any, res) => {
  const db = getDb();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const shares = db.shares.filter(s => s.userId === user.id);
  const transactions = db.transactions.filter(t => t.userId === user.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const referrals = db.users.filter(u => u.referredBy === user.referralCode);
  
  res.json({ user, shares, transactions, referrals });
});

// 3. Transactions / Wallet
app.post('/api/wallet/deposit', authRequired, (req: any, res) => {
  const { amount } = req.body; // e.g. 100000
  const db = getDb();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  user.balance += amount;
  
  const txn: Transaction = {
    id: `txn_${Date.now()}`,
    userId: user.id,
    type: 'DEPOSIT',
    amount,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    memo: 'Wallet Funded (Automated gateway simulation)'
  };
  
  db.transactions.push(txn);
  saveDb(db);
  res.json({ balance: user.balance, txn });
});

app.post('/api/wallet/withdraw', authRequired, (req: any, res) => {
  const { amount } = req.body;
  const db = getDb();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  if (user.balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }
  
  user.balance -= amount;
  
  const txn: Transaction = {
    id: `txn_${Date.now()}`,
    userId: user.id,
    type: 'WITHDRAWAL',
    amount,
    status: 'PENDING', // Wait for admin approval
    createdAt: new Date().toISOString(),
    memo: 'Bank Withdrawal Request'
  };
  
  db.transactions.push(txn);
  saveDb(db);
  res.json({ balance: user.balance, txn });
});

// 4. Buy Shares
const SHARE_PRICE = 5;
app.post('/api/shares/buy', authRequired, (req: any, res) => {
  const { sharesAmount } = req.body;
  if (sharesAmount < 2000 || sharesAmount > 10000000) {
    return res.status(400).json({ error: 'Share amount must be between 2,000 and 10,000,000' });
  }
  
  const investmentValue = sharesAmount * SHARE_PRICE;
  const db = getDb();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  if (user.balance < investmentValue) {
    return res.status(400).json({ error: 'Insufficient wallet balance to buy shares' });
  }
  
  user.balance -= investmentValue;
  db.stats.companyReserve += investmentValue;

  const dailyIncome = investmentValue * 0.04; // 4% daily
  
  const share: ShareInvestment = {
    id: `sh_${Date.now()}`,
    userId: user.id,
    sharesAmount,
    investmentValue,
    dailyIncome,
    maturityValue: sharesAmount * 50, // Grows to 50 in 180 days
    daysRemaining: 180,
    createdAt: new Date().toISOString(),
    status: 'ACTIVE'
  };
  
  db.shares.push(share);
  
  db.transactions.push({
    id: `txn_${Date.now()}_buy`,
    userId: user.id,
    type: 'SHARE_PURCHASE',
    amount: investmentValue,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    memo: `Purchased ${sharesAmount.toLocaleString()} Shares`
  });
  
  // Referral Bonus - 12% of investment
  if (user.referredBy) {
    const referrer = db.users.find(u => u.referralCode === user.referredBy);
    if (referrer) {
      const grossBonus = investmentValue * 0.12;
      const tax = grossBonus * 0.04;
      const netBonus = grossBonus - tax;
      
      referrer.balance += netBonus;
      referrer.totalEarnings += netBonus;
      db.stats.totalTaxCollected += tax;
      db.stats.companyReserve -= netBonus;
      
      db.transactions.push({
        id: `txn_${Date.now()}_ref`,
        userId: referrer.id,
        type: 'REFERRAL_BONUS',
        amount: netBonus,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        memo: `Referral Bonus for ${user.name} (-4% tax deducted)`
      });
    }
  }
  
  saveDb(db);
  res.json({ share, balance: user.balance });
});

// 5. Admin Routes
app.get('/api/admin/stats', authRequired, (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  
  const db = getDb();
  res.json({
    users: db.users,
    transactions: db.transactions,
    shares: db.shares,
    stats: db.stats
  });
});

app.post('/api/admin/cron/simulate-day', authRequired, (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  
  const db = getDb();
  let totalDistributed = 0;
  let totalTax = 0;
  
  db.shares.filter(s => s.status === 'ACTIVE').forEach(share => {
    const user = db.users.find(u => u.id === share.userId);
    if (user && share.daysRemaining > 0) {
      const grossReturn = share.dailyIncome;
      const tax = grossReturn * 0.04;
      const netReturn = grossReturn - tax;
      
      user.balance += netReturn;
      user.totalEarnings += netReturn;
      share.daysRemaining -= 1;
      
      db.stats.totalTaxCollected += tax;
      db.stats.companyReserve -= netReturn;
      
      totalDistributed += netReturn;
      totalTax += tax;
      
      db.transactions.push({
        id: `txn_${Date.now()}_${Math.random()}`,
        userId: user.id,
        type: 'DAILY_RETURN',
        amount: netReturn,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        memo: `Daily Return from ${share.sharesAmount} shares`
      });
      
      if (share.daysRemaining === 0) {
        share.status = 'MATURED';
      }
    }
  });

  saveDb(db);
  res.json({ success: true, message: `Simulated day: distributed ₦${totalDistributed}, collected ₦${totalTax} in tax.` });
});


// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
