// Professional Design System for Dilly's Dally
// World-class typography, spacing, and visual system

// ========================================
// TYPOGRAPHY SYSTEM - Professional Hierarchy
// ========================================

export const typography = {
  // Display - For hero numbers and primary metrics (like $40,587)
  display: {
    xl: 'text-5xl font-bold tracking-tight leading-none', // 48px - Major financial metrics
    lg: 'text-4xl font-bold tracking-tight leading-tight', // 36px - Section totals
    md: 'text-3xl font-bold tracking-tight leading-tight', // 30px - Page headers
    sm: 'text-2xl font-bold tracking-tight leading-tight', // 24px - Card headers
  },

  // Headings - For section headers and navigation
  heading: {
    xl: 'text-2xl font-semibold tracking-tight leading-tight', // 24px - Main page titles
    lg: 'text-xl font-semibold tracking-tight leading-tight', // 20px - Section headers
    md: 'text-lg font-semibold tracking-tight leading-tight', // 18px - Card titles
    sm: 'text-base font-semibold tracking-tight leading-tight', // 16px - Sub-sections
  },

  // Body text - For readable content
  body: {
    xl: 'text-lg font-normal leading-relaxed', // 18px - Important descriptions
    lg: 'text-base font-normal leading-relaxed', // 16px - Standard body text
    md: 'text-sm font-normal leading-relaxed', // 14px - Secondary content
    sm: 'text-xs font-normal leading-relaxed', // 12px - Helper text
  },

  // Interactive elements
  interactive: {
    button: 'text-sm font-medium leading-tight', // 14px - Buttons
    link: 'text-sm font-medium leading-tight hover:underline', // 14px - Links
    nav: 'text-sm font-medium leading-tight', // 14px - Navigation items
  },

  // Data and metrics
  data: {
    primary: 'text-2xl font-bold tracking-tight tabular-nums', // 24px - Key numbers
    secondary: 'text-lg font-semibold tracking-tight tabular-nums', // 18px - Supporting numbers
    small: 'text-sm font-medium tracking-tight tabular-nums', // 14px - Small metrics
    caption: 'text-xs font-normal tracking-wide uppercase', // 12px - Data labels
  },
};

// ========================================
// SPACING SYSTEM - 8px Grid for Mathematical Precision
// ========================================

export const spacing = {
  // Base spacing units (multiples of 8px for perfect alignment)
  px: '1px',
  0: '0',
  1: '4px',   // 0.5 * 8px
  2: '8px',   // 1 * 8px
  3: '12px',  // 1.5 * 8px
  4: '16px',  // 2 * 8px
  5: '20px',  // 2.5 * 8px
  6: '24px',  // 3 * 8px
  8: '32px',  // 4 * 8px
  10: '40px', // 5 * 8px
  12: '48px', // 6 * 8px
  16: '64px', // 8 * 8px
  20: '80px', // 10 * 8px
  24: '96px', // 12 * 8px
  32: '128px', // 16 * 8px

  // Semantic spacing for components
  component: {
    // Internal padding for components
    tight: '8px 12px',     // Compact buttons, tags
    comfortable: '12px 16px', // Standard buttons, inputs
    spacious: '16px 24px',    // Large buttons, cards
    
    // Margins between components
    stack: {
      xs: '4px',  // Tight stacking (related items)
      sm: '8px',  // Close items
      md: '16px', // Standard spacing
      lg: '24px', // Section spacing
      xl: '32px', // Page section spacing
    },
  },

  // Layout spacing
  layout: {
    section: '48px',     // Between major page sections
    container: '32px',   // Container padding
    sidebar: '64px',     // Sidebar spacing
  },
};

// ========================================
// COLOR SYSTEM - Professional Purple Theme
// ========================================

export const colors = {
  // Primary brand colors (your distinctive purple theme)
  primary: {
    50: '#faf7ff',   // Lightest tint
    100: '#f4edff',  // Very light
    200: '#e9d8ff',  // Light
    300: '#d6bbff',  // Medium light
    400: '#c191ff',  // Medium
    500: '#a855f7',  // Base purple (primary)
    600: '#9333ea',  // Medium dark
    700: '#7c2d12',  // Dark
    800: '#581c87',  // Very dark
    900: '#3b1065',  // Darkest
  },

  // Semantic colors for different states
  semantic: {
    success: {
      light: '#10b981',   // Green for positive values
      dark: '#059669',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    warning: {
      light: '#f59e0b',   // Amber for warnings
      dark: '#d97706',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
    error: {
      light: '#ef4444',   // Red for errors/negative
      dark: '#dc2626',
      bg: 'rgba(239, 68, 68, 0.1)',
    },
    info: {
      light: '#3b82f6',   // Blue for information
      dark: '#2563eb',
      bg: 'rgba(59, 130, 246, 0.1)',
    },
  },

  // Dark theme colors (your app's foundation)
  dark: {
    // Backgrounds - Multiple layers for depth
    bg: {
      primary: '#0f0f0f',     // Main background (almost black)
      secondary: '#1a1a1a',   // Card backgrounds
      tertiary: '#2a2a2a',    // Elevated elements
      overlay: 'rgba(0, 0, 0, 0.8)', // Modal overlays
    },
    
    // Text colors - Clear hierarchy
    text: {
      primary: '#ffffff',     // Main text (pure white)
      secondary: '#e5e5e5',   // Secondary text (light gray)
      tertiary: '#a3a3a3',    // Supporting text (medium gray)
      disabled: '#525252',    // Disabled text (dark gray)
      inverse: '#000000',     // Text on light backgrounds
    },

    // Border colors
    border: {
      primary: '#404040',     // Main borders
      secondary: '#2a2a2a',   // Subtle borders
      accent: '#a855f7',      // Purple borders for focus
    },

    // Interactive states
    interactive: {
      hover: 'rgba(255, 255, 255, 0.05)',   // Subtle hover
      active: 'rgba(255, 255, 255, 0.1)',   // Active state
      focus: 'rgba(168, 85, 247, 0.2)',     // Purple focus ring
    },
  },

  // Glass morphism effects (your signature style)
  glass: {
    background: 'rgba(255, 255, 255, 0.05)',  // Subtle glass background
    border: 'rgba(255, 255, 255, 0.1)',       // Glass border
    shadow: '0 8px 32px rgba(168, 85, 247, 0.15)', // Purple-tinted shadow
    blur: 'blur(20px)',                        // Backdrop blur
  },
};

// ========================================
// COMPONENT VARIANTS - Reusable Patterns
// ========================================

export const variants = {
  // Card variants for different use cases
  card: {
    default: `
      bg-white/5 backdrop-blur-xl 
      border border-white/10 
      rounded-2xl shadow-lg shadow-purple-500/10
      transition-all duration-300 ease-out
    `,
    elevated: `
      bg-white/10 backdrop-blur-xl 
      border border-white/20 
      rounded-2xl shadow-xl shadow-purple-500/20
      transform hover:scale-[1.02] hover:-translate-y-1
      transition-all duration-300 ease-out
    `,
    interactive: `
      bg-white/5 backdrop-blur-xl 
      border border-white/10 hover:border-purple-500/50
      rounded-2xl shadow-lg shadow-purple-500/10
      hover:shadow-xl hover:shadow-purple-500/20
      cursor-pointer transform hover:scale-[1.01] hover:-translate-y-0.5
      transition-all duration-300 ease-out
    `,
    metric: `
      bg-gradient-to-br from-purple-500/10 to-purple-600/10 
      backdrop-blur-xl border border-purple-500/20
      rounded-2xl shadow-lg shadow-purple-500/25
      transition-all duration-300 ease-out
    `,
  },

  // Button variants for different actions
  button: {
    primary: `
      bg-gradient-to-r from-purple-600 to-purple-500 
      text-white font-medium
      border border-purple-500/50
      rounded-xl px-6 py-3
      shadow-lg shadow-purple-500/25
      hover:shadow-xl hover:shadow-purple-500/40
      hover:scale-105 active:scale-95
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-purple-500/50
    `,
    secondary: `
      bg-white/10 backdrop-blur-xl 
      text-white font-medium
      border border-white/20 hover:border-purple-500/50
      rounded-xl px-6 py-3
      shadow-lg shadow-black/10
      hover:bg-white/20 hover:scale-105 active:scale-95
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-purple-500/50
    `,
    ghost: `
      bg-transparent text-white/80 hover:text-white font-medium
      border border-transparent hover:border-white/20
      rounded-xl px-6 py-3
      hover:bg-white/10 hover:scale-105 active:scale-95
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-purple-500/50
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-red-500 
      text-white font-medium
      border border-red-500/50
      rounded-xl px-6 py-3
      shadow-lg shadow-red-500/25
      hover:shadow-xl hover:shadow-red-500/40
      hover:scale-105 active:scale-95
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-red-500/50
    `,
  },

  // Input variants
  input: {
    default: `
      bg-white/10 backdrop-blur-xl 
      border border-white/20 focus:border-purple-500/50
      rounded-xl px-4 py-3
      text-white placeholder-white/50
      shadow-lg shadow-black/10
      focus:shadow-xl focus:shadow-purple-500/20
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-purple-500/50
    `,
  },
};

// ========================================
// ANIMATION PRESETS - Smooth Micro-interactions
// ========================================

export const animations = {
  // Duration values (in milliseconds)
  duration: {
    fast: 150,      // Quick interactions
    normal: 300,    // Standard transitions
    slow: 500,      // Dramatic effects
  },

  // Easing curves for natural motion
  easing: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',  // Material Design standard
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)', // Slow out
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',   // Fast out
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',      // Sharp curve
  },

  // Common transition patterns
  transition: {
    smooth: 'all 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    fast: 'all 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    slow: 'all 500ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },

  // Hover effects
  hover: {
    lift: 'transform hover:scale-105 hover:-translate-y-1',
    glow: 'hover:shadow-xl hover:shadow-purple-500/30',
    fade: 'hover:opacity-80',
  },
};

// ========================================
// UTILITY FUNCTIONS - Helper Methods
// ========================================

export const utils = {
  // Combine multiple class strings safely
  cn: (...classes: (string | undefined | null | false)[]): string => {
    return classes.filter(Boolean).join(' ');
  },

  // Get responsive text size based on importance
  getTextSize: (importance: 'primary' | 'secondary' | 'tertiary' = 'secondary') => {
    switch (importance) {
      case 'primary': return typography.heading.lg;
      case 'secondary': return typography.body.lg;
      case 'tertiary': return typography.body.md;
      default: return typography.body.lg;
    }
  },

  // Get spacing value
  getSpacing: (size: keyof typeof spacing) => spacing[size],

  // Get color with opacity
  withOpacity: (color: string, opacity: number) => {
    return `${color}/${Math.round(opacity * 100)}`;
  },
};

// ========================================
// EXPORT DEFAULT - Main Design System Object
// ========================================

export const designSystem = {
  typography,
  spacing,
  colors,
  variants,
  animations,
  utils,
};

export default designSystem;