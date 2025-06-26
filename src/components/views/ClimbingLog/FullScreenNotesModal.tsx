import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';

interface FullScreenNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
}

const FullScreenNotesModal: React.FC<FullScreenNotesModalProps> = ({
  isOpen,
  onClose,
  value,
  onChange
}) => {
  const { settings } = useAppContext();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-lg flex items-center justify-center z-100 p-8"
      onClick={onClose}
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

        {/* Content */}
        <div className="flex-1 p-6">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
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
            {value.trim().split(/\s+/).filter(word => word.length > 0).length} words
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullScreenNotesModal;