import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { designSystem } from '../../utils/designSystem';

// ========================================
// CARD COMPONENT TYPES
// ========================================

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'interactive' | 'metric' | 'hero';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  glow?: boolean;
  gradient?: boolean;
  loading?: boolean;
  className?: string;
}

// ========================================
// ENHANCED CARD VARIANTS - Net Worth Style
// ========================================

const cardVariants = {
  default: `
    bg-gray-800/40 backdrop-blur-md 
    border border-gray-700/50 
    rounded-2xl shadow-md
    transition-all duration-300 ease-out
  `,
  
  elevated: `
    bg-gray-800/60 backdrop-blur-md 
    border border-gray-600/50 
    rounded-2xl shadow-lg
    transition-all duration-300 ease-out
  `,
  
  interactive: `
    bg-gray-800/40 backdrop-blur-md 
    border border-gray-700/50 hover:border-purple-500/50
    rounded-2xl shadow-md hover:shadow-lg hover:shadow-purple-500/20
    cursor-pointer group
    transition-all duration-300 ease-out
  `,
  
  metric: `
    bg-gray-800/60 backdrop-blur-md 
    border border-gray-600/50
    rounded-2xl shadow-lg
    transition-all duration-300 ease-out
  `,
  
  hero: `
    bg-gray-800/60 backdrop-blur-md 
    border border-gray-600/50
    rounded-3xl shadow-xl
    transition-all duration-300 ease-out
  `,
};

// ========================================
// SIZE VARIANTS - Different Card Sizes
// ========================================

const sizeVariants = {
  sm: 'min-h-[120px]',
  md: 'min-h-[160px]',
  lg: 'min-h-[200px]',
  xl: 'min-h-[280px]',
};

// ========================================
// PADDING VARIANTS - Internal Spacing
// ========================================

const paddingVariants = {
  none: 'p-0',
  sm: 'p-4',       // 16px
  md: 'p-6',       // 24px
  lg: 'p-8',       // 32px
  xl: 'p-10',      // 40px
};

// ========================================
// ANIMATION VARIANTS - Framer Motion
// ========================================

const motionVariants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0.0, 0.2, 1],
    },
  },
  hover: { 
    scale: 1.02,
    y: -4,
    transition: {
      duration: 0.2,
      ease: [0.4, 0.0, 0.2, 1],
    },
  },
  tap: { 
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: [0.4, 0.0, 0.2, 1],
    },
  },
};

// ========================================
// MAIN CARD COMPONENT - NET WORTH STYLE
// ========================================

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'metric',  // Default to metric for consistency
  size = 'md',
  padding = 'lg',      // Default to large padding like Net Worth
  hover = false,        // Default hover enabled
  glow = true,         // Default glow enabled
  gradient = true,     // Default gradient enabled
  loading = false,
  className = '',
  ...motionProps
}) => {
  // Enhanced styling with Net Worth page effects
  const getCardStyle = (): React.CSSProperties => {
    let style: React.CSSProperties = {};

    // Purple gradient background (matching Net Worth)
    if (gradient) {
      style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)';
    }

    // Purple glow effect (matching Net Worth)
    if (glow) {
      style.boxShadow = '0 10px 25px rgba(139, 92, 246, 0.15), 0 4px 10px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
    }

    return style;
  };

  // Combine all the CSS classes
  const cardClasses = designSystem.utils.cn(
    cardVariants[variant],
    sizeVariants[size],
    paddingVariants[padding],
    loading && 'animate-pulse',
    className
  );

  // Determine if card should have hover animations
  const shouldAnimate = variant === 'interactive' || hover;

  return (
    <motion.div
      className={cardClasses}
      style={getCardStyle()}
      variants={motionVariants}
      initial="hidden"
      animate="visible"
      whileHover={shouldAnimate ? "hover" : undefined}
      whileTap={shouldAnimate ? "tap" : undefined}
      {...motionProps}
    >
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-2xl">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
          </div>
        </div>
      )}
      
      {/* Card content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Subtle inner border for extra polish */}
      <div className="absolute inset-[1px] rounded-inherit pointer-events-none bg-gradient-to-b from-white/5 to-transparent" />
    </motion.div>
  );
};

// ========================================
// SPECIALIZED CARD COMPONENTS - NET WORTH STYLE
// ========================================

// Metric Card - Perfect match to Net Worth cards
export const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}> = ({ title, value, change, changeType = 'neutral', icon, children, className }) => {
  const changeColors = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-gray-400',
  };

  return (
    <Card className={className}>
      {children ? children : (
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">
                {title}
              </h3>
              {icon && (
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  {icon}
                </div>
              )}
            </div>
            
            <div className="text-2xl font-bold text-white mb-1">
              {value}
            </div>
            
            {change && (
              <div className={`text-sm ${changeColors[changeType]}`}>
                {change}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

// Section Card - For grouping content with gray contrast
export const SectionCard: React.FC<{
  title?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className }) => {
  return (
    <Card className={className}>
      {title && (
        <h3 className="text-lg font-semibold text-white mb-4">
          {title}
        </h3>
      )}
      
      {/* Gray contrast section */}
      <div className="bg-gray-700/30 border border-gray-600/30 rounded-xl p-4 space-y-3">
        {children}
      </div>
    </Card>
  );
};

// Hero Card - For major dashboard sections
export const HeroCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <Card variant="hero" size="xl" padding="xl" className={className}>
      {children}
    </Card>
  );
};

// Interactive Card - For clickable items
export const InteractiveCard: React.FC<CardProps & {
  onClick?: () => void;
}> = ({ children, onClick, className, ...props }) => {
  return (
    <Card 
      variant="interactive" 
      hover 
      glow 
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </Card>
  );
};

// ========================================
// CARD GRID LAYOUT COMPONENT
// ========================================

export const CardGrid: React.FC<{
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ children, cols = 2, gap = 'md', className }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  const gridGap = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  return (
    <div className={designSystem.utils.cn(
      'grid',
      gridCols[cols],
      gridGap[gap],
      className
    )}>
      {children}
    </div>
  );
};

export default Card;