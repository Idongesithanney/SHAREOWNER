import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateArg: any) {
  if (!dateArg) return '';
  const d = dateArg.toDate ? dateArg.toDate() : new Date(dateArg);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(d);
}

export function formatProjectedDate(dateArg: any, daysToAdd: number = 180) {
  if (!dateArg) return '';
  const d = dateArg.toDate ? dateArg.toDate() : new Date(dateArg);
  if (isNaN(d.getTime())) return '';
  const r = new Date(d);
  r.setDate(r.getDate() + daysToAdd);
  return formatDate(r);
}
