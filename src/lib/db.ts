import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'local-db.json');

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  balance: number; // Withdrawable wallet
  totalEarnings: number;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface ShareInvestment {
  id: string;
  userId: string;
  sharesAmount: number;     // e.g. 2000 shares
  investmentValue: number;  // @ ₦5 = ₦10,000
  dailyIncome: number;      // 4% daily
  maturityValue: number;    // grows to ₦50 in 180 days (or flat rate)
  daysRemaining: number;
  createdAt: string;
  status: 'ACTIVE' | 'MATURED';
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'SHARE_PURCHASE' | 'DAILY_RETURN' | 'REFERRAL_BONUS' | 'TAX_DEDUCTION';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  memo: string;
}

export interface SystemStats {
  companyReserve: number;
  totalTaxCollected: number;
}

interface Database {
  users: User[];
  shares: ShareInvestment[];
  transactions: Transaction[];
  stats: SystemStats;
}

const defaultDb: Database = {
  users: [],
  shares: [],
  transactions: [],
  stats: {
    companyReserve: 0,
    totalTaxCollected: 0,
  }
};

export function getDb(): Database {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
    return defaultDb;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return defaultDb;
  }
}

export function saveDb(db: Database) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Ensure dummy admin exists
const initialDb = getDb();
if (!initialDb.users.find(u => u.email === 'admin@shareowner.com')) {
  initialDb.users.push({
    id: `u_${Date.now()}_admin`,
    name: 'Super Admin',
    email: 'admin@shareowner.com',
    passwordHash: 'admin123', // In a real app this is bcrypt hash
    role: 'ADMIN',
    balance: 0,
    totalEarnings: 0,
    referralCode: 'ADMINREF',
    createdAt: new Date().toISOString(),
    status: 'ACTIVE'
  });
  saveDb(initialDb);
}
