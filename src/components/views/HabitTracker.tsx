import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Edit, Trash, CheckCircle, XCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { Habit } from '../../types';
import { formatISODate } from '../../utils/dateUtils';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';
import { useAuth } from '@clerk/clerk-react';

// 🔒 VALIDATION FUNCTIONS
const validateHabitData = (habit: Partial<Habit>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Title validation
  if (!habit.title || typeof habit.title !== 'string') {
    errors.push('Habit title is required');
  } else if (habit.title.length < 2) {
    errors.push('Habit title must be at least 2 characters');
  } else if (habit.title.length > 100) {
    errors.push('Habit title is too long (max 100 characters)');
  }

  // Description validation
  if (habit.description && typeof habit.description === 'string') {
    if (habit.description.length > 500) {
      errors.push('Description is too long (max 500 characters)');
    }
  }

  // Target validation
  if (habit.target === undefined || habit.target === null) {
    errors.push('Target is required');
  } else if (typeof habit.target !== 'number' || isNaN(habit.target)) {
    errors.push('Target must be a valid number');
  } else if (habit.target < 1) {
    errors.push('Target must be at least 1');
  } else if (habit.target > 100) {
    errors.push('Target cannot exceed 100');
  }

  // Progress validation
  if (habit.progress !== undefined && habit.progress !== null) {
    if (typeof habit.progress !== 'number' || isNaN(habit.progress)) {
      errors.push('Progress must be a valid number');
    } else if (habit.progress < 0) {
      errors.push('Progress cannot be negative');
    } else if (habit.target && habit.progress > habit.target * 2) {
      errors.push('Progress seems unusually high compared to target');
    }
  }

  // Frequency validation
  if (!habit.frequency || !['daily', 'weekly'].includes(habit.frequency)) {
    errors.push('Frequency must be either daily or weekly');
  }

  // Color validation
  if (habit.color && typeof habit.color === 'string') {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(habit.color)) {
      errors.push('Invalid color format (must be hex color)');
    }
  }

  return { valid: errors.length === 0, errors };
};

const sanitizeHabitInput = (input: string): string => {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
};

const sanitizeNumericInput = (value: any, min: number, max: number): number => {
  const num = parseInt(value);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(num, max));
};

// Enhanced validation hook
const useHabitValidation = () => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const validateHabit = (habit: Partial<Habit>) => {
    const validation = validateHabitData(habit);
    setValidationErrors(validation.errors);

    // Add warnings for potential issues
    const warnings: string[] = [];
    if (habit.target && habit.target > 50) {
      warnings.push('Very high target - consider starting smaller for better consistency');
    }
    if (habit.title && habit.title.length < 5) {
      warnings.push('Short title - consider adding more descriptive text');
    }
    if (!habit.description || habit.description.length < 10) {
      warnings.push('Adding a description can help you stay motivated');
    }
    setValidationWarnings(warnings);

    return validation.valid;
  };

  const clearValidation = () => {
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  return {
    validationErrors,
    validationWarnings,
    validateHabit,
    clearValidation
  };
};

const HabitTracker: React.FC = () => {
  const { habits, setHabits, selectedDate, isAuthenticated, user, settings } = useAppContext();
  const { getToken } = useAuth();
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  
  // 🔒 VALIDATION: Use validation hook
  const { validationErrors, validationWarnings, validateHabit, clearValidation } = useHabitValidation();
  
  const resetForm = () => {
    setIsAddingHabit(false);
    setEditingHabit(null);
    clearValidation();
  };
  
  // 🔒 VALIDATION: Enhanced save with validation
  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingHabit) return;

    // Sanitize inputs
    const sanitizedHabit = {
      ...editingHabit,
      title: sanitizeHabitInput(editingHabit.title),
      description: sanitizeHabitInput(editingHabit.description || ''),
      target: sanitizeNumericInput(editingHabit.target, 1, 100),
      progress: sanitizeNumericInput(editingHabit.progress, 0, editingHabit.target * 2)
    };

    // Validate the sanitized habit
    const isValid = validateHabit(sanitizedHabit);
    if (!isValid) {
      return; // Validation errors will be shown
    }
    
    try {
      if (sanitizedHabit.id) {
        // Update existing habit
        setHabits(habits.map(h => h.id === sanitizedHabit.id ? sanitizedHabit : h));
        
        // Update in Supabase if authenticated
        if (isAuthenticated && user) {
          const token = await getToken();
          if (!token) throw new Error('No authentication token');
          
          const supabase = createAuthenticatedSupabaseClient(token, user.id);

          const { error } = await supabase
            .from('habits')
            .update({
              title: sanitizedHabit.title,
              description: sanitizedHabit.description,
              frequency: sanitizedHabit.frequency,
              target: sanitizedHabit.target,
              progress: sanitizedHabit.progress,
              completed: sanitizedHabit.progress >= sanitizedHabit.target,
              color: sanitizedHabit.color,
              completed_history: sanitizedHabit.completed,
            })
            .eq('id', sanitizedHabit.id);
          if (error) throw error;
        }
      } else {
        // Add new habit
        const newHabit: Habit = {
          ...sanitizedHabit,
          id: Date.now().toString(),
          createdAt: formatISODate(new Date()),
          progress: 0,
          completed: Array(7).fill(false)
        };
        setHabits([...habits, newHabit]);
        
        // Save to Supabase if authenticated
        if (isAuthenticated && user) {
          const token = await getToken();
          if (!token) throw new Error('No authentication token');
          
          const supabase = createAuthenticatedSupabaseClient(token, user.id);

          const { data, error } = await supabase
            .from('habits')
            .insert([{
              title: newHabit.title,
              description: newHabit.description,
              frequency: newHabit.frequency,
              target: newHabit.target,
              progress: newHabit.progress,
              completed: newHabit.progress >= newHabit.target,
              color: newHabit.color,
              completed_history: newHabit.completed,
              date: formatISODate(selectedDate),
              user_id: user.id
            }])
            .select()
            .single();
          if (error) throw error;
          
          // Update the habit with the Supabase ID
          setHabits(prev => 
            prev.map(habit => 
              habit.id === newHabit.id 
                ? { ...habit, id: data.id }
                : habit
            )
          );
        }
      }
      resetForm();
    } catch (error) {
      console.error('Error saving habit:', error);
      alert('Failed to save habit. Please try again.');
    }
  };
  
  // 🔒 VALIDATION: Enhanced delete with confirmation
  const handleDeleteHabit = async (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    // Enhanced confirmation
    const confirmMessage = `Are you sure you want to delete "${habit.title}"?\n\nThis action cannot be undone and will remove all progress data.`;
    if (!confirm(confirmMessage)) return;

    // Delete from local state
    setHabits(habits.filter(h => h.id !== id));
    
    // Delete from Supabase only if authenticated
    if (isAuthenticated) {
      try {
        const token = await getToken();
        if (!token) throw new Error('No authentication token');
        
        const supabase = createAuthenticatedSupabaseClient(token, user?.id);

        const { error } = await supabase
          .from('habits')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting habit:', error);
        // Revert local deletion on error
        setHabits(prev => [...prev, habit]);
        alert('Failed to delete habit from cloud. Please try again.');
      }
    }
  };
  
  // 🔒 VALIDATION: Enhanced progress update with validation
  const handleProgressUpdate = async (habit: Habit, increment: boolean) => {
    const updatedHabit = { ...habit };
    
    if (increment && updatedHabit.progress < updatedHabit.target) {
      updatedHabit.progress += 1;
    } else if (!increment && updatedHabit.progress > 0) {
      updatedHabit.progress -= 1;
    } else {
      // No change needed
      return;
    }

    // Validate the updated habit
    const validation = validateHabitData(updatedHabit);
    if (!validation.valid) {
      console.error('Progress update would create invalid habit:', validation.errors);
      alert('Cannot update progress: ' + validation.errors.join(', '));
      return;
    }
    
    // Update completed status for today
    const dayIndex = 6; // Assuming index 6 is today in the completed array
    updatedHabit.completed = [...updatedHabit.completed];
    updatedHabit.completed[dayIndex] = updatedHabit.progress >= updatedHabit.target;
    
    // Update local state
    setHabits(habits.map(h => h.id === habit.id ? updatedHabit : h));
    
    // Update in Supabase if authenticated
    if (isAuthenticated) {
      try {
        const token = await getToken();
        if (!token) throw new Error('No authentication token');
        
        const supabase = createAuthenticatedSupabaseClient(token, user?.id);

        const { error } = await supabase
          .from('habits')
          .update({
            progress: updatedHabit.progress,
            completed: updatedHabit.progress >= updatedHabit.target,
            completed_history: updatedHabit.completed
          })
          .eq('id', habit.id);
        if (error) throw error;
      } catch (error) {
        console.error('Error updating habit progress:', error);
        // Revert local change on error
        setHabits(habits.map(h => h.id === habit.id ? habit : h));
        alert('Failed to update progress. Please try again.');
      }
    }
  };
  
  const startAddHabit = () => {
    clearValidation();
    setEditingHabit({
      id: '',
      title: '',
      description: '',
      frequency: 'daily',
      target: 1,
      progress: 0,
      createdAt: '',
      color: '#3B82F6',
      icon: 'check',
      completed: Array(7).fill(false)
    });
    setIsAddingHabit(true);
  };
  
  const startEditHabit = (habit: Habit) => {
    clearValidation();
    setEditingHabit({ ...habit });
    setIsAddingHabit(true);
  };

  // 🔒 VALIDATION: Filter out invalid habits for display
  const validHabits = habits.filter(habit => {
    const validation = validateHabitData(habit);
    if (!validation.valid) {
      console.warn('Invalid habit found:', habit, validation.errors);
      return false;
    }
    return true;
  });

  const invalidHabitsCount = habits.length - validHabits.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${
            settings.darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Habit Tracker
          </h2>
          {/* 🔒 VALIDATION: Data quality indicator */}
          {invalidHabitsCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-yellow-500 mt-1">
              <AlertTriangle size={16} />
              <span>{invalidHabitsCount} invalid habit{invalidHabitsCount > 1 ? 's' : ''} excluded</span>
            </div>
          )}
        </div>
        <button
          onClick={startAddHabit}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span>Add Habit</span>
        </button>
      </div>
      
      {/* 🔒 VALIDATION: Validation errors display */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className="space-y-2">
          {validationErrors.length > 0 && (
            <div className={`p-4 rounded-xl border ${
              settings.darkMode 
                ? 'bg-red-900/20 border-red-700/50 text-red-400' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} />
                <h4 className="font-medium text-sm">Please fix these issues:</h4>
              </div>
              <ul className="text-xs space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validationWarnings.length > 0 && (
            <div className={`p-4 rounded-xl border ${
              settings.darkMode 
                ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-400' 
                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} />
                <h4 className="font-medium text-sm">Suggestions:</h4>
              </div>
              <ul className="text-xs space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Enhanced Habit Form with Validation */}
      {isAddingHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className={`max-w-md w-full p-6 rounded-lg shadow-lg ${
            settings.darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${
              settings.darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {editingHabit?.id ? 'Edit Habit' : 'Add New Habit'}
            </h3>
            
            <form onSubmit={handleSaveHabit}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={editingHabit?.title || ''}
                    onChange={e => {
                      const sanitized = sanitizeHabitInput(e.target.value);
                      setEditingHabit(prev => prev ? { ...prev, title: sanitized } : null);
                      if (editingHabit) {
                        validateHabit({ ...editingHabit, title: sanitized });
                      }
                    }}
                    placeholder="e.g., Morning Exercise"
                    maxLength={100}
                    className={`w-full px-3 py-2 border rounded-md ${
                      settings.darkMode 
                        ? 'border-gray-700 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="#3B82F6">Blue</option>
                    <option value="#10B981">Green</option>
                    <option value="#F59E0B">Yellow</option>
                    <option value="#EF4444">Red</option>
                    <option value="#8B5CF6">Purple</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className={`px-4 py-2 border rounded-md transition-colors ${
                    settings.darkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={validationErrors.length > 0}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    validationErrors.length > 0
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Enhanced Habits List with Validation */}
      <div className="grid gap-4">
        {validHabits.length === 0 ? (
          <div className={`text-center py-10 rounded-xl shadow-sm ${
            settings.darkMode 
              ? 'bg-gray-800 border border-gray-700' 
              : 'bg-white border border-gray-200'
          }`}>
            <p className={`mb-4 ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No habits created yet
            </p>
            <button
              onClick={startAddHabit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create your first habit
            </button>
          </div>
        ) : (
          validHabits.map(habit => (
            <div 
              key={habit.id}
              className={`rounded-xl shadow-sm p-5 transition-all hover:shadow-md ${
                settings.darkMode 
                  ? 'bg-gray-800 border border-gray-700' 
                  : 'bg-white border border-gray-200'
              }`}
              style={{ borderLeft: `4px solid ${habit.color}` }}
            >
              <div className="flex justify-between">
                <div>
                  <h3 className={`font-semibold text-lg ${
                    settings.darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {habit.title}
                  </h3>
                  {habit.description && (
                    <p className={`text-sm mt-1 ${
                      settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {habit.description}
                    </p>
                  )}
                  {/* Progress validation indicator */}
                  {habit.progress > habit.target && (
                    <div className="flex items-center gap-1 text-xs text-yellow-500 mt-1">
                      <AlertTriangle size={12} />
                      <span>Progress exceeds target</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => startEditHabit(habit)}
                    className={`p-1 transition-colors ${
                      settings.darkMode 
                        ? 'text-gray-400 hover:text-gray-200' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteHabit(habit.id)}
                    className={`p-1 transition-colors ${
                      settings.darkMode 
                        ? 'text-gray-400 hover:text-red-400' 
                        : 'text-gray-500 hover:text-red-500'
                    }`}
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <button
                      onClick={() => handleProgressUpdate(habit, false)}
                      disabled={habit.progress <= 0}
                      className={`p-1 rounded-full transition-colors ${
                        habit.progress <= 0
                          ? settings.darkMode 
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : settings.darkMode
                          ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <XCircle size={20} />
                    </button>
                    <span className={`mx-3 font-medium ${
                      settings.darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {habit.progress}/{habit.target}
                    </span>
                    <button
                      onClick={() => handleProgressUpdate(habit, true)}
                      disabled={habit.progress >= habit.target}
                      className={`p-1 rounded-full transition-colors ${
                        habit.progress >= habit.target
                          ? settings.darkMode 
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : settings.darkMode
                          ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <CheckCircle size={20} />
                    </button>
                  </div>
                </div>
                
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    settings.darkMode 
                      ? 'bg-blue-900 text-blue-200' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {habit.frequency}
                  </span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className={`mt-3 h-2 rounded-full overflow-hidden ${
                settings.darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, (habit.progress / habit.target) * 100)}%`,
                    backgroundColor: habit.color
                  }}
                ></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HabitTracker; rounded-md transition-colors ${
                      settings.darkMode 
                        ? 'border-gray-700 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    } ${validationErrors.some(e => e.includes('title')) ? 'border-red-500' : ''}`}
                    required
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {(editingHabit?.title || '').length}/100 characters
                  </div>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <textarea
                    value={editingHabit?.description || ''}
                    onChange={e => {
                      const sanitized = sanitizeHabitInput(e.target.value);
                      setEditingHabit(prev => prev ? { ...prev, description: sanitized } : null);
                      if (editingHabit) {
                        validateHabit({ ...editingHabit, description: sanitized });
                      }
                    }}
                    placeholder="Why is this habit important to you?"
                    maxLength={500}
                    className={`w-full px-3 py-2 border rounded-md transition-colors ${
                      settings.darkMode 
                        ? 'border-gray-700 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    } ${validationErrors.some(e => e.includes('description')) ? 'border-red-500' : ''}`}
                    rows={2}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {(editingHabit?.description || '').length}/500 characters
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Frequency *
                    </label>
                    <select
                      value={editingHabit?.frequency || 'daily'}
                      onChange={e => {
                        setEditingHabit(prev => prev ? { ...prev, frequency: e.target.value as 'daily' | 'weekly' } : null);
                        if (editingHabit) {
                          validateHabit({ ...editingHabit, frequency: e.target.value as 'daily' | 'weekly' });
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-md ${
                        settings.darkMode 
                          ? 'border-gray-700 bg-gray-700 text-white' 
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Target *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingHabit?.target || 1}
                      onChange={e => {
                        const target = sanitizeNumericInput(e.target.value, 1, 100);
                        setEditingHabit(prev => prev ? { ...prev, target } : null);
                        if (editingHabit) {
                          validateHabit({ ...editingHabit, target });
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-md ${
                        settings.darkMode 
                          ? 'border-gray-700 bg-gray-700 text-white' 
                          : 'border-gray-300 bg-white text-gray-900'
                      } ${validationErrors.some(e => e.includes('target')) ? 'border-red-500' : ''}`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Times per {editingHabit?.frequency || 'day'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Color
                  </label>
                  <select
                    value={editingHabit?.color || '#3B82F6'}
                    onChange={e => {
                      setEditingHabit(prev => prev ? { ...prev, color: e.target.value } : null);
                      if (editingHabit) {
                        validateHabit({ ...editingHabit, color: e.target.value });
                      }
                    }}
                    className={`w-full px-3 py-2 border