import React, { useState, useRef, useEffect } from 'react';
import { Send, Clock, Sparkles } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInitialPrompt, setShowInitialPrompt] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { journalEntries, expenses, climbingSessions, habits } = useAppContext();

  // Add daily recap as first message when loaded
  useEffect(() => {
    if (dailyRecap && !isLoading && messages.length === 0) {
      setMessages([{
        id: '1',
        content: dailyRecap,
        role: 'assistant',
        timestamp: new Date()
      }]);
    }
  }, [dailyRecap, isLoading]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setShowInitialPrompt(false);

    if (!isExpanded) {
      setIsExpanded(true);
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
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputFocus = () => {
    onFocusChange(true);
    if (!isExpanded && messages.length > 0) {
      setIsExpanded(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ 
        opacity: 1, 
        y: isExpanded ? 0 : 100,
        height: isExpanded ? 'auto' : 'auto'
      }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`w-full ${isExpanded ? 'max-h-[80vh]' : ''}`}
    >
      {/* Chat Container */}
      <div className={`${
        isExpanded 
          ? 'bg-gray-900/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl' 
          : ''
      }`}>
        {/* Messages Area */}
        {isExpanded && (
          <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 text-white'
                      : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white'
                  }`}>
                    {message.role === 'assistant' && isLoading && message === messages[0] ? (
                      <TypewriterText text={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-2xl">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} className={`${isExpanded ? 'p-6 pt-0' : ''}`}>
          <div className="relative">
            {/* Spotlight Search Style Input */}
            <div className={`relative flex items-center ${
              isExpanded 
                ? 'bg-white/5 backdrop-blur-sm border border-white/10' 
                : 'bg-gray-800/40 backdrop-blur-2xl border border-white/20 shadow-2xl'
            } rounded-2xl transition-all duration-300`}>
              <Sparkles className="absolute left-4 text-white/40" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={() => onFocusChange(false)}
                placeholder={
                  showInitialPrompt && !isExpanded 
                    ? "What's on the agenda today?" 
                    : "Ask anything..."
                }
                className={`w-full bg-transparent text-white placeholder-white/40 outline-none ${
                  isExpanded ? 'px-12 py-3' : 'px-12 py-5 text-lg'
                }`}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-2 text-white/40 hover:text-white/60 transition-colors disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>

            {/* History Button */}
            {!isExpanded && (
              <button
                type="button"
                onClick={onHistoryClick}
                className="absolute -right-12 top-1/2 transform -translate-y-1/2 p-2 text-white/40 hover:text-white/60 transition-colors"
              >
                <Clock size={20} />
              </button>
            )}
          </div>
        </form>
      </div>
    </motion.div>
  );
};

// Typewriter effect component
const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 20);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  return <p className="whitespace-pre-wrap">{displayedText}</p>;
};

export default AIChat;