/**
 * Formatting utilities for currency, dates, and other display values
 */

/**
 * Formats a number as US currency with no decimal places
 * @param amount - The numeric amount to format
 * @returns Formatted currency string (e.g., "$2,700")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a date string as a localized date
 * Uses UTC timezone to prevent off-by-one day errors with date-only strings
 * @param dateString - ISO date string (e.g., "2018-07-30")
 * @returns Formatted date string (e.g., "Jul 30, 2018") or "Invalid date" if parsing fails
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return 'Invalid date';
  }
}
