// Purple gradient from the bar graph
export const purpleGradient = {
  start: '#8B5CF6', // Purple-500
  mid: '#7C3AED',   // Purple-600
  end: '#6D28D9',   // Purple-700
  light: '#A78BFA', // Purple-400
  dark: '#5B21B6',  // Purple-800
};

// Category colors - using a sophisticated palette
export const categoryColors: Record<string, string> = {
  food: '#3B82F6',          // Blue
  transport: '#8B5CF6',     // Purple (matching your theme)
  entertainment: '#EC4899', // Pink
  shopping: '#F59E0B',      // Amber
  bills: '#10B981',         // Emerald
  health: '#EF4444',        // Red
  education: '#06B6D4',     // Cyan
  personal: '#F97316',      // Orange
  travel: '#14B8A6',        // Teal
  other: '#6B7280',         // Gray
};

// Get color with opacity
export const getCategoryColor = (category: string, opacity: number = 1): string => {
  const color = categoryColors[category.toLowerCase()] || categoryColors.other;
  
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Generate gradient for charts
export const getGradientColors = (startColor: string, endColor: string, steps: number): string[] => {
  const colors: string[] = [];
  
  // Parse colors
  const start = {
    r: parseInt(startColor.slice(1, 3), 16),
    g: parseInt(startColor.slice(3, 5), 16),
    b: parseInt(startColor.slice(5, 7), 16),
  };
  
  const end = {
    r: parseInt(endColor.slice(1, 3), 16),
    g: parseInt(endColor.slice(3, 5), 16),
    b: parseInt(endColor.slice(5, 7), 16),
  };
  
  // Generate intermediate colors
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(start.r + (end.r - start.r) * ratio);
    const g = Math.round(start.g + (end.g - start.g) * ratio);
    const b = Math.round(start.b + (end.b - start.b) * ratio);
    
    colors.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
  }
  
  return colors;
};

// Bar chart gradient (matching your climbing log)
export const barChartGradient = `linear-gradient(180deg, ${purpleGradient.light} 0%, ${purpleGradient.start} 50%, ${purpleGradient.mid} 100%)`;

// Glass morphism backgrounds
export const glassBackground = {
  dark: 'rgba(31, 41, 55, 0.5)', // gray-800 with opacity
  light: 'rgba(255, 255, 255, 0.5)', // white with opacity
};

// Status colors
export const statusColors = {
  success: '#10B981', // Emerald
  warning: '#F59E0B', // Amber
  danger: '#EF4444',  // Red
  info: '#3B82F6',    // Blue
};

// Export category icons for use in other components
export const categoryIcons = {
  food: 'Coffee',
  transport: 'Car',
  shopping: 'ShoppingCart',
  bills: 'Home',
  health: 'Heart',
  entertainment: 'Sparkles',
  education: 'BookOpen',
  personal: 'User',
  travel: 'Plane',
  other: 'MoreHorizontal'
};