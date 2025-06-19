import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppContext } from '../../../context/AppContext';
import CalendarHeader from './CalendarHeader';
import MonthView from './MonthView';
import WeekView from './WeekView';
import YearView from './YearView';
import DayView from './DayView';
import DayPopup from './DayPopup';
import ClimbingEditor from './ClimbingEditor';
import JournalEditor from './JournalEditor';
import CalendarSearch from '../CalendarSearch';
import { ViewMode, DayPopupData } from './types';
import { formatISODate } from '../../../utils/dateUtils';
import { performSearch, getDataForDate } from './utils';

interface CalendarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ isOpen, onClose }) => {
  const { 
    selectedDate, 
    setSelectedDate, 
    journalEntries, 
    habits, 
    climbingSessions, 
    expenses,
    settings
  } = useAppContext();
  
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate));
  const [dayPopup, setDayPopup] = useState<DayPopupData | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClimbingEditor, setShowClimbingEditor] = useState(false);
  const [editingClimbingSession, setEditingClimbingSession] = useState<any>(null);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentDate(new Date(selectedDate));
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dayPopup) {
          setDayPopup(null);
        } else if (showSearch) {
          setShowSearch(false);
        } else if (showClimbingEditor) {
          setShowClimbingEditor(false);
        } else if (editingEntry) {
          setEditingEntry(null);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, dayPopup, showSearch, showClimbingEditor, editingEntry, onClose]);

  const openDayPopup = useCallback((date: Date) => {
    const data = getDataForDate(date, journalEntries, habits, expenses, climbingSessions);
    setDayPopup({
      date,
      journalEntry: data.journalEntry,
      habits: data.habits,
      expenses: data.expenses,
      climbingSession: data.climbingSession,
      data: data as DayPopupData
    });
  }, [journalEntries, habits, expenses, climbingSessions]);

  const closeDayPopup = useCallback(() => {
    setDayPopup(null);
  }, []);

  const navigateToDay = useCallback((date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setViewMode('day');
    closeDayPopup();
  }, [setSelectedDate, closeDayPopup]);

  if (!isOpen) return null;

  const springTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30
  };

  return (
    <>
      {/* Search Overlay */}
      <CalendarSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setCurrentDate(date);
          setViewMode('day');
          setShowSearch(false);
        }}
      />

      {/* Main Calendar Modal */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={springTransition}
          className={`w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
            settings.darkMode 
              ? 'bg-gray-900/95 border border-gray-800' 
              : 'bg-white/95 border border-gray-200'
          } backdrop-blur-xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarHeader 
            viewMode={viewMode}
            setViewMode={setViewMode}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onSearch={() => setShowSearch(true)}
            onClose={onClose}
            settings={settings}
          />

          {/* Calendar Content with View Transitions */}
          <div className="flex-1 overflow-hidden relative">
            {viewMode === 'month' && (
              <MonthView 
                currentDate={currentDate}
                openDayPopup={openDayPopup}
                settings={settings}
              />
            )}
            
            {viewMode === 'week' && (
              <WeekView 
                currentDate={currentDate}
                openDayPopup={openDayPopup}
                settings={settings}
              />
            )}
            
            {viewMode === 'year' && (
              <YearView 
                currentDate={currentDate}
                openDayPopup={openDayPopup}
                settings={settings}
              />
            )}
            
            {viewMode === 'day' && (
              <DayView 
                currentDate={currentDate}
                onEditJournal={setEditingEntry}
                onEditClimbing={(session) => {
                  setEditingClimbingSession(session);
                  setShowClimbingEditor(true);
                }}
                settings={settings}
              />
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Day Popup */}
      <AnimatePresence>
        {dayPopup && (
          <DayPopup 
            data={dayPopup}
            onClose={closeDayPopup}
            onViewDay={() => navigateToDay(dayPopup.date)}
            settings={settings}
          />
        )}
      </AnimatePresence>

      {/* Climbing Editor */}
      <AnimatePresence>
        {showClimbingEditor && (
          <ClimbingEditor 
            isOpen={showClimbingEditor}
            onClose={() => {
              setShowClimbingEditor(false);
              setEditingClimbingSession(null);
            }}
            editingSession={editingClimbingSession}
            currentDate={currentDate}
            settings={settings}
          />
        )}
      </AnimatePresence>

      {/* Journal Editor */}
      <AnimatePresence>
        {editingEntry && (
          <JournalEditor 
            entry={editingEntry}
            onClose={() => setEditingEntry(null)}
            settings={settings}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Calendar;