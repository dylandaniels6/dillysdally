import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { JournalEntry } from '../../types';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';
import { useAuth } from '@clerk/clerk-react';
import PastEntries from './PastEntries';
import { HabitRings } from './HabitRingMemory';
import JournalEntrySection from './JournalEntrySection';
import { formatISODate } from '../../utils/dateUtils';
import { Card } from '../common/Card';
import { IconButton } from '../common/Button';
import { designSystem } from '../../utils/designSystem';
  
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

  const { getToken } = useAuth();

  const [currentEntry, setCurrentEntry] = useState<DailyEntry | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Format date display
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
      setCurrentEntry({ ...existingEntry });
    } else {
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
          phoneOff: '',
          wakeUp: '',
          quality: null
        },
        meals: '',
        dayRating: 5,
        miles: 0
      };
      setCurrentEntry(newEntry);
    }
  }, [selectedDate, journalEntries]);

  const updateEntry = (updates: Partial<DailyEntry>) => {
    if (!currentEntry) return;
    setCurrentEntry(prev => ({ ...prev!, ...updates }));
  };

  const setSleepQuality = (quality: '😫' | '😔' | '😐' | '😊' | '🤩' | null) => {
    updateEntry({
      sleepData: {
        ...currentEntry?.sleepData,
        quality
      }
    });
  };

  // AI Reflection function
  const getAIReflection = async () => {
    if (!currentEntry?.content.trim()) return;
    
    setIsLoadingAI(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token);
      
      const { data, error } = await supabase.functions.invoke('journal-reflect', {
        body: {
          entry: currentEntry.content,
          mood: currentEntry.mood,
          date: currentEntry.date
        }
      });

      if (error) throw new Error(error.message || 'Failed to get AI reflection');

      const reflection = data?.analysis || data?.reflection || data?.response || data?.text;
      if (reflection) {
        updateEntry({ ai_reflection: reflection });
      }
    } catch (error) {
      console.error('Error getting AI reflection:', error);
      alert('Failed to get AI reflection. Please try again.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Save entry function
  const saveEntry = async () => {
    if (!currentEntry) return;

    const entryToSave: DailyEntry = {
      ...currentEntry,
      id: currentEntry.id || Date.now().toString()
    };

    const existingIndex = journalEntries.findIndex(entry => entry.date === entryToSave.date);
    let updatedEntries;
    
    if (existingIndex >= 0) {
      updatedEntries = [...journalEntries];
      updatedEntries[existingIndex] = entryToSave;
    } else {
      updatedEntries = [...journalEntries, entryToSave];
    }
    
    setJournalEntries(updatedEntries);
    
    if (!currentEntry.id) {
      setCurrentEntry(entryToSave);
    }

    // Save to Supabase if authenticated
    if (isAuthenticated && user) {
      try {
        const token = await getToken();
        if (!token) throw new Error('No authentication token');
        
        const supabase = createAuthenticatedSupabaseClient(token);

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

        // Check if entry exists (no user_id filter needed - RLS handles this)
        const { data: existingEntry } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('date', entryToSave.date)
          .single();

        if (existingEntry) {
          await supabase
            .from('journal_entries')
            .update(entryData)
            .eq('id', existingEntry.id);
        } else {
          await supabase
            .from('journal_entries')
            .insert([entryData]);
        }
      } catch (error) {
        console.error('Error saving to Supabase:', error);
      }
    }
  };

  // Edit and delete functions
  const editEntry = async (updatedEntry: JournalEntry) => {
    const updatedEntries = journalEntries.map(entry =>
      entry.id === updatedEntry.id ? updatedEntry : entry
    );
    setJournalEntries(updatedEntries);

    if (isAuthenticated && user) {
      try {
        const token = await getToken();
        if (!token) throw new Error('No authentication token');
        
        const supabase = createAuthenticatedSupabaseClient(token);

        await supabase
          .from('journal_entries')
          .update({
            title: updatedEntry.title,
            content: updatedEntry.content,
            mood: updatedEntry.mood,
            tags: updatedEntry.tags
          })
          .eq('id', updatedEntry.id);
      } catch (error) {
        console.error('Error updating entry:', error);
      }
    }
  };

  const deleteEntry = async (entryId: string) => {
    const updatedEntries = journalEntries.filter(entry => entry.id !== entryId);
    setJournalEntries(updatedEntries);

    if (isAuthenticated && user) {
      try {
        const token = await getToken();
        if (!token) throw new Error('No authentication token');
        
        const supabase = createAuthenticatedSupabaseClient(token);

        await supabase
          .from('journal_entries')
          .delete()
          .eq('id', entryId);
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  const getMoodIcon = (mood: string) => {
    const moodIcons = {
      happy: '😊',
      sad: '😢',
      excited: '🤩',
      neutral: '😐',
      angry: '😠',
      anxious: '😰',
      grateful: '🙏',
      tired: '😴'
    };
    return moodIcons[mood as keyof typeof moodIcons] || '😐';
  };

  if (!currentEntry) return null;

  return (
    <div className="space-y-8">
      
      {/* Professional 7-Day Calendar Strip */}
      <Card variant="default" padding="sm">
        <div className="flex items-center justify-between min-h-[120px]">
          {/* Previous Week Button */}
          <IconButton
            icon={<ChevronLeft size={20} />}
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() - 7);
              setSelectedDate(newDate);
            }}
            variant="ghost"
            size="md"
            className="flex-shrink-0"
          />
          
          {/* Date Strip */}
          <div className="flex space-x-2 flex-1 justify-center">
            {weekDates.map((date, index) => {
              const { day, dayName, isToday, isSelected } = formatDateShort(date);
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={designSystem.utils.cn(
                    'flex flex-col items-center px-4 py-3 rounded-xl transition-all duration-200',
                    'min-w-[60px] text-center',
                    isSelected
                      ? 'bg-purple-500 text-white shadow-lg scale-105'
                      : isToday
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'hover:bg-white/10 text-white/70 hover:text-white'
                  )}
                >
                  <span className={designSystem.typography.body.xs + ' font-medium mb-1'}>
                    {dayName.toUpperCase()}
                  </span>
                  <span className={designSystem.typography.body.lg + ' font-semibold'}>
                    {day}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Next Week Button */}
          <IconButton
            icon={<ChevronRight size={20} />}
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() + 7);
              setSelectedDate(newDate);
            }}
            variant="ghost"
            size="md"
            className="flex-shrink-0"
          />
        </div>
      </Card>

      {/* Habit Rings Section - Professional Card */}
      <Card variant="default" padding="lg">
        <div className="habit-rings-container">
          <HabitRings />
        </div>
      </Card>

      {/* Journal Entry Section */}
      <JournalEntrySection
        currentEntry={currentEntry}
        updateEntry={updateEntry}
        setSleepQuality={setSleepQuality}
        settings={settings || { darkMode: true, authenticationEnabled: true, autoSave: true }}
        getAIReflection={getAIReflection}
        isLoadingAI={isLoadingAI}
        isAuthenticated={isAuthenticated}
        saveEntry={saveEntry}
      />

      {/* Past Entries Section - Professional Card */}
      <Card variant="default" padding="lg">
        <PastEntries 
          journalEntries={journalEntries}
          currentEntry={currentEntry}
          settings={settings || { darkMode: true, authenticationEnabled: true, autoSave: true }}
          onEditEntry={editEntry}
          onDeleteEntry={deleteEntry}
          getMoodIcon={getMoodIcon}
        />
      </Card>
    </div>
  );
};

export default DailyJournal;