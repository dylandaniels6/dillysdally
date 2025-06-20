import React, { useState, useEffect } from 'react';
import { X, Calendar, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatSession {
  id: string;
  date: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen]);

  const loadChatHistory = () => {
    // Load from localStorage for now
    // In production, this would load from your database
    const history = localStorage.getItem('chatHistory');
    if (history) {
      setSessions(JSON.parse(history));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] max-w-4xl mx-auto bg-gray-900/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Chat History</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex h-[calc(100%-80px)]">
              {/* Sessions List */}
              <div className="w-64 border-r border-white/10 overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="p-6 text-center text-white/40">
                    No chat history yet
                  </div>
                ) : (
                  <div className="p-2">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className={`w-full p-3 rounded-lg text-left transition-colors mb-1 ${
                          selectedSession?.id === session.id
                            ? 'bg-white/10'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                          <Calendar size={14} />
                          <span>{formatDate(session.date)}</span>
                        </div>
                        <div className="text-white text-sm line-clamp-2">
                          {session.messages[0]?.content || 'Empty conversation'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Messages View */}
              <div className="flex-1 overflow-y-auto">
                {selectedSession ? (
                  <div className="p-6 space-y-4">
                    {selectedSession.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] p-4 rounded-2xl ${
                            message.role === 'user'
                              ? 'bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 text-white'
                              : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <div className="mt-2 text-xs opacity-50">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/40">
                    <div className="text-center">
                      <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Select a conversation to view</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistory;