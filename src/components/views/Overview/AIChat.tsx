import React, { useState, useRef, useEffect } from 'react';
import { Send, Clock, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from '../../../lib/supabase';
import { sendChatMessage } from './utils/aiService';
import { useAppContext } from '../../../context/AppContext';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatSession {
  id: string;
  date: string;
  messages: Message[];
  created_at?: string;
  updated_at?: string;
}

interface AIChatProps {
  dailyRecap: string;
  isLoading: boolean;
  onFocusChange: (focused: boolean) => void;
  onHistoryClick: () => void;
}

// ChatGPT-style typing component with exact speed and cadence
const ChatGPTTyping: React.FC<{ 
  text: string; 
  onComplete?: () => void;
  onTextChange?: (text: string) => void;
  speed?: number;
}> = ({ text, onComplete, onTextChange, speed = 65 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const char = text[currentIndex];
      
      // Base delay calculation
      let delay = 1000 / speed;
      
      // Adjust delays for natural pauses
      if (char === '.' || char === '!' || char === '?') {
        delay *= 1.8;
      } else if (char === ',' || char === ';' || char === ':') {
        delay *= 1.3;
      } else if (char === '\n') {
        delay *= 1.5;
      } else if (char === ' ' && currentIndex > 0) {
        const prevChar = text[currentIndex - 1];
        if (prevChar === '.' || prevChar === '!' || prevChar === '?') {
          delay *= 1.2;
        }
      }
      
      // Small random variations
      delay *= 0.9 + Math.random() * 0.2;

      const timeout = setTimeout(() => {
        const newText = displayedText + char;
        setDisplayedText(newText);
        setCurrentIndex(prev => prev + 1);
        onTextChange?.(newText);
      }, delay);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete, displayedText, onTextChange]);

  return <span className="whitespace-pre-wrap">{displayedText}</span>;
};

const AIChat: React.FC<AIChatProps> = ({ 
  dailyRecap, 
  isLoading, 
  onFocusChange,
  onHistoryClick 
}) => {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const [isDailyRecapTyping, setIsDailyRecapTyping] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { journalEntries, expenses, climbingSessions, habits, isAuthenticated } = useAppContext();

  // Initialize session
  useEffect(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(sessionId);
  }, []);

  // Load chat history and check if user has sent messages before
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!isAuthenticated) {
        handleOfflineMode();
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          handleOfflineMode();
          return;
        }
        
        const supabase = createAuthenticatedSupabaseClient(token);
        
        // Try to get today's chat session
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('date', today)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error loading chat session:', error);
          handleOfflineMode();
          return;
        }

        if (data) {
          // Load existing session
          const parsedMessages = typeof data.messages === 'string' 
            ? JSON.parse(data.messages) 
            : data.messages;
          
          setMessages(parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
          setCurrentSessionId(data.id);
          setHasUserSentMessage(parsedMessages.some((msg: any) => msg.role === 'user'));
        } else {
          // No existing session, check if we should show daily recap
          const hasSeenTodaysRecap = localStorage.getItem('hasSeenTodaysRecap') === today;
          if (dailyRecap && !isLoading && !hasSeenTodaysRecap) {
            setIsDailyRecapTyping(true);
          }
        }
      } catch (error) {
        console.error('Error loading authenticated chat history:', error);
        handleOfflineMode();
      }
    };

    const handleOfflineMode = () => {
      const savedMessages = localStorage.getItem('chatMessages');
      const today = new Date().toDateString();
      const hasSeenTodaysRecap = localStorage.getItem('hasSeenTodaysRecap') === today;
      
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          setMessages(parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
          const userHasSent = parsedMessages.some((msg: Message) => msg.role === 'user');
          setHasUserSentMessage(userHasSent);
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      } else if (dailyRecap && !isLoading && !hasSeenTodaysRecap) {
        setIsDailyRecapTyping(true);
      }
    };

    loadChatHistory();
  }, [dailyRecap, isLoading, isAuthenticated, getToken]);

  // Save messages to both localStorage and Supabase
  useEffect(() => {
    if (messages.length > 0) {
      // Always save to localStorage for offline access
      localStorage.setItem('chatMessages', JSON.stringify(messages));
      
      // Save to Supabase if authenticated
      if (isAuthenticated && currentSessionId) {
        saveChatToSupabase(messages);
      }
    }
  }, [messages, isAuthenticated, currentSessionId]);

  const saveChatToSupabase = async (chatMessages: Message[]) => {
    try {
      const token = await getToken();
      if (!token) return;
      
      const supabase = createAuthenticatedSupabaseClient(token);
      
      const sessionData = {
        id: currentSessionId,
        date: new Date().toISOString().split('T')[0],
        messages: JSON.stringify(chatMessages),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('chat_sessions')
        .upsert(sessionData);
      
      if (error) {
        console.error('Error saving chat to Supabase:', error);
      }
    } catch (error) {
      console.error('Error saving chat to Supabase:', error);
    }
  };

  const [typingProgress, setTypingProgress] = useState('');

  // Auto-scroll to bottom when messages change OR during typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingProgress]);

  // Handle daily recap typing completion
  const handleDailyRecapComplete = async () => {
    const today = new Date().toDateString();
    localStorage.setItem('hasSeenTodaysRecap', today);
    
    const recapMessage: Message = {
      id: '1',
      content: dailyRecap,
      role: 'assistant',
      timestamp: new Date()
    };
    
    setMessages([recapMessage]);
    setIsDailyRecapTyping(false);

    // Save this initial message if authenticated
    if (isAuthenticated && currentSessionId) {
      saveChatToSupabase([recapMessage]);
    }
  };

  // Handle new conversation
  const handleNewConversation = async () => {
    // Create new session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(newSessionId);
    
    // Clear messages and reset state
    setMessages([]);
    setInput('');
    setIsTyping(false);
    setHasUserSentMessage(false);
    setIsDailyRecapTyping(false);
    
    // Clear chat from localStorage
    localStorage.removeItem('chatMessages');
    
    // The new conversation will automatically be saved when messages are added
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setHasUserSentMessage(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const response = await sendChatMessage(input, messages, {
        journalEntries,
        expenses,
        climbingSessions,
        habits
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date(),
        isTyping: true
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat API Error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Error: Failed to get response. Please check your API settings.`,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  // Handle AI typing completion
  const handleAITypingComplete = (messageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isTyping: false }
          : msg
      )
    );
    setIsTyping(false);
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = Math.min(scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Show authentication warning if not signed in
  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-8 text-white backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-4">Sign In Required</h3>
            <p className="text-sm text-white/70 mb-6">
              Please sign in to access AI chat features and sync your conversations across devices.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show centered input if no messages and not typing daily recap
  if (messages.length === 0 && !isDailyRecapTyping) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-4 max-w-4xl w-full px-6">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on the agenda today?"
              rows={1}
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 pr-14 text-white placeholder-white/50 resize-none outline-none focus:border-white/40 focus:bg-white/15 transition-all text-lg leading-relaxed overflow-hidden"
              style={{ 
                minHeight: '60px', 
                maxHeight: '60px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 text-white/50 hover:text-white/80 transition-colors disabled:opacity-30"
              onClick={handleSubmit}
            >
              <Send size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={onHistoryClick}
            className="p-4 text-white/50 hover:text-white/80 transition-colors bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl"
            title="Chat history"
          >
            <Clock size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Show centered typing daily recap if it's typing and no user messages yet
  if (isDailyRecapTyping && !hasUserSentMessage) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-3xl px-4">
          <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white backdrop-blur-sm mb-8">
            <div className="text-sm leading-relaxed">
              <ChatGPTTyping 
                text={dailyRecap} 
                onComplete={handleDailyRecapComplete}
                speed={1000}
              />
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on the agenda today?"
                rows={1}
                className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-4 pr-12 text-white placeholder-white/60 resize-none outline-none focus:border-white/50 focus:bg-white/15 transition-all text-lg"
                style={{ minHeight: '60px', maxHeight: '200px' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-3 bottom-3 p-2 text-white/40 hover:text-white/70 transition-colors disabled:opacity-30"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 border border-white/20 text-white backdrop-blur-sm'
              }`}>
                {message.isTyping ? (
                  <div className="text-sm leading-relaxed">
                    <ChatGPTTyping 
                      text={message.content}
                      onComplete={() => handleAITypingComplete(message.id)}
                      onTextChange={setTypingProgress}
                      speed={1000}
                    />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && !messages.some(m => m.isTyping) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Dynamic Width */}
      <div className="px-4 pb-6">
        <motion.div
          initial={false}
          animate={{
            paddingLeft: hasUserSentMessage ? '0' : '0',
            paddingRight: hasUserSentMessage ? '0' : '15%',
          }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="relative"
        >
          <form onSubmit={handleSubmit}>
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  rows={1}
                  className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/60 resize-none outline-none focus:border-white/50 focus:bg-white/15 transition-all text-sm"
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 bottom-2 p-2 text-white/40 hover:text-white/70 transition-colors disabled:opacity-30"
                >
                  <Send size={18} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleNewConversation}
                className="p-3 text-white/40 hover:text-white/60 transition-colors"
                title="New conversation"
              >
                <Plus size={20} />
              </button>
              <button
                type="button"
                onClick={onHistoryClick}
                className="p-3 text-white/40 hover:text-white/60 transition-colors"
                title="Chat history"
              >
                <Clock size={20} />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AIChat;