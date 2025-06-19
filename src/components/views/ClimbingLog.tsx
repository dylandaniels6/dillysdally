import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../../context/AppContext';
import { Edit, Trash, Calendar, Clock, MapPin, Minus, Plus, X, Eye, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { ClimbingSession, ClimbingRoute } from '../../types';
import { formatISODate, formatDate } from '../../utils/dateUtils';
import { supabase } from '../../lib/supabase';
import ClimbingProgress from './ClimbingProgress';
import { SessionPreviewChart } from './ChartEnhancements';

type TimeRange = 'week' | 'month' | '6months' | 'year' | 'all';

interface ClimbTypeFilters {
  gym: boolean;
  kilter: boolean;
}

interface SessionDetailModalProps {
  session: ClimbingSession;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (session: ClimbingSession) => void;
  onDelete: (sessionId: string) => void;
}

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ 
  session, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}) => {
  const { settings } = useAppContext();

  if (!isOpen) return null;

  const completedRoutes = session.routes.filter(r => r.completed);
  
  // Group routes by climb type
  const gymRoutes = session.routes.filter(r => r.climbType === 'gym' || !r.climbType); // Default to gym for existing data
  const kilterRoutes = session.routes.filter(r => r.climbType === 'kilter');
  const gymCompleted = gymRoutes.filter(r => r.completed);
  const kilterCompleted = kilterRoutes.filter(r => r.completed);

  // Group routes by grade
  const routesByGrade = session.routes.reduce((acc, route) => {
    if (!acc[route.grade]) {
      acc[route.grade] = [];
    }
    acc[route.grade].push(route);
    return acc;
  }, {} as Record<string, ClimbingRoute[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${
        settings.darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${
          settings.darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-2xl font-bold ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Climbing Session Details
              </h2>
              <p className={`text-sm mt-1 ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {formatDate(new Date(session.date))} at {session.location}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(session)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  settings.darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Edit size={16} />
                <span>Edit</span>
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  settings.darkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Session Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className={`p-4 rounded-lg ${
              settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <Clock size={18} className="text-blue-500" />
                <span className={`text-sm font-medium ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Duration
                </span>
              </div>
              <p className={`text-xl font-bold ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {session.duration} min
              </p>
            </div>

            <div className={`p-4 rounded-lg ${
              settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <MapPin size={18} className="text-green-500" />
                <span className={`text-sm font-medium ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Gym Sends
                </span>
              </div>
              <p className={`text-xl font-bold ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {gymCompleted.length}/{gymRoutes.length}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${
              settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <MapPin size={18} className="text-orange-500" />
                <span className={`text-sm font-medium ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Kilter Sends
                </span>
              </div>
              <p className={`text-xl font-bold ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {kilterCompleted.length}/{kilterRoutes.length}
              </p>
            </div>
          </div>

          {/* Session Notes */}
          {session.notes && (
            <div className="mb-8">
              <h3 className={`text-lg font-semibold mb-3 ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Session Notes
              </h3>
              <div className={`p-4 rounded-lg ${
                settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <p className={`${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {session.notes}
                </p>
              </div>
            </div>
          )}

          {/* Routes by Grade */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${
              settings.darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Routes by Grade
            </h3>
            
            {Object.keys(routesByGrade).length === 0 ? (
              <p className={`text-center py-8 ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No routes logged for this session.
              </p>
            ) : (
              <div className="space-y-6">
                {Object.entries(routesByGrade)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([grade, routes]) => (
                    <div key={grade}>
                      <h4 className={`text-md font-medium mb-3 ${
                        settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                      }`}>
                        {grade} ({routes.length} routes)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {routes.map((route, index) => (
                          <div 
                            key={route.id}
                            className={`p-3 rounded-lg border-l-4 ${
                              route.completed 
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                                : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className={`font-medium ${
                                  settings.darkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {route.name || `Route ${index + 1}`}
                                </h5>
                                <div className={`flex items-center space-x-3 mt-1 text-sm ${
                                  settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  <span className="capitalize">{route.type}</span>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                route.completed
                                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                              }`}>
                                {route.completed ? 'Sent' : 'Attempted'}
                              </span>
                            </div>
                            
                            {route.notes && (
                              <p className={`mt-2 text-sm ${
                                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {route.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${
          settings.darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this session?')) {
                  onDelete(session.id);
                  onClose();
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Session
            </button>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors ${
                settings.darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClimbingLog: React.FC = () => {
  const { climbingSessions, setClimbingSessions, selectedDate, settings, user, isAuthenticated } = useAppContext();
  
  // Add shared time range state for the chart and progress
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [climbTypeFilters, setClimbTypeFilters] = useState<ClimbTypeFilters>({
    gym: true,
    kilter: true
  });
  
  // Collapsible form state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  
  // Recent Sessions collapsible state
  const [isRecentSessionsCollapsed, setIsRecentSessionsCollapsed] = useState(true);
  
  // Recent Sessions Modal state
  const [showAllSessionsModal, setShowAllSessionsModal] = useState(false);
  const [loadedSessionsCount, setLoadedSessionsCount] = useState(10);
  
// Full-screen notes modal state
const [showFullscreenNotes, setShowFullscreenNotes] = useState(false);

// Add this useEffect for escape key
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showFullscreenNotes) {
      setShowFullscreenNotes(false);
    }
  };

  if (showFullscreenNotes) {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }
}, [showFullscreenNotes]);
  
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
  
  // Timezone-safe display formatting for session dates
  const formatSessionDateSafe = (dateStr: string) => {
    // Add noon to prevent timezone shifting
    const date = new Date(dateStr + 'T12:00:00');
    return formatDate(date);
  };
  
  const todayFormatted = formatDateSafe(currentTime);
  const selectedDateFormatted = formatDateSafe(selectedDate);
  const isToday = selectedDateFormatted === todayFormatted;
  
  const [sessionJournal, setSessionJournal] = useState('');
  const [sessionDuration, setSessionDuration] = useState(90);
  const [climbType, setClimbType] = useState<'gym' | 'kilter'>('gym');
  const [gymClimbCounts, setGymClimbCounts] = useState({
    V6: 0,
    V7: 0,
    V8: 0,
    V9: 0,
    V10: 0
  });
  const [kilterClimbCounts, setKilterClimbCounts] = useState({
    V6: 0,
    V7: 0,
    V8: 0,
    V9: 0,
    V10: 0
  });
  
  // Get current climb counts based on selected type
  const climbCounts = climbType === 'gym' ? gymClimbCounts : kilterClimbCounts;
  const setClimbCounts = climbType === 'gym' ? setGymClimbCounts : setKilterClimbCounts;
  
  // Gym location state
  const [selectedGym, setSelectedGym] = useState('');
  const [customGymName, setCustomGymName] = useState('');
  const [saveGym, setSaveGym] = useState(false);
  const [gymList, setGymList] = useState([
    'Crux Pflugerville',
    'Crux Central', 
    'Mesa Rim',
    'ABP - Westgate',
    'ABP - Springdale'
  ]);
  
  // Duration input state
  const [isDurationEditing, setIsDurationEditing] = useState(false);
  const [durationInput, setDurationInput] = useState(sessionDuration.toString());
  
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<ClimbingSession | null>(null);
  const [isEditingSession, setIsEditingSession] = useState<ClimbingSession | null>(null);
  
  // Get session for the currently selected date
  const existingSession = climbingSessions.find(session => session.date === selectedDateFormatted);
  
  // Determine if form should be collapsed based on session existence
  useEffect(() => {
    setIsCollapsed(!!existingSession);
  }, [existingSession, selectedDate]);
  
  // Load existing session data when date changes or when editing
  useEffect(() => {
    const sessionToLoad = isEditingSession || existingSession;
    
    if (sessionToLoad) {
      setSessionJournal(sessionToLoad.notes || '');
      setSelectedGym(sessionToLoad.location);
      setSessionDuration(sessionToLoad.duration || 90);
      setDurationInput((sessionToLoad.duration || 90).toString());
      
      // Extract climb counts from routes, separated by type
      const gymCounts = { V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 };
      const kilterCounts = { V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 };
      
      sessionToLoad.routes.forEach(route => {
        if (route.completed && gymCounts.hasOwnProperty(route.grade)) {
          if (route.climbType === 'kilter') {
            kilterCounts[route.grade as keyof typeof kilterCounts]++;
          } else {
            // Default to gym for existing routes without climbType
            gymCounts[route.grade as keyof typeof gymCounts]++;
          }
        }
      });
      
      setGymClimbCounts(gymCounts);
      setKilterClimbCounts(kilterCounts);
    } else {
      // Reset form for new session
      setSessionJournal('');
      setSelectedGym('');
      setSessionDuration(90);
      setDurationInput('90');
      setClimbType('gym');
      setGymClimbCounts({ V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 });
      setKilterClimbCounts({ V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 });
    }
  }, [existingSession, selectedDate, isEditingSession]);
  
  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('climbing_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      // Update local state immediately to trigger re-render of progress stats
      setClimbingSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };
  
  const updateClimbCount = (grade: keyof typeof climbCounts, increment: boolean) => {
    if (climbType === 'gym') {
      setGymClimbCounts(prev => ({
        ...prev,
        [grade]: Math.max(0, prev[grade] + (increment ? 1 : -1))
      }));
    } else {
      setKilterClimbCounts(prev => ({
        ...prev,
        [grade]: Math.max(0, prev[grade] + (increment ? 1 : -1))
      }));
    }
  };

  const handleGymChange = (value: string) => {
    setSelectedGym(value);
    if (value !== 'Other') {
      setCustomGymName('');
      setSaveGym(false);
    }
  };

  const handleSaveCustomGym = () => {
    if (customGymName.trim() && saveGym) {
      setGymList(prev => [...prev, customGymName.trim()]);
      setSelectedGym(customGymName.trim());
      setCustomGymName('');
      setSaveGym(false);
    }
  };

  const handleDurationDoubleClick = () => {
    setIsDurationEditing(true);
    setDurationInput(sessionDuration.toString());
  };

  const handleDurationSubmit = () => {
    const value = parseInt(durationInput);
    if (value >= 0 && value <= 999) {
      setSessionDuration(value);
    }
    setIsDurationEditing(false);
  };

  const handleDurationKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDurationSubmit();
    } else if (e.key === 'Escape') {
      setIsDurationEditing(false);
      setDurationInput(sessionDuration.toString());
    }
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGym) {
      alert('Please select a gym location.');
      return;
    }

    try {
      // Convert both gym and kilter climb counts to array of ClimbingRoute
      const routes: ClimbingRoute[] = [];
      
      // Add gym routes
      Object.entries(gymClimbCounts).forEach(([grade, count]) => {
        for (let i = 0; i < count; i++) {
          routes.push({
            id: `gym-${grade}-${i}-${Date.now()}`,
            name: `${grade} Gym Route ${i + 1}`,
            grade,
            type: 'boulder',
            attempts: 1,
            completed: true,
            notes: '',
            climbType: 'gym'
          });
        }
      });
      
      // Add kilter routes
      Object.entries(kilterClimbCounts).forEach(([grade, count]) => {
        for (let i = 0; i < count; i++) {
          routes.push({
            id: `kilter-${grade}-${i}-${Date.now()}`,
            name: `${grade} Kilter Route ${i + 1}`,
            grade,
            type: 'kilter',
            attempts: 1,
            completed: true,
            notes: '',
            climbType: 'kilter'
          });
        }
      });

      // Use the correct date - either the editing session's date or the selected date
      // Use timezone-safe formatting to preserve local dates
      const sessionDate = isEditingSession ? isEditingSession.date : formatDateSafe(selectedDate);

      const sessionData = {
        date: sessionDate,
        location: selectedGym,
        duration: sessionDuration,
        notes: sessionJournal,
        routes,
        user_id: isAuthenticated ? user?.id : null,
      };

      let result;
      const sessionId = isEditingSession?.id || existingSession?.id;
      
      if (!sessionId) {
        // Creating new session
        result = await supabase
          .from('climbing_sessions')
          .insert([sessionData])
          .select()
          .single();
      } else {
        // Updating existing session
        result = await supabase
          .from('climbing_sessions')
          .update(sessionData)
          .eq('id', sessionId)
          .select()
          .single();
      }

      const { data, error } = result;

      if (error) throw error;

      // Update local state immediately to trigger re-render of progress stats
      if (!sessionId) {
        // Add new session to the beginning of the array (most recent first)
        setClimbingSessions(prev => [data, ...prev]);
      } else {
        // Update existing session in place
        setClimbingSessions(prev =>
          prev.map(session => (session.id === data.id ? data : session))
        );
      }

      // Show checkmark animation and then collapse
      setShowCheckmark(true);
      setTimeout(() => {
        setShowCheckmark(false);
        setIsCollapsed(true);
      }, 1500);

      // Clear editing state
      setIsEditingSession(null);
      
      // Reset form if it was a new session
      if (!existingSession) {
        setSessionJournal('');
        setSelectedGym('');
        setSessionDuration(90);
        setClimbType('gym');
        setGymClimbCounts({ V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 });
        setKilterClimbCounts({ V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 });
      }

    } catch (err: any) {
      console.error('Supabase Error:', err?.message || err);
      alert(`Save failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleEditSession = (session: ClimbingSession) => {
    setIsEditingSession(session);
    setSelectedSessionForDetail(null);
    setIsCollapsed(false); // Expand when editing
  };

  const handleCancelEdit = () => {
  setIsEditingSession(null);
  // Reset to current day's session if it exists
  if (existingSession) {
    setSessionJournal(existingSession.notes || '');
    setSelectedGym(existingSession.location);
    setSessionDuration(existingSession.duration || 90);
    const gymCounts = { V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 };
    const kilterCounts = { V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 };
    existingSession.routes.forEach(route => {
      if (route.completed && gymCounts.hasOwnProperty(route.grade)) {
        if (route.climbType === 'kilter') {
          kilterCounts[route.grade as keyof typeof kilterCounts]++;
        } else {
          gymCounts[route.grade as keyof typeof gymCounts]++;
        }
      }
    });
    setGymClimbCounts(gymCounts);
    setKilterClimbCounts(kilterCounts);
  } else {
    setSessionJournal('');
    setSelectedGym('');
    setSessionDuration(90);
    setClimbType('gym');
    setGymClimbCounts({ V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 });
    setKilterClimbCounts({ V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 });
  }
};
  
  // Calculate total climbs for real-time visualization (both gym and kilter combined)
  const totalClimbs = Object.values(gymClimbCounts).reduce((sum, count) => sum + count, 0) + 
                     Object.values(kilterClimbCounts).reduce((sum, count) => sum + count, 0);

  // Get the session being displayed in the form
  const currentFormSession = isEditingSession || existingSession;

  // Dynamic header text
  const getHeaderText = () => {
    if (isEditingSession) {
      return `Edit Session - ${formatSessionDateSafe(isEditingSession.date)}`;
    } else if (existingSession) {
      return isToday ? "Edit Today's Session" : `Edit Session - ${formatDate(selectedDate)}`;
    } else {
      return isToday ? "Today's Session" : `Session for ${formatDate(selectedDate)}`;
    }
  };

  // Dynamic button text
  const getButtonText = () => {
    return currentFormSession ? 'Update Session' : 'Add Session';
  };

  // Sort sessions by date (most recent first)
  const sortedSessions = [...climbingSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Load more sessions function
  const loadMoreSessions = () => {
    setLoadedSessionsCount(prev => Math.min(prev + 10, sortedSessions.length));
  };

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    
    if (isNearBottom && loadedSessionsCount < sortedSessions.length) {
      loadMoreSessions();
    }
  };

  // Reset loaded count when modal opens
  const openAllSessionsModal = () => {
    setLoadedSessionsCount(10);
    setShowAllSessionsModal(true);
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
      <div className={`rounded-2xl shadow-sm border overflow-hidden ${
        settings.darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        
        {/* Collapsible Header */}
        <div 
          className={`p-6 cursor-pointer transition-all duration-200 ${
            settings.darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
          }`}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className={`text-xl font-bold ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {getHeaderText()}
              </h3>
              <p className={`text-sm mt-1 ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {isEditingSession 
                  ? `Editing session from ${formatSessionDateSafe(isEditingSession.date)}`
                  : formatDate(selectedDate)
                }
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {isEditingSession && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEdit();
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    settings.darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel Edit
                </button>
              )}
              {isCollapsed ? (
                <ChevronDown size={20} className={settings.darkMode ? 'text-gray-400' : 'text-gray-600'} />
              ) : (
                <ChevronUp size={20} className={settings.darkMode ? 'text-gray-400' : 'text-gray-600'} />
              )}
            </div>
          </div>
        </div>

        {/* Expandable Content */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0' : 'max-h-[2000px]'
        }`}>
          <div className="px-6 pb-6">
            
            <form onSubmit={handleSaveSession}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Gym Location */}
                  <div>
                    <label className={`block text-sm font-semibold mb-3 ${
                      settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      Gym Location <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={selectedGym}
                      onChange={(e) => handleGymChange(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        settings.darkMode 
                          ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-500' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'
                      } focus:outline-none focus:ring-4 focus:ring-blue-500/20`}
                      required
                    >
                      <option value="">Select a gym...</option>
                      {gymList.map(gym => (
                        <option key={gym} value={gym}>{gym}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    
                    {/* Custom Gym Input */}
                    {selectedGym === 'Other' && (
                      <div className="mt-4 space-y-3">
                        <input
                          type="text"
                          value={customGymName}
                          onChange={(e) => setCustomGymName(e.target.value)}
                          placeholder="Enter gym name..."
                          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                            settings.darkMode 
                              ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500' 
                              : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                          } focus:outline-none focus:ring-4 focus:ring-blue-500/20`}
                        />
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={saveGym}
                              onChange={(e) => setSaveGym(e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className={`text-sm ${settings.darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Save Gym?</span>
                          </label>
                          {customGymName.trim() && saveGym && (
                            <button
                              type="button"
                              onClick={handleSaveCustomGym}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Save
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Apple-Style Session Duration Slider */}
                  <div>
                    <label className={`block text-sm font-semibold mb-3 ${
                      settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      Session Duration (minutes)
                    </label>
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="180"
                        step="1"
                        value={Math.min(sessionDuration, 180)}
                        onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer slider-gradient"
                        style={{
                          background: `linear-gradient(to right, 
                            #3B82F6 0%, 
                            #8B5CF6 ${(Math.min(sessionDuration, 180) / 180) * 100}%, 
                            #374151 ${(Math.min(sessionDuration, 180) / 180) * 100}%, 
                            #374151 100%)`
                        }}
                      />
                      <div className="flex justify-between items-center mt-3">
                        <span className={`text-xs ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>0 min</span>
                        
                        {/* Clickable Duration Display */}
                        <div 
                          className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-sm cursor-pointer hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                          onDoubleClick={handleDurationDoubleClick}
                        >
                          {isDurationEditing ? (
                            <input
                              type="number"
                              value={durationInput}
                              onChange={(e) => setDurationInput(e.target.value)}
                              onBlur={handleDurationSubmit}
                              onKeyDown={handleDurationKeyPress}
                              min="0"
                              max="999"
                              className="bg-transparent text-white text-center w-16 outline-none"
                              autoFocus
                            />
                          ) : (
                            `${sessionDuration} min`
                          )}
                        </div>
                        
                        <span className={`text-xs ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>3 hours</span>
                      </div>
                    </div>
                  </div>

                  {/* Session Notes with Full-Screen Option */}
                  <div>
                    <label className={`block text-sm font-semibold mb-3 ${
                      settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      Session Notes
                    </label>
                    <div className={`relative rounded-xl border-2 transition-all duration-200 ${
                      settings.darkMode 
                        ? 'bg-gray-900 border-gray-600' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      {!showFullscreenNotes && (
  <button
    type="button"
    onClick={() => setShowFullscreenNotes(true)}
    className={`absolute top-3 right-3 z-10 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
      settings.darkMode
        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600/30'
        : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
    }`}
  >
    ⤢ Expand
  </button>
)}
            <div className={`p-4 pr-20 min-h-[300px] cursor-pointer transition-all duration-200 ${                        sessionJournal 
                          ? settings.darkMode ? 'text-white' : 'text-gray-900'
                          : settings.darkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}
                      onClick={() => setShowFullscreenNotes(true)}
                      >
                        {sessionJournal || 'How was your climbing session today?'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Apple-Style Climbs Completed with Toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className={`text-sm font-semibold ${
                        settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                      }`}>
                        Climbs Completed
                      </label>
                      
                      {/* Climb Type Toggle */}
                      <div className="flex items-center space-x-3">
                        <span className={`text-sm font-medium transition-colors ${
                          climbType === 'gym' 
                            ? settings.darkMode ? 'text-white' : 'text-gray-900'
                            : settings.darkMode ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          Gym
                        </span>
                        <button
                          type="button"
                          onClick={() => setClimbType(climbType === 'gym' ? 'kilter' : 'gym')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            climbType === 'kilter' 
                              ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                              : 'bg-gradient-to-r from-blue-500 to-purple-500'
                          } ${settings.darkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                              climbType === 'kilter' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`text-sm font-medium transition-colors ${
                          climbType === 'kilter' 
                            ? settings.darkMode ? 'text-white' : 'text-gray-900'
                            : settings.darkMode ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          Kilter
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {Object.entries(climbCounts).map(([grade, count]) => (
                        <div key={grade} className={`flex items-center justify-between p-4 rounded-xl ${
                          settings.darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-100 border border-gray-200'
                        }`}>
                          <span className={`font-semibold text-lg ${
                            settings.darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {grade}
                          </span>
                          
                          <div className="flex items-center space-x-4">
                            <button
                              type="button"
                              onClick={() => updateClimbCount(grade as keyof typeof climbCounts, false)}
                              disabled={count <= 0}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                                count <= 0
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-30'
                                  : 'bg-red-500/25 hover:bg-red-500/40 text-red-400 hover:text-red-200 border border-red-500/40 hover:border-red-500/60 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95'
                              }`}
                            >
                              <Minus size={14} />
                            </button>
                            
                            <span className={`text-xl font-semibold min-w-[2.5rem] text-center ${
                              settings.darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {count}
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => updateClimbCount(grade as keyof typeof climbCounts, true)}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 bg-green-500/25 hover:bg-green-500/40 text-green-400 hover:text-green-200 border border-green-500/40 hover:border-green-500/60 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
               {/* Session Preview Chart */}
                  <SessionPreviewChart 
                    gymCounts={gymClimbCounts}
                    kilterCounts={kilterClimbCounts}
                    darkMode={settings.darkMode}
                  />
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={showCheckmark}
                  className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                    showCheckmark
                      ? 'bg-green-600 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95'
                  }`}
                >
                  {showCheckmark ? (
                    <>
                      <Check size={20} className="animate-bounce" />
                      <span>Updated!</span>
                    </>
                  ) : (
                    <span>{getButtonText()}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>


      {/* Full-Screen Notes Modal */}
{showFullscreenNotes && (
  <div 
    className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-lg flex items-center justify-center z-100 p-8"
    onClick={() => setShowFullscreenNotes(false)}
  >
          <div 
  className={`rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col ${
    settings.darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
  }`}
  onClick={(e) => e.stopPropagation()}
>
            {/* Header */}
            <div className={`p-6 border-b flex justify-between items-center ${
              settings.darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-xl font-semibold ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Session Notes
              </h3>
              <button
                onClick={() => setShowFullscreenNotes(false)}
                className={`p-2 rounded-lg transition-colors ${
                  settings.darkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              <textarea
                value={sessionJournal}
                onChange={(e) => setSessionJournal(e.target.value)}
                placeholder={`How was your climbing session today?

Share your thoughts about:
• Routes you worked on
• Techniques you practiced  
• Areas for improvement
• Highlights from the session
• How you felt physically and mentally

Write as much or as little as you'd like...`}
                className={`w-full h-full resize-none text-base leading-relaxed ${
                  settings.darkMode 
                    ? 'bg-transparent text-white placeholder-gray-500' 
                    : 'bg-transparent text-gray-900 placeholder-gray-400'
                } border-none outline-none`}
                style={{ minHeight: '400px' }}
                autoFocus
              />
            </div>

            {/* Footer */}
            <div className={`p-6 border-t flex justify-between items-center ${
              settings.darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <span className={`text-sm ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {sessionJournal.trim().split(/\s+/).filter(word => word.length > 0).length} words
              </span>
              <button
                onClick={() => setShowFullscreenNotes(false)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Sessions */}
      {climbingSessions.length > 0 && (
        <div className={`rounded-2xl shadow-sm border overflow-hidden ${
          settings.darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          
          {/* Collapsible Header */}
          <div className={`p-6 ${
            settings.darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
          }`}>
            <div className="flex justify-between items-center">
              <div 
                className="cursor-pointer transition-all duration-200 flex-1"
                onClick={() => setIsRecentSessionsCollapsed(!isRecentSessionsCollapsed)}
              >
                <div className="flex items-center space-x-3">
                  <h3 className={`text-lg font-semibold ${
                    settings.darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Recent Sessions
                  </h3>
                  {isRecentSessionsCollapsed ? (
                    <ChevronDown size={20} className={settings.darkMode ? 'text-gray-400' : 'text-gray-600'} />
                  ) : (
                    <ChevronUp size={20} className={settings.darkMode ? 'text-gray-400' : 'text-gray-600'} />
                  )}
                </div>
              </div>
              
              <span 
                onClick={openAllSessionsModal}
                className={`text-sm transition-colors cursor-pointer hover:underline ${
                  settings.darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                View All ({climbingSessions.length})
              </span>
            </div>
          </div>

          {/* Expandable Content */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isRecentSessionsCollapsed ? 'max-h-0' : 'max-h-[2000px]'
          }`}>
            <div className="px-6 pb-6">
              <div className="space-y-4">
                {sortedSessions
                  .slice(0, 10)
                  .map(session => (
                    <div 
                      key={session.id}
                      className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        settings.darkMode 
                          ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-700' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedSessionForDetail(session)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className={`flex items-center gap-2 text-sm mb-1 ${
                            settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <Calendar size={14} />
                            <span>{formatSessionDateSafe(session.date)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              settings.darkMode 
                                ? 'bg-blue-900/30 text-blue-200' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {session.routes.length} routes
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              settings.darkMode 
                                ? 'bg-green-900/30 text-green-200' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {session.routes.filter(r => r.completed).length} completed
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              settings.darkMode 
                                ? 'bg-orange-900/30 text-orange-200' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {session.duration} min
                            </span>
                          </div>
                          <h4 className={`font-medium ${
                            settings.darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {session.location}
                          </h4>
                          <p className={`mt-1 text-sm ${
                            settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {session.notes ? session.notes.substring(0, 100) + (session.notes.length > 100 ? '...' : '') : 'No notes'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSessionForDetail(session);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              settings.darkMode 
                                ? 'hover:bg-gray-600 text-gray-400' 
                                : 'hover:bg-gray-200 text-gray-600'
                            }`}
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSession(session);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              settings.darkMode 
                                ? 'hover:bg-gray-600 text-gray-400' 
                                : 'hover:bg-gray-200 text-gray-600'
                            }`}
                            title="Edit Session"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this session?')) {
                                deleteSession(session.id);
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              settings.darkMode 
                                ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400' 
                                : 'hover:bg-gray-200 text-gray-600 hover:text-red-500'
                            }`}
                            title="Delete Session"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Sessions Modal */}
      {showAllSessionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${
            settings.darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`p-6 border-b ${
              settings.darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className={`text-2xl font-bold ${
                    settings.darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    All Sessions
                  </h2>
                  <p className={`text-sm mt-1 ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Showing {Math.min(loadedSessionsCount, sortedSessions.length)} of {sortedSessions.length} sessions
                  </p>
                </div>
                
                <button
                  onClick={() => setShowAllSessionsModal(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    settings.darkMode 
                      ? 'hover:bg-gray-700 text-gray-400' 
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div 
              className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]"
              onScroll={handleScroll}
            >
              <div className="space-y-4">
                {sortedSessions
                  .slice(0, loadedSessionsCount)
                  .map(session => (
                    <div 
                      key={session.id}
                      className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        settings.darkMode 
                          ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-700' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setSelectedSessionForDetail(session);
                        setShowAllSessionsModal(false);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className={`flex items-center gap-2 text-sm mb-1 ${
                            settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <Calendar size={14} />
                            <span>{formatSessionDateSafe(session.date)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              settings.darkMode 
                                ? 'bg-blue-900/30 text-blue-200' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {session.routes.length} routes
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              settings.darkMode 
                                ? 'bg-green-900/30 text-green-200' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {session.routes.filter(r => r.completed).length} completed
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              settings.darkMode 
                                ? 'bg-orange-900/30 text-orange-200' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {session.duration} min
                            </span>
                          </div>
                          <h4 className={`font-medium ${
                            settings.darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {session.location}
                          </h4>
                          <p className={`mt-1 text-sm ${
                            settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {session.notes ? session.notes.substring(0, 100) + (session.notes.length > 100 ? '...' : '') : 'No notes'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSessionForDetail(session);
                              setShowAllSessionsModal(false);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              settings.darkMode 
                                ? 'hover:bg-gray-600 text-gray-400' 
                                : 'hover:bg-gray-200 text-gray-600'
                            }`}
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSession(session);
                              setShowAllSessionsModal(false);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              settings.darkMode 
                                ? 'hover:bg-gray-600 text-gray-400' 
                                : 'hover:bg-gray-200 text-gray-600'
                            }`}
                            title="Edit Session"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this session?')) {
                                deleteSession(session.id);
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              settings.darkMode 
                                ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400' 
                                : 'hover:bg-gray-200 text-gray-600 hover:text-red-500'
                            }`}
                            title="Delete Session"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {/* Loading indicator */}
                {loadedSessionsCount < sortedSessions.length && (
                  <div className={`text-center py-4 ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <div className="inline-flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span>Loading more sessions...</span>
                    </div>
                  </div>
                )}
                
                {/* End of list indicator */}
                {loadedSessionsCount >= sortedSessions.length && sortedSessions.length > 10 && (
                  <div className={`text-center py-4 text-sm ${
                    settings.darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    You've reached the end of your sessions
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

      <style jsx>{`
        .slider-gradient::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3B82F6, #8B5CF6);
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }
        
        .slider-gradient::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
        }
        
        .slider-gradient::-webkit-slider-thumb:active {
          transform: scale(0.95);
        }
        
        .slider-gradient::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3B82F6, #8B5CF6);
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }
        
        .slider-gradient::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
};

export default ClimbingLog;