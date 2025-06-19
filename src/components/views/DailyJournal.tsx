import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Loader, Flame, Moon, Sun, Calendar, Cloud, CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { Smile, Frown, Meh, Edit, Trash } from 'lucide-react';
import { JournalEntry } from '../../types';
import { supabase } from '../../lib/supabase';
import PastEntries from './PastEntries';
import { HabitRings } from './HabitRingMemory';
import JournalEntrySection from './JournalEntrySection';
import { formatISODate } from '../../utils/dateUtils';
  
interface HabitData {
  hangboard: { completed: boolean; streak: number };
  coldShower: { completed: boolean; streak: number };
  techUsage: { completed: boolean; streak: number };
  porn: { completed: boolean; streak: number };
}

interface DailyEntry extends JournalEntry {
  habitData?: HabitData;
  sleepData?: {
    phoneOff: string;
    wakeUp: string;
    quality: '😫' | '😔' | '😐' | '😊' | '🤩' | null;
  };
  meals?: string;
  dayRating?: number;
  miles?: number;
}

const DailyJournal: React.FC = () => {
  const { 
    selectedDate, 
    setSelectedDate, 
    journalEntries, 
    setJournalEntries,
    settings,
    isAuthenticated,
    user,
    cloudSyncStatus,
    lastSyncTime,
    forceSync
  } = useAppContext();

  const [currentEntry, setCurrentEntry] = useState<DailyEntry | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Get 7-day calendar strip
  const getWeekDates = () => {
    const dates = [];
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - 3);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  // Load or create entry for selected date
  useEffect(() => {
    const dateString = formatISODate(selectedDate);
    const existingEntry = journalEntries.find(entry => entry.date === dateString) as DailyEntry;
    
    if (existingEntry) {
      // Always create a fresh copy to ensure proper reset between dates
      setCurrentEntry({ ...existingEntry });
    } else {
      // Create fresh entry with EMPTY sleep data for the new date
      const newEntry: DailyEntry = {
        id: '',
        date: dateString,
        content: '',
        title: formatDate(selectedDate),
        mood: 'neutral',
        tags: [],
        habitData: {
          hangboard: { completed: false, streak: 0 },
          coldShower: { completed: false, streak: 0 },
          techUsage: { completed: false, streak: 0 },
          porn: { completed: false, streak: 0 }
        },
        sleepData: {
          phoneOff: '',  // Always start with empty strings
          wakeUp: '',    // Always start with empty strings
          quality: null
        },
        meals: '',
        dayRating: 3,
        miles: 0
      };
      setCurrentEntry(newEntry);
    }
  }, [selectedDate, journalEntries]);

  // Auto-save functionality
  useEffect(() => {
    if (currentEntry && settings?.autoSave && currentEntry.content.trim()) {
      const timeoutId = setTimeout(() => {
        saveEntry();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [currentEntry, settings?.autoSave]);

  const saveEntry = async () => {
    if (!currentEntry) return;
    
    // Don't save entries that are completely empty
    if (!currentEntry.content.trim() && 
        !currentEntry.meals?.trim() && 
        !currentEntry.sleepData?.phoneOff && 
        !currentEntry.sleepData?.wakeUp && 
        !currentEntry.sleepData?.quality &&
        currentEntry.dayRating === 3 &&
        currentEntry.miles === 0) {
      return;
    }
    
    try {
      // Always ensure the entry has an ID before saving
      const entryToSave = { 
        ...currentEntry, 
        id: currentEntry.id || Date.now().toString() 
      };

      const existingIndex = journalEntries.findIndex(entry => entry.date === entryToSave.date);
      let updatedEntries;
      
      if (existingIndex >= 0) {
        // Update existing entry
        updatedEntries = [...journalEntries];
        updatedEntries[existingIndex] = entryToSave;
      } else {
        // Add new entry
        updatedEntries = [...journalEntries, entryToSave];
      }
      
      // Update the state immediately
      setJournalEntries(updatedEntries);
      
      // Update current entry with the ID if it was just created
      if (!currentEntry.id) {
        setCurrentEntry(entryToSave);
      }

      // Save to Supabase if authenticated
      if (isAuthenticated && user) {
        const entryData = {
          date: entryToSave.date,
          title: entryToSave.title,
          content: entryToSave.content,
          mood: entryToSave.mood,
          tags: entryToSave.tags,
          ai_reflection: entryToSave.ai_reflection,
          context_data: {
            habitData: entryToSave.habitData,
            sleepData: entryToSave.sleepData,
            meals: entryToSave.meals,
            dayRating: entryToSave.dayRating,
            miles: entryToSave.miles
          },
          user_id: user.id
        };

        const existingSupabaseEntry = await supabase
          .from('journal_entries')
          .select('id')
          .eq('date', entryToSave.date)
          .eq('user_id', user.id)
          .single();

        if (existingSupabaseEntry.data) {
          // Update existing entry in Supabase
          await supabase
            .from('journal_entries')
            .update(entryData)
            .eq('id', existingSupabaseEntry.data.id);
        } else {
          // Insert new entry in Supabase
          const { data } = await supabase
            .from('journal_entries')
            .insert([entryData])
            .select()
            .single();
          
          if (data) {
            // Update the entry with the Supabase ID
            const finalEntry = { ...entryToSave, id: data.id };
            setCurrentEntry(finalEntry);
            
            // Update the journalEntries array with the Supabase ID
            const finalUpdatedEntries = [...updatedEntries];
            const finalIndex = finalUpdatedEntries.findIndex(entry => entry.date === finalEntry.date);
            if (finalIndex >= 0) {
              finalUpdatedEntries[finalIndex] = finalEntry;
              setJournalEntries(finalUpdatedEntries);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const setSleepQuality = (quality: '😫' | '😔' | '😐' | '😊' | '🤩') => {
    if (!currentEntry) return;
    
    setCurrentEntry({
      ...currentEntry,
      sleepData: {
        ...currentEntry.sleepData!,
        quality
      }
    });
  };

  const updateEntry = (updates: Partial<DailyEntry>) => {
    if (currentEntry) {
      // Handle sleep data updates with proper validation
      if (updates.sleepData) {
        const validateTime = (timeStr: string) => {
          if (!timeStr) return '';
          // Check if it matches HH:MM format
          const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
          return timeRegex.test(timeStr) ? timeStr : '';
        };

        // Create a validated sleep data object
        const validatedSleepData = {
          phoneOff: '',
          wakeUp: '',
          quality: null,
          ...currentEntry.sleepData, // Start with existing data
          ...updates.sleepData        // Apply updates
        };

        // Validate the time fields - if invalid, clear them
        if (validatedSleepData.phoneOff) {
          validatedSleepData.phoneOff = validateTime(validatedSleepData.phoneOff);
        }
        if (validatedSleepData.wakeUp) {
          validatedSleepData.wakeUp = validateTime(validatedSleepData.wakeUp);
        }

        setCurrentEntry({ 
          ...currentEntry, 
          ...updates, 
          sleepData: validatedSleepData 
        });
      } else {
        setCurrentEntry({ ...currentEntry, ...updates });
      }
    }
  };

  // Keep the existing AI reflection function exactly as is
  const getAIReflection = async () => {
    if (!currentEntry || !currentEntry.content.trim()) {
      alert('Please write some content before getting a reflection');
      return;
    }
    
    setIsLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('journal-reflect', {
        body: {
          entry: currentEntry.content,
          habits: currentEntry.habitData,
          mood: currentEntry.mood,
          date: currentEntry.date,
          context: {
            sleepData: currentEntry.sleepData,
            dayRating: currentEntry.dayRating,
            miles: currentEntry.miles,
            meals: currentEntry.meals
          }
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
            ...prev.context_data,
            analyzed_at: new Date().toISOString(),
          }
        } : null);
      } else {
        throw new Error('No reflection received from the API');
      }
    } catch (error: any) {
      console.error('Error getting reflection:', error);
      alert(`Failed to get AI reflection: ${error.message}`);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
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

  const editEntry = (entry: DailyEntry) => {
    setCurrentEntry({ ...entry });
    setIsEditingEntry(true);
    setEditingEntryId(entry.id);
    // Set the selected date to the entry's date - fix the timezone issue here too
    const entryDate = new Date(entry.date + 'T12:00:00');
    setSelectedDate(entryDate);
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'great':
      case 'good':
        return <Smile className="text-green-500" size={18} />;
      case 'neutral':
        return <Meh className="text-gray-500" size={18} />;
      case 'bad':
      case 'terrible':
        return <Frown className="text-red-500" size={18} />;
      default:
        return <Meh className="text-gray-500" size={18} />;
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDateShort = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = date.toDateString() === selectedDate.toDateString();
    
    return {
      day: date.getDate(),
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      isToday,
      isSelected
    };
  };

  const getSyncIcon = () => {
    switch (cloudSyncStatus) {
      case 'syncing':
        return <RefreshCw size={20} className="animate-spin text-blue-500" />;
      case 'synced':
        return <Cloud size={20} className="text-green-500" />;
      case 'error':
        return <CloudOff size={20} className="text-red-500" />;
      case 'offline':
        return <WifiOff size={20} className="text-gray-500" />;
      default:
        return <Cloud size={20} className="text-gray-500" />;
    }
  };

  const getSyncStatus = () => {
    switch (cloudSyncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return lastSyncTime ? `Last synced: ${lastSyncTime.toLocaleTimeString()}` : 'Synced';
      case 'error':
        return 'Sync error - click to retry';
      case 'offline':
        return 'Offline - will sync when connected';
      default:
        return 'Click to sync';
    }
  };

  if (!currentEntry) return null;

  return (
    <div className="">
      {/* 7-Day Calendar Strip */}
      <div className={`p-4 rounded-2xl mb-8 ${
        settings?.darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() - 7);
              setSelectedDate(newDate);
            }}
            className={`p-2 rounded-lg transition-colors ${
              settings?.darkMode 
                ? 'hover:bg-gray-700 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex space-x-2">
            {weekDates.map((date, index) => {
              const { day, dayName, isToday, isSelected } = formatDateShort(date);
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : isToday
                        ? settings?.darkMode
                          ? 'bg-gray-700 text-blue-400'
                          : 'bg-blue-50 text-blue-600'
                        : settings?.darkMode
                          ? 'hover:bg-gray-700 text-gray-300'
                          : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-xs font-medium mb-1">{dayName}</span>
                  <span className="text-lg font-semibold">{day}</span>
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() + 7);
              setSelectedDate(newDate);
            }}
            className={`p-2 rounded-lg transition-colors ${
              settings?.darkMode 
                ? 'hover:bg-gray-700 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Habit Rings */}
      <div className="mb-8">
        <HabitRings />
      </div>

      {/* Journal Entry Section */}
      <div className="mb-8">
        <JournalEntrySection
          currentEntry={currentEntry}
          updateEntry={updateEntry}
          setSleepQuality={setSleepQuality}
          settings={settings || { darkMode: true, authenticationEnabled: false, autoSave: true }}
          getAIReflection={getAIReflection}
          isLoadingAI={isLoadingAI}
          isAuthenticated={isAuthenticated}
          saveEntry={saveEntry}
        />
      </div>

      {/* Past Entries Component */}
      <PastEntries 
        journalEntries={journalEntries}
        currentEntry={currentEntry}
        settings={settings || { darkMode: true, authenticationEnabled: false, autoSave: true }}
        onEditEntry={editEntry}
        onDeleteEntry={deleteEntry}
        getMoodIcon={getMoodIcon}
      />
    </div>
  );
};

export default DailyJournal;