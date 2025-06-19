import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../../../../context/AppContext';
import { 
  NetWorthEntry, 
  NetWorthSummary, 
  NetWorthMetrics, 
  ChartDataPoint,
  QuickAddFormData,
  AssetFormData,
  ValidationError,
  ChartConfig,
  ViewMode,
  SortDirection,
  SortField,
  Asset
} from '../types/networth.types';
import { 
  calculateNetWorthSummary, 
  calculateNetWorthMetrics, 
  prepareChartData,
  calculateTrend,
  propagateAssets,
  calculateTotalAssetValue
} from '../utils/netWorthCalculations';

export const useNetWorthData = () => {
  const { 
    netWorthEntries, 
    setNetWorthEntries, 
    settings,
    user,
    isAuthenticated 
  } = useAppContext();

  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Chart configuration
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'area',
    timeRange: '1Y',
    showCashOnly: false,
    showAssets: true,
    showGrid: true,
    smoothing: true,
  });

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  // Convert legacy entries to new format if needed
  const convertedEntries = useMemo(() => {
    return netWorthEntries.map(entry => {
      // If entry is in old format, convert it
      if ('liabilities' in entry && !('creditCards' in entry)) {
        const oldEntry = entry as any;
        return {
          id: oldEntry.id,
          date: oldEntry.date,
          cashEquivalents: oldEntry.cashAccounts || 0,
          creditCards: oldEntry.liabilities || 0,
          assets: oldEntry.assets ? [{
            id: `asset-${oldEntry.id}`,
            name: 'Assets',
            value: oldEntry.assets,
            category: 'other' as const,
            addedDate: oldEntry.date,
            isActive: true,
          }] : [],
          notes: oldEntry.notes,
          createdAt: oldEntry.createdAt,
          updatedAt: oldEntry.updatedAt,
        } as NetWorthEntry;
      }
      return entry as NetWorthEntry;
    });
  }, [netWorthEntries]);

  // Memoized calculations with asset propagation
  const entriesWithAssets = useMemo(() => 
    propagateAssets(convertedEntries), 
    [convertedEntries]
  );

  const summary = useMemo(() => 
    calculateNetWorthSummary(entriesWithAssets), 
    [entriesWithAssets]
  );

  const metrics = useMemo(() => 
    calculateNetWorthMetrics(entriesWithAssets), 
    [entriesWithAssets]
  );

  const chartData = useMemo(() => 
    prepareChartData(entriesWithAssets, chartConfig.timeRange), 
    [entriesWithAssets, chartConfig.timeRange]
  );

  const trend = useMemo(() => 
    calculateTrend(chartData), 
    [chartData]
  );

  // Get active assets from latest entry
  const activeAssets = useMemo(() => {
    if (entriesWithAssets.length === 0) return [];
    const latest = entriesWithAssets.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    return latest.assets.filter(asset => asset.isActive);
  }, [entriesWithAssets]);

  // Form validation
  const validateQuickAddForm = useCallback((data: QuickAddFormData): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Cash equivalents validation
    const cashEquivalents = parseFloat(data.cashEquivalents);
    if (isNaN(cashEquivalents) || cashEquivalents < 0) {
      errors.push({
        field: 'cashEquivalents',
        message: 'Cash & cash equivalents must be a valid positive number'
      });
    }

    // Credit cards validation (can be negative)
    const creditCards = parseFloat(data.creditCards);
    if (isNaN(creditCards)) {
      errors.push({
        field: 'creditCards',
        message: 'Credit card balance must be a valid number'
      });
    }

    // Date validation (if provided)
    if (data.date) {
      const date = new Date(data.date);
      const now = new Date();
      if (isNaN(date.getTime()) || date > now) {
        errors.push({
          field: 'date',
          message: 'Date must be valid and not in the future'
        });
      }
    }

    // Notes validation
    if (data.notes && data.notes.length > 500) {
      errors.push({
        field: 'notes',
        message: 'Notes must be less than 500 characters'
      });
    }

    return errors;
  }, []);

  const validateAssetForm = useCallback((data: AssetFormData): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Name validation
    if (!data.name.trim()) {
      errors.push({
        field: 'name',
        message: 'Asset name is required'
      });
    } else if (data.name.length > 100) {
      errors.push({
        field: 'name',
        message: 'Asset name must be less than 100 characters'
      });
    }

    // Value validation
    const value = parseFloat(data.value);
    if (isNaN(value) || value < 0) {
      errors.push({
        field: 'value',
        message: 'Asset value must be a valid positive number'
      });
    }

    return errors;
  }, []);

  // Quick add entry (cash + credit cards only)
  const quickAddEntry = useCallback(async (data: QuickAddFormData): Promise<boolean> => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    try {
      const validationErrors = validateQuickAddForm(data);
      if (validationErrors.length > 0) {
        setHasError(true);
        setErrorMessage(validationErrors[0].message);
        return false;
      }

      const entryDate = data.date || new Date().toISOString().split('T')[0];
      
      // Get existing assets to carry forward
      const existingAssets = activeAssets.map(asset => ({ ...asset }));

      const newEntry: NetWorthEntry = {
        id: Date.now().toString(),
        date: entryDate,
        cashEquivalents: parseFloat(data.cashEquivalents),
        creditCards: parseFloat(data.creditCards),
        assets: existingAssets,
        notes: data.notes || undefined,
        createdAt: new Date().toISOString(),
      };

      setNetWorthEntries(prev => [newEntry, ...prev.filter(e => e.date !== entryDate)]);
      return true;
    } catch (error) {
      console.error('Error adding entry:', error);
      setHasError(true);
      setErrorMessage('Failed to add entry. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [validateQuickAddForm, activeAssets, setNetWorthEntries]);

  // Add new asset
  const addAsset = useCallback(async (data: AssetFormData, entryDate?: string): Promise<boolean> => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    try {
      const validationErrors = validateAssetForm(data);
      if (validationErrors.length > 0) {
        setHasError(true);
        setErrorMessage(validationErrors[0].message);
        return false;
      }

      const targetDate = entryDate || new Date().toISOString().split('T')[0];
      const newAsset: Asset = {
        id: `asset-${Date.now()}`,
        name: data.name.trim(),
        value: parseFloat(data.value),
        category: data.category,
        addedDate: targetDate,
        isActive: true,
      };

      // Find existing entry for this date or create new one
      const existingEntryIndex = convertedEntries.findIndex(e => e.date === targetDate);
      
      if (existingEntryIndex >= 0) {
        // Update existing entry
        const updatedEntries = [...convertedEntries];
        updatedEntries[existingEntryIndex] = {
          ...updatedEntries[existingEntryIndex],
          assets: [...updatedEntries[existingEntryIndex].assets, newAsset],
          updatedAt: new Date().toISOString(),
        };
        setNetWorthEntries(updatedEntries);
      } else {
        // Create new entry with existing assets + new asset
        const newEntry: NetWorthEntry = {
          id: Date.now().toString(),
          date: targetDate,
          cashEquivalents: 0,
          creditCards: 0,
          assets: [...activeAssets, newAsset],
          createdAt: new Date().toISOString(),
        };
        setNetWorthEntries(prev => [newEntry, ...prev]);
      }

      return true;
    } catch (error) {
      console.error('Error adding asset:', error);
      setHasError(true);
      setErrorMessage('Failed to add asset. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [validateAssetForm, convertedEntries, activeAssets, setNetWorthEntries]);

  // Update asset value
  const updateAsset = useCallback(async (assetId: string, newValue: number, entryDate?: string): Promise<boolean> => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    try {
      if (isNaN(newValue) || newValue < 0) {
        setHasError(true);
        setErrorMessage('Asset value must be a valid positive number');
        return false;
      }

      const targetDate = entryDate || new Date().toISOString().split('T')[0];
      
      // Find existing entry for this date or create new one
      const existingEntryIndex = convertedEntries.findIndex(e => e.date === targetDate);
      
      if (existingEntryIndex >= 0) {
        // Update existing entry
        const updatedEntries = [...convertedEntries];
        const updatedAssets = updatedEntries[existingEntryIndex].assets.map(asset =>
          asset.id === assetId ? { ...asset, value: newValue } : asset
        );
        
        updatedEntries[existingEntryIndex] = {
          ...updatedEntries[existingEntryIndex],
          assets: updatedAssets,
          updatedAt: new Date().toISOString(),
        };
        setNetWorthEntries(updatedEntries);
      } else {
        // Create new entry with updated asset
        const updatedAssets = activeAssets.map(asset =>
          asset.id === assetId ? { ...asset, value: newValue } : asset
        );
        
        const newEntry: NetWorthEntry = {
          id: Date.now().toString(),
          date: targetDate,
          cashEquivalents: 0,
          creditCards: 0,
          assets: updatedAssets,
          createdAt: new Date().toISOString(),
        };
        setNetWorthEntries(prev => [newEntry, ...prev]);
      }

      return true;
    } catch (error) {
      console.error('Error updating asset:', error);
      setHasError(true);
      setErrorMessage('Failed to update asset. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [convertedEntries, activeAssets, setNetWorthEntries]);

  // Delete asset (mark as inactive from a specific date)
  const deleteAsset = useCallback(async (assetId: string, entryDate?: string): Promise<boolean> => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    try {
      const targetDate = entryDate || new Date().toISOString().split('T')[0];
      
      // Find existing entry for this date or create new one
      const existingEntryIndex = convertedEntries.findIndex(e => e.date === targetDate);
      
      if (existingEntryIndex >= 0) {
        // Update existing entry
        const updatedEntries = [...convertedEntries];
        const updatedAssets = updatedEntries[existingEntryIndex].assets.map(asset =>
          asset.id === assetId ? { ...asset, isActive: false } : asset
        );
        
        updatedEntries[existingEntryIndex] = {
          ...updatedEntries[existingEntryIndex],
          assets: updatedAssets,
          updatedAt: new Date().toISOString(),
        };
        setNetWorthEntries(updatedEntries);
      } else {
        // Create new entry with asset marked as inactive
        const updatedAssets = activeAssets.map(asset =>
          asset.id === assetId ? { ...asset, isActive: false } : asset
        );
        
        const newEntry: NetWorthEntry = {
          id: Date.now().toString(),
          date: targetDate,
          cashEquivalents: 0,
          creditCards: 0,
          assets: updatedAssets,
          createdAt: new Date().toISOString(),
        };
        setNetWorthEntries(prev => [newEntry, ...prev]);
      }

      return true;
    } catch (error) {
      console.error('Error deleting asset:', error);
      setHasError(true);
      setErrorMessage('Failed to delete asset. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [convertedEntries, activeAssets, setNetWorthEntries]);

  // Update entire entry
  const updateEntry = useCallback(async (id: string, data: QuickAddFormData): Promise<boolean> => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    try {
      const validationErrors = validateQuickAddForm(data);
      if (validationErrors.length > 0) {
        setHasError(true);
        setErrorMessage(validationErrors[0].message);
        return false;
      }

      setNetWorthEntries(prev => prev.map(entry => 
        entry.id === id 
          ? {
              ...entry,
              cashEquivalents: parseFloat(data.cashEquivalents),
              creditCards: parseFloat(data.creditCards),
              notes: data.notes || undefined,
              updatedAt: new Date().toISOString(),
            }
          : entry
      ));

      return true;
    } catch (error) {
      console.error('Error updating entry:', error);
      setHasError(true);
      setErrorMessage('Failed to update entry. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [validateQuickAddForm, setNetWorthEntries]);

  // Delete entire entry
  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    try {
      setNetWorthEntries(prev => prev.filter(entry => entry.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting entry:', error);
      setHasError(true);
      setErrorMessage('Failed to delete entry. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setNetWorthEntries]);

  // Utility functions
  const updateChartConfig = useCallback((newConfig: Partial<ChartConfig>) => {
    setChartConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const clearError = useCallback(() => {
    setHasError(false);
    setErrorMessage('');
  }, []);

  return {
    // Data
    entries: entriesWithAssets,
    summary,
    metrics,
    chartData,
    trend,
    activeAssets,
    
    // State
    isLoading,
    hasError,
    errorMessage,
    sortField,
    sortDirection,
    chartConfig,
    viewMode,
    
    // Actions
    quickAddEntry,
    addAsset,
    updateAsset,
    deleteAsset,
    updateEntry,
    deleteEntry,
    updateChartConfig,
    setViewMode,
    clearError,
    
    // Utilities
    validateQuickAddForm,
    validateAssetForm,
  };
};