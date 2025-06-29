import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { ClimbingSession } from '../../../types';
import { createAuthenticatedSupabaseClient } from '../../../lib/supabase';
import { useAuth } from '@clerk/clerk-react';
import ClimbingProgress from './ClimbingProgress';
import SessionForm from './SessionForm';
import RecentSessions from './RecentSessions';
import SessionDetailModal from './SessionDetailModal';

type TimeRange = 'week' | 'month' | '6months' | 'year' | 'all';

interface ClimbTypeFilters {
  gym: boolean;
  kilter: boolean;
}

const ClimbingLog: React.FC = () => {
  const { climbingSessions, setClimbingSessions, selectedDate, settings } = useAppContext();
  const { getToken } = useAuth();
  
  // Add shared time range state for the chart and progress
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [climbTypeFilters, setClimbTypeFilters] = useState<ClimbTypeFilters>({
    gym: true,
    kilter: true
  });
  
  // Dynamic date calculation that updates with local time
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time every minute to ensure dynamic updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Timezone-safe date formatting that preserves local dates
  const formatDateSafe = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const todayFormatted = formatDateSafe(currentTime);
  const selectedDateFormatted = formatDateSafe(selectedDate);
  const isToday = selectedDateFormatted === todayFormatted;
  
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<ClimbingSession | null>(null);
  const [isEditingSession, setIsEditingSession] = useState<ClimbingSession | null>(null);
  
  // Get session for the currently selected date
  const existingSession = climbingSessions.find(session => session.date === selectedDateFormatted);
  
  const deleteSession = async (sessionId: string) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token);

      const { error } = await supabase
        .from('climbing_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      // Update local state immediately to trigger re-render of progress stats
      setClimbingSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleEditSession = (session: ClimbingSession) => {
    setIsEditingSession(session);
    setSelectedSessionForDetail(null);
  };

  const handleCancelEdit = () => {
    setIsEditingSession(null);
  };

  const handleSessionSaved = (session: ClimbingSession) => {
    // Clear editing state
    setIsEditingSession(null);
  };

  return (
    <div className="space-y-6">
      {/* Progress Chart - No title/subtitle, with shared time range */}
      <ClimbingProgress 
        selectedTimeRange={selectedTimeRange}
        onTimeRangeChange={setSelectedTimeRange}
        climbTypeFilters={climbTypeFilters}
        onFiltersChange={setClimbTypeFilters}
      />
      
      {/* Session Form */}
      <SessionForm
        selectedDate={selectedDate}
        existingSession={existingSession}
        isEditingSession={isEditingSession}
        onSessionSaved={handleSessionSaved}
        onEditCancel={handleCancelEdit}
        isToday={isToday}
      />

      {/* Recent Sessions */}
      <RecentSessions
        onEditSession={handleEditSession}
        onDeleteSession={deleteSession}
        onViewSession={setSelectedSessionForDetail}
      />

      {/* Session Detail Modal */}
      {selectedSessionForDetail && (
        <SessionDetailModal
          session={selectedSessionForDetail}
          isOpen={!!selectedSessionForDetail}
          onClose={() => setSelectedSessionForDetail(null)}
          onEdit={handleEditSession}
          onDelete={deleteSession}
        />
      )}
    </div>
  );
};

export default ClimbingLog;