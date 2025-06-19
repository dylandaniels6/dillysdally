// This file helps manage dark mode and light mode colors in one place
// Instead of writing the same dark mode checks everywhere!

export const theme = {
  // Card backgrounds (like boxes around content)
  card: (darkMode: boolean) => 
    darkMode 
      ? 'bg-gray-800 border border-gray-700' 
      : 'bg-white border border-gray-200 shadow-sm',
  
  // Main text color
  text: (darkMode: boolean) =>
    darkMode ? 'text-white' : 'text-gray-900',
    
  // Secondary text (less important text)
  secondaryText: (darkMode: boolean) =>
    darkMode ? 'text-gray-400' : 'text-gray-600',
    
  // Page background
  background: (darkMode: boolean) =>
    darkMode ? 'bg-gray-950' : 'bg-gray-50',
    
  // Hover effects
  hover: (darkMode: boolean) =>
    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
    
  // Input fields
  input: (darkMode: boolean) =>
    darkMode 
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500',
      
  // Buttons
  button: (darkMode: boolean) =>
    darkMode
      ? 'bg-gray-700 hover:bg-gray-600 text-white'
      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
};