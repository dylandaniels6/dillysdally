export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

export const formatShortDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
};

// FIXED: Properly handle timezone issues to get correct local date
export const formatISODate = (date: Date): string => {
  // Simple approach: get the year, month, day in local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getPreviousDays = (days: number): Date[] => {
  const result: Date[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    result.push(date);
  }
  
  return result;
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// FIXED: Parse a date string and use our timezone-safe formatISODate
export const parseDateString = (
  dateString: string,
  defaultYear: number = 2025
): string | null => {
  try {
    const withYear = `${dateString}, ${defaultYear}`;
    const parsed = new Date(withYear);
    if (!isNaN(parsed.getTime())) {
      return formatISODate(parsed); // Use our fixed formatISODate function
    }
  } catch {
    return null;
  }
  return null;
};