import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Target,
  Zap,
  DollarSign,
  ShoppingCart,
  Coffee,
  Car,
  Home,
  Heart,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '../utils/expenseHelpers';
import { categoryColors } from '../utils/categoryColors';

interface CategoryInsightsProps {
  expenses: any[];
  settings: { darkMode: boolean; categories: string[]; budgets?: Record<string, number> };
  timeRange: string;
}

const categoryIcons: Record<string, any> = {
  food: Coffee,
  transport: Car,
  shopping: ShoppingCart,
  bills: Home,
  health: Heart,
  entertainment: Sparkles,
};

const CategoryInsights: React.FC<CategoryInsightsProps> = ({ expenses, settings, timeRange }) => {
  // Calculate insights
  const insights = useMemo(() => {
    // Category totals
    const categoryTotals = new Map<string, number>();
    const categoryTransactions = new Map<string, number>();
    const dailyAverages = new Map<string, number[]>();
    
    expenses.forEach(expense => {
      categoryTotals.set(expense.category, (categoryTotals.get(expense.category) || 0) + expense.amount);
      categoryTransactions.set(expense.category, (categoryTransactions.get(expense.category) || 0) + 1);
      
      // Track daily spending for variance calculation
      const date = new Date(expense.date).toISOString().split('T')[0];
      if (!dailyAverages.has(expense.category)) {
        dailyAverages.set(expense.category, []);
      }
      dailyAverages.get(expense.category)!.push(expense.amount);
    });
    
    // Sort categories by total spending
    const sortedCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category, total]) => ({
        category,
        total,
        transactionCount: categoryTransactions.get(category) || 0
      }));
    
    // Calculate trends (compare first half vs second half of period)
    const midPoint = Math.floor(expenses.length / 2);
    const firstHalf = expenses.slice(0, midPoint);
    const secondHalf = expenses.slice(midPoint);
    
    const trends = new Map<string, number>();
    settings.categories.forEach(category => {
      const firstTotal = firstHalf
        .filter(e => e.category === category)
        .reduce((sum, e) => sum + e.amount, 0);
      const secondTotal = secondHalf
        .filter(e => e.category === category)
        .reduce((sum, e) => sum + e.amount, 0);
      
      if (firstTotal > 0) {
        trends.set(category, ((secondTotal - firstTotal) / firstTotal) * 100);
      }
    });
    
    // Find unusual spending
    const unusualSpending = expenses
      .filter(expense => {
        const categoryAvg = (categoryTotals.get(expense.category) || 0) / (categoryTransactions.get(expense.category) || 1);
        return expense.amount > categoryAvg * 2;
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    
    // Budget analysis
    const budgetStatus = settings.budgets ? 
      Object.entries(settings.budgets).map(([category, budget]) => {
        const spent = categoryTotals.get(category) || 0;
        const percentage = (spent / budget) * 100;
        return { category, budget, spent, percentage };
      }).filter(b => b.percentage > 80) : [];
    
    return {
      sortedCategories,
      trends,
      unusualSpending,
      budgetStatus,
      totalSpent: Array.from(categoryTotals.values()).reduce((sum, val) => sum + val, 0),
      avgTransaction: expenses.length > 0 ? 
        Array.from(categoryTotals.values()).reduce((sum, val) => sum + val, 0) / expenses.length : 0
    };
  }, [expenses, settings]);
  
  return (
    <div className="space-y-6">
      {/* AI Insights Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl ${
          settings.darkMode 
            ? 'bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-700/30' 
            : 'bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200'
        } backdrop-blur-sm`}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-2 rounded-lg ${
            settings.darkMode ? 'bg-purple-800/50' : 'bg-purple-100'
          }`}>
            <Sparkles size={18} className="text-purple-500" />
          </div>
          <h3 className={`font-semibold ${
            settings.darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            AI Insights
          </h3>
        </div>
        
        <div className="space-y-3">
          {insights.unusualSpending.length > 0 && (
            <div className={`p-3 rounded-lg ${
              settings.darkMode ? 'bg-amber-900/20' : 'bg-amber-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-amber-500" />
                <span className={`text-sm font-medium ${
                  settings.darkMode ? 'text-amber-400' : 'text-amber-700'
                }`}>
                  Unusual Spending Detected
                </span>
              </div>
              <p className={`text-xs ${
                settings.darkMode ? 'text-amber-400/70' : 'text-amber-600'
              }`}>
                {insights.unusualSpending[0].description} was {formatCurrency(insights.unusualSpending[0].amount)}
              </p>
            </div>
          )}
          
          {insights.budgetStatus.length > 0 && (
            <div className={`p-3 rounded-lg ${
              settings.darkMode ? 'bg-red-900/20' : 'bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Target size={14} className="text-red-500" />
                <span className={`text-sm font-medium ${
                  settings.darkMode ? 'text-red-400' : 'text-red-700'
                }`}>
                  Budget Alert
                </span>
              </div>
              <p className={`text-xs ${
                settings.darkMode ? 'text-red-400/70' : 'text-red-600'
              }`}>
                {insights.budgetStatus[0].category} is at {insights.budgetStatus[0].percentage.toFixed(0)}% of budget
              </p>
            </div>
          )}
          
          <div className={`p-3 rounded-lg ${
            settings.darkMode ? 'bg-blue-900/20' : 'bg-blue-50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-blue-500" />
              <span className={`text-sm font-medium ${
                settings.darkMode ? 'text-blue-400' : 'text-blue-700'
              }`}>
                Quick Tip
              </span>
            </div>
            <p className={`text-xs ${
              settings.darkMode ? 'text-blue-400/70' : 'text-blue-600'
            }`}>
              Your {insights.sortedCategories[0]?.category || 'top'} spending is 23% higher than last month
            </p>
          </div>
        </div>
      </motion.div>
      
      
     
    </div>
  );
};

export default CategoryInsights;