import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { ClimbingSession } from '../../../types';
import { createAuthenticatedSupabaseClient } from '../../../lib/supabase';
import { useAuth } from '@clerk/clerk-react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import ClimbingProgress from './ClimbingProgress';
import SessionForm from './SessionForm';
import RecentSessions from './RecentSessions';
import SessionDetailModal from './SessionDetailModal';

type TimeRange = 'week' | 'month' | '6months' | 'year' | 'all';

interface ClimbTypeFilters {
  gym: boolean;
  kilter: boolean;
}

// 🔒 VALIDATION FUNCTIONS
const validateClimbingSession = (session: Partial<ClimbingSession>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Date validation
  if (!session.date) {
    errors.push('Date is required');
  } else {
    const date = new Date(session.date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
    } else if (date > new Date()) {
      errors.push('Date cannot be in the future');
    } else if (date < new Date('1900-01-01')) {
      errors.push('Date is too far in the past');
    }
  }

  // Location validation
  if (!session.location || typeof session.location !== 'string') {
    errors.push('Location is required');
  } else if (session.location.length < 2) {
    errors.push('Location must be at least 2 characters');
  } else if (session.location.length > 100) {
    errors.push('Location name is too long (max 100 characters)');
  }

  // Routes validation
  if (session.routes) {
    if (!Array.isArray(session.routes)) {
      errors.push('Routes must be an array');
    } else if (session.routes.length > 100) {
      errors.push('Too many routes (max 100 per session)');
    } else {
      session.routes.forEach((route, index) => {
        if (!route || typeof route !== 'object') {
          errors.push(`Route ${index + 1} is invalid`);
          return;
        }

        // Grade validation
        if (!route.grade || typeof route.grade !== 'string') {
          errors.push(`Route ${index + 1}: Grade is required`);
        } else if (route.grade.length > 10) {
          errors.push(`Route ${index + 1}: Grade is too long (max 10 characters)`);
        } else if (!isValidClimbingGrade(route.grade)) {
          errors.push(`Route ${index + 1}: Invalid climbing grade format`);
        }

        // Attempts validation
        if (route.attempts !== undefined) {
          if (typeof route.attempts !== 'number' || isNaN(route.attempts)) {
            errors.push(`Route ${index + 1}: Attempts must be a number`);
          } else if (route.attempts < 0) {
            errors.push(`Route ${index + 1}: Attempts cannot be negative`);
          } else if (route.attempts > 1000) {
            errors.push(`Route ${index + 1}: Attempts seems unrealistic (max 1000)`);
          }
        }

        // Completed validation
        if (route.completed !== undefined && typeof route.completed !== 'boolean') {
          errors.push(`Route ${index + 1}: Completed must be true/false`);
        }

        // Flash validation
        if (route.flash !== undefined && typeof route.flash !== 'boolean') {
          errors.push(`Route ${index + 1}: Flash must be true/false`);
        }

        // Notes validation
        if (route.notes && typeof route.notes === 'string' && route.notes.length > 500) {
          errors.push(`Route ${index + 1}: Notes are too long (max 500 characters)`);
        }
      });
    }
  }

  // Notes validation
  if (session.notes && typeof session.notes === 'string' && session.notes.length > 1000) {
    errors.push('Session notes are too long (max 1000 characters)');
  }

  // Duration validation
  if (session.duration !== undefined) {
    if (typeof session.duration !== 'number' || isNaN(session.duration)) {
      errors.push('Duration must be a number');
    } else if (session.duration < 0) {
      errors.push('Duration cannot be negative');
    } else if (session.duration > 24 * 60) {
      errors.push('Duration cannot exceed 24 hours');
    }
  }

  return { valid: errors.length === 0, errors };
};

const isValidClimbingGrade = (grade: string): boolean => {
  // Boulder grades (V-scale) - most common in the US
  const boulderRegex = /^V([0-9]|1[0-9]|B)$/i;
  
  // Sport/Traditional grades (5.X) - most common in the US  
  const sportRegex = /^5\.[0-9]{1,2}[a-d]?$/i;
  
  return boulderRegex.test(grade) || sportRegex.test(grade);
};

const sanitizeClimbingInput = (input: string): string => {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
};

const sanitizeNumericInput = (value: any, min: number, max: number): number => {
  const num = parseFloat(value);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(num, max));
};

// Enhanced validation hook
const useClimbingValidation = () => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const validateSession = (session: Partial<ClimbingSession>) => {
    const validation = validateClimbingSession(session);
    setValidationErrors(validation.errors);

    // Add warnings for potential issues
    const warnings: string[] = [];
    
    if (session.routes && session.routes.length > 50) {
      warnings.push('Very high number of routes - consider breaking into multiple sessions');
    }
    
    if (session.duration && session.duration > 8 * 60) {
      warnings.push('Very long session - make sure to stay hydrated and take breaks');
    }
    
    if (session.routes) {
      const flashCount = session.routes.filter(r => r.flash).length;
      const totalRoutes = session.routes.length;
      if (flashCount / totalRoutes > 0.8 && totalRoutes > 5) {
        warnings.push('High flash rate - consider trying harder grades to challenge yourself');
      }
    }

    setValidationWarnings(warnings);
    return validation.valid;
  };

  const clearValidation = () => {
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  return {
    validationErrors,
    validationWarnings,
    validateSession,
    clearValidation
  };
};

const ClimbingLog: React.FC = () => {
  const { climbingSessions, setClimbingSessions, selectedDate, settings } = useAppContext();
  const { getToken } = useAuth();
  
  // Add shared time range state for the chart and progress
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [climbTypeFilters, setClimbTypeFilters] = useState<ClimbTypeFilters>({
    gym: true,
    kilter: true
  });
  
  // 🔒 VALIDATION: Use validation hook
  const { validationErrors, validationWarnings, validateSession, clearValidation } = useClimbingValidation();
  
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
  
  // 🔒 VALIDATION: Filter sessions and validate existing data
  const validSessions = climbingSessions.filter(session => {
    const validation = validateClimbingSession(session);
    if (!validation.valid) {
      console.warn('Invalid climbing session found:', session, validation.errors);
      return false;
    }
    return true;
  });

  const invalidSessionsCount = climbingSessions.length - validSessions.length;
  
  // Get session for the currently selected date (from valid sessions only)
  const existingSession = validSessions.find(session => session.date === selectedDateFormatted);
  
  // 🔒 VALIDATION: Enhanced delete with validation
  const deleteSession = async (sessionId: string) => {
    const session = climbingSessions.find(s => s.id === sessionId);
    if (!session) return;

    // Enhanced confirmation
    const routeCount = session.routes?.length || 0;
    const confirmMessage = `Are you sure you want to delete this climbing session?\n\nDate: ${session.date}\nLocation: ${session.location}\nRoutes: ${routeCount}\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) return;

    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token, userId);

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

  // 🔒 VALIDATION: Enhanced edit with validation
  const handleEditSession = (session: ClimbingSession) => {
    // Validate before allowing edit
    const validation = validateClimbingSession(session);
    if (!validation.valid) {
      alert(`Cannot edit invalid session:\n${validation.errors.join('\n')}\n\nPlease contact support if this persists.`);
      return;
    }

    clearValidation();
    setIsEditingSession(session);
    setSelectedSessionForDetail(null);
  };

  const handleCancelEdit = () => {
    setIsEditingSession(null);
    clearValidation();
  };

  // 🔒 VALIDATION: Enhanced session save with validation
  const handleSessionSaved = (session: ClimbingSession) => {
    // Validate the saved session
    const validation = validateClimbingSession(session);
    if (!validation.valid) {
      console.error('Saved session is invalid:', validation.errors);
      alert('Session saved but contains validation errors. Please review and edit if necessary.');
    }

    // Clear editing state
    setIsEditingSession(null);
    clearValidation();
  };

  // 🔒 VALIDATION: Enhanced form submission handler
  const handleFormSubmit = async (sessionData: Partial<ClimbingSession>) => {
    // Sanitize inputs
    const sanitizedSession = {
      ...sessionData,
      location: sessionData.location ? sanitizeClimbingInput(sessionData.location) : '',
      notes: sessionData.notes ? sanitizeClimbingInput(sessionData.notes) : '',
      routes: sessionData.routes?.map(route => ({
        ...route,
        grade: route.grade ? sanitizeClimbingInput(route.grade) : '',
        notes: route.notes ? sanitizeClimbingInput(route.notes) : '',
        attempts: route.attempts ? sanitizeNumericInput(route.attempts, 0, 1000) : undefined
      })),
      duration: sessionData.duration ? sanitizeNumericInput(sessionData.duration, 0, 24 * 60) : undefined
    };

    // Validate the sanitized session
    const isValid = validateSession(sanitizedSession);
    if (!isValid) {
      return false; // Validation errors will be shown
    }

    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token, userId);

      if (sanitizedSession.id) {
        // Update existing session
        const { error } = await supabase
          .from('climbing_sessions')
          .update(sanitizedSession)
          .eq('id', sanitizedSession.id);

        if (error) throw error;

        // Update local state
        setClimbingSessions(prev => 
          prev.map(session => 
            session.id === sanitizedSession.id ? sanitizedSession as ClimbingSession : session
          )
        );
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('climbing_sessions')
          .insert([sanitizedSession])
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setClimbingSessions(prev => [...prev, data]);
      }

      clearValidation();
      return true;
    } catch (error) {
      console.error('Error saving climbing session:', error);
      alert('Failed to save session. Please try again.');
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* 🔒 VALIDATION: Data quality indicator */}
      {invalidSessionsCount > 0 && (
        <div className={`p-4 rounded-xl border ${
          settings.darkMode 
            ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-400' 
            : 'bg-yellow-50 border-yellow-200 text-yellow-700'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">
              {invalidSessionsCount} invalid climbing session{invalidSessionsCount > 1 ? 's' : ''} excluded from display
            </span>
          </div>
        </div>
      )}

      {/* 🔒 VALIDATION: Validation errors display */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className="space-y-2">
          {validationErrors.length > 0 && (
            <div className={`p-4 rounded-xl border ${
              settings.darkMode 
                ? 'bg-red-900/20 border-red-700/50 text-red-400' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} />
                <h4 className="font-medium text-sm">Please fix these issues:</h4>
              </div>
              <ul className="text-xs space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validationWarnings.length > 0 && (
            <div className={`p-4 rounded-xl border ${
              settings.darkMode 
                ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-400' 
                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} />
                <h4 className="font-medium text-sm">Suggestions:</h4>
              </div>
              <ul className="text-xs space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Progress Chart - Enhanced with validation */}
      <ClimbingProgress 
        sessions={validSessions} // Pass only valid sessions
        selectedTimeRange={selectedTimeRange}
        onTimeRangeChange={setSelectedTimeRange}
        climbTypeFilters={climbTypeFilters}
        onFiltersChange={setClimbTypeFilters}
        showDataQuality={invalidSessionsCount > 0}
      />
      
      {/* Session Form - Enhanced with validation */}
      <SessionForm
        selectedDate={selectedDate}
        existingSession={existingSession}
        isEditingSession={isEditingSession}
        onSessionSaved={handleSessionSaved}
        onEditCancel={handleCancelEdit}
        onSubmit={handleFormSubmit}
        isToday={isToday}
        validationErrors={validationErrors}
        validationWarnings={validationWarnings}
        onValidate={validateSession}
        onClearValidation={clearValidation}
      />

      {/* Recent Sessions - Enhanced with validation */}
      <RecentSessions
        sessions={validSessions} // Pass only valid sessions
        onEditSession={handleEditSession}
        onDeleteSession={deleteSession}
        onViewSession={setSelectedSessionForDetail}
        showDataQuality={invalidSessionsCount > 0}
      />

      {/* Session Detail Modal - Enhanced with validation */}
      {selectedSessionForDetail && (
        <SessionDetailModal
          session={selectedSessionForDetail}
          isOpen={!!selectedSessionForDetail}
          onClose={() => setSelectedSessionForDetail(null)}
          onEdit={handleEditSession}
          onDelete={deleteSession}
          showValidationWarnings={true}
        />
      )}
    </div>
  );
};

export default ClimbingLog;