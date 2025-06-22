import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { designSystem } from '../../utils/designSystem';

// ========================================
// BUTTON COMPONENT TYPES
// ========================================

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
}

// ========================================
// BUTTON VARIANTS - Different Visual Styles
// ========================================

const buttonVariants = {
  primary: `
    bg-gradient-to-r from-purple-600 to-purple-500 
    text-white font-medium
    border border-purple-500/50
    shadow-lg shadow-purple-500/25
    hover:shadow-xl hover:shadow-purple-500/40
    hover:from-purple-500 hover:to-purple-400
    active:from-purple-700 active:to-purple-600
    focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-transparent
  `,
  
  secondary: `
    bg-white/10 backdrop-blur-xl 
    text-white font-medium
    border border-white/20 hover:border-purple-500/50
    shadow-lg shadow-black/10
    hover:bg-white/20 hover:shadow-xl hover:shadow-purple-500/20
    active:bg-white/5
    focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-transparent
  `,
  
  ghost: `
    bg-transparent text-white/80 hover:text-white font-medium
    border border-transparent hover:border-white/20
    hover:bg-white/10 hover:shadow-lg hover:shadow-black/10
    active:bg-white/5
    focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-transparent
  `,
  
  danger: `
    bg-gradient-to-r from-red-600 to-red-500 
    text-white font-medium
    border border-red-500/50
    shadow-lg shadow-red-500/25
    hover:shadow-xl hover:shadow-red-500/40
    hover:from-red-500 hover:to-red-400
    active:from-red-700 active:to-red-600
    focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-transparent
  `,
  
  success: `
    bg-gradient-to-r from-green-600 to-green-500 
    text-white font-medium
    border border-green-500/50
    shadow-lg shadow-green-500/25
    hover:shadow-xl hover:shadow-green-500/40
    hover:from-green-500 hover:to-green-400
    active:from-green-700 active:to-green-600
    focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-transparent
  `,
};

// ========================================
// SIZE VARIANTS - Different Button Sizes
// ========================================

const sizeVariants = {
  sm: {
    button: 'px-3 py-2 text-sm rounded-lg',
    icon: 'w-4 h-4',
  },
  md: {
    button: 'px-4 py-3 text-sm rounded-xl',
    icon: 'w-5 h-5',
  },
  lg: {
    button: 'px-6 py-4 text-base rounded-xl',
    icon: 'w-5 h-5',
  },
  xl: {
    button: 'px-8 py-5 text-lg rounded-2xl',
    icon: 'w-6 h-6',
  },
};

// ========================================
// ANIMATION VARIANTS - Framer Motion
// ========================================

const motionVariants = {
  idle: { 
    scale: 1,
    y: 0,
  },
  hover: { 
    scale: 1.05,
    y: -2,
    transition: {
      duration: 0.2,
      ease: [0.4, 0.0, 0.2, 1],
    },
  },
  tap: { 
    scale: 0.95,
    y: 0,
    transition: {
      duration: 0.1,
      ease: [0.4, 0.0, 0.2, 1],
    },
  },
  disabled: {
    scale: 1,
    y: 0,
    opacity: 0.5,
  },
};

// ========================================
// LOADING SPINNER COMPONENT
// ========================================

const LoadingSpinner: React.FC<{ size: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size }) => {
  const spinnerSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  return (
    <div className={`${spinnerSize[size]} animate-spin`}>
      <div className="w-full h-full border-2 border-current border-t-transparent rounded-full" />
    </div>
  );
};

// ========================================
// MAIN BUTTON COMPONENT
// ========================================

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  ...motionProps
}) => {
  // Determine button state
  const isDisabled = disabled || loading;
  
  // Combine all the CSS classes
  const buttonClasses = designSystem.utils.cn(
    'relative inline-flex items-center justify-center',
    'font-medium transition-all duration-200 ease-out',
    'transform focus:outline-none',
    buttonVariants[variant],
    sizeVariants[size].button,
    fullWidth && 'w-full',
    isDisabled && 'cursor-not-allowed opacity-50',
    className
  );

  return (
    <motion.button
      className={buttonClasses}
      variants={motionVariants}
      initial="idle"
      whileHover={!isDisabled ? "hover" : undefined}
      whileTap={!isDisabled ? "tap" : undefined}
      animate={isDisabled ? "disabled" : "idle"}
      disabled={isDisabled}
      {...motionProps}
    >
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size={size} />
        </div>
      )}
      
      {/* Button content */}
      <div className={`flex items-center space-x-2 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {/* Icon on the left */}
        {icon && iconPosition === 'left' && (
          <span className={sizeVariants[size].icon}>
            {icon}
          </span>
        )}
        
        {/* Button text */}
        <span>{children}</span>
        
        {/* Icon on the right */}
        {icon && iconPosition === 'right' && (
          <span className={sizeVariants[size].icon}>
            {icon}
          </span>
        )}
      </div>
    </motion.button>
  );
};

// ========================================
// SPECIALIZED BUTTON COMPONENTS
// ========================================

// Icon Button - For buttons with only icons
export const IconButton: React.FC<{
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  title?: string;
}> = ({ icon, size = 'md', variant = 'ghost', className, title, ...props }) => {
  const iconSizes = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={designSystem.utils.cn(
        iconSizes[size],
        'aspect-square',
        className
      )}
      title={title}
      {...props}
    >
      {icon}
    </Button>
  );
};

// Button Group - For related actions
export const ButtonGroup: React.FC<{
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ children, orientation = 'horizontal', size = 'md', className }) => {
  const orientationClasses = {
    horizontal: 'flex-row space-x-2',
    vertical: 'flex-col space-y-2',
  };

  return (
    <div className={designSystem.utils.cn(
      'flex',
      orientationClasses[orientation],
      className
    )}>
      {children}
    </div>
  );
};

// Floating Action Button - For primary actions
export const FloatingActionButton: React.FC<{
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}> = ({ icon, onClick, className, position = 'bottom-right' }) => {
  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6',
  };

  return (
    <motion.button
      className={designSystem.utils.cn(
        positionClasses[position],
        'z-50 p-4 bg-gradient-to-r from-purple-600 to-purple-500',
        'text-white rounded-full shadow-xl shadow-purple-500/30',
        'hover:shadow-2xl hover:shadow-purple-500/50',
        'transform hover:scale-110 active:scale-95',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
        className
      )}
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      {icon}
    </motion.button>
  );
};

// Split Button - Button with dropdown
export const SplitButton: React.FC<{
  children: React.ReactNode;
  onMainClick?: () => void;
  onDropdownClick?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ children, onMainClick, onDropdownClick, variant = 'primary', size = 'md', className }) => {
  return (
    <div className={designSystem.utils.cn('flex', className)}>
      <Button
        variant={variant}
        size={size}
        onClick={onMainClick}
        className="rounded-r-none border-r-0"
      >
        {children}
      </Button>
      <Button
        variant={variant}
        size={size}
        onClick={onDropdownClick}
        className="rounded-l-none px-3"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>
    </div>
  );
};

// ========================================
// EXPORTS
// ========================================

export default Button;