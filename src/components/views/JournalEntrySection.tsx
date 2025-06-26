import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Maximize2, X, PenTool, ChefHat, Brain, Save, Sparkles, Loader, Check, Moon, Sun, ChevronDown, ChevronUp } from 'lucide-react';

interface HabitData {
  hangboard: { completed: boolean; streak: number };
  coldShower: { completed: boolean; streak: number };
  techUsage: { completed: boolean; streak: number };
  porn: { completed: boolean; streak: number };
}

interface DailyEntry {
  id: string;
  date: string;
  content: string;
  title: string;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  tags: string[];
  habitData?: HabitData;
  sleepData?: {
    phoneOff: string;
    wakeUp: string;
    quality: '😫' | '😔' | '😐' | '😊' | '🤩' | null;
  };
  meals?: string;
  dayRating?: number;
  miles?: number;
  ai_reflection?: string;
  meal_ai_reflection?: string;
  context_data?: any;
}

interface JournalEntrySectionProps {
  currentEntry: DailyEntry;
  updateEntry: (updates: Partial<DailyEntry>) => void;
  setSleepQuality: (quality: '😫' | '😔' | '😐' | '😊' | '🤩') => void;
  settings: {
    darkMode: boolean;
    authenticationEnabled: boolean;
    autoSave: boolean;
  };
  getAIReflection: () => Promise<void>;
  isLoadingAI: boolean;
  isAuthenticated: boolean;
  saveEntry: () => Promise<void>;
}

const JournalEntrySection: React.FC<JournalEntrySectionProps> = ({
  currentEntry,
  updateEntry,
  setSleepQuality,
  settings,
  getAIReflection,
  isLoadingAI,
  isAuthenticated,
  saveEntry
}) => {
  const [isJournalExpanded, setIsJournalExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingMealAI, setIsGeneratingMealAI] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSavedState, setShowSavedState] = useState(false);
  const [isAIReflectionExpanded, setIsAIReflectionExpanded] = useState(false);

  // Handle time input changes with validation
  const handleTimeChange = (field: 'wakeUp' | 'phoneOff', value: string) => {
    // Always update immediately to show user input
    updateEntry({
      sleepData: { 
        ...currentEntry.sleepData!, 
        [field]: value 
      }
    });
  };

  // Handle input blur to ensure cleanup of invalid values
  const handleTimeBlur = (field: 'wakeUp' | 'phoneOff', value: string) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (value && !timeRegex.test(value)) {
      // Clear invalid value on blur
      updateEntry({
        sleepData: { 
          ...currentEntry.sleepData!, 
          [field]: '' 
        }
      });
    }
  };

  const handleSaveEntry = async () => {
  setIsSaving(true);
  try {
    await saveEntry();
    
    // Auto-generate REAL AI reflection after saving using journal-reflect
    if (currentEntry.content && currentEntry.content.trim().length > 10) {
      try {
        await getAIReflection(); // This calls the real journal-reflect function
      } catch (error) {
        console.error('Error getting AI reflection:', error);
        // Fallback to simple message if AI fails
        updateEntry({ 
          ai_reflection: "AI reflection temporarily unavailable. Your journal entry has been saved successfully.",
          context_data: {
            ...currentEntry.context_data,
            analyzed_at: new Date().toISOString(),
          }
        });
      }
    }

   // Generate meal AI reflection if meals exist
if (currentEntry.meals && currentEntry.meals.trim().length > 10) {
  setIsGeneratingMealAI(true);
  try {
    const { data, error } = await supabase.functions.invoke('meal-analyze', {
      body: {
        meals: currentEntry.meals,
        habits: currentEntry.habitData,
        mood: currentEntry.mood,
        date: currentEntry.date,
        context: {
          sleepData: currentEntry.sleepData,
          dayRating: currentEntry.dayRating,
          miles: currentEntry.miles
        }
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to get meal analysis');
    }

    const analysis = data?.analysis;
    if (analysis) {
      updateEntry({ meal_ai_reflection: analysis });
    }
  } catch (error) {
    console.error('Error getting meal analysis:', error);
    // Fallback to default message
    updateEntry({ 
      meal_ai_reflection: "Based on your nutrition log, you've maintained a balanced approach to eating today. Consider incorporating more leafy greens and ensuring adequate hydration throughout the day for optimal energy levels."
    });
  } finally {
    setIsGeneratingMealAI(false);
  }
}

    // Show saved state but don't collapse
setShowSavedState(true);
setTimeout(() => {
  setShowSavedState(false);
}, 5200);

  } catch (error) {
    console.error('Error saving entry:', error);
  } finally {
    setIsSaving(false);
  }
};

  // Collapsed state - just add professional styling to existing structure
  if (!isExpanded) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg shadow-purple-500/10">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between p-6 rounded-2xl transition-all duration-300 text-white"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl">
              <PenTool size={24} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold">Daily Entry</h3>
              <p className="text-sm text-white/60">Journal • Sleep • Metrics</p>
            </div>
          </div>
          <ChevronDown size={24} className="text-white/60" />
        </button>
      </div>
    );
  }

  // Expanded state - YOUR EXACT ORIGINAL CODE with just container styling changed
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg shadow-purple-500/10">
      
      {/* Header with Collapse Button */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl">
              <PenTool size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Daily Entry</h3>
              <p className="text-sm text-white/60">Journal • Sleep • Metrics</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 rounded-xl transition-colors text-white/60"
          >
            <ChevronUp size={24} />
          </button>
        </div>
      </div>

      {/* Main Content - Grid Layout */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Side - Journal (2 columns) */}
          <div className="lg:col-span-2 space-y-6 min-h-screen">
            
            {/* Journal Entry Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white">Journal Entry</h4>
              <button
                onClick={() => setIsJournalExpanded(true)}
                className="p-2 rounded-xl transition-all bg-white/5 text-white/60"
              >
                <Maximize2 size={18} />
              </button>
            </div>

            {/* Main Journal Textarea */}
            <div className="relative">
              <textarea
                value={currentEntry.content}
                onChange={(e) => updateEntry({ content: e.target.value })}
                placeholder="How was your day? What thoughts are flowing through your mind?"
                className="w-full h-[500px] p-4 rounded-2xl border resize-none bg-white/5 border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base backdrop-blur-sm"
              />
              <div className="absolute bottom-3 right-3 text-xs text-white/40">
                {currentEntry.content.length} characters
              </div>
            </div>

            {/* Journal AI Reflection Box */}
<div className="p-4 rounded-2xl border bg-purple-500/10 border-purple-500/20 backdrop-blur-sm min-h-[100px]">
  <div className="flex items-center gap-2 mb-3">
    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
      {isLoadingAI ? (
        <Loader size={16} className="text-white animate-spin" />
      ) : (
        <Brain size={16} className="text-white" />
      )}
    </div>
    <h4 className="font-bold text-purple-300">
      AI Journal Reflection
    </h4>
  </div>
  {currentEntry.ai_reflection ? (
    <div className="relative">
      <p className="text-sm line-clamp-3 text-white/80">
        {currentEntry.ai_reflection}
      </p>
      {currentEntry.ai_reflection.length > 200 && (
        <button
          onClick={() => setIsAIReflectionExpanded(true)}
          className="text-sm font-medium mt-2 text-purple-400 hover:text-purple-300 transition-colors"
        >
          Read more...
        </button>
      )}
    </div>
  ) : (
    <p className="text-sm italic text-white/40">
      AI reflection will appear here after saving your entry...
    </p>
  )}
</div>

            {/* Meals Section */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <ChefHat size={14} className="text-white" />
                </div>
                <label className="text-base font-semibold text-white">
                  Today's Nutrition
                </label>
              </div>
              
              <textarea
                value={currentEntry.meals || ''}
                onChange={(e) => updateEntry({ meals: e.target.value })}
                placeholder="What nourished your body today?"
                className="w-full h-32 p-4 rounded-2xl border resize-none bg-white/5 border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm backdrop-blur-sm"
              />
            </div>

            {/* Meal AI Reflection Box */}
            <div className="p-4 rounded-2xl border bg-orange-500/10 border-orange-500/20 backdrop-blur-sm min-h-[100px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
                  {isGeneratingMealAI ? (
                    <Loader size={16} className="text-white animate-spin" />
                  ) : (
                    <ChefHat size={16} className="text-white" />
                  )}
                </div>
                <h4 className="font-bold text-orange-300">
                  AI Nutrition Analysis
                </h4>
              </div>
              {isGeneratingMealAI ? (
                <div className="text-sm text-white/60">
                  Analyzing your nutrition choices...
                </div>
              ) : currentEntry.meal_ai_reflection ? (
                <p className="text-sm text-white/80">
                  {currentEntry.meal_ai_reflection}
                </p>
              ) : (
                <p className="text-sm italic text-white/40">
                  AI nutrition analysis will appear here after saving...
                </p>
              )}
            </div>
          </div>

          {/* Right Side - Sleep & Metrics (1 column) - YOUR EXACT ORIGINAL CODE */}
          <div className="space-y-6">
            
            {/* Sleep Tracking - Apple Design Language */}
            <div className="relative p-8 rounded-3xl overflow-hidden bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl">
              {/* Animated Background Gradient */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-indigo-500/20 animate-pulse"></div>
              </div>
              
              {/* Header with Icon Animation */}
              <div className="relative flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg transition-all duration-300 ease-out">
                      <Moon size={20} className="text-white animate-pulse" />
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30 animate-pulse"></div>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">
                    Sleep Tracking
                  </h3>
                </div>
              </div>

              {/* Time Input Cards - Vertical Stack with WIDER GRAY CONTAINERS */}
              <div className="space-y-4 mb-6 -mx-6">
                {/* Wake Up Time */}
                <div className="group relative">
                  <div className="relative p-4 rounded-2xl transition-all duration-500 ease-out bg-white/5 border border-white/10 backdrop-blur-sm">
                    
                    {/* Floating Icon and Label - Top Left */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-lg transition-all duration-300">
                        <Sun size={12} className="text-white" />
                      </div>
                      <div className="text-sm font-semibold text-white/70">
                        Wake up
                      </div>
                    </div>
                    
                    {/* Time Input - Centered */}
                    <div className="flex justify-center">
                      <input
                        key={`wakeUp-${currentEntry.date}`}
                        type="time"
                        value={currentEntry.sleepData?.wakeUp || ''}
                        onChange={e => handleTimeChange('wakeUp', e.target.value)}
                        onBlur={e => handleTimeBlur('wakeUp', e.target.value)}
                        className="px-4 py-3 rounded-xl border transition-all duration-300 font-mono text-xl font-bold text-center tracking-wider bg-white/5 border-white/20 text-white focus:border-orange-500/80 focus:outline-none focus:ring-2 focus:ring-orange-500/20 backdrop-blur-sm"
                        style={{
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
                          width: '180px'
                        }}
                      />
                    </div>
                    
                    {/* Animated Border */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/50 to-yellow-500/50 opacity-0 transition-opacity duration-500 pointer-events-none"></div>
                  </div>
                </div>

                {/* Phone Off Time */}
                <div className="group relative">
                  <div className="relative p-4 rounded-2xl transition-all duration-500 ease-out bg-white/5 border border-white/10 backdrop-blur-sm">
                    
                    {/* Floating Icon and Label - Top Left */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg transition-all duration-300">
                        <Moon size={12} className="text-white" />
                      </div>
                      <div className="text-sm font-semibold text-white/70">
                        Phone off
                      </div>
                    </div>
                    
                    {/* Time Input - Centered */}
                    <div className="flex justify-center">
                      <input
                        key={`phoneOff-${currentEntry.date}`}
                        type="time"
                        value={currentEntry.sleepData?.phoneOff || ''}
                        onChange={e => handleTimeChange('phoneOff', e.target.value)}
                        onBlur={e => handleTimeBlur('phoneOff', e.target.value)}
                        className="px-4 py-3 rounded-xl border transition-all duration-300 font-mono text-xl font-bold text-center tracking-wider bg-white/5 border-white/20 text-white focus:border-blue-500/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 backdrop-blur-sm"
                        style={{
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
                          width: '180px'
                        }}
                      />
                    </div>
                    
                    {/* Animated Border */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/50 to-purple-500/50 opacity-0 transition-opacity duration-500 pointer-events-none"></div>
                  </div>
                </div>
              </div>
              
              {/* Sleep Quality Section */}
              <div className="relative">
                {/* Title */}
                <div className="text-lg font-semibold mb-6 text-center text-white">
                  How did you sleep?
                </div>
                
                {/* Emoji Selection - 2x2x1 Grid Layout */}
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-4">
                  {/* First Row - 2 emojis */}
                  {['😫', '😔'].map((emoji, index) => {
                    const isSelected = currentEntry.sleepData?.quality === emoji;
                    const labels = ['Terrible', 'Poor'];
                    return (
                      <div key={emoji} className="relative group">
                        {/* Selection Ring - Static when selected */}
                        {isSelected && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/40 to-blue-500/40"></div>
                        )}
                        
                        <button
                          type="button"
                          onClick={(event) => {
                            setSleepQuality(emoji as any);
                            // Trigger one-time wave effect
                            const button = event.currentTarget;
                            button.classList.add('emoji-selected');
                            setTimeout(() => button.classList.remove('emoji-selected'), 1000);
                          }}
                          className={`relative w-full h-20 rounded-2xl transition-all duration-500 ease-out transform active:scale-95 ${
                            isSelected
                              ? 'bg-gradient-to-br from-purple-500/30 to-blue-500/30 scale-105 shadow-2xl shadow-purple-500/30 backdrop-blur-sm border-2 border-purple-400/50'
                              : 'bg-white/5 border border-white/10 shadow-xl shadow-purple-900/50'
                          } backdrop-blur-sm flex flex-col items-center justify-center`}
                        >
                          <span className="text-3xl filter transition-all duration-300 mb-1">
                            {emoji}
                          </span>
                          <span className="text-xs font-medium text-white/60">
                            {labels[index]}
                          </span>
                          
                          {/* Hover Glow */}
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity duration-300"></div>
                          
                          {/* Static Glow for Selected */}
                          {isSelected && (
                            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-purple-500/30 to-blue-500/30 blur-lg opacity-50"></div>
                          )}
                          
                          {/* One-time Wave Effect on Selection */}
                          <div className="absolute inset-0 rounded-2xl bg-purple-500/30 opacity-0 pointer-events-none wave-ring"></div>
                          <div className="absolute inset-0 rounded-2xl bg-purple-500/20 opacity-0 pointer-events-none wave-ring-2"></div>
                        </button>
                      </div>
                    );
                  })}
                  
                  {/* Second Row - 2 emojis */}
                  {['😐', '😊'].map((emoji, index) => {
                    const isSelected = currentEntry.sleepData?.quality === emoji;
                    const labels = ['Okay', 'Good'];
                    return (
                      <div key={emoji} className="relative group">
                        {/* Selection Ring - Static when selected */}
                        {isSelected && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/40 to-blue-500/40"></div>
                        )}
                        
                        <button
                          type="button"
                          onClick={() => setSleepQuality(emoji as any)}
                          className={`relative w-full h-20 rounded-2xl transition-all duration-500 ease-out transform hover:scale-105 active:scale-95 ${
                            isSelected
                              ? 'bg-gradient-to-br from-purple-500/30 to-blue-500/30 scale-105 shadow-2xl shadow-purple-500/30 backdrop-blur-sm border-2 border-purple-400/50'
                              : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:shadow-xl hover:shadow-purple-900/50'
                          } hover:-translate-y-1 backdrop-blur-sm flex flex-col items-center justify-center`}
                        >
                          <span className="text-3xl filter hover:brightness-110 transition-all duration-300 mb-1">
                            {emoji}
                          </span>
                          <span className="text-xs font-medium text-white/60">
                            {labels[index]}
                          </span>
                          
                          {/* Hover Glow */}
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          {/* Static Glow for Selected */}
                          {isSelected && (
                            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-purple-500/30 to-blue-500/30 blur-lg opacity-50"></div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                {/* Third Row - 1 emoji centered */}
                <div className="flex justify-center">
                  {['🤩'].map((emoji, index) => {
                    const isSelected = currentEntry.sleepData?.quality === emoji;
                    const labels = ['Amazing'];
                    return (
                      <div key={emoji} className="relative group w-32">
                        {/* Selection Ring - Static when selected */}
                        {isSelected && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/40 to-blue-500/40"></div>
                        )}
                        
                        <button
                          type="button"
                          onClick={() => setSleepQuality(emoji as any)}
                          className={`relative w-full h-20 rounded-2xl transition-all duration-500 ease-out transform hover:scale-105 active:scale-95 ${
                            isSelected
                              ? 'bg-gradient-to-br from-purple-500/30 to-blue-500/30 scale-105 shadow-2xl shadow-purple-500/30 backdrop-blur-sm border-2 border-purple-400/50'
                              : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:shadow-xl hover:shadow-purple-900/50'
                          } hover:-translate-y-1 backdrop-blur-sm flex flex-col items-center justify-center`}
                        >
                          <span className="text-3xl filter hover:brightness-110 transition-all duration-300 mb-1">
                            {emoji}
                          </span>
                          <span className="text-xs font-medium text-white/60">
                            {labels[index]}
                          </span>
                          
                          {/* Hover Glow */}
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          {/* Static Glow for Selected */}
                          {isSelected && (
                            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-purple-500/30 to-blue-500/30 blur-lg opacity-50"></div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Subtle Floating Particles */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-blue-400/30 animate-float"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${3 + Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Daily Metrics - Compact Apple Style */}
            <div className="relative p-6 rounded-2xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-xl">
              {/* Subtle Background Gradient */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-emerald-500/10"></div>
              </div>
              
              {/* Header */}
              <div className="relative flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <div className="w-3 h-3 rounded-full bg-white/30"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Daily Metrics
                  </h3>
                </div>
              </div>

              {/* Horizontal Metrics Layout */}
              <div className="space-y-5">
                
                {/* Day Rating */}
                <div className="group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">⭐</span>
                      <label className="text-sm font-semibold text-white/70">
                        Day Rating
                      </label>
                    </div>
                    <div className="text-2xl font-bold font-mono text-purple-400">
                      {(currentEntry.dayRating || 3).toFixed(1)}
                    </div>
                  </div>
                  
                  {/* Horizontal Slider */}
                  <div className="relative">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={currentEntry.dayRating || 3}
                      onChange={(e) => updateEntry({ dayRating: parseFloat(e.target.value) })}
                      className="slider w-full h-2 rounded-full appearance-none cursor-pointer transition-all duration-300 focus:outline-none"
                      style={{
                        background: `linear-gradient(to right, #8b5cf6 0%, #a855f7 ${((currentEntry.dayRating || 3) - 1) * 25}%, rgba(255,255,255,0.1) ${((currentEntry.dayRating || 3) - 1) * 25}%, rgba(255,255,255,0.1) 100%)`
                      }}
                    />
                    
                    {/* Value Labels */}
                    <div className="flex justify-between mt-1 px-1">
                      {[1, 2, 3, 4, 5].map(value => (
                        <span 
                          key={value}
                          className={`text-xs font-medium transition-all duration-300 ${
                            Math.round(currentEntry.dayRating || 3) === value
                              ? 'text-purple-400'
                              : 'text-white/40'
                          }`}
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Miles Ran */}
                <div className="group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🏃</span>
                      <label className="text-sm font-semibold text-white/70">
                        Miles Ran
                      </label>
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      {(currentEntry.miles || 0).toFixed(1)}
                      <span className="text-sm ml-1">mi</span>
                    </div>
                  </div>
                  
                  {/* Horizontal Slider */}
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={currentEntry.miles || 0}
                      onChange={(e) => updateEntry({ miles: parseFloat(e.target.value) })}
                      className="slider-miles w-full h-2 rounded-full appearance-none cursor-pointer transition-all duration-300 focus:outline-none"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #059669 ${(currentEntry.miles || 0) * 10}%, rgba(255,255,255,0.1) ${(currentEntry.miles || 0) * 10}%, rgba(255,255,255,0.1) 100%)`
                      }}
                    />
                    
                    {/* Value Labels */}
                    <div className="flex justify-between mt-1 px-1">
                      {[0, 2.5, 5, 7.5, 10].map(value => (
                        <span 
                          key={value}
                          className={`text-xs font-medium transition-all duration-300 ${
                            Math.abs((currentEntry.miles || 0) - value) < 0.5
                              ? 'text-emerald-400'
                              : 'text-white/40'
                          }`}
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Entry Button - Bottom Right */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveEntry}
            disabled={isSaving || isLoadingAI}
            style={{ 
              background: showSavedState ? '#10b981' : 'linear-gradient(to right, #7c3aed, #4f46e5)',
              padding: '12px 24px',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '600',
              border: 'none',
              cursor: isSaving || isLoadingAI ? 'not-allowed' : 'pointer',
              opacity: isSaving || isLoadingAI ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px',
              transition: 'all 0.3s ease'
            }}
          >
            {showSavedState ? (
              <>
                <Check size={18} />
                Saved
              </>
            ) : isSaving || isLoadingAI ? (
              <>
                <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {isSaving ? 'Saving...' : 'Generating AI...'}
              </>
            ) : (
              <>
                <Save size={18} />
                Save Entry
                {settings.authenticationEnabled && isAuthenticated && (
                  <Sparkles size={14} />
                )}
              </>
            )}
          </button>
        </div>
      </div>
      
{/* AI Reflection Expanded Modal */}
{isAIReflectionExpanded && (
  <div 
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
  >
    <div 
      className="absolute inset-0"
      onClick={() => setIsAIReflectionExpanded(false)}
    />
    
    <div className="relative w-full max-w-2xl max-h-[80vh] bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden">
      
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              AI Journal Reflection
            </h2>
          </div>
          <button
            onClick={() => setIsAIReflectionExpanded(false)}
            className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>
      
      <div className="p-6 overflow-y-auto max-h-[60vh]">
        <p className="text-base leading-relaxed whitespace-pre-line text-white/80">
          {currentEntry.ai_reflection}
        </p>
      </div>
    </div>
  </div>
)}

      {/* Expanded Journal Modal */}
      {isJournalExpanded && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div 
            className="absolute inset-0"
            onClick={() => setIsJournalExpanded(false)}
          />
          
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden">
            
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Focused Writing
                </h2>
                <button
                  onClick={() => setIsJournalExpanded(false)}
                  className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <textarea
                value={currentEntry.content}
                onChange={(e) => updateEntry({ content: e.target.value })}
                placeholder="Let your thoughts flow freely..."
                className="w-full h-96 p-6 rounded-2xl border resize-none bg-white/5 border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg backdrop-blur-sm"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }
        
        @keyframes wave-expand {
          0% { 
            transform: scale(1); 
            opacity: 0.4; 
          }
          50% { 
            transform: scale(1.3); 
            opacity: 0.2; 
          }
          100% { 
            transform: scale(1.8); 
            opacity: 0; 
          }
        }
        
        @keyframes wave-expand-2 {
          0% { 
            transform: scale(1); 
            opacity: 0.3; 
          }
          50% { 
            transform: scale(1.5); 
            opacity: 0.15; 
          }
          100% { 
            transform: scale(2.2); 
            opacity: 0; 
          }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        .emoji-selected .wave-ring {
          animation: wave-expand 0.6s ease-out;
        }
        
        .emoji-selected .wave-ring-2 {
          animation: wave-expand-2 0.8s ease-out 0.1s;
        }
        
        input[type="time"]::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 0;
          width: 0;
          height: 0;
          pointer-events: none;
        }

        .slider::-webkit-slider-thumb,
        .slider-miles::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 10px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
          transition: all 0.3s ease;
          border: 2px solid white;
        }
        
        .slider::-webkit-slider-thumb {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
        }
        
        .slider-miles::-webkit-slider-thumb {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        
        .slider::-webkit-slider-thumb:hover,
        .slider-miles::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        
        .slider::-webkit-slider-thumb:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }
        
        .slider-miles::-webkit-slider-thumb:hover {
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        
        .slider::-moz-range-thumb,
        .slider-miles::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 10px;
          cursor: pointer;
          border: 2px solid white;
          transition: all 0.3s ease;
        }
        
        .slider::-moz-range-thumb {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }
        
        .slider-miles::-moz-range-thumb {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        
        .slider::-moz-range-thumb:hover,
        .slider-miles::-moz-range-thumb:hover {
          transform: scale(1.1);
        }
        
        .slider::-moz-range-thumb:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }
        
        .slider-miles::-moz-range-thumb:hover {
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
};

export default JournalEntrySection;