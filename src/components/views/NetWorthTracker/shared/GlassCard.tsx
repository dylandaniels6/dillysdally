import React, { forwardRef, ReactNode } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { glassEffect, shadows, borderRadius, motionVariants } from '../utils/animationPresets';

interface GlassCardProps extends Omit<MotionProps, 'children'> {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle' | 'primary';
  size?: 'small' | 'medium' | 'large';
  padding?: 'none' | 'small' | 'medium' | 'large';
  blur?: 'none' | 'light' | 'medium' | 'strong';
  border?: boolean;
  shadow?: 'none' | 'subtle' | 'moderate' | 'strong' | 'purple';
  rounded?: 'small' | 'medium' | 'large' | 'xl';
  isDarkMode?: boolean;
  hover?: boolean;
  clickable?: boolean;
  gradient?: boolean;
  glow?: boolean;
  loading?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({
  children,
  className = '',
  variant = 'default',
  size = 'medium',
  padding = 'medium',
  blur = 'medium',
  border = true,
  shadow = 'moderate',
  rounded = 'large',
  isDarkMode = false,
  hover = false,
  clickable = false,
  gradient = false,
  glow = false,
  loading = false,
  ...motionProps
}, ref) => {
  
  // Variant styles
  const variantClasses = {
    default: isDarkMode 
      ? 'bg-gray-800/40 border-gray-700/50' 
      : 'bg-white/40 border-gray-200/50',
    elevated: isDarkMode 
      ? 'bg-gray-800/60 border-gray-600/50' 
      : 'bg-white/60 border-gray-200/60',
    subtle: isDarkMode 
      ? 'bg-gray-900/20 border-gray-800/30' 
      : 'bg-white/20 border-gray-100/30',
    primary: isDarkMode 
      ? 'bg-purple-900/30 border-purple-700/40' 
      : 'bg-purple-50/60 border-purple-200/50',
  };

  // Size classes
  const sizeClasses = {
    small: 'min-h-[120px]',
    medium: 'min-h-[160px]',
    large: 'min-h-[240px]',
  };

  // Padding classes
  const paddingClasses = {
    none: 'p-0',
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
  };

  // Blur intensity
  const blurClasses = {
    none: '',
    light: 'backdrop-blur-sm',
    medium: 'backdrop-blur-md',
    strong: 'backdrop-blur-lg',
  };

  // Shadow classes
  const shadowClasses = {
    none: '',
    subtle: 'shadow-sm',
    moderate: 'shadow-md',
    strong: 'shadow-lg',
    purple: '', // Custom purple shadow applied via style
  };

  // Border radius classes
  const roundedClasses = {
    small: 'rounded-lg',
    medium: 'rounded-xl',
    large: 'rounded-2xl',
    xl: 'rounded-3xl',
  };

  // Gradient background
  const gradientStyle = gradient ? {
    background: isDarkMode 
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)'
      : 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(168, 85, 247, 0.02) 100%)',
  } : {};

  // Glow effect
  const glowStyle = glow ? {
    boxShadow: isDarkMode 
      ? '0 0 30px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      : '0 0 30px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
  } : {};

  // Purple shadow
  const purpleShadowStyle = shadow === 'purple' ? {
    boxShadow: isDarkMode
      ? '0 10px 25px rgba(139, 92, 246, 0.15), 0 4px 10px rgba(139, 92, 246, 0.1)'
      : '0 10px 25px rgba(139, 92, 246, 0.1), 0 4px 10px rgba(139, 92, 246, 0.05)',
  } : {};

  // Loading shimmer
  const loadingOverlay = loading && (
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse rounded-inherit" />
  );

  // Hover and click animations
  const hoverVariants = hover ? {
    rest: { 
      scale: 1,
      backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.4)' : 'rgba(255, 255, 255, 0.4)',
    },
    hover: { 
      scale: 1.02,
      backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.6)' : 'rgba(255, 255, 255, 0.6)',
      transition: { duration: 0.2 }
    },
  } : {};

  const tapVariants = clickable ? {
    tap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    },
  } : {};

  // Combine all styles
  const combinedClassName = `
    relative overflow-hidden transition-all duration-300 ease-out
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${paddingClasses[padding]}
    ${blurClasses[blur]}
    ${shadowClasses[shadow]}
    ${roundedClasses[rounded]}
    ${border ? 'border' : ''}
    ${clickable ? 'cursor-pointer select-none' : ''}
    ${className}
  `.trim();

  const combinedStyle = {
    ...gradientStyle,
    ...glowStyle,
    ...purpleShadowStyle,
  };

  return (
    <motion.div
      ref={ref}
      className={combinedClassName}
      style={combinedStyle}
      variants={{
        ...motionVariants.glassCard,
        ...hoverVariants,
        ...tapVariants,
      }}
      initial="hidden"
      animate="visible"
      whileHover={hover ? "hover" : undefined}
      whileTap={clickable ? "tap" : undefined}
      {...motionProps}
    >
      {children}
      {loadingOverlay}
      
      {/* Subtle inner border for extra polish */}
      {border && (
        <div 
          className={`
            absolute inset-[1px] rounded-inherit pointer-events-none
            ${isDarkMode 
              ? 'bg-gradient-to-b from-white/5 to-transparent' 
              : 'bg-gradient-to-b from-white/50 to-transparent'
            }
          `} 
        />
      )}
    </motion.div>
  );
});

GlassCard.displayName = 'GlassCard';

// Specialized variants for common use cases
export const MetricCard = forwardRef<HTMLDivElement, Omit<GlassCardProps, 'variant' | 'padding' | 'hover'>>(
  (props, ref) => (
    <GlassCard 
      ref={ref}
      variant="elevated"
      padding="large"
      hover={true}
      shadow="purple"
      glow={true}
      {...props}
    />
  )
);

MetricCard.displayName = 'MetricCard';

export const ChartCard = forwardRef<HTMLDivElement, Omit<GlassCardProps, 'variant' | 'padding'>>(
  (props, ref) => (
    <GlassCard 
      ref={ref}
      variant="default"
      padding="medium"
      shadow="moderate"
      {...props}
    />
  )
);

ChartCard.displayName = 'ChartCard';

export const ActionCard = forwardRef<HTMLDivElement, Omit<GlassCardProps, 'clickable' | 'hover'>>(
  (props, ref) => (
    <GlassCard 
      ref={ref}
      clickable={true}
      hover={true}
      shadow="subtle"
      {...props}
    />
  )
);

ActionCard.displayName = 'ActionCard';

export default GlassCard;