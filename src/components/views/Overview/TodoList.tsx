import React, { useState, useEffect } from 'react';
import { Plus, GripVertical, X, Check } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { supabase } from '../../../lib/supabase';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: number;
  created_at: string;
  completed_at?: string;
}

const TodoList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
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

    const newTask = {
      text: newTaskText,
      completed: false,
      priority: tasks.length,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;
      
      setTasks([...tasks, data]);
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

  if (isLoading) {
    return (
      <div className="bg-gray-900/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/10 rounded w-1/3"></div>
          <div className="h-10 bg-white/10 rounded"></div>
          <div className="h-10 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-gray-900/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Today's Tasks</h3>

      {/* Add Task Form */}
      <form onSubmit={addTask} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add a task..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/20 transition-colors"
          />
          <button
            type="submit"
            className="p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </form>

      {/* Tasks List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        <Reorder.Group values={sortedTasks} onReorder={reorderTasks}>
          <AnimatePresence>
            {sortedTasks.map((task) => (
              <Reorder.Item
                key={task.id}
                value={task}
                dragListener={!task.completed}
                dragControls={undefined}
                className={`group ${task.completed ? 'pointer-events-none' : ''}`}
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${
                    task.completed 
                      ? 'bg-white/5 opacity-50' 
                      : 'bg-white/10 hover:bg-white/15'
                  }`}
                >
                  {!task.completed && (
                    <div className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/50">
                      <GripVertical size={16} />
                    </div>
                  )}

                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`p-1 rounded transition-colors ${
                      task.completed 
                        ? 'text-green-400' 
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    {task.completed ? (
                      <Check size={16} />
                    ) : (
                      <div className="w-4 h-4 border border-current rounded" />
                    )}
                  </button>

                  <span className={`flex-1 text-sm ${
                    task.completed 
                      ? 'text-white/40 line-through' 
                      : 'text-white'
                  }`}>
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
      </div>
    </motion.div>
  );
};

export default TodoList;