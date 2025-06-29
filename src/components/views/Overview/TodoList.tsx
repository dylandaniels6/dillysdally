import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Check, X, GripVertical, CheckSquare } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from '../../../lib/supabase';
import { Card } from '../../common/Card';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: number;
  created_at: string;
  completed_at?: string;
}

const TodoList: React.FC = () => {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token);
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out yesterday's completed tasks
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const filteredTasks = (data || []).filter(task => {
        if (!task.completed) return true;
        if (!task.completed_at) return true;
        
        const completedDate = new Date(task.completed_at);
        return completedDate >= yesterday;
      });

      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    // Find the smallest priority (to put new task first)
    const minPriority = tasks.length > 0 
      ? Math.min(...tasks.map(t => t.priority)) - 1
      : 0;

    const newTask = {
      text: newTaskText,
      completed: false,
      priority: minPriority,
      created_at: new Date().toISOString()
    };

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;
      
      setTasks([data, ...tasks]);
      setNewTaskText('');
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = {
      ...task,
      completed: !task.completed,
      completed_at: !task.completed ? new Date().toISOString() : null
    };

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token);
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: updatedTask.completed,
          completed_at: updatedTask.completed_at
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const reorderTasks = async (newOrder: Task[]) => {
    setTasks(newOrder);

    // Update priorities in database
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token);
      
      const updates = newOrder.map((task, index) => ({
        id: task.id,
        priority: index
      }));

      for (const update of updates) {
        await supabase
          .from('tasks')
          .update({ priority: update.priority })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error reordering tasks:', error);
    }
  };

  // Sort tasks: incomplete first (by priority), then completed
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return a.priority - b.priority;
  });

  // Filter tasks
  const incompleteTasks = sortedTasks.filter(task => !task.completed);
  const completedTasks = sortedTasks.filter(task => task.completed);

  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/10 rounded w-1/3"></div>
          <div className="h-10 bg-white/10 rounded"></div>
          <div className="h-10 bg-white/10 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full" hover={false}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <CheckSquare size={16} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Today's Tasks</h3>
            <p className="text-sm text-gray-400">
              {incompleteTasks.length} remaining
            </p>
          </div>
        </div>
      </div>

      {/* Add new task form */}
      <form onSubmit={addTask} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add a task..."
            className="flex-1 bg-gray-700/30 border border-gray-600/30 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:bg-gray-700/50 transition-all"
          />
          <button
            type="submit"
            disabled={!newTaskText.trim()}
            className="px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-purple-400 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </form>

      {/* Tasks list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {incompleteTasks.length > 0 && (
          <Reorder.Group 
            values={incompleteTasks} 
            onReorder={reorderTasks}
          >
            <AnimatePresence>
              {incompleteTasks.map((task) => (
                <Reorder.Item
                  key={task.id}
                  value={task}
                  dragListener={true}
                  dragControls={undefined}
                >
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="group flex items-center gap-3 p-3 bg-gray-700/30 border border-gray-600/30 rounded-xl hover:bg-gray-700/50 transition-all"
                  >
                    <div className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/50">
                      <GripVertical size={16} />
                    </div>

                    <button
                      onClick={() => toggleTask(task.id)}
                      className="p-1 rounded transition-colors text-white/30 hover:text-white/60"
                    >
                      <div className="w-4 h-4 border border-current rounded" />
                    </button>

                    <span className="flex-1 text-sm text-white">
                      {task.text}
                    </span>

                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-red-400 transition-all"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}

        {/* Completed tasks */}
        {completedTasks.length > 0 && (
          <div className="mt-4">
            {/* Gray contrast section for completed tasks */}
            <div className="bg-gray-700/30 border border-gray-600/30 rounded-xl p-3 space-y-2">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Completed Today ({completedTasks.length})</h4>
              {completedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="group flex items-center gap-3 p-2 bg-white/5 opacity-50 rounded-lg"
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="p-1 rounded transition-colors text-green-400"
                  >
                    <Check size={16} />
                  </button>

                  <span className="flex-1 text-sm text-white/40 line-through">
                    {task.text}
                  </span>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-red-400 transition-all"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {incompleteTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="text-gray-400 text-sm">
              {completedTasks.length > 0 
                ? "All tasks completed! 🎉" 
                : "No tasks yet. Add one above to get started."
              }
            </div>
          </motion.div>
        )}
      </div>
    </Card>
  );
};

export default TodoList;