// src/components/features/Overview/utils/summaryGenerator.ts
import { supabase } from '../../../../lib/supabase';

interface RecapData {
  journalEntries: any[];
  expenses: any[];
  climbingSessions: any[];
  habits: any[];
}

export const generateDailyRecap = async (data: RecapData): Promise<string> => {
  try {
    // Check if we have any data for today
    const today = new Date().toISOString().split('T')[0];
    const todaysData = {
      journalEntries: data.journalEntries.filter(e => e.date === today),
      expenses: data.expenses.filter(e => e.date === today),
      climbingSessions: data.climbingSessions.filter(s => s.date === today),
      habits: data.habits.filter(h => h.date === today)
    };

    // If no data for today, return a default message
    if (!todaysData.journalEntries.length && 
        !todaysData.expenses.length && 
        !todaysData.climbingSessions.length && 
        !todaysData.habits.length) {
      return "Welcome back! Today is a fresh start. What would you like to accomplish?";
    }

    // Call the generate-summary edge function
    const { data: response, error } = await supabase.functions.invoke('generate-summary', {
      body: {
        periodType: 'daily',
        date: today
      }
    });

    if (error) {
      console.error('Error generating daily recap:', error);
      return "I'm here to help you track your day. How can I assist you?";
    }

    // Check if we got a valid summary
    if (response?.data?.summary) {
      return response.data.summary;
    } else if (response?.data?.insufficient_data) {
      return "Welcome! Start tracking your day and I'll provide personalized insights.";
    }

    // Fallback message
    return "Ready to help you make today great! What's on your mind?";
    
  } catch (error) {
    console.error('Error generating daily recap:', error);
    return "I'm here to help you track your progress. Let's get started!";
  }
};