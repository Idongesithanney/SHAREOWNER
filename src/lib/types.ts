export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  balance: number;
  totalEarnings: number;
  referralCode: string;
  referredBy?: string;
  createdAt: any;
  status: 'ACTIVE' | 'SUSPENDED';
  twoFactorEnabled?: boolean;
  twoFactorType?: 'TOTP' | 'SMS';
  twoFactorSecret?: string;
  twoFactorPhone?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  bankLinked?: boolean;
}

export interface ShareInvestment {
  id: string;
  userId: string;
  sharesAmount: number;
  investmentValue: number;
  dailyIncome: number;
  maturityValue: number;
  daysRemaining: number;
  createdAt: any;
  status: 'ACTIVE' | 'MATURED';
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'SHARE_PURCHASE' | 'DAILY_RETURN' | 'REFERRAL_BONUS' | 'TAX_DEDUCTION';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: any;
  memo: string;
}

export interface SystemStats {
  companyReserve: number;
  totalTaxCollected: number;
}
