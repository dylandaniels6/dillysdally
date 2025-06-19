import { NetWorthEntry, NetWorthSummary, NetWorthMetrics, ChartDataPoint, Asset, AssetAllocation } from '../types/networth.types';

/**
 * Calculate cash net worth (cash & cash equivalents - credit cards)
 */
export const calculateCashNetWorth = (entry: NetWorthEntry): number => {
  return entry.cashEquivalents - entry.creditCards;
};

/**
 * Calculate total asset value for an entry
 */
export const calculateTotalAssetValue = (assets: Asset[]): number => {
  return assets
    .filter(asset => asset.isActive)
    .reduce((total, asset) => total + asset.value, 0);
};

/**
 * Calculate total net worth (cash net worth + assets)
 */
export const calculateTotalNetWorth = (entry: NetWorthEntry): number => {
  const cashNetWorth = calculateCashNetWorth(entry);
  const assetValue = calculateTotalAssetValue(entry.assets);
  return cashNetWorth + assetValue;
};

/**
 * Propagate assets forward to future months
 */
export const propagateAssets = (entries: NetWorthEntry[]): NetWorthEntry[] => {
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const propagatedEntries: NetWorthEntry[] = [];
  let cumulativeAssets: Asset[] = [];

  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];
    
    // Remove assets that were deleted in this month
    const deletedAssetIds = entry.assets
      .filter(asset => !asset.isActive)
      .map(asset => asset.id);
    
    cumulativeAssets = cumulativeAssets.filter(asset => 
      !deletedAssetIds.includes(asset.id)
    );

    // Add new assets from this month
    const newAssets = entry.assets.filter(asset => 
      asset.addedDate === entry.date && asset.isActive
    );
    
    cumulativeAssets.push(...newAssets);

    // Update asset values if they were modified in this month
    entry.assets.forEach(entryAsset => {
      if (entryAsset.isActive) {
        const existingAssetIndex = cumulativeAssets.findIndex(
          asset => asset.id === entryAsset.id
        );
        if (existingAssetIndex >= 0) {
          cumulativeAssets[existingAssetIndex] = { ...entryAsset };
        }
      }
    });

    propagatedEntries.push({
      ...entry,
      assets: [...cumulativeAssets]
    });
  }

  return propagatedEntries;
};

/**
 * Calculate comprehensive net worth summary
 */
export const calculateNetWorthSummary = (entries: NetWorthEntry[]): NetWorthSummary => {
  if (entries.length === 0) {
    return {
      cashNetWorth: 0,
      totalNetWorth: 0,
      monthlyChange: 0,
      monthlyChangePercent: 0,
      yearToDateChange: 0,
      yearToDateChangePercent: 0,
      allTimeHigh: 0,
      allTimeLow: 0,
      totalAssetValue: 0,
    };
  }

  const propagatedEntries = propagateAssets(entries);
  const sortedEntries = propagatedEntries.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latest = sortedEntries[0];
  const cashNetWorth = calculateCashNetWorth(latest);
  const totalAssetValue = calculateTotalAssetValue(latest.assets);
  const totalNetWorth = cashNetWorth + totalAssetValue;

  // Monthly change calculation
  let monthlyChange = 0;
  let monthlyChangePercent = 0;
  
  if (sortedEntries.length > 1) {
    const previous = sortedEntries[1];
    const previousTotal = calculateTotalNetWorth(previous);
    monthlyChange = totalNetWorth - previousTotal;
    monthlyChangePercent = previousTotal !== 0 ? (monthlyChange / previousTotal) * 100 : 0;
  }

  // Year to date calculation
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const yearStartEntry = sortedEntries.find(entry => 
    new Date(entry.date) <= startOfYear
  );

  let yearToDateChange = 0;
  let yearToDateChangePercent = 0;

  if (yearStartEntry) {
    const yearStartTotal = calculateTotalNetWorth(yearStartEntry);
    yearToDateChange = totalNetWorth - yearStartTotal;
    yearToDateChangePercent = yearStartTotal !== 0 ? (yearToDateChange / yearStartTotal) * 100 : 0;
  }

  // All time high and low
  const allValues = propagatedEntries.map(entry => calculateTotalNetWorth(entry));
  const allTimeHigh = Math.max(...allValues);
  const allTimeLow = Math.min(...allValues);

  return {
    cashNetWorth,
    totalNetWorth,
    monthlyChange,
    monthlyChangePercent,
    yearToDateChange,
    yearToDateChangePercent,
    allTimeHigh,
    allTimeLow,
    totalAssetValue,
  };
};

/**
 * Calculate asset allocation breakdown
 */
export const calculateAssetAllocation = (assets: Asset[]): AssetAllocation[] => {
  const totalValue = calculateTotalAssetValue(assets);
  
  if (totalValue === 0) return [];

  const categoryTotals = assets
    .filter(asset => asset.isActive)
    .reduce((acc, asset) => {
      acc[asset.category] = (acc[asset.category] || 0) + asset.value;
      return acc;
    }, {} as Record<Asset['category'], number>);

  const colors = {
    real_estate: '#8B5CF6',  // Purple
    investments: '#06B6D4',  // Cyan
    vehicles: '#10B981',     // Green
    valuables: '#F59E0B',    // Amber
    other: '#6B7280',        // Gray
  };

  return Object.entries(categoryTotals).map(([category, value]) => ({
    category: category as Asset['category'],
    value,
    percentage: (value / totalValue) * 100,
    color: colors[category as Asset['category']],
  }));
};

/**
 * Prepare chart data from entries
 */
export const prepareChartData = (entries: NetWorthEntry[], timeRange: string = 'ALL'): ChartDataPoint[] => {
  if (entries.length === 0) return [];

  const propagatedEntries = propagateAssets(entries);
  const sortedEntries = propagatedEntries.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Filter by time range
  let filteredEntries = sortedEntries;
  const now = new Date();
  
  switch (timeRange) {
    case '3M':
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      filteredEntries = sortedEntries.filter(entry => new Date(entry.date) >= threeMonthsAgo);
      break;
    case '6M':
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      filteredEntries = sortedEntries.filter(entry => new Date(entry.date) >= sixMonthsAgo);
      break;
    case '1Y':
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      filteredEntries = sortedEntries.filter(entry => new Date(entry.date) >= oneYearAgo);
      break;
    case '2Y':
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      filteredEntries = sortedEntries.filter(entry => new Date(entry.date) >= twoYearsAgo);
      break;
    default: // 'ALL'
      filteredEntries = sortedEntries;
  }

  return filteredEntries.map(entry => {
    const date = new Date(entry.date);
    const cashNetWorth = calculateCashNetWorth(entry);
    const totalAssets = calculateTotalAssetValue(entry.assets);
    const totalNetWorth = cashNetWorth + totalAssets;

    return {
      date: entry.date,
      cashNetWorth,
      totalNetWorth,
      cashEquivalents: entry.cashEquivalents,
      creditCards: entry.creditCards,
      totalAssets,
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      year: date.getFullYear(),
      formattedDate: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
    };
  });
};

/**
 * Calculate advanced metrics for analytics
 */
export const calculateNetWorthMetrics = (entries: NetWorthEntry[]): NetWorthMetrics => {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      averageMonthlyGrowth: 0,
      averageCashGrowth: 0,
      averageAssetGrowth: 0,
      longestGrowthStreak: 0,
      currentStreak: 0,
      volatilityScore: 0,
      projectedNextMonth: 0,
      assetAllocation: [],
    };
  }

  const propagatedEntries = propagateAssets(entries);
  const sortedEntries = propagatedEntries.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate monthly changes
  const totalChanges: number[] = [];
  const cashChanges: number[] = [];
  const assetChanges: number[] = [];

  for (let i = 1; i < sortedEntries.length; i++) {
    const current = sortedEntries[i];
    const previous = sortedEntries[i - 1];

    const currentTotal = calculateTotalNetWorth(current);
    const previousTotal = calculateTotalNetWorth(previous);
    const currentCash = calculateCashNetWorth(current);
    const previousCash = calculateCashNetWorth(previous);
    const currentAssets = calculateTotalAssetValue(current.assets);
    const previousAssets = calculateTotalAssetValue(previous.assets);

    if (previousTotal !== 0) {
      totalChanges.push(((currentTotal - previousTotal) / previousTotal) * 100);
    }
    if (previousCash !== 0) {
      cashChanges.push(((currentCash - previousCash) / previousCash) * 100);
    }
    if (previousAssets !== 0) {
      assetChanges.push(((currentAssets - previousAssets) / previousAssets) * 100);
    }
  }

  // Calculate averages
  const averageMonthlyGrowth = totalChanges.length > 0 
    ? totalChanges.reduce((sum, change) => sum + change, 0) / totalChanges.length
    : 0;

  const averageCashGrowth = cashChanges.length > 0
    ? cashChanges.reduce((sum, change) => sum + change, 0) / cashChanges.length
    : 0;

  const averageAssetGrowth = assetChanges.length > 0
    ? assetChanges.reduce((sum, change) => sum + change, 0) / assetChanges.length
    : 0;

  // Calculate growth streaks
  let longestGrowthStreak = 0;
  let currentStreak = 0;
  let currentStreakLength = 0;

  for (let i = 0; i < totalChanges.length; i++) {
    if (totalChanges[i] > 0) {
      currentStreakLength++;
      longestGrowthStreak = Math.max(longestGrowthStreak, currentStreakLength);
    } else {
      currentStreakLength = 0;
    }
  }

  // Current streak (from the end)
  for (let i = totalChanges.length - 1; i >= 0; i--) {
    if (totalChanges[i] > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Volatility score
  const meanChange = averageMonthlyGrowth;
  const variance = totalChanges.length > 0
    ? totalChanges.reduce((sum, change) => sum + Math.pow(change - meanChange, 2), 0) / totalChanges.length
    : 0;
  const volatilityScore = Math.sqrt(variance);

  // Simple projection
  const latestEntry = sortedEntries[sortedEntries.length - 1];
  const projectedNextMonth = calculateTotalNetWorth(latestEntry) * (1 + (averageMonthlyGrowth / 100));

  // Asset allocation
  const assetAllocation = calculateAssetAllocation(latestEntry.assets);

  return {
    totalEntries: entries.length,
    averageMonthlyGrowth,
    averageCashGrowth,
    averageAssetGrowth,
    longestGrowthStreak,
    currentStreak,
    volatilityScore,
    projectedNextMonth,
    assetAllocation,
  };
};

/**
 * Format currency with appropriate precision
 */
export const formatCurrency = (amount: number, compact: boolean = false): string => {
  const absAmount = Math.abs(amount);
  
  if (compact) {
    if (absAmount >= 1_000_000) {
      return `${amount < 0 ? '-' : ''}$${(absAmount / 1_000_000).toFixed(1)}M`;
    } else if (absAmount >= 1_000) {
      return `${amount < 0 ? '-' : ''}$${(absAmount / 1_000).toFixed(1)}K`;
    }
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format percentage with appropriate precision
 */
export const formatPercentage = (percent: number, precision: number = 1): string => {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(precision)}%`;
};

/**
 * Determine the trend direction from recent data
 */
export const calculateTrend = (data: ChartDataPoint[]): 'up' | 'down' | 'neutral' => {
  if (data.length < 2) return 'neutral';
  
  const recent = data.slice(-3);
  if (recent.length < 2) return 'neutral';
  
  const firstValue = recent[0].totalNetWorth;
  const lastValue = recent[recent.length - 1].totalNetWorth;
  
  const changePercent = ((lastValue - firstValue) / firstValue) * 100;
  
  if (changePercent > 2) return 'up';
  if (changePercent < -2) return 'down';
  return 'neutral';
};