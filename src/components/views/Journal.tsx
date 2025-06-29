import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Calendar, Edit, Trash, Smile, Frown, Meh, Loader } from 'lucide-react';
import { JournalEntry } from '../../types';
import { formatISODate, formatDate } from '../../utils/dateUtils';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';
import { useAuth } from '@clerk/clerk-react';

const Journal: React.FC = () => {
  const { journalEntries, setJournalEntries, selectedDate, habits } = useAppContext();
  const { getToken } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const todayFormatted = formatISODate(selectedDate);
  const existingEntry = journalEntries.find(entry => entry.date === todayFormatted);
  
  const resetForm = () => {
    setIsEditing(false);
    setCurrentEntry(null);
  };
  
  const startNewEntry = () => {
    setCurrentEntry({
      id: '',
      date: todayFormatted,
      title: '',
      content: '',
      mood: 'neutral',
      tags: [],
      ai_reflection: null,
      context_data: null
    });
    setIsEditing(true);
  };
  
  const editEntry = (entry: JournalEntry) => {
    setCurrentEntry({ ...entry });
    setIsEditing(true);
  };
  
  const deleteEntry = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token);

      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setJournalEntries(journalEntries.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    }
  };
  
  const getAIReflection = async () => {
    if (!currentEntry || !currentEntry.content.trim()) {
      alert('Please write some content before getting a reflection');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token);

      const { data, error } = await supabase.functions.invoke('journal-reflect', {
        body: {
          entry: currentEntry.content,
          habits: habits,
          mood: currentEntry.mood,
          date: currentEntry.date
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get AI reflection');
      }

      const reflection = data?.analysis || data?.reflection || data?.response || data?.text;

      if (reflection) {
        setCurrentEntry(prev => prev ? {
          ...prev,
          ai_reflection: reflection,
          context_data: {
            analyzed_at: new Date().toISOString(),
            mood: prev.mood,
            date: prev.date
          }
        } : null);
      } else {
        throw new Error('No reflection received from the API');
      }
    } catch (error: any) {
      console.error('Error getting reflection:', error);
      alert(`Failed to get AI reflection: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentEntry) return;

    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token);

      const entryData = {
        date: currentEntry.date,
        title: currentEntry.title,
        content: currentEntry.content,
        mood: currentEntry.mood,
        tags: currentEntry.tags,
        ai_reflection: currentEntry.ai_reflection,
        context_data: currentEntry.context_data,
        user_id: currentEntry.user_id // This will be set by RLS
      };

      if (currentEntry.id) {
        // Update existing entry
        const { error } = await supabase
          .from('journal_entries')
          .update(entryData)
          .eq('id', currentEntry.id);

        if (error) throw error;

        setJournalEntries(journalEntries.map(entry => 
          entry.id === currentEntry.id ? { ...entry, ...entryData } : entry
        ));
      } else {
        // Add new entry
        const { data, error } = await supabase
          .from('journal_entries')
          .insert([entryData])
          .select()
          .single();

        if (error) throw error;

        setJournalEntries([...journalEntries, { ...data, id: data.id }]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry');
    }
  };
  
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const tag = input.value.trim().toLowerCase();
      
      if (tag && currentEntry && !currentEntry.tags.includes(tag)) {
        setCurrentEntry({
          ...currentEntry,
          tags: [...currentEntry.tags, tag]
        });
      }
      
      input.value = '';
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    if (currentEntry) {
      setCurrentEntry({
        ...currentEntry,
        tags: currentEntry.tags.filter(tag => tag !== tagToRemove)
      });
    }
  };
  
  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'great':
      case 'good':
        return <Smile className="text-green-500" />;
      case 'neutral':
        return <Meh className="text-gray-500" />;
      case 'bad':
      case 'terrible':
        return <Frown className="text-red-500" />;
      default:
        return <Meh className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Journal</h2>
        {!isEditing && (
          <button
            onClick={startNewEntry}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            <span>New Entry</span>
          </button>
        )}
      </div>
      
      {/* Journal Form */}
      {isEditing && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold mb-4">
            {currentEntry?.id ? 'Edit Journal Entry' : 'New Journal Entry'}
          </h3>
          
          <form onSubmit={handleSaveEntry}>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-500" />
                <span>{formatDate(selectedDate)}</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={currentEntry?.title || ''}
                  onChange={e => setCurrentEntry(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-700"
                  placeholder="Title your entry..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Mood</label>
                <select
                  value={currentEntry?.mood || 'neutral'}
                  onChange={e => setCurrentEntry(prev => prev ? { ...prev, mood: e.target.value as any } : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-700"
                >
                  <option value="great">Great</option>
                  <option value="good">Good</option>
                  <option value="neutral">Neutral</option>
                  <option value="bad">Bad</option>
                  <option value="terrible">Terrible</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={currentEntry?.content || ''}
                  onChange={e => setCurrentEntry(prev => prev ? { ...prev, content: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-700"
                  placeholder="Write your thoughts..."
                  rows={6}
                  required
                />
              </div>

              {currentEntry?.content && currentEntry.content.trim().length > 10 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={getAIReflection}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <span>✨ Get AI Reflection</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {currentEntry?.ai_reflection && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✨</span>
                    </div>
                    <h4 className="font-semibold text-purple-700 dark:text-purple-300">
                      AI Reflection
                    </h4>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                      {currentEntry.ai_reflection}
                    </p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {currentEntry?.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs flex items-center gap-1"
                    >
                      #{tag}
                      <button 
                        type="button"
                        onClick={() => removeTag(tag)} 
                        className="text-gray-500 hover:text-red-500"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  onKeyDown={handleTagInput}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-700"
                  placeholder="Add tags (press Enter after each tag)..."
                />
                <p className="text-xs text-gray-500 mt-1">Press Enter or comma to add a tag</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Entry
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Journal Entries */}
      {!isEditing && (
        existingEntry ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2">
                  <Calendar size={16} />
                  <span>{formatDate(new Date(existingEntry.date))}</span>
                  <div className="flex items-center gap-1 ml-2">
                    {getMoodIcon(existingEntry.mood)}
                    <span className="capitalize">{existingEntry.mood}</span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold">{existingEntry.title}</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => editEntry(existingEntry)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => deleteEntry(existingEntry.id)}
                  className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
            
            <div className="mt-4 whitespace-pre-line text-gray-700 dark:text-gray-300">
              {existingEntry.content}
            </div>

            {existingEntry.ai_reflection && (
              <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-700">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✨</span>
                  </div>
                  <h4 className="font-semibold text-purple-700 dark:text-purple-300">
                    AI Reflection
                  </h4>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    {existingEntry.ai_reflection}
                  </p>
                </div>
              </div>
            )}
            
            {existingEntry.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {existingEntry.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No journal entry for today</p>
            <button
              onClick={startNewEntry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Write today's entry
            </button>
          </div>
        )
      )}
      
      {/* Past Entries */}
      {!isEditing && journalEntries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Past Entries</h3>
          
          <div className="space-y-4">
            {journalEntries
              .filter(entry => entry.id !== existingEntry?.id)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map(entry => (
                <div 
                  key={entry.id}
                  className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-0"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                        <Calendar size={14} />
                        <span>{formatDate(new Date(entry.date))}</span>
                        <div className="flex items-center gap-1 ml-2">
                          {getMoodIcon(entry.mood)}
                        </div>
                      </div>
                      <h4 className="font-medium">{entry.title}</h4>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editEntry(entry)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                    {entry.content}
                  </p>

                  {entry.ai_reflection && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400">
                      <span>✨</span>
                      <span>Has AI reflection</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Journal;