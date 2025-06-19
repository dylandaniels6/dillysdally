export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyPrecise = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const getDateRange = (range: string): { start: Date; end: Date } => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  
  switch (range) {
    case 'week':
      start.setDate(end.getDate() - 6);
      break;
    case 'month':
      start.setDate(end.getDate() - 29);
      break;
    case '3months':
      start.setDate(end.getDate() - 89);
      break;
    case '6months':
      start.setDate(end.getDate() - 179);
      break;
    case 'year':
      start.setDate(end.getDate() - 364);
      break;
    case 'all':
      start.setFullYear(2020); // Or account creation date
      break;
  }
  
  return { start, end };
};

export const groupExpensesByDay = (expenses: any[]): Map<string, any[]> => {
  const grouped = new Map<string, any[]>();
  
  expenses.forEach(expense => {
    const date = new Date(expense.date).toISOString().split('T')[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(expense);
  });
  
  return grouped;
};

export const groupExpensesByCategory = (expenses: any[]): Map<string, number> => {
  const grouped = new Map<string, number>();
  
  expenses.forEach(expense => {
    const current = grouped.get(expense.category) || 0;
    grouped.set(expense.category, current + expense.amount);
  });
  
  return grouped;
};

export const parseNaturalLanguageAmount = (input: string): {
  amount: number;
  description: string;
  category?: string;
} => {
  // Extract amount from natural language
  const amountMatch = input.match(/\$?(\d+\.?\d*)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
  
  // Updated category keywords for new categories
  const categoryKeywords: Record<string, string[]> = {
    'eating out': ['restaurant', 'dinner', 'lunch', 'breakfast', 'coffee', 'cafe', 'starbucks', 'mcdonald', 'burger', 'pizza', 'sushi', 'dine', 'dining', 'eat out', 'takeout', 'delivery'],
    'groceries': ['grocery', 'groceries', 'supermarket', 'walmart', 'target', 'safeway', 'kroger', 'whole foods', 'trader joe', 'costco', 'food shopping', 'milk', 'bread', 'vegetables'],
    'transportation': ['uber', 'lyft', 'gas', 'gasoline', 'parking', 'transit', 'subway', 'bus', 'train', 'taxi', 'car payment', 'auto', 'vehicle', 'transport', 'fuel'],
    'entertainment': ['movie', 'cinema', 'concert', 'netflix', 'spotify', 'gaming', 'games', 'entertainment', 'fun', 'activity', 'show', 'theater', 'streaming'],
    'shopping': ['amazon', 'shopping', 'clothes', 'clothing', 'shoes', 'electronics', 'purchase', 'buy', 'store', 'mall', 'retail', 'online shopping'],
    'subscriptions': ['subscription', 'netflix', 'spotify', 'hulu', 'disney', 'apple music', 'youtube premium', 'amazon prime', 'monthly', 'annual', 'recurring'],
    'bills': ['rent', 'utilities', 'electricity', 'water', 'internet', 'phone', 'insurance', 'mortgage', 'bill', 'payment', 'electric', 'gas bill', 'cable']
  };
  
  let category = 'eating out'; // Default to eating out instead of 'other'
  const lowerInput = input.toLowerCase();
  
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerInput.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  // Remove amount from description
  const description = input.replace(/\$?\d+\.?\d*/, '').trim();
  
  return {
    amount,
    description: description || input,
    category
  };
};