import React, { useState, useRef, useEffect } from 'react';
import { Send, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage } from './utils/aiService';
import { useAppContext } from '../../../context/AppContext';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface AIChatProps {
  dailyRecap: string;
  isLoading: boolean;
  onFocusChange: (focused: boolean) => void;
  onHistoryClick: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ 
  dailyRecap, 
  isLoading, 
  onFocusChange,
  onHistoryClick 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { journalEntries, expenses, climbingSessions, habits } = useAppContext();

  // Load chat history and check if user has sent messages before
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
        // Check if user has sent any messages
        const userHasSent = parsedMessages.some((msg: Message) => msg.role === 'user');
        setHasUserSentMessage(userHasSent);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    } else if (dailyRecap && !isLoading) {
      // Set initial daily recap message
      const initialMessage = {
        id: '1',
        content: dailyRecap,
        role: 'assistant' as const,
        timestamp: new Date()
      };
      setMessages([initialMessage]);
      localStorage.setItem('chatMessages', JSON.stringify([initialMessage]));
    }
  }, [dailyRecap, isLoading]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    setHasUserSentMessage(true); // Mark that user has sent a message

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
        timestamp: new Date()
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
    } finally {
      setIsTyping(false);
    }
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
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
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
                onClick={onHistoryClick}
                className="p-3 text-white/40 hover:text-white/60 transition-colors"
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