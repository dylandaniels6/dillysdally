import { SpringConfig } from 'react-spring';

// Apple-inspired animation presets with enhanced smoothness
export const springPresets = {
  // Gentle, organic feeling - like iOS interface elements
  gentle: {
    tension: 120,
    friction: 14,
    precision: 0.1,
  } as SpringConfig,

  // Quick and snappy - for buttons and immediate feedback
  snappy: {
    tension: 300,
    friction: 30,
    precision: 0.1,
  } as SpringConfig,

  // Smooth and fluid - for value changes and transitions
  fluid: {
    tension: 200,
    friction: 25,
    precision: 0.1,
  } as SpringConfig,

  // Bouncy but controlled - for success states
  bouncy: {
    tension: 180,
    friction: 12,
    precision: 0.1,
  } as SpringConfig,

  // Slow and deliberate - for large transitions
  slow: {
    tension: 80,
    friction: 20,
    precision: 0.1,
  } as SpringConfig,

  // Ultra smooth - for number counters (Apple-like precision)
  smooth: {
    tension: 100,
    friction: 26,
    precision: 0.001,
  } as SpringConfig,

  // Elastic bounce for delightful interactions
  elastic: {
    tension: 150,
    friction: 10,
    precision: 0.1,
  } as SpringConfig,
};

// Animation durations (in ms) - Apple timing
export const durations = {
  instant: 0,
  micro: 100,    // Micro-interactions
  fast: 200,     // Quick feedback
  normal: 300,   // Standard transitions
  slow: 500,     // Deliberate changes
  slower: 800,   // Major state changes
  glacial: 1200, // Page transitions
};

// Apple's exact easing curves
export const easings = {
  // Apple's standard easing (most common)
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  
  // Apple's emphasized easing (for important elements)
  emphasized: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  
  // Apple's accelerate
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  
  // Apple's decelerate
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  
  // Sharp entrance/exit
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  
  // Playful bounce
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // Elastic feel
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',

  // iOS spring feel
  spring: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
};

// Your app's signature purple gradient theme
export const colorTheme = {
  primary: {
    gradient: ['#8B5CF6', '#A855F7', '#C084FC'], // Purple gradient
    solid: '#8B5CF6',
    light: '#EDE9FE',
    dark: '#6D28D9',
  },
  success: {
    gradient: ['#10B981', '#34D399', '#6EE7B7'], // Green gradient
    solid: '#10B981',
    light: '#D1FAE5',
    dark: '#047857',
  },
  warning: {
    gradient: ['#F59E0B', '#FBBF24', '#FCD34D'], // Amber gradient
    solid: '#F59E0B',
    light: '#FEF3C7',
    dark: '#D97706',
  },
  danger: {
    gradient: ['#EF4444', '#F87171', '#FCA5A5'], // Red gradient
    solid: '#EF4444',
    light: '#FEE2E2',
    dark: '#DC2626',
  },
  neutral: {
    gradient: ['#6B7280', '#9CA3AF', '#D1D5DB'], // Gray gradient
    solid: '#6B7280',
    light: '#F9FAFB',
    dark: '#374151',
  },
};

// Stagger delays for sequential animations (Apple-style)
export const staggerDelays = {
  cards: 60,     // For cards appearing in sequence
  items: 40,     // For list items
  numbers: 120,  // For animated numbers (slower for emphasis)
  charts: 180,   // For chart elements
  assets: 80,    // For asset list items
};

// Scale transforms for hover effects (subtle like Apple)
export const scaleTransforms = {
  subtle: 1.015,  // Barely noticeable
  gentle: 1.03,   // Gentle lift
  obvious: 1.05,  // Clear interaction feedback
  dramatic: 1.08, // For emphasis
};

// Framer Motion variants with Apple-inspired timing
export const motionVariants = {
  // Fade in with perfect Apple timing
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: durations.normal / 1000,
        ease: [0.4, 0.0, 0.2, 1]
      }
    },
  },

  // Slide up from bottom (iOS style)
  slideUp: {
    hidden: { opacity: 0, y: 24 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: durations.normal / 1000,
        ease: [0.4, 0.0, 0.2, 1]
      }
    },
  },

  // Scale in from center (card appearance)
  scaleIn: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: durations.normal / 1000,
        ease: [0.4, 0.0, 0.2, 1]
      }
    },
  },

  // Stagger children (perfect for lists)
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelays.items / 1000,
        delayChildren: 0.1,
      },
    },
  },

  // Hover scale effect (Apple button style)
  hoverScale: {
    rest: { scale: 1 },
    hover: { 
      scale: scaleTransforms.gentle,
      transition: { 
        duration: durations.fast / 1000,
        ease: [0.4, 0.0, 0.2, 1]
      }
    },
  },

  // Press effect (Apple button press)
  tapScale: {
    rest: { scale: 1 },
    tap: { 
      scale: 0.97,
      transition: { 
        duration: durations.micro / 1000
      }
    },
  },

  // Number counter animation
  numberCount: {
    hidden: { scale: 0.9, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        duration: durations.slow / 1000,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
  },

  // Glass morphism card entrance
  glassCard: {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      backdropFilter: 'blur(0px)',
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      backdropFilter: 'blur(20px)',
      transition: { 
        duration: durations.slow / 1000,
        ease: [0.4, 0.0, 0.2, 1]
      }
    },
  },
};

// Glass morphism effect values (Apple-inspired)
export const glassEffect = {
  blur: 'blur(20px)',
  saturate: 'saturate(180%)',
  opacity: 0.1,
  border: 'rgba(255, 255, 255, 0.125)',
  shadow: '0 8px 32px 0 rgba(139, 92, 246, 0.15)', // Purple tinted shadow
  backdrop: 'rgba(255, 255, 255, 0.05)',
};

// Color transition presets with perfect Apple timing
export const colorTransitions = {
  smooth: `all ${durations.normal}ms ${easings.standard}`,
  fast: `all ${durations.fast}ms ${easings.standard}`,
  slow: `all ${durations.slow}ms ${easings.standard}`,
  spring: `all ${durations.normal}ms ${easings.spring}`,
};

// Shadow presets (Apple's design system)
export const shadows = {
  subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  gentle: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  moderate: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  strong: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  dramatic: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  // Purple-tinted shadows for key elements
  purple: {
    subtle: '0 4px 20px rgba(139, 92, 246, 0.1)',
    moderate: '0 8px 30px rgba(139, 92, 246, 0.15)',
    strong: '0 12px 40px rgba(139, 92, 246, 0.2)',
  },
};

// Border radius values (Apple's system)
export const borderRadius = {
  none: '0',
  small: '4px',
  default: '8px',
  medium: '12px',
  large: '16px',
  xl: '20px',
  full: '9999px',
  
  // Apple's card radius
  card: '16px',
  button: '12px',
  input: '10px',
};