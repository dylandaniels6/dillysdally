import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Edit, Trash, Calendar, Eye, X } from 'lucide-react';
import { ClimbingSession } from '../../../types';
import { formatDate } from '../../../utils/dateUtils';

interface AllSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sortedSessions: ClimbingSession[];
  onEditSession: (session: ClimbingSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onViewSession: (session: ClimbingSession) => void;
}

const AllSessionsModal: React.FC<AllSessionsModalProps> = ({
  isOpen,
  onClose,
  sortedSessions,
  onEditSession,
  onDeleteSession,
  onViewSession
}) => {
  const { settings } = useAppContext();
  const [loadedSessionsCount, setLoadedSessionsCount] = useState(10);
  
  // Timezone-safe display formatting for session dates
  const formatSessionDateSafe = (dateStr: string) => {
    // Add noon to prevent timezone shifting
    const date = new Date(dateStr + 'T12:00:00');
    return formatDate(date);
  };

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
  React.useEffect(() => {
    if (isOpen) {
      setLoadedSessionsCount(10);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
                All Sessions
              </h2>
              <p className={`text-sm mt-1 ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Showing {Math.min(loadedSessionsCount, sortedSessions.length)} of {sortedSessions.length} sessions
              </p>
            </div>
            
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
                    onViewSession(session);
                    onClose();
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
                          onViewSession(session);
                          onClose();
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
                          onClose();
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
  );
};

export default AllSessionsModal;