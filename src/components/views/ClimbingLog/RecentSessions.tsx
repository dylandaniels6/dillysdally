import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Edit, Trash, Calendar, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { ClimbingSession } from '../../../types';
import { formatDate } from '../../../utils/dateUtils';
import AllSessionsModal from './AllSessionsModal';
import { Card } from '../../common/Card';

interface RecentSessionsProps {
  onEditSession: (session: ClimbingSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onViewSession: (session: ClimbingSession) => void;
}

const RecentSessions: React.FC<RecentSessionsProps> = ({
  onEditSession,
  onDeleteSession,
  onViewSession
}) => {
  const { climbingSessions, settings } = useAppContext();
  
  // Recent Sessions collapsible state
  const [isRecentSessionsCollapsed, setIsRecentSessionsCollapsed] = useState(true);
  
  // Recent Sessions Modal state
  const [showAllSessionsModal, setShowAllSessionsModal] = useState(false);
  
  // Timezone-safe display formatting for session dates
  const formatSessionDateSafe = (dateStr: string) => {
    // Add noon to prevent timezone shifting
    const date = new Date(dateStr + 'T12:00:00');
    return formatDate(date);
  };
  
  // Sort sessions by date (most recent first)
  const sortedSessions = [...climbingSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openAllSessionsModal = () => {
    setShowAllSessionsModal(true);
  };

  if (climbingSessions.length === 0) {
    return null;
  }

  return (
    <>
      <Card variant="elevated" size="sm" padding="sm" className={`shadow-sm border overflow-hidden ${
        settings.darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        
        {/* Collapsible Header */}
        <div className={`py-2 ${
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
          <div className="pt-3 space-y-4">
              {sortedSessions
                .slice(0, 10)
                .map(session => (
                  <Card 
                    key={session.id}
                    className={`p-4 border transition-all duration-200 cursor-pointer ${
                      settings.darkMode 
                        ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-700' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => onViewSession(session)}
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
                            onViewSession(session);
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
                            onEditSession(session);
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
                              onDeleteSession(session.id);
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
                  </Card>
                ))}
            </div>
        </div>
      </Card>

      {/* All Sessions Modal */}
      <AllSessionsModal
        isOpen={showAllSessionsModal}
        onClose={() => setShowAllSessionsModal(false)}
        sortedSessions={sortedSessions}
        onEditSession={onEditSession}
        onDeleteSession={onDeleteSession}
        onViewSession={onViewSession}
      />
    </>
  );
};

export default RecentSessions;