import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// British number formatting utilities
export function formatNumberWithCommas(value: string | number): string {
  if (!value && value !== 0) return '';
  
  const numStr = value.toString();
  const [integerPart, decimalPart] = numStr.split('.');
  
  // Add commas as thousand separators (British format)
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

export function parseFormattedNumber(value: string): string {
  if (!value) return '';
  // Remove commas to get clean numeric value
  return value.replace(/,/g, '');
}

export function isValidNumberInput(value: string): boolean {
  if (!value) return true;
  // Allow digits, one decimal point, and commas
  const cleanValue = parseFormattedNumber(value);
  return /^\d*\.?\d*$/.test(cleanValue);
}
