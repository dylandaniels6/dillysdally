import React, { useEffect, useState, useMemo } from 'react';
import { useSpring, animated } from 'react-spring';
import { springPresets, colorTheme, durations } from '../utils/animationPresets';

interface AnimatedNumberProps {
  value: number;
  format?: 'currency' | 'percentage' | 'number';
  prefix?: string;
  suffix?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'success' | 'danger' | 'neutral' | 'auto';
  showChange?: boolean;
  previousValue?: number;
  precision?: number;
  compact?: boolean;
  isDarkMode?: boolean;
  animationDelay?: number;
  enablePulse?: boolean;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format = 'number',
  prefix = '',
  suffix = '',
  className = '',
  size = 'medium',
  weight = 'semibold',
  color = 'auto',
  showChange = false,
  previousValue,
  precision = 0,
  compact = false,
  isDarkMode = false,
  animationDelay = 0,
  enablePulse = true,
}) => {
  const [previousVal, setPreviousVal] = useState(previousValue || value);
  const [hasChanged, setHasChanged] = useState(false);

  // Track value changes
  useEffect(() => {
    if (value !== previousVal) {
      setPreviousVal(value);
      setHasChanged(true);
      
      // Reset change indicator after animation
      const timer = setTimeout(() => setHasChanged(false), durations.slow);
      return () => clearTimeout(timer);
    }
  }, [value, previousVal]);

  // Determine color based on value and props
  const determinedColor = useMemo(() => {
    if (color !== 'auto') return color;
    
    if (showChange && previousValue !== undefined) {
      const change = value - previousValue;
      if (change > 0) return 'success';
      if (change < 0) return 'danger';
      return 'neutral';
    }
    
    if (format === 'percentage') {
      if (value > 0) return 'success';
      if (value < 0) return 'danger';
      return 'neutral';
    }
    
    return 'primary';
  }, [color, value, previousValue, showChange, format]);

  // Color theme mapping
  const colorClasses = useMemo(() => {
    const themes = {
      primary: isDarkMode ? 'text-purple-300' : 'text-purple-600',
      success: isDarkMode ? 'text-green-400' : 'text-green-600',
      danger: isDarkMode ? 'text-red-400' : 'text-red-600',
      neutral: isDarkMode ? 'text-gray-300' : 'text-gray-600',
    };
    return themes[determinedColor];
  }, [determinedColor, isDarkMode]);

  // Size classes
  const sizeClasses = useMemo(() => {
    const sizes = {
      small: 'text-sm',
      medium: 'text-lg',
      large: 'text-2xl',
      xl: 'text-4xl',
    };
    return sizes[size];
  }, [size]);

  // Weight classes
  const weightClasses = useMemo(() => {
    const weights = {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    };
    return weights[weight];
  }, [weight]);

  // Format the number
  const formatNumber = (num: number): string => {
    const absNum = Math.abs(num);
    
    if (format === 'currency') {
      if (compact && absNum >= 1_000_000) {
        return `${num < 0 ? '-' : ''}$${(absNum / 1_000_000).toFixed(1)}M`;
      } else if (compact && absNum >= 1_000) {
        return `${num < 0 ? '-' : ''}$${(absNum / 1_000).toFixed(1)}K`;
      }
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(num);
    }
    
    if (format === 'percentage') {
      return `${num >= 0 ? '+' : ''}${num.toFixed(precision)}%`;
    }
    
    // Default number formatting
    if (compact && absNum >= 1_000_000) {
      return `${num < 0 ? '-' : ''}${(absNum / 1_000_000).toFixed(1)}M`;
    } else if (compact && absNum >= 1_000) {
      return `${num < 0 ? '-' : ''}${(absNum / 1_000).toFixed(1)}K`;
    }
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  };

  // Spring animation for the number
  const { displayValue } = useSpring({
    config: springPresets.smooth,
    from: { displayValue: previousVal },
    to: { displayValue: value },
    delay: animationDelay,
  });

  // Pulse animation for changes
  const pulseSpring = useSpring({
    config: springPresets.bouncy,
    from: { scale: 1, opacity: 0.8 },
    to: async (next) => {
      if (hasChanged && enablePulse) {
        await next({ scale: 1.05, opacity: 1 });
        await next({ scale: 1, opacity: 0.8 });
      }
    },
    reset: hasChanged,
  });

  // Change indicator animation
  const changeSpring = useSpring({
    config: springPresets.gentle,
    from: { opacity: 0, transform: 'translateY(-5px)' },
    to: { 
      opacity: showChange && hasChanged ? 1 : 0,
      transform: showChange && hasChanged ? 'translateY(0px)' : 'translateY(-5px)',
    },
  });

  // Glow effect for significant changes
  const glowSpring = useSpring({
    config: springPresets.fluid,
    from: { 
      boxShadow: '0 0 0px rgba(139, 92, 246, 0)',
      textShadow: '0 0 0px rgba(139, 92, 246, 0)',
    },
    to: {
      boxShadow: hasChanged && enablePulse 
        ? '0 0 20px rgba(139, 92, 246, 0.3)' 
        : '0 0 0px rgba(139, 92, 246, 0)',
      textShadow: hasChanged && enablePulse 
        ? '0 0 10px rgba(139, 92, 246, 0.5)' 
        : '0 0 0px rgba(139, 92, 246, 0)',
    },
  });

  return (
    <div className="relative inline-block">
      <animated.span
        style={{
          transform: enablePulse ? pulseSpring.scale.to(s => `scale(${s})`) : undefined,
          opacity: enablePulse ? pulseSpring.opacity : undefined,
          ...glowSpring,
        }}
        className={`
          ${sizeClasses}
          ${weightClasses}
          ${colorClasses}
          transition-colors duration-300 ease-out
          ${className}
        `}
      >
        {prefix}
        <animated.span>
          {displayValue.to((val: number) => formatNumber(val))}
        </animated.span>
        {suffix}
      </animated.span>

      {/* Change indicator */}
      {showChange && previousValue !== undefined && (
        <animated.div
          style={changeSpring}
          className={`
            absolute -top-1 -right-1 text-xs px-1.5 py-0.5 rounded-full
            ${value > previousValue 
              ? isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
              : value < previousValue
              ? isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
              : isDarkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600'
            }
          `}
        >
          {value > previousValue ? '↗' : value < previousValue ? '↘' : '→'}
        </animated.div>
      )}

      {/* Loading shimmer effect */}
      {value === 0 && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded" />
      )}
    </div>
  );
};

// Wrapper component for common currency formatting
export const AnimatedCurrency: React.FC<Omit<AnimatedNumberProps, 'format'>> = (props) => (
  <AnimatedNumber {...props} format="currency" />
);

// Wrapper component for percentage formatting
export const AnimatedPercentage: React.FC<Omit<AnimatedNumberProps, 'format'>> = (props) => (
  <AnimatedNumber {...props} format="percentage" />
);

// Wrapper component for compact currency (e.g., $1.2M)
export const AnimatedCompactCurrency: React.FC<Omit<AnimatedNumberProps, 'format' | 'compact'>> = (props) => (
  <AnimatedNumber {...props} format="currency" compact />
);

export default AnimatedNumber;