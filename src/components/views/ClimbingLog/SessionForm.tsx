import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Minus, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { ClimbingSession, ClimbingRoute } from '../../../types';
import { createAuthenticatedSupabaseClient } from '../../../lib/supabase';
import { useAuth } from '@clerk/clerk-react';
import { SessionPreviewChart } from './ChartEnhancements';
import FullScreenNotesModal from './FullScreenNotesModal';
import { formatDate } from '../../../utils/dateUtils';
import { Card } from '../../common/Card';

interface SessionFormProps {
  selectedDate: Date;
  existingSession: ClimbingSession | null;
  isEditingSession: ClimbingSession | null;
  onSessionSaved: (session: ClimbingSession) => void;
  onEditCancel: () => void;
  isToday: boolean;
}

const SessionForm: React.FC<SessionFormProps> = ({
  selectedDate,
  existingSession,
  isEditingSession,
  onSessionSaved,
  onEditCancel,
  isToday
}) => {
  const { climbingSessions, setClimbingSessions, settings, user, isAuthenticated } = useAppContext();
  const { getToken } = useAuth();
  
  // Collapsible form state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  
  // Full-screen notes modal state
  const [showFullscreenNotes, setShowFullscreenNotes] = useState(false);
  
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
  
  // Timezone-safe date formatting that preserves local dates
  const formatDateSafe = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const selectedDateFormatted = formatDateSafe(selectedDate);
  
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
      const token = await getToken();
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token, userId);

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
      const sessionDate = isEditingSession ? isEditingSession.date : formatDateSafe(selectedDate);

      const sessionData = {
        date: sessionDate,
        location: selectedGym,
        duration: sessionDuration,
        notes: sessionJournal,
        routes,
        user_id: user?.id
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

      // Call the callback with the saved session
      onSessionSaved(data);
      
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

  // Get the session being displayed in the form
  const currentFormSession = isEditingSession || existingSession;

  // Dynamic header text
  const getHeaderText = () => {
    if (isEditingSession) {
      return `Edit Session - ${formatDate(new Date(isEditingSession.date + 'T12:00:00'))}`;
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

  // Calculate total climbs for real-time visualization (both gym and kilter combined)
  const totalClimbs = Object.values(gymClimbCounts).reduce((sum, count) => sum + count, 0) + 
                     Object.values(kilterClimbCounts).reduce((sum, count) => sum + count, 0);

  return (
    <>
      {/* Session Form Card */}
      <Card variant="elevated" size="sm" padding="none" className="overflow-hidden">
        
        {/* Collapsible Header */}
        <div 
          className={`p-4 cursor-pointer transition-all duration-200 ${
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
                  ? `Editing session from ${formatDate(new Date(isEditingSession.date + 'T12:00:00'))}`
                  : formatDate(selectedDate)
                }
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {isEditingSession && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCancel();
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
          <div className="px-4 pb-4">
            
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
                      <div className={`p-4 pr-20 min-h-[300px] cursor-pointer transition-all duration-200 ${
                        sessionJournal 
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
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
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
      </Card>

      {/* Full-Screen Notes Modal */}
      <FullScreenNotesModal
        isOpen={showFullscreenNotes}
        sessionJournal={sessionJournal}
        onSave={setSessionJournal}
        onClose={() => setShowFullscreenNotes(false)}
      />

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
    </>
  );
};

export default SessionForm;