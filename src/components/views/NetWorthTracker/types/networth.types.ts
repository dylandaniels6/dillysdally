export interface NetWorthEntry {
  id: string;
  date: string;
  cashEquivalents: number;    // Cash & cash equivalents
  creditCards: number;        // Credit card balances (can be negative = credit)
  assets: Asset[];           // Array of assets for this month
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  category: 'real_estate' | 'investments' | 'vehicles' | 'valuables' | 'other';
  addedDate: string;         // When this asset was first added
  isActive: boolean;         // Whether it's still counted in net worth
}

export interface NetWorthSummary {
  cashNetWorth: number;           // cashEquivalents - creditCards
  totalNetWorth: number;          // cashNetWorth + total asset value
  monthlyChange: number;          // Change from last month
  monthlyChangePercent: number;   // Percentage change from last month
  yearToDateChange: number;
  yearToDateChangePercent: number;
  allTimeHigh: number;
  allTimeLow: number;
  totalAssetValue: number;        // Sum of all active assets
}

export interface ChartDataPoint {
  date: string;
  cashNetWorth: number;
  totalNetWorth: number;
  cashEquivalents: number;
  creditCards: number;
  totalAssets: number;
  month: string;
  year: number;
  formattedDate: string;
}

export interface QuickAddFormData {
  cashEquivalents: string;
  creditCards: string;
  notes: string;
  date?: string;
}

export interface AssetFormData {
  name: string;
  value: string;
  category: Asset['category'];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AnimationState {
  isVisible: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  hasError: boolean;
  springValues: {
    cashNetWorth: number;
    totalNetWorth: number;
    monthlyChange: number;
  };
}

export interface ChartConfig {
  type: 'line' | 'area' | 'combined';
  timeRange: '3M' | '6M' | '1Y' | '2Y' | 'ALL';
  showCashOnly: boolean;
  showAssets: boolean;
  showGrid: boolean;
  smoothing: boolean;
}

export interface NetWorthMetrics {
  totalEntries: number;
  averageMonthlyGrowth: number;
  averageCashGrowth: number;
  averageAssetGrowth: number;
  longestGrowthStreak: number;
  currentStreak: number;
  volatilityScore: number;
  projectedNextMonth: number;
  assetAllocation: AssetAllocation[];
}

export interface AssetAllocation {
  category: Asset['category'];
  value: number;
  percentage: number;
  color: string;
}

export type ViewMode = 'overview' | 'detailed' | 'assets' | 'analytics';
export type SortDirection = 'asc' | 'desc';
export type SortField = 'date' | 'cashNetWorth' | 'totalNetWorth' | 'change';

export interface ThemeColors {
  primary: string[];          // Purple gradient
  success: string[];          // Green gradient for positive values
  warning: string[];          // Orange gradient for neutral
  danger: string[];           // Red gradient for negative values
  background: string;         // Card background
  surface: string;           // Elevated surface
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  border: string;
  shadow: string;
}