import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingDown, Info, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/expenseHelpers';
import { categoryColors, purpleGradient } from '../utils/categoryColors';

interface ExpenseSankeyProps {
  expenses: any[];
  income?: number; // Monthly income
  settings: { darkMode: boolean };
  timeRange: string;
}

interface FlowNode {
  name: string;
  value: number;
  x: number;
  y: number;
  height: number;
  color: string;
  type: 'source' | 'category' | 'subcategory';
}

interface FlowLink {
  source: string;
  target: string;
  value: number;
  sourceNode?: FlowNode;
  targetNode?: FlowNode;
}

const ExpenseSankey: React.FC<ExpenseSankeyProps> = ({ 
  expenses, 
  income = 5000, // Default income if not provided
  settings,
  timeRange 
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Process data for Sankey diagram
  const sankeyData = useMemo(() => {
    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const savings = Math.max(0, income - totalExpenses);
    
    // Group by category and subcategory
    const categoryGroups = new Map<string, Map<string, number>>();
    
    expenses.forEach(expense => {
      if (!categoryGroups.has(expense.category)) {
        categoryGroups.set(expense.category, new Map());
      }
      
      // Extract subcategory from description (e.g., "Starbucks" from "Coffee at Starbucks")
      const subcategory = expense.description.split(' at ')[1] || 
                         expense.description.split(' from ')[1] || 
                         expense.description.split(' - ')[0] ||
                         'Other';
      
      const categoryMap = categoryGroups.get(expense.category)!;
      categoryMap.set(subcategory, (categoryMap.get(subcategory) || 0) + expense.amount);
    });
    
    // Create nodes
    const nodes: FlowNode[] = [
      // Source node
      {
        name: 'Income',
        value: income,
        x: 50,
        y: 200,
        height: 200,
        color: purpleGradient.start,
        type: 'source'
      }
    ];
    
    // Create links
    const links: FlowLink[] = [];
    
    // Add savings node if positive
    if (savings > 0) {
      nodes.push({
        name: 'Savings',
        value: savings,
        x: 950,
        y: 50,
        height: (savings / income) * 200,
        color: '#10B981',
        type: 'category'
      });
      links.push({
        source: 'Income',
        target: 'Savings',
        value: savings
      });
    }
    
    // Calculate positions for category nodes
    let categoryY = savings > 0 ? 150 : 50;
    const categoryX = 500;
    const subcategoryX = 950;
    
    // Sort categories by value
    const sortedCategories = Array.from(categoryGroups.entries())
      .sort((a, b) => {
        const sumA = Array.from(a[1].values()).reduce((sum, val) => sum + val, 0);
        const sumB = Array.from(b[1].values()).reduce((sum, val) => sum + val, 0);
        return sumB - sumA;
      });
    
    sortedCategories.forEach(([category, subcategories]) => {
      const categoryTotal = Array.from(subcategories.values()).reduce((sum, val) => sum + val, 0);
      const categoryHeight = (categoryTotal / income) * 200;
      
      // Add category node
      const categoryNode: FlowNode = {
        name: category.charAt(0).toUpperCase() + category.slice(1),
        value: categoryTotal,
        x: categoryX,
        y: categoryY,
        height: categoryHeight,
        color: categoryColors[category] || categoryColors.other,
        type: 'category'
      };
      nodes.push(categoryNode);
      
      // Add link from income to category
      links.push({
        source: 'Income',
        target: categoryNode.name,
        value: categoryTotal
      });
      
      // Add subcategory nodes
      let subcategoryY = categoryY;
      const sortedSubcategories = Array.from(subcategories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5 subcategories
      
      sortedSubcategories.forEach(([subcategory, value]) => {
        const subcategoryHeight = (value / income) * 200;
        
        const subcategoryNode: FlowNode = {
          name: subcategory,
          value: value,
          x: subcategoryX,
          y: subcategoryY,
          height: subcategoryHeight,
          color: categoryNode.color,
          type: 'subcategory'
        };
        nodes.push(subcategoryNode);
        
        // Add link from category to subcategory
        links.push({
          source: categoryNode.name,
          target: subcategory,
          value: value
        });
        
        subcategoryY += subcategoryHeight + 10;
      });
      
      // Add "Others" node if there are more subcategories
      const othersTotal = categoryTotal - sortedSubcategories.reduce((sum, [, val]) => sum + val, 0);
      if (othersTotal > 0) {
        const othersHeight = (othersTotal / income) * 200;
        nodes.push({
          name: `Other ${category}`,
          value: othersTotal,
          x: subcategoryX,
          y: subcategoryY,
          height: othersHeight,
          color: categoryNode.color,
          type: 'subcategory'
        });
        links.push({
          source: categoryNode.name,
          target: `Other ${category}`,
          value: othersTotal
        });
      }
      
      categoryY += categoryHeight + 20;
    });
    
    // Assign node references to links
    links.forEach(link => {
      link.sourceNode = nodes.find(n => n.name === link.source);
      link.targetNode = nodes.find(n => n.name === link.target);
    });
    
    return { nodes, links, totalExpenses, savings };
  }, [expenses, income]);
  
  // Generate SVG path for curved links
  const generateLinkPath = (link: FlowLink): string => {
    if (!link.sourceNode || !link.targetNode) return '';
    
    const sourceX = link.sourceNode.x + 150; // Width of node
    const sourceY = link.sourceNode.y + (link.sourceNode.height / 2);
    const targetX = link.targetNode.x;
    const targetY = link.targetNode.y + (link.targetNode.height / 2);
    
    const midX = (sourceX + targetX) / 2;
    
    return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
  };
  
  const { nodes, links, totalExpenses, savings } = sankeyData;
  
  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${
            settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <Wallet size={20} className="text-purple-500" />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${
              settings.darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Cash Flow Visualization
            </h3>
            <p className={`text-sm ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Track where your money goes
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`text-sm ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Flow Efficiency
            </div>
            <div className={`text-lg font-semibold ${
              savings > 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {((savings / income) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
      
      {/* Sankey Diagram */}
      <div className="relative h-[600px] overflow-hidden">
        <svg width="100%" height="100%" viewBox="0 0 1200 600">
          <defs>
            {/* Gradient definitions */}
            {Object.entries(categoryColors).map(([category, color]) => (
              <linearGradient key={category} id={`gradient-${category}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="50%" stopColor={color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={color} stopOpacity="0.1" />
              </linearGradient>
            ))}
            <linearGradient id="gradient-income" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={purpleGradient.start} stopOpacity="0.3" />
              <stop offset="100%" stopColor={purpleGradient.start} stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="gradient-savings" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Links */}
          <g className="links">
            {links.map((link, index) => {
              const isHighlighted = !hoveredNode || 
                hoveredNode === link.source || 
                hoveredNode === link.target;
              
              return (
                <motion.path
                  key={`${link.source}-${link.target}`}
                  d={generateLinkPath(link)}
                  fill="none"
                  stroke={link.sourceNode?.color || '#666'}
                  strokeWidth={(link.value / income) * 100}
                  opacity={isHighlighted ? 0.6 : 0.2}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: index * 0.05 }}
                  style={{
                    filter: isHighlighted ? 'blur(0px)' : 'blur(1px)'
                  }}
                />
              );
            })}
          </g>
          
          {/* Nodes */}
          <g className="nodes">
            {nodes.map((node, index) => {
              const isHighlighted = !hoveredNode || hoveredNode === node.name;
              const isSource = node.type === 'source';
              const isSavings = node.name === 'Savings';
              
              return (
                <motion.g
                  key={node.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  onMouseEnter={() => setHoveredNode(node.name)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => node.type === 'category' && setSelectedCategory(node.name)}
                  style={{ cursor: node.type === 'category' ? 'pointer' : 'default' }}
                >
                  {/* Node rectangle */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={150}
                    height={node.height}
                    rx={8}
                    fill={node.color}
                    opacity={isHighlighted ? 0.9 : 0.6}
                    stroke={isHighlighted ? node.color : 'transparent'}
                    strokeWidth={2}
                  />
                  
                  {/* Gradient overlay */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={150}
                    height={node.height}
                    rx={8}
                    fill={`url(#gradient-${node.name.toLowerCase().replace(' ', '-')})`}
                    opacity={isHighlighted ? 1 : 0.5}
                  />
                  
                  {/* Node label */}
                  <text
                    x={node.x + 75}
                    y={node.y + node.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`text-sm font-medium fill-current ${
                      settings.darkMode ? 'text-white' : 'text-gray-900'
                    }`}
                    style={{
                      opacity: isHighlighted ? 1 : 0.7,
                      fontSize: node.type === 'subcategory' ? '12px' : '14px'
                    }}
                  >
                    {node.name}
                  </text>
                  
                  {/* Value label */}
                  <text
                    x={node.x + 75}
                    y={node.y + node.height / 2 + 20}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`text-xs fill-current ${
                      settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                    style={{ opacity: isHighlighted ? 1 : 0 }}
                  >
                    {formatCurrency(node.value)}
                  </text>
                  
                  {/* Percentage label for categories */}
                  {node.type === 'category' && (
                    <text
                      x={node.x + 75}
                      y={node.y + node.height / 2 + 35}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`text-xs fill-current ${
                        settings.darkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}
                      style={{ opacity: isHighlighted ? 0.8 : 0 }}
                    >
                      {((node.value / income) * 100).toFixed(1)}%
                    </text>
                  )}
                </motion.g>
              );
            })}
          </g>
          
          {/* Labels for columns */}
          <g className="column-labels">
            <text
              x={125}
              y={30}
              textAnchor="middle"
              className={`text-sm font-semibold fill-current ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Income Source
            </text>
            <text
              x={575}
              y={30}
              textAnchor="middle"
              className={`text-sm font-semibold fill-current ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Categories
            </text>
            <text
              x={1025}
              y={30}
              textAnchor="middle"
              className={`text-sm font-semibold fill-current ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Details
            </text>
          </g>
        </svg>
      </div>
      
      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`p-4 rounded-xl ${
            settings.darkMode 
              ? 'bg-gray-800/50 border border-gray-700/50' 
              : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Income
            </span>
            <DollarSign size={16} className="text-purple-500" />
          </div>
          <div className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
            {formatCurrency(income)}
          </div>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`p-4 rounded-xl ${
            settings.darkMode 
              ? 'bg-gray-800/50 border border-gray-700/50' 
              : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Expenses
            </span>
            <TrendingDown size={16} className="text-red-500" />
          </div>
          <div className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
            {formatCurrency(totalExpenses)}
          </div>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`p-4 rounded-xl ${
            settings.darkMode 
              ? 'bg-gray-800/50 border border-gray-700/50' 
              : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Savings
            </span>
            <Wallet size={16} className="text-green-500" />
          </div>
          <div className={`text-xl font-bold ${
            savings >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {formatCurrency(savings)}
          </div>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`p-4 rounded-xl ${
            settings.darkMode 
              ? 'bg-gray-800/50 border border-gray-700/50' 
              : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Savings Rate
            </span>
            <Info size={16} className="text-blue-500" />
          </div>
          <div className={`text-xl font-bold ${
            savings >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {((savings / income) * 100).toFixed(1)}%
          </div>
        </motion.div>
      </div>
      
      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${
          settings.darkMode 
            ? 'bg-blue-900/20 border border-blue-700/30' 
            : 'bg-blue-50 border border-blue-200'
        }`}
      >
        <Info size={18} className="text-blue-500 mt-0.5" />
        <div>
          <p className={`text-sm ${
            settings.darkMode ? 'text-blue-300' : 'text-blue-700'
          }`}>
            This diagram shows how your income flows through different spending categories. 
            The width of each connection represents the amount of money flowing through it.
            Click on categories to see detailed breakdowns.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ExpenseSankey;