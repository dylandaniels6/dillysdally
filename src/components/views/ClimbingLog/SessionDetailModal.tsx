import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Edit, Calendar, Clock, MapPin, X } from 'lucide-react';
import { ClimbingSession, ClimbingRoute } from '../../../types';
import { formatDate } from '../../../utils/dateUtils';

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

export default SessionDetailModal;