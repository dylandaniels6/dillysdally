import React, { useState, useEffect } from 'react';
import { X, Calendar, MessageSquare, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from '../../../lib/supabase';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  date: string;
  messages: ChatMessage[];
  created_at?: string;
  updated_at?: string;
}

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ isOpen, onClose }) => {
  const { getToken } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen]);

  const loadChatHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await getToken();
      if (!token) {
        // Fall back to localStorage if not authenticated
        loadFromLocalStorage();
        return;
      }
      
      const supabase = createAuthenticatedSupabaseClient(token);
      
      // First, try to create the chat_sessions table if it doesn't exist
      await createChatSessionsTable(supabase);
      
      // Load chat sessions from Supabase
      const { data, error: fetchError } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (fetchError) {
        console.error('Error loading from Supabase:', fetchError);
        // Fall back to localStorage on error
        loadFromLocalStorage();
        return;
      }
      
      // Parse messages JSON and set sessions
      const parsedSessions = (data || []).map(session => ({
        ...session,
        messages: typeof session.messages === 'string' 
          ? JSON.parse(session.messages) 
          : session.messages
      }));
      
      setSessions(parsedSessions);
      
      // Also merge with localStorage data for backwards compatibility
      const localSessions = getLocalStorageSessions();
      const mergedSessions = mergeSessions(parsedSessions, localSessions);
      setSessions(mergedSessions);
      
    } catch (error) {
      console.error('Error loading chat history:', error);
      setError('Failed to load chat history');
      // Fall back to localStorage on error
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const createChatSessionsTable = async (supabase: any) => {
    try {
      // This will only work if you have the proper permissions
      // In production, this table should be created via migration
      const { error } = await supabase.rpc('create_chat_sessions_table_if_not_exists');
      if (error && !error.message.includes('already exists')) {
        console.warn('Could not create chat_sessions table:', error);
      }
    } catch (error) {
      // Table creation failed, but that's okay - it might already exist
      console.warn('Chat sessions table creation skipped:', error);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const localSessions = getLocalStorageSessions();
      setSessions(localSessions);
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setSessions([]);
    }
  };

  const getLocalStorageSessions = (): ChatSession[] => {
    try {
      const history = localStorage.getItem('chatHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error parsing localStorage chat history:', error);
      return [];
    }
  };

  const mergeSessions = (supabaseSessions: ChatSession[], localSessions: ChatSession[]): ChatSession[] => {
    const sessionMap = new Map<string, ChatSession>();
    
    // Add Supabase sessions first (they take priority)
    supabaseSessions.forEach(session => {
      sessionMap.set(session.id, session);
    });
    
    // Add local sessions that don't exist in Supabase
    localSessions.forEach(session => {
      if (!sessionMap.has(session.id)) {
        sessionMap.set(session.id, session);
      }
    });
    
    return Array.from(sessionMap.values())
      .sort((a, b) => new Date(b.updated_at || b.date).getTime() - new Date(a.updated_at || a.date).getTime());
  };

  const saveChatSession = async (session: ChatSession) => {
    try {
      const token = await getToken();
      if (token) {
        const supabase = createAuthenticatedSupabaseClient(token);
        
        // Save to Supabase
        const { error } = await supabase
          .from('chat_sessions')
          .upsert({
            id: session.id,
            date: session.date,
            messages: JSON.stringify(session.messages),
            created_at: session.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error saving to Supabase:', error);
          // Fall back to localStorage
          saveToLocalStorage(session);
          return;
        }
      } else {
        // Save to localStorage if not authenticated
        saveToLocalStorage(session);
      }
      
      // Also save to localStorage for offline access
      saveToLocalStorage(session);
      
    } catch (error) {
      console.error('Error saving chat session:', error);
      // Fall back to localStorage
      saveToLocalStorage(session);
    }
  };

  const saveToLocalStorage = (session: ChatSession) => {
    try {
      const existingSessions = getLocalStorageSessions();
      const updatedSessions = [
        session, 
        ...existingSessions.filter(s => s.id !== session.id)
      ];
      localStorage.setItem('chatHistory', JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const deleteChatSession = async (sessionId: string) => {
    if (!confirm('Delete this chat session? This action cannot be undone.')) {
      return;
    }

    try {
      const token = await getToken();
      if (token) {
        const supabase = createAuthenticatedSupabaseClient(token);
        
        // Delete from Supabase
        const { error } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', sessionId);
        
        if (error) {
          console.error('Error deleting from Supabase:', error);
        }
      }
      
      // Also remove from localStorage
      const existingSessions = getLocalStorageSessions();
      const updatedSessions = existingSessions.filter(s => s.id !== sessionId);
      localStorage.setItem('chatHistory', JSON.stringify(updatedSessions));
      
      // Update local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      
    } catch (error) {
      console.error('Error deleting chat session:', error);
      setError('Failed to delete chat session');
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

  const exportChatHistory = () => {
    try {
      const dataStr = JSON.stringify(sessions, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Error exporting chat history:', error);
      setError('Failed to export chat history');
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
              <div>
                <h2 className="text-xl font-semibold text-white">Chat History</h2>
                <p className="text-sm text-white/60">{sessions.length} conversations</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportChatHistory}
                  className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white/80"
                >
                  Export
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-white/60" />
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-300 text-xs hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex h-[calc(100%-80px)]">
              {/* Sessions List */}
              <div className="w-64 border-r border-white/10 overflow-y-auto">
                {isLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full mx-auto"></div>
                    <p className="text-white/40 text-sm mt-2">Loading...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="p-6 text-center text-white/40">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No chat history yet</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {sessions.map((session) => (
                      <div key={session.id} className="group relative">
                        <button
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
                          <div className="text-white text-sm line-clamp-2 pr-6">
                            {session.messages[0]?.content || 'Empty conversation'}
                          </div>
                        </button>
                        
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChatSession(session.id);
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-all rounded"
                          title="Delete conversation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Messages View */}
              <div className="flex-1 overflow-y-auto">
                {selectedSession ? (
                  <div className="p-6 space-y-4">
                    <div className="border-b border-white/10 pb-4">
                      <h3 className="text-lg font-medium text-white">
                        {formatDate(selectedSession.date)}
                      </h3>
                      <p className="text-sm text-white/60">
                        {selectedSession.messages.length} messages
                      </p>
                    </div>
                    
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
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </p>
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