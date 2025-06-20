import React, { useState, useMemo } from 'react';
import { 
  Moon, 
  Smartphone, 
  CheckCircle2, 
  Mountain, 
  DollarSign,
  ChevronDown,
  ChevronUp,
  Circle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../../context/AppContext';

const YesterdayRecap: React.FC = () => {
  const { journalEntries, expenses, climbingSessions, habits } = useAppContext();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Get yesterday's data
  const yesterday = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }, []);

  // Get yesterday's journal entry
  const yesterdayEntry = useMemo(() => 
    journalEntries.find(entry => entry.date === yesterday),
    [journalEntries, yesterday]
  );

  // Get yesterday's habits
  const yesterdayHabits = useMemo(() => 
    habits.filter(h => h.date === yesterday),
    [habits, yesterday]
  );

  const completedHabits = yesterdayHabits.filter(h => h.progress >= h.target).length;

  // Get yesterday's climbing session
  const yesterdayClimbing = useMemo(() => 
    climbingSessions.find(session => session.date === yesterday),
    [climbingSessions, yesterday]
  );

  const climbingDuration = yesterdayClimbing 
    ? `${Math.floor(yesterdayClimbing.duration / 60)}h ${yesterdayClimbing.duration % 60}m`
    : null;

  const routesCompleted = yesterdayClimbing
    ? yesterdayClimbing.routes.filter(r => r.completed).length
    : 0;

  // Get yesterday's spending
  const yesterdaySpending = useMemo(() => 
    expenses
      .filter(expense => expense.date === yesterday)
      .reduce((total, expense) => total + expense.amount, 0),
    [expenses, yesterday]
  );

  // Format time helper
  const formatTime = (time: string | undefined) => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minutes} ${period}`;
  };

  // Calculate sleep duration
  const calculateSleepDuration = (sleepTime?: string, wakeTime?: string) => {
    if (!sleepTime || !wakeTime) return null;
    
    const [sleepHours, sleepMinutes] = sleepTime.split(':').map(Number);
    const [wakeHours, wakeMinutes] = wakeTime.split(':').map(Number);
    
    let sleepDate = new Date();
    sleepDate.setHours(sleepHours, sleepMinutes, 0, 0);
    
    let wakeDate = new Date();
    wakeDate.setHours(wakeHours, wakeMinutes, 0, 0);
    
    // If wake time is before sleep time, assume next day
    if (wakeDate < sleepDate) {
      wakeDate.setDate(wakeDate.getDate() + 1);
    }
    
    const diff = wakeDate.getTime() - sleepDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const sleepDuration = calculateSleepDuration(
    yesterdayEntry?.sleepTime,
    yesterdayEntry?.wakeTime
  );

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gray-900/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Yesterday in Review</h3>
      
      {/* Sleep & Wake */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-white/70">
            <Moon size={16} />
            <span>Sleep</span>
          </div>
          <span className="text-white font-medium">
            {formatTime(yesterdayEntry?.sleepTime)} - {formatTime(yesterdayEntry?.wakeTime)}
            {sleepDuration && (
              <span className="text-white/50 ml-2">({sleepDuration})</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-white/70">
            <Smartphone size={16} />
            <span>Phone Off</span>
          </div>
          <span className="text-white font-medium">
            {formatTime(yesterdayEntry?.phoneOffTime) || '--:--'}
          </span>
        </div>
      </div>

      <div className="border-t border-white/10" />

      {/* Habits */}
      <div>
        <button
          onClick={() => toggleSection('habits')}
          className="w-full flex items-center justify-between text-sm hover:bg-white/5 -mx-2 px-2 py-1 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2 text-white/70">
            <CheckCircle2 size={16} />
            <span>Habits</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">
              {completedHabits}/{yesterdayHabits.length} completed
            </span>
            {expandedSection === 'habits' ? (
              <ChevronUp size={16} className="text-white/50" />
            ) : (
              <ChevronDown size={16} className="text-white/50" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {expandedSection === 'habits' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1 pl-6">
                {yesterdayHabits.map(habit => (
                  <div key={habit.id} className="flex items-center gap-2 text-sm">
                    {habit.progress >= habit.target ? (
                      <CheckCircle2 size={14} className="text-green-400" />
                    ) : (
                      <Circle size={14} className="text-white/30" />
                    )}
                    <span className={habit.progress >= habit.target ? 'text-white/70' : 'text-white/40'}>
                      {habit.name}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-white/10" />

      {/* Climbing */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-white/70">
          <Mountain size={16} />
          <span>Climbing</span>
        </div>
        <span className="text-white font-medium">
          {yesterdayClimbing ? (
            <>
              {climbingDuration} • {routesCompleted} routes
            </>
          ) : (
            <span className="text-white/40">No session</span>
          )}
        </span>
      </div>

      <div className="border-t border-white/10" />

      {/* Spending */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-white/70">
          <DollarSign size={16} />
          <span>Spending</span>
        </div>
        <span className="text-white font-medium">
          ${yesterdaySpending.toFixed(2)}
        </span>
      </div>
    </motion.div>
  );
};

export default YesterdayRecap;