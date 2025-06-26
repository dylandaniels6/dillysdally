import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingDown, Info, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/expenseHelpers';
import { categoryColors, purpleGradient } from '../utils/categoryColors';

interface ExpenseSankeyProps {
  expenses: any[];
  income?: number;
  settings: { darkMode: boolean };
  timeRange: string;
}

const ExpenseSankey: React.FC<ExpenseSankeyProps> = ({ 
  expenses, 
  income = 5000,
  settings,
  timeRange 
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Extended color palette with consistent, accessible colors
  const extendedCategoryColors = {
    ...categoryColors,
    'groceries': '#10B981',
    'eating out': '#8B5CF6', 
    'transportation': '#3B82F6',
    'entertainment': '#F59E0B',
    'bills': '#EF4444',
    'shopping': '#EC4899',
    'subscriptions': '#6366F1',
    'health': '#14B8A6',
    'travel': '#F97316',
    'education': '#84CC16',
    'gifts': '#A855F7',
    'other': '#6B7280'
  };

  // Process data for all scenarios including zero income and negative cash flow
  const visualData = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netFlow = income - totalExpenses;
    const isDeficit = netFlow < 0;
    const hasIncome = income > 0;
    const hasExpenses = totalExpenses > 0;

    // Handle edge cases
    if (!hasExpenses && !hasIncome) {
      return { 
        nodes: [], 
        flows: [], 
        totalExpenses: 0, 
        netFlow: 0,
        isDeficit: false,
        isEmpty: true 
      };
    }

    // Group by category
    const categoryTotals = new Map<string, number>();
    expenses.forEach(expense => {
      categoryTotals.set(expense.category, (categoryTotals.get(expense.category) || 0) + expense.amount);
    });

    const getColorForCategory = (category: string, index: number) => {
      if (extendedCategoryColors[category]) {
        return extendedCategoryColors[category];
      }
      const fallbackColors = ['#6B7280', '#9CA3AF', '#4B5563', '#374151'];
      return fallbackColors[index % fallbackColors.length];
    };

    // Sort categories by amount
    const sortedCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1]);

    const nodes = [];
    const flows = [];

    // Layout constants for clean spacing
    const nodeSpacing = 12;
    const minNodeHeight = 30;
    const maxNodeHeight = 120;
    const containerHeight = 320;
    const availableHeight = containerHeight - 80; // Leave space for margins

    // Calculate proportional heights
    const calculateNodeHeight = (value: number, total: number) => {
      if (total === 0) return minNodeHeight;
      const proportion = value / total;
      return Math.max(minNodeHeight, Math.min(maxNodeHeight, proportion * availableHeight));
    };

    // Create expense nodes first to calculate layout
    let expenseY = 60;
    const expenseNodes = [];
    
    if (hasExpenses) {
      sortedCategories.forEach(([category, amount], index) => {
        const nodeHeight = calculateNodeHeight(amount, totalExpenses);
        const color = getColorForCategory(category, index);
        
        expenseNodes.push({
          name: category.charAt(0).toUpperCase() + category.slice(1),
          value: amount,
          x: 320,
          y: expenseY,
          width: 160,
          height: nodeHeight,
          color: color,
          category: category,
          percentage: (amount / totalExpenses) * 100
        });

        expenseY += nodeHeight + nodeSpacing;
      });
    }

    // Calculate center points for positioning
    const expenseBlockHeight = expenseY - 60 - nodeSpacing;
    const expenseCenter = 60 + (expenseBlockHeight / 2);

    // Income node positioning - centered on expense block or standalone
    if (hasIncome) {
      const incomeHeight = hasExpenses ? 
        Math.min(140, expenseBlockHeight * 0.8) : 
        100;
      const incomeY = expenseCenter - (incomeHeight / 2);

      nodes.push({
        name: 'Income',
        value: income,
        x: 60,
        y: incomeY,
        width: 180,
        height: incomeHeight,
        color: '#8B5CF6',
        category: 'income',
        percentage: 100
      });
    }

    // Add expense nodes to main nodes array
    nodes.push(...expenseNodes);

    // Result node (Savings/Deficit/Debt Funding)
    if (hasExpenses) {
      const resultValue = Math.abs(netFlow);
      let resultHeight, resultColor, resultName;

      if (isDeficit) {
        // Negative cash flow scenarios
        if (hasIncome) {
          // Deficit: spending more than income
          resultHeight = Math.min(120, (resultValue / totalExpenses) * availableHeight);
          resultColor = '#EF4444';
          resultName = 'Deficit';
        } else {
          // No income: all expenses funded by debt/savings
          resultHeight = Math.min(140, expenseBlockHeight * 0.8);
          resultColor = '#F97316';
          resultName = 'Debt/Savings';
        }
      } else {
        // Positive cash flow: traditional savings
        resultHeight = hasIncome ? 
          Math.min(100, (netFlow / income) * availableHeight) : 
          minNodeHeight;
        resultColor = '#10B981';
        resultName = 'Savings';
      }

      const resultY = expenseCenter - (resultHeight / 2);

      nodes.push({
        name: resultName,
        value: hasIncome ? resultValue : totalExpenses,
        x: 560,
        y: resultY,
        width: 160,
        height: resultHeight,
        color: resultColor,
        category: isDeficit ? 'deficit' : 'savings',
        percentage: hasIncome ? (resultValue / income) * 100 : 100
      });

      // Create flows based on scenario
      if (hasIncome) {
        // Standard income-to-expense flows
        let sourceOffset = 0;
        const incomeNode = nodes.find(n => n.category === 'income');

        sortedCategories.forEach(([category], index) => {
          const categoryNode = expenseNodes[index];
          const flowProportion = categoryNode.value / income;
          const flowHeight = flowProportion * incomeNode.height;

          flows.push({
            id: `income-${category}`,
            sourceX: incomeNode.x + incomeNode.width,
            sourceY: incomeNode.y + sourceOffset,
            sourceHeight: flowHeight,
            targetX: categoryNode.x,
            targetY: categoryNode.y,
            targetHeight: categoryNode.height,
            color: categoryNode.color,
            value: categoryNode.value,
            category: category
          });

          sourceOffset += flowHeight;
        });
      } else {
        // No income: debt/savings funding expenses
        const resultNode = nodes.find(n => n.category !== 'income' && !expenseNodes.includes(n));
        let sourceOffset = 0;

        sortedCategories.forEach(([category], index) => {
          const categoryNode = expenseNodes[index];
          const flowProportion = categoryNode.value / totalExpenses;
          const flowHeight = flowProportion * resultNode.height;

          flows.push({
            id: `debt-${category}`,
            sourceX: resultNode.x,
            sourceY: resultNode.y + sourceOffset,
            sourceHeight: flowHeight,
            targetX: categoryNode.x + categoryNode.width,
            targetY: categoryNode.y,
            targetHeight: categoryNode.height,
            color: categoryNode.color,
            value: categoryNode.value,
            category: category,
            isReverse: true
          });

          sourceOffset += flowHeight;
        });
      }

      // Result flows (expense-to-result)
      if (hasIncome) {
        const resultNode = nodes.find(n => ['deficit', 'savings'].includes(n.category));
        let targetOffset = 0;

        sortedCategories.forEach(([category], index) => {
          const categoryNode = expenseNodes[index];
          const flowProportion = categoryNode.value / totalExpenses;
          const flowHeight = flowProportion * resultNode.height;

          flows.push({
            id: `${category}-result`,
            sourceX: categoryNode.x + categoryNode.width,
            sourceY: categoryNode.y,
            sourceHeight: categoryNode.height,
            targetX: resultNode.x,
            targetY: resultNode.y + targetOffset,
            targetHeight: flowHeight,
            color: categoryNode.color,
            value: categoryNode.value,
            category: category
          });

          targetOffset += flowHeight;
        });
      }
    }

    return { 
      nodes, 
      flows, 
      totalExpenses, 
      netFlow,
      isDeficit,
      hasIncome,
      hasExpenses,
      isEmpty: false
    };
  }, [expenses, income]);

  // Smooth Sankey flow component with Apple-quality animations
  const SankeyFlow = ({ flow, isHighlighted }) => {
    const controlOffset = 140;
    
    let pathD;
    if (flow.isReverse) {
      // Right-to-left flow for debt funding
      pathD = `
        M ${flow.sourceX} ${flow.sourceY}
        L ${flow.sourceX} ${flow.sourceY + flow.sourceHeight}
        C ${flow.sourceX - controlOffset} ${flow.sourceY + flow.sourceHeight}, 
          ${flow.targetX + controlOffset} ${flow.targetY + flow.targetHeight}, 
          ${flow.targetX} ${flow.targetY + flow.targetHeight}
        L ${flow.targetX} ${flow.targetY}
        C ${flow.targetX + controlOffset} ${flow.targetY}, 
          ${flow.sourceX - controlOffset} ${flow.sourceY}, 
          ${flow.sourceX} ${flow.sourceY}
        Z
      `;
    } else {
      // Standard left-to-right flow
      pathD = `
        M ${flow.sourceX} ${flow.sourceY}
        L ${flow.sourceX} ${flow.sourceY + flow.sourceHeight}
        C ${flow.sourceX + controlOffset} ${flow.sourceY + flow.sourceHeight}, 
          ${flow.targetX - controlOffset} ${flow.targetY + flow.targetHeight}, 
          ${flow.targetX} ${flow.targetY + flow.targetHeight}
        L ${flow.targetX} ${flow.targetY}
        C ${flow.targetX - controlOffset} ${flow.targetY}, 
          ${flow.sourceX + controlOffset} ${flow.sourceY}, 
          ${flow.sourceX} ${flow.sourceY}
        Z
      `;
    }

    const opacity = hoveredCategory === null ? 0.6 : isHighlighted ? 0.85 : 0.08;

    return (
      <motion.path
        d={pathD}
        fill={`url(#gradient-${flow.id})`}
        animate={{ opacity }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={{
          filter: isHighlighted ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : 'none'
        }}
      />
    );
  };

  // Glass-morphism node component with Apple-quality styling
  const SankeyNode = ({ node, isConnected }) => {
    const opacity = hoveredCategory === null ? 1 : isConnected ? 1 : 0.3;
    const scale = hoveredCategory === node.category ? 1.02 : 1;
    
    return (
      <motion.g
        onHoverStart={() => setHoveredCategory(node.category)}
        onHoverEnd={() => setHoveredCategory(null)}
        animate={{ opacity, scale }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={{ cursor: 'pointer' }}
      >
        {/* Glass background */}
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx="16"
          fill="rgba(255, 255, 255, 0.1)"
          style={{
            backdropFilter: 'blur(10px)',
            filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.1))'
          }}
        />
        
        {/* Color accent */}
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx="16"
          fill={node.color}
          opacity={0.8}
        />
        
        {/* Inner highlight for glass effect */}
        <rect
          x={node.x + 1}
          y={node.y + 1}
          width={node.width - 2}
          height={node.height - 2}
          rx="15"
          fill="url(#glassHighlight)"
          opacity={0.3}
        />
        
        {/* Category name */}
        <text
          x={node.x + node.width/2}
          y={node.y + node.height/2 - 8}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white font-semibold"
          fontSize="14"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
        >
          {node.name}
        </text>
        
        {/* Amount */}
        <text
          x={node.x + node.width/2}
          y={node.y + node.height/2 + 8}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white/90 font-medium"
          fontSize="12"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
        >
          {formatCurrency(node.value)}
        </text>
        
        {/* Percentage for larger nodes */}
        {node.height > 50 && (
          <text
            x={node.x + node.width/2}
            y={node.y + node.height/2 + 22}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white/75 font-medium"
            fontSize="10"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
          >
            {node.percentage.toFixed(1)}%
          </text>
        )}
      </motion.g>
    );
  };

  const efficiencyRate = income > 0 ? ((visualData.netFlow / income) * 100).toFixed(1) : '0.0';

  // Handle empty state
  if (visualData.isEmpty) {
    return (
      <div 
        className="w-full h-96 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
        }}
      >
        <div className="text-center">
          <Info size={48} className="text-white/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/80 mb-2">No Data Available</h3>
          <p className="text-white/60">Add some expenses or income to see your cash flow visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 ease-out"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
      }}
    >
      {/* Sankey Visualization */}
      <div className="h-80 relative mb-6">
        <svg width="100%" height="100%" viewBox="0 0 800 320">
          <defs>
            {/* Glass highlight gradient */}
            <linearGradient id="glassHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="50%" stopColor="white" stopOpacity="0.1" />
              <stop offset="100%" stopColor="white" stopOpacity="0.0" />
            </linearGradient>
            
            {/* Flow gradients */}
            {visualData.flows.map(flow => (
              <linearGradient 
                key={`gradient-${flow.id}`} 
                id={`gradient-${flow.id}`} 
                x1="0%" 
                y1="0%" 
                x2="100%" 
                y2="0%"
              >
                <stop offset="0%" stopColor={flow.color} stopOpacity="0.7" />
                <stop offset="50%" stopColor={flow.color} stopOpacity="0.5" />
                <stop offset="100%" stopColor={flow.color} stopOpacity="0.3" />
              </linearGradient>
            ))}
          </defs>

          {/* Subtle column indicators */}
          {visualData.hasIncome && (
            <text x="150" y="30" textAnchor="middle" className="fill-white/40 text-sm font-medium">
              Income
            </text>
          )}
          {visualData.hasExpenses && (
            <text x="400" y="30" textAnchor="middle" className="fill-white/40 text-sm font-medium">
              Expenses
            </text>
          )}
          {(visualData.isDeficit || (!visualData.hasIncome && visualData.hasExpenses)) && (
            <text x="640" y="30" textAnchor="middle" className="fill-white/40 text-sm font-medium">
              {!visualData.hasIncome ? 'Funding' : (visualData.isDeficit ? 'Deficit' : 'Savings')}
            </text>
          )}

          {/* Render flows first */}
          {visualData.flows.map(flow => {
            const isHighlighted = hoveredCategory === null || 
                                hoveredCategory === flow.category ||
                                hoveredCategory === 'income';
            
            return (
              <SankeyFlow
                key={flow.id}
                flow={flow}
                isHighlighted={isHighlighted}
              />
            );
          })}

          {/* Render nodes */}
          {visualData.nodes.map(node => {
            const isConnected = hoveredCategory === null || 
                              hoveredCategory === node.category ||
                              hoveredCategory === 'income';
            
            return (
              <SankeyNode
                key={node.name}
                node={node}
                isConnected={isConnected}
              />
            );
          })}
        </svg>
      </div>

      {/* Glass summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { 
            label: 'Income', 
            value: income, 
            icon: DollarSign, 
            color: 'text-purple-300',
            bgColor: 'rgba(139, 92, 246, 0.2)'
          },
          { 
            label: 'Expenses', 
            value: visualData.totalExpenses, 
            icon: TrendingDown, 
            color: 'text-red-300',
            bgColor: 'rgba(239, 68, 68, 0.2)'
          },
          { 
            label: visualData.isDeficit ? 'Deficit' : 'Savings', 
            value: Math.abs(visualData.netFlow), 
            icon: visualData.isDeficit ? AlertTriangle : Wallet, 
            color: visualData.isDeficit ? 'text-red-300' : 'text-green-300',
            bgColor: visualData.isDeficit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'
          },
          { 
            label: 'Rate', 
            value: `${efficiencyRate}%`, 
            icon: parseFloat(efficiencyRate) >= 0 ? TrendingUp : TrendingDown, 
            color: parseFloat(efficiencyRate) >= 0 ? 'text-blue-300' : 'text-red-300',
            bgColor: parseFloat(efficiencyRate) >= 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'
          }
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 text-center"
            style={{
              background: `linear-gradient(135deg, ${item.bgColor} 0%, rgba(255,255,255,0.05) 100%)`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 mb-3 rounded-xl ${item.color}`}
                 style={{ background: 'rgba(255,255,255,0.1)' }}>
              <item.icon size={20} />
            </div>
            <div className="text-sm text-white/60 mb-1 font-medium">
              {item.label}
            </div>
            <div className="text-lg font-bold text-white">
              {typeof item.value === 'number' ? formatCurrency(item.value) : item.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Subtle help text */}
      <div className="mt-6 text-center">
        <p className="text-xs text-white/40 font-medium">
          Hover over categories to trace money flow • 
          {!visualData.hasIncome && ' Expenses funded by debt or savings •'}
          {visualData.isDeficit && ' Red indicates deficit spending •'}
          Flows represent proportional amounts
        </p>
      </div>
    </div>
  );
};

export default ExpenseSankey;