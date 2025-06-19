import React, { forwardRef, ReactNode } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { springPresets, colorTheme, durations, motionVariants } from '../utils/animationPresets';

interface SpringButtonProps extends Omit<MotionProps, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  isDarkMode?: boolean;
  glow?: boolean;
  onClick?: () => void | Promise<void>;
}

export const SpringButton = forwardRef<HTMLButtonElement, SpringButtonProps>(({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  isDarkMode = false,
  glow = false,
  onClick,
  ...motionProps
}, ref) => {

  // Variant styles
  const variantClasses = {
    primary: isDarkMode
      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white border-purple-500/50'
      : 'bg-gradient-to-r from-purple-600 to-purple-500 text-white border-purple-500/50',
    secondary: isDarkMode
      ? 'bg-gray-800/60 text-gray-200 border-gray-600/50 hover:bg-gray-700/80'
      : 'bg-gray-100/80 text-gray-700 border-gray-300/50 hover:bg-gray-200/80',
    success: isDarkMode
      ? 'bg-gradient-to-r from-green-600 to-green-500 text-white border-green-500/50'
      : 'bg-gradient-to-r from-green-600 to-green-500 text-white border-green-500/50',
    danger: isDarkMode
      ? 'bg-gradient-to-r from-red-600 to-red-500 text-white border-red-500/50'
      : 'bg-gradient-to-r from-red-600 to-red-500 text-white border-red-500/50',
    ghost: isDarkMode
      ? 'bg-transparent text-gray-300 border-gray-600/30 hover:bg-gray-800/40'
      : 'bg-transparent text-gray-600 border-gray-300/30 hover:bg-gray-100/40',
  };

  // Size classes
  const sizeClasses = {
    small: 'px-3 py-2 text-sm',
    medium: 'px-4 py-2.5 text-base',
    large: 'px-6 py-3 text-lg',
  };

  // Disabled state
  const disabledClasses = disabled || loading
    ? 'opacity-50 cursor-not-allowed pointer-events-none'
    : 'cursor-pointer';

  // Glow effect for primary actions
  const glowStyle = glow && variant === 'primary' ? {
    boxShadow: isDarkMode
      ? '0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)'
      : '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1)',
  } : {};

  // Loading spinner
  const LoadingSpinner = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
    />
  );

  // Icon rendering
  const renderIcon = (position: 'left' | 'right') => {
    if (!icon || iconPosition !== position) return null;
    
    return (
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex items-center ${
          position === 'left' ? 'mr-2' : 'ml-2'
        }`}
      >
        {icon}
      </motion.span>
    );
  };

  // Combined class names
  const combinedClassName = `
    relative inline-flex items-center justify-center
    font-medium rounded-xl border backdrop-blur-sm
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2
    ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${disabledClasses}
    ${className}
  `.trim();

  // Handle click with haptic feedback simulation
  const handleClick = async () => {
    if (disabled || loading || !onClick) return;
    
    // Haptic feedback simulation (visual)
    try {
      await onClick();
    } catch (error) {
      console.error('Button click error:', error);
    }
  };

  return (
    <motion.button
      ref={ref}
      className={combinedClassName}
      style={glowStyle}
      variants={{
        rest: { 
          scale: 1,
          y: 0,
        },
        hover: { 
          scale: 1.02,
          y: -1,
          transition: { 
            duration: 0.2,
            ease: [0.4, 0.0, 0.2, 1]
          }
        },
        tap: { 
          scale: 0.98,
          y: 0,
          transition: { 
            duration: 0.1,
            ease: [0.4, 0.0, 0.2, 1]
          }
        },
      }}
      initial="rest"
      whileHover={!disabled && !loading ? "hover" : "rest"}
      whileTap={!disabled && !loading ? "tap" : "rest"}
      onClick={handleClick}
      disabled={disabled || loading}
      {...motionProps}
    >
      {/* Background gradient overlay for extra depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl pointer-events-none" />
      
      {/* Content */}
      <div className="relative flex items-center justify-center">
        {loading ? (
          <>
            <LoadingSpinner />
            {children && <span className="ml-2">{children}</span>}
          </>
        ) : (
          <>
            {renderIcon('left')}
            {children}
            {renderIcon('right')}
          </>
        )}
      </div>

      {/* Shine effect on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl opacity-0"
        initial={{ x: '-100%', opacity: 0 }}
        whileHover={{
          x: '100%',
          opacity: [0, 1, 0],
          transition: { duration: 0.6, ease: "easeInOut" }
        }}
      />
    </motion.button>
  );
});

SpringButton.displayName = 'SpringButton';

// Specialized button variants
export const PrimaryButton = forwardRef<HTMLButtonElement, Omit<SpringButtonProps, 'variant'>>(
  (props, ref) => <SpringButton ref={ref} variant="primary" glow {...props} />
);

export const SecondaryButton = forwardRef<HTMLButtonElement, Omit<SpringButtonProps, 'variant'>>(
  (props, ref) => <SpringButton ref={ref} variant="secondary" {...props} />
);

export const SuccessButton = forwardRef<HTMLButtonElement, Omit<SpringButtonProps, 'variant'>>(
  (props, ref) => <SpringButton ref={ref} variant="success" {...props} />
);

export const DangerButton = forwardRef<HTMLButtonElement, Omit<SpringButtonProps, 'variant'>>(
  (props, ref) => <SpringButton ref={ref} variant="danger" {...props} />
);

export const GhostButton = forwardRef<HTMLButtonElement, Omit<SpringButtonProps, 'variant'>>(
  (props, ref) => <SpringButton ref={ref} variant="ghost" {...props} />
);

PrimaryButton.displayName = 'PrimaryButton';
SecondaryButton.displayName = 'SecondaryButton';
SuccessButton.displayName = 'SuccessButton';
DangerButton.displayName = 'DangerButton';
GhostButton.displayName = 'GhostButton';

export default SpringButton;