import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Edit, Trash, CheckCircle, XCircle } from 'lucide-react';
import { Habit } from '../../types';
import { formatISODate } from '../../utils/dateUtils';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';
import { useAuth } from '@clerk/clerk-react';

const HabitTracker: React.FC = () => {
  const { habits, setHabits, selectedDate, isAuthenticated, user, settings } = useAppContext();
  const { getToken } = useAuth();
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  
  const resetForm = () => {
    setIsAddingHabit(false);
    setEditingHabit(null);
  };
  
  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingHabit) return;
    
    try {
      if (editingHabit.id) {
        // Update existing habit
        setHabits(habits.map(h => h.id === editingHabit.id ? editingHabit : h));
        
        // Update in Supabase if authenticated
        if (isAuthenticated && user) {
          const token = await getToken();
          if (!token) throw new Error('No authentication token');
          
          const supabase = createAuthenticatedSupabaseClient(token);

          const { error } = await supabase
            .from('habits')
            .update({
              title: editingHabit.title,
              description: editingHabit.description,
              frequency: editingHabit.frequency,
              target: editingHabit.target,
              progress: editingHabit.progress,
              completed: editingHabit.progress >= editingHabit.target,
              color: editingHabit.color,
              completed_history: editingHabit.completed,
            })
            .eq('id', editingHabit.id);
          if (error) throw error;
        }
      } else {
        // Add new habit
        const newHabit: Habit = {
          ...editingHabit,
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
          
          const supabase = createAuthenticatedSupabaseClient(token);

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
  
  const handleDeleteHabit = async (id: string) => {
    // Always delete from local state
    setHabits(habits.filter(h => h.id !== id));
    
    // Delete from Supabase only if authenticated
    if (isAuthenticated) {
      try {
        const token = await getToken();
        if (!token) throw new Error('No authentication token');
        
        const supabase = createAuthenticatedSupabaseClient(token);

        const { error } = await supabase
          .from('habits')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting habit:', error);
      }
    }
  };
  
  const handleProgressUpdate = async (habit: Habit, increment: boolean) => {
    const updatedHabit = { ...habit };
    
    if (increment && updatedHabit.progress < updatedHabit.target) {
      updatedHabit.progress += 1;
    } else if (!increment && updatedHabit.progress > 0) {
      updatedHabit.progress -= 1;
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
        
        const supabase = createAuthenticatedSupabaseClient(token);

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
      }
    }
  };
  
  const startAddHabit = () => {
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
    setEditingHabit({ ...habit });
    setIsAddingHabit(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Habit Tracker
        </h2>
        <button
          onClick={startAddHabit}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span>Add Habit</span>
        </button>
      </div>
      
      {/* Habit Form */}
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
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingHabit?.title || ''}
                    onChange={e => setEditingHabit(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className={`w-full px-3 py-2 border rounded-md ${
                      settings.darkMode 
                        ? 'border-gray-700 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    required
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <textarea
                    value={editingHabit?.description || ''}
                    onChange={e => setEditingHabit(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className={`w-full px-3 py-2 border rounded-md ${
                      settings.darkMode 
                        ? 'border-gray-700 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Frequency
                    </label>
                    <select
                      value={editingHabit?.frequency || 'daily'}
                      onChange={e => setEditingHabit(prev => prev ? { ...prev, frequency: e.target.value as 'daily' | 'weekly' } : null)}
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
                      Target
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingHabit?.target || 1}
                      onChange={e => setEditingHabit(prev => prev ? { ...prev, target: parseInt(e.target.value) } : null)}
                      className={`w-full px-3 py-2 border rounded-md ${
                        settings.darkMode 
                          ? 'border-gray-700 bg-gray-700 text-white' 
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    />
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
                    onChange={e => setEditingHabit(prev => prev ? { ...prev, color: e.target.value } : null)}
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Habits List */}
      <div className="grid gap-4">
        {habits.length === 0 ? (
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
          habits.map(habit => (
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
                      className={`p-1 rounded-full transition-colors ${
                        habit.progress <= 0
                          ? settings.darkMode 
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : settings.darkMode
                          ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      disabled={habit.progress <= 0}
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
                      className={`p-1 rounded-full transition-colors ${
                        habit.progress >= habit.target
                          ? settings.darkMode 
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : settings.darkMode
                          ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      disabled={habit.progress >= habit.target}
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

export default HabitTracker;