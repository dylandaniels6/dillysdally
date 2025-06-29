import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Smile, AlertCircle } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useAppContext } from '../../../context/AppContext';
import { createAuthenticatedSupabaseClient } from '../../../lib/supabase';
import { getMoodEmoji } from './utils';

interface JournalEditorProps {
  entry: any;
  onClose: () => void;
  settings: any;
}

const JournalEditor: React.FC<JournalEditorProps> = ({ entry, onClose, settings }) => {
  const { getToken } = useAuth();
  const { journalEntries, setJournalEntries } = useAppContext();
  const [content, setContent] = useState(entry.content);
  const [mood, setMood] = useState(entry.mood || 'neutral');
  const [gratitude, setGratitude] = useState(entry.context_data?.gratitude || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required. Please sign in to save changes.');
      }

      const supabase = createAuthenticatedSupabaseClient(token);
      
      const updatedEntry = {
        ...entry,
        content,
        mood,
        context_data: {
          ...entry.context_data,
          gratitude: gratitude || null
        }
      };
      
      // Save to database - store everything in context_data
      const { error: dbError } = await supabase
        .from('journal_entries')
        .update({
          context_data: {
            ...entry.context_data,
            content: content,
            mood: mood,
            gratitude: gratitude || null
          }
        })
        .eq('id', entry.id);

      if (dbError) {
        throw new Error(`Failed to save changes: ${dbError.message}`);
      }

      // Update local state only after successful database save
      const updatedEntries = journalEntries.map(e => 
        e.id === entry.id ? updatedEntry : e
      );
      
      setJournalEntries(updatedEntries);
      
      // Simulate save delay
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 300);

    } catch (error) {
      console.error('Error saving journal entry:', error);
      setError(error instanceof Error ? error.message : 'Failed to save changes. Please try again.');
      setIsSaving(false);
    }
  };

  const moods = [
    { value: 'great', label: 'Great', emoji: '🤩' },
    { value: 'good', label: 'Good', emoji: '😊' },
    { value: 'neutral', label: 'Neutral', emoji: '😐' },
    { value: 'bad', label: 'Bad', emoji: '😔' },
    { value: 'terrible', label: 'Terrible', emoji: '😫' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`w-full max-w-3xl rounded-2xl shadow-2xl ${
          settings.darkMode 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          settings.darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-xl font-semibold ${
              settings.darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Edit Journal Entry
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                settings.darkMode 
                  ? 'hover:bg-gray-700 text-gray-400' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X size={20} />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                settings.darkMode 
                  ? 'bg-red-900/20 border-red-700 text-red-400' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* Mood Selector */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              settings.darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              How are you feeling?
            </label>
            <div className="flex gap-2">
              {moods.map((moodOption) => (
                <motion.button
                  key={moodOption.value}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMood(moodOption.value)}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    mood === moodOption.value
                      ? settings.darkMode
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-purple-500 bg-purple-50'
                      : settings.darkMode
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <span className="text-2xl">{moodOption.emoji}</span>
                    <p className={`text-xs mt-1 ${
                      settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {moodOption.label}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              settings.darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              What's on your mind?
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full h-64 p-4 rounded-xl border resize-none transition-all ${
                settings.darkMode 
                  ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500'
              } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              placeholder="Write about your day, thoughts, or experiences..."
            />
            <p className={`text-xs mt-2 ${
              settings.darkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {content.split(' ').filter(w => w.length > 0).length} words
            </p>
          </div>

          {/* Gratitude */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              settings.darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              What are you grateful for?
            </label>
            <textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              className={`w-full h-24 p-4 rounded-xl border resize-none transition-all ${
                settings.darkMode 
                  ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500'
              } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              placeholder="List things you're thankful for today..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${
          settings.darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                settings.darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={isSaving || !content.trim()}
              className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2
                bg-gradient-to-r from-purple-600 to-pink-600 text-white
                hover:from-purple-700 hover:to-pink-700 
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-lg`}
            >
              {isSaving ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Changes</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default JournalEditor;