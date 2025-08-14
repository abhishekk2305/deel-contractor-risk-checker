// Utility functions for formatting numbers, dates, and other display values

/**
 * Format numeric scores with consistent decimal precision
 * @param n - Number to format
 * @returns Formatted string with exactly 2 decimal places
 */
export function formatScore(n: number): string {
  return n.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

/**
 * Format percentage values
 * @param n - Number to format as percentage
 * @returns Formatted percentage string
 */
export function formatPercentage(n: number): string {
  return n.toLocaleString(undefined, { 
    style: 'percent',
    minimumFractionDigits: 1, 
    maximumFractionDigits: 1 
  });
}

/**
 * Format dates in human-friendly format
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "Aug 14, 2025")
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format relative time (e.g., "2 days ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} months ago`;
}

/**
 * Format currency amounts
 * @param amount - Amount to format
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format large numbers with abbreviations (K, M, B)
 * @param num - Number to format
 * @returns Formatted string with abbreviation
 */
export function formatLargeNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}