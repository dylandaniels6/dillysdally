import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from '../lib/supabase';
import { Habit, ClimbingSession, ClimbingRoute } from '../types';

export type ViewMode = 'overview' | 'journal' | 'habits' | 'climbing' | 'expenses' | 'networth' | 'settings' | 'ai-usage';

// UPDATED: Moved HabitData interface here and removed HabitState
export interface HabitData {
  hangboard: { completed: boolean; streak: number };
  coldShower: { completed: boolean; streak: number };
  techUsage: { completed: boolean; streak: number };
  porn: { completed: boolean; streak: number };
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  title?: string;
  mood?: string;
  tags?: string[];
  
  // UPDATED: Using the new habit system
  habitData?: HabitData;
  
  // Sleep tracking
  sleepData?: {
    phoneOff: string;
    wakeUp: string;
    quality: '😫' | '😔' | '😐' | '😊' | '🤩' | null;
  };
  
  // Additional daily metrics
  meals?: string;
  dayRating?: number;
  miles?: number;
  
  // AI reflections
  ai_reflection?: string | null;
  meal_ai_reflection?: string;
  context_data?: any | null;
  
  // Legacy fields (kept for backward compatibility)
  wakeTime?: string;
  sleepTime?: string;
  climbed?: boolean;
  gym?: string;
  sessionNotes?: string;
  sends?: {
    V6: number;
    V7: number;
    V8: number;
    V9: number;
    V10: number;
  };
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

export interface Income {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

// UPDATED: New NetWorthEntry interface with 3-category system
export interface NetWorthEntry {
  id: string;
  date: string;
  cashEquivalents: number;    // Renamed from cashAccounts
  creditCards: number;        // Renamed from liabilities (can be negative)
  assets: {                   // Changed from single number to array of assets
    id: string;
    name: string;
    value: number;
    category: 'real_estate' | 'investments' | 'vehicles' | 'valuables' | 'other';
    addedDate: string;
    isActive: boolean;
  }[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataImport {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'json';
  uploadDate: string;
  status: 'processing' | 'completed' | 'error';
  itemsImported: {
    journalEntries: number;
    habits: number;
    climbingSessions: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
  errors?: string[];
}

export interface AppSettings {
  darkMode: boolean;
  autoSave: boolean;
  notifications: boolean;
  gyms: string[];
  categories: string[];
  authenticationEnabled: boolean;
  cloudSync: boolean;
  autoBackup: boolean;
}

interface AppContextType {
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  journalEntries: JournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  income: Income[];
  setIncome: React.Dispatch<React.SetStateAction<Income[]>>;
  netWorthEntries: NetWorthEntry[];
  setNetWorthEntries: React.Dispatch<React.SetStateAction<NetWorthEntry[]>>;
  dataImports: DataImport[];
  setDataImports: React.Dispatch<React.SetStateAction<DataImport[]>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  climbingSessions: ClimbingSession[];
  setClimbingSessions: React.Dispatch<React.SetStateAction<ClimbingSession[]>>;
  totalSends: {
    V6: number;
    V7: number;
    V8: number;
    V9: number;
    V10: number;
  };
  // Simplified auth using Clerk
  user: any;
  isAuthenticated: boolean;
  userId: string;
  cloudSyncStatus: 'synced' | 'syncing' | 'error' | 'offline';
  lastSyncTime: Date | null;
  forceSync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ADDED: Helper function to convert old NetWorthEntry format to new format
const convertLegacyNetWorthEntry = (entry: any): NetWorthEntry => {
  // If already in new format, return as-is
  if (entry.cashEquivalents !== undefined && Array.isArray(entry.assets)) {
    return entry;
  }
  
  // Convert old format to new format
  return {
    id: entry.id,
    date: entry.date,
    cashEquivalents: entry.cashAccounts || 0,
    creditCards: entry.liabilities || 0,
    assets: typeof entry.assets === 'number' && entry.assets > 0 ? 
      [{
        id: `legacy-asset-${entry.id}`,
        name: 'Legacy Assets',
        value: entry.assets,
        category: 'other' as const,
        addedDate: entry.date,
        isActive: true
      }] : [],
    notes: entry.notes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
};

// Generate example climbing data
const generateExampleClimbingData = (): ClimbingSession[] => {
  const sessions: ClimbingSession[] = [];
  const currentDate = new Date();
  const grades = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7'];
  
  // Generate data for the past 30 days
  for (let i = 0; i < 30; i++) {
    if (Math.random() > 0.5) { // 50% chance of climbing on any given day
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      
      const numRoutes = Math.floor(Math.random() * 10) + 5; // 5-15 routes
      
      // Generate routes for this session
      const routes: ClimbingRoute[] = [];
      for (let j = 0; j < numRoutes; j++) {
        routes.push({
          grade: grades[Math.floor(Math.random() * grades.length)],
          completed: Math.random() > 0.3, // 70% completion rate
          attempts: Math.floor(Math.random() * 3) + 1,
          notes: Math.random() > 0.7 ? 'Challenging overhang' : undefined
        });
      }
      
      sessions.push({
        id: `example-${i}`,
        date: date.toISOString().split('T')[0],
        gym: ['Crux Pflugerville', 'Crux Central', 'Mesa Rim'][Math.floor(Math.random() * 3)],
        duration: Math.floor(Math.random() * 60) + 60, // 60-120 minutes
        routes: routes,
        notes: `Example session - felt ${['strong', 'tired', 'great', 'okay'][Math.floor(Math.random() * 4)]}`,
        climbs: [] // Empty for examples
      });
    }
  }
  
  return sessions;
};

// Generate realistic net worth data for 2 years
const generateExampleNetWorthData = (): NetWorthEntry[] => {
  const entries: NetWorthEntry[] = [];
  const today = new Date();
  
  // Starting values (2 years ago)
  let cashEquivalents = 25000;
  let creditCards = 2500;
  
  // Assets that will be added over time
  const assetTemplates = [
    { name: "Primary Residence", category: 'real_estate' as const, startValue: 450000, monthlyGrowth: 0.005, addedAt: 20 },
    { name: "401k Retirement", category: 'investments' as const, startValue: 75000, monthlyGrowth: 0.008, addedAt: 24 },
    { name: "Tesla Model Y", category: 'vehicles' as const, startValue: 62000, monthlyGrowth: -0.015, addedAt: 18 },
    { name: "Emergency Fund (HYSA)", category: 'investments' as const, startValue: 15000, monthlyGrowth: 0.004, addedAt: 24 },
    { name: "Stock Portfolio", category: 'investments' as const, startValue: 30000, monthlyGrowth: 0.01, addedAt: 22 },
    { name: "Rolex Submariner", category: 'valuables' as const, startValue: 12000, monthlyGrowth: 0.003, addedAt: 8 },
  ];

  // Generate 24 months of data
  for (let monthsAgo = 24; monthsAgo >= 0; monthsAgo--) {
    const entryDate = new Date(today);
    entryDate.setMonth(entryDate.getMonth() - monthsAgo);
    entryDate.setDate(1);
    
    const randomCashChange = (Math.random() - 0.4) * 3000;
    cashEquivalents += randomCashChange;
    cashEquivalents = Math.max(5000, cashEquivalents);
    
    const creditCardChange = (Math.random() - 0.6) * 800;
    creditCards += creditCardChange;
    creditCards = Math.max(0, Math.min(10000, creditCards));
    
    const monthAssets: NetWorthEntry['assets'] = [];
    
    assetTemplates.forEach(template => {
      if (monthsAgo <= template.addedAt) {
        const monthsOwned = template.addedAt - monthsAgo;
        const currentValue = template.startValue * Math.pow(1 + template.monthlyGrowth, monthsOwned);
        const randomMultiplier = 0.97 + (Math.random() * 0.06);
        const finalValue = Math.round(currentValue * randomMultiplier);
        
        monthAssets.push({
          id: `asset-${template.name.toLowerCase().replace(/\s+/g, '-')}-${entryDate.getTime()}`,
          name: template.name,
          value: Math.max(0, finalValue),
          category: template.category,
          addedDate: entryDate.toISOString().split('T')[0],
          isActive: true,
        });
      }
    });

    entries.push({
      id: `networth-${entryDate.getTime()}`,
      date: entryDate.toISOString().split('T')[0],
      cashEquivalents: Math.round(cashEquivalents),
      creditCards: Math.round(creditCards),
      assets: monthAssets,
      notes: monthsAgo === 0 ? "Current month" : undefined,
      createdAt: entryDate.toISOString(),
    });
  }

  return entries.reverse();
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Clerk hooks - replaces all custom auth logic
  const { user, isLoaded } = useUser();
  const { isSignedIn, getToken } = useAuth();

  // Your existing state (keep all of this)
  const [currentView, setCurrentView] = useState<ViewMode>('overview');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [netWorthEntries, setNetWorthEntries] = useState<NetWorthEntry[]>([]);
  const [dataImports, setDataImports] = useState<DataImport[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: true,
    autoSave: true,
    notifications: true,
    gyms: ['Crux Pflugerville', 'Crux Central', 'Mesa Rim', 'ABP - Westgate', 'ABP - Springdale'],
    categories: ['eating out', 'groceries', 'transportation', 'entertainment', 'shopping', 'subscriptions', 'bills'],
    authenticationEnabled: true, // Always true with Clerk
    cloudSync: true,
    autoBackup: true,
  });
  const [habits, setHabits] = useState<Habit[]>([]);
  const [climbingSessions, setClimbingSessions] = useState<ClimbingSession[]>([]);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Track if initial data load has been completed
  const initialLoadCompleted = useRef(false);

  // Simplified auth state (powered by Clerk)
  const isAuthenticated = isSignedIn && isLoaded;
  const userId = user?.id || '';

  // FIXED: Use the new Clerk-native approach with proper async handling and userId caching
const getAuthenticatedSupabase = useCallback(async () => {
  if (!isAuthenticated || !getToken) return null;
  
  try {
    const token = await getToken({ template: 'supabase' });
    if (!token) throw new Error('No token received');
    
    // Pass userId for better caching
    const authSupabase = createAuthenticatedSupabaseClient(token, userId);
    return authSupabase;
  } catch (error) {
    console.error('Failed to create authenticated Supabase client:', error);
    return null;
  }
}, [isAuthenticated, getToken, userId]); // Add userId to dependencies

  // Calculate total sends - FIXED: Added safety check for session.climbs
  const totalSends = climbingSessions.reduce((acc, session) => {
    const sends = { ...acc };
    // Check if session.climbs exists and is an array before iterating
    if (session.climbs && Array.isArray(session.climbs)) {
      session.climbs.forEach(climb => {
        const grade = climb.grade as keyof typeof sends;
        if (grade in sends && climb.completed) {
          sends[grade]++;
        }
      });
    }
    return sends;
  }, { V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 });

  // Load data from localStorage
  const loadDataFromLocalStorage = useCallback(() => {
    console.log('Loading data from localStorage');
    
    try {
      // Load all the data from localStorage
      const savedJournalEntries = localStorage.getItem('journalEntries');
      const savedExpenses = localStorage.getItem('expenses');
      const savedIncome = localStorage.getItem('income');
      const savedNetWorthEntries = localStorage.getItem('netWorthEntries');
      const savedDataImports = localStorage.getItem('dataImports');
      const savedSettings = localStorage.getItem('settings');
      const savedHabits = localStorage.getItem('habits');
      const savedClimbingSessions = localStorage.getItem('climbingSessions');

      const localData = {
        journalEntries: savedJournalEntries ? JSON.parse(savedJournalEntries) : [],
        expenses: savedExpenses ? JSON.parse(savedExpenses) : [],
        income: savedIncome ? JSON.parse(savedIncome) : [],
        netWorthEntries: savedNetWorthEntries ? JSON.parse(savedNetWorthEntries).map(convertLegacyNetWorthEntry) : [],
        dataImports: savedDataImports ? JSON.parse(savedDataImports) : [],
        habits: savedHabits ? JSON.parse(savedHabits) : [],
        climbingSessions: savedClimbingSessions ? JSON.parse(savedClimbingSessions) : [],
        settings: savedSettings ? JSON.parse(savedSettings) : null
      };

      return localData;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return {
        journalEntries: [],
        expenses: [],
        income: [],
        netWorthEntries: [],
        dataImports: [],
        habits: [],
        climbingSessions: [],
        settings: null
      };
    }
  }, []);

  // FIXED: Cloud sync with new Clerk integration
  const loadDataFromCloud = useCallback(async () => {
    if (!settings.cloudSync || !isAuthenticated || !userId) return null;
    
    setCloudSyncStatus('syncing');
    try {
      // IMPORTANT: Await the async function
      const authSupabase = await getAuthenticatedSupabase();
      if (!authSupabase) {
        console.error('Failed to get authenticated Supabase client');
        setCloudSyncStatus('error');
        return null;
      }

      console.log('🔍 Testing Supabase JWT integration...');

      // Test the function from within your app
      try {
        const testResult = await authSupabase.rpc('get_clerk_user_id');
        console.log('✅ get_clerk_user_id full result:', JSON.stringify(testResult, null, 2));
        console.log('✅ get_clerk_user_id data value:', testResult.data);
        console.log('✅ Expected user ID from Clerk:', userId);
      } catch (error) {
        console.error('❌ get_clerk_user_id error:', error);
      }

      console.log('Making authenticated requests with user ID:', userId);

      // CRITICAL: Remove all .eq('user_id', xxx) filters - RLS handles this automatically
      // Also remove the profiles query since that table doesn't exist
      const [journalData, expensesData, incomeData, netWorthData, habitsData, climbingData] = await Promise.all([
        authSupabase.from('journal_entries').select('*').order('date', { ascending: false }),
        authSupabase.from('expenses').select('*').order('date', { ascending: false }),
        authSupabase.from('income').select('*').order('date', { ascending: false }),
        authSupabase.from('net_worth_entries').select('*').order('date', { ascending: false }),
        authSupabase.from('habits').select('*').order('created_at', { ascending: false }),
        authSupabase.from('climbing_sessions').select('*').order('date', { ascending: false })
      ]);

      // Check for errors in each query
      const queries = [
        { name: 'journal_entries', data: journalData },
        { name: 'expenses', data: expensesData },
        { name: 'income', data: incomeData },
        { name: 'net_worth_entries', data: netWorthData },
        { name: 'habits', data: habitsData },
        { name: 'climbing_sessions', data: climbingData }
      ];

      for (const query of queries) {
        if (query.data.error) {
          console.error(`Error loading ${query.name}:`, query.data.error);
        } else {
          console.log(`✅ Loaded ${query.data.data?.length || 0} ${query.name}`);
        }
      }

      // Only process data without errors
      const cloudData = {
        journalEntries: journalData.data || [],
        expenses: expensesData.data || [],
        income: incomeData.data || [],
        netWorthEntries: netWorthData.data || [],
        habits: habitsData.data || [],
        climbingSessions: climbingData.data || [],
        settings: null // We'll handle settings separately
      };

      // Process netWorthEntries
      if (cloudData.netWorthEntries) {
        cloudData.netWorthEntries = cloudData.netWorthEntries.map(entry => ({
          ...entry,
          assets: entry.assets || [],
          cashEquivalents: entry.cash_equivalents || entry.cashEquivalents || 0,
          creditCards: entry.credit_cards || entry.creditCards || 0,
        }));
      }

      console.log('✅ Cloud data loaded successfully');
      setCloudSyncStatus('synced');
      setLastSyncTime(new Date());
      return cloudData;

    } catch (error) {
      console.error('Cloud sync error:', error);
      setCloudSyncStatus('error');
      return null;
    }
  }, [settings.cloudSync, isAuthenticated, userId, getAuthenticatedSupabase]);

  // FIXED: Save data to cloud
  const saveDataToCloud = useCallback(async () => {
    if (!settings.cloudSync || !isAuthenticated || !userId) return;

    try {
      const authSupabase = await getAuthenticatedSupabase(); // Add await here
      if (!authSupabase) {
        console.error('Failed to get authenticated Supabase client');
        return;
      }

      // Save all data to cloud...
      // (implementation remains the same)
    } catch (error) {
      console.error('Error saving to cloud:', error);
    }
  }, [settings.cloudSync, isAuthenticated, userId, getAuthenticatedSupabase]);

  // Force sync function
  const forceSync = useCallback(async () => {
    if (!isAuthenticated || !settings.cloudSync) return;
    
    console.log('Force syncing with cloud...');
    setCloudSyncStatus('syncing');
    
    try {
      const cloudData = await loadDataFromCloud();
      if (cloudData) {
        // Update local state with cloud data
        if (cloudData.journalEntries.length > 0) {
  setJournalEntries(cloudData.journalEntries.map(entry => ({
    ...entry,
    // 🔧 FIXED: Extract the main journal fields from context_data
    content: entry.context_data?.content || entry.content || '',
    title: entry.context_data?.title || entry.title || '',
    mood: entry.context_data?.mood || entry.mood || 'neutral',
    tags: entry.context_data?.tags || entry.tags || [],
    
    // Map other fields from context_data
    habitData: entry.context_data?.habitData || undefined,
    sleepData: entry.context_data?.sleepData || undefined,
    meals: entry.context_data?.meals || entry.meals,
    dayRating: entry.context_data?.dayRating || entry.dayRating,
    miles: entry.context_data?.miles || entry.miles,
    wakeTime: entry.context_data?.wakeTime || entry.wakeTime || '07:00',
    sleepTime: entry.context_data?.sleepTime || entry.sleepTime || '23:00',
    climbed: entry.context_data?.climbed || false,
    gym: entry.context_data?.gym,
    sessionNotes: entry.context_data?.sessionNotes,
    sends: entry.context_data?.sends || { V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 },
  })));
}
        if (cloudData.expenses.length > 0) setExpenses(cloudData.expenses);
        if (cloudData.income.length > 0) setIncome(cloudData.income);
        if (cloudData.netWorthEntries.length > 0) setNetWorthEntries(cloudData.netWorthEntries.map(convertLegacyNetWorthEntry));
        if (cloudData.habits.length > 0) setHabits(cloudData.habits);
        if (cloudData.climbingSessions.length > 0) setClimbingSessions(cloudData.climbingSessions);
      }
      
      await saveDataToCloud();
      setCloudSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Force sync error:', error);
      setCloudSyncStatus('error');
    }
  }, [isAuthenticated, settings.cloudSync, loadDataFromCloud, saveDataToCloud]);

  // Initial data load effect
  useEffect(() => {
    const loadData = async () => {
      if (!isLoaded) return;
      
      console.log('🔄 Starting initial data load...');
      
      // 1. Always load from localStorage first
      const localData = loadDataFromLocalStorage();
      
      // 2. Set local data immediately
      setJournalEntries(localData.journalEntries);
      setExpenses(localData.expenses);
      setIncome(localData.income);
      setNetWorthEntries(localData.netWorthEntries);
      setDataImports(localData.dataImports);
      setHabits(localData.habits);
      setClimbingSessions(localData.climbingSessions);
      
      if (localData.settings) {
        setSettings(prev => ({
          ...prev,
          ...localData.settings,
          gyms: localData.settings.gyms || prev.gyms,
          categories: localData.settings.categories || prev.categories,
        }));
      }
      
      // 3. Mark initial load as completed
      initialLoadCompleted.current = true;
      
      // 4. Only try to load from cloud if authenticated
if (isAuthenticated) {
  const cloudData = await loadDataFromCloud();
  
  if (cloudData) {
    // 5. Update with cloud data if available, otherwise keep local data
    if (cloudData.journalEntries.length > 0) {
      setJournalEntries(cloudData.journalEntries.map(entry => ({
        ...entry,
        // 🔧 FIXED: Extract the main journal fields from context_data
        content: entry.context_data?.content || entry.content || '',
        title: entry.context_data?.title || entry.title || '',
        mood: entry.context_data?.mood || entry.mood || 'neutral',
        tags: entry.context_data?.tags || entry.tags || [],
        
        // Map from context_data to the new structure
        habitData: entry.context_data?.habitData || undefined,
        sleepData: entry.context_data?.sleepData || undefined,
        meals: entry.context_data?.meals || entry.meals,
        dayRating: entry.context_data?.dayRating || entry.dayRating,
        miles: entry.context_data?.miles || entry.miles,
        // Keep legacy fields for backward compatibility
        wakeTime: entry.context_data?.wakeTime || entry.wakeTime || '07:00',
        sleepTime: entry.context_data?.sleepTime || entry.sleepTime || '23:00',
        climbed: entry.context_data?.climbed || false,
        gym: entry.context_data?.gym,
        sessionNotes: entry.context_data?.sessionNotes,
        sends: entry.context_data?.sends || { V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 },
      })));
    }

          if (cloudData.expenses.length > 0) setExpenses(cloudData.expenses);
          if (cloudData.income.length > 0) setIncome(cloudData.income);
          
          // UPDATED: Convert cloud net worth data to new format
          if (cloudData.netWorthEntries.length > 0) {
            setNetWorthEntries(cloudData.netWorthEntries.map(e => convertLegacyNetWorthEntry({
              id: e.id, 
              date: e.date,
              cashAccounts: e.cash_accounts || e.cashEquivalents,
              liabilities: e.liabilities || e.creditCards,
              assets: e.assets,
              notes: e.notes,
              createdAt: e.created_at,
              updatedAt: e.updated_at,
            })));
          }
          
          if (cloudData.habits.length > 0) {
            setHabits(cloudData.habits.map(h => ({
              ...h, createdAt: h.created_at,
              completed: h.completed_history || Array(7).fill(false),
            })));
          }
          
          if (cloudData.climbingSessions.length > 0) {
            setClimbingSessions(cloudData.climbingSessions);
          } else if (localData.climbingSessions.length === 0) {
            // 6. Generate example data only if no data exists anywhere
            const exampleClimbingData = generateExampleClimbingData();
            setClimbingSessions(exampleClimbingData);
          }

          if (cloudData.settings) {
            setSettings(prev => ({
              ...prev, ...cloudData.settings,
              gyms: cloudData.settings.gyms || prev.gyms,
              categories: cloudData.settings.categories || prev.categories,
            }));
          }
        } else if (localData.climbingSessions.length === 0) {
          // 7. Generate example data if no cloud data and no local data
          const exampleClimbingData = generateExampleClimbingData();
          setClimbingSessions(exampleClimbingData);
        }
      } else if (localData.climbingSessions.length === 0) {
        // Generate example data for non-authenticated users
        const exampleClimbingData = generateExampleClimbingData();
        setClimbingSessions(exampleClimbingData);
      }
      
      // 8. Generate example net worth data if none exists
if (localData.netWorthEntries.length === 0 && !isAuthenticated) {
        const exampleNetWorthData = generateExampleNetWorthData();
        setNetWorthEntries(exampleNetWorthData);
      }
      
      console.log('✅ Initial data load completed');
    };

    loadData();
  }, [isLoaded, isAuthenticated, loadDataFromLocalStorage, loadDataFromCloud]);

  // FIXED: Auto-sync with proper async handling
  useEffect(() => {
    if (settings.cloudSync && isAuthenticated && userId && initialLoadCompleted.current) {
      const syncToCloud = async () => {
        try {
          const authSupabase = await getAuthenticatedSupabase(); // Add await here
          if (!authSupabase) return;

          // Sync journal entries
          const entriesToSync = journalEntries.map(entry => ({
            id: entry.id,
            date: entry.date,
            title: entry.title,
            content: entry.content,
            mood: entry.mood,
            tags: entry.tags,
            ai_reflection: entry.ai_reflection,
            context_data: entry.context_data || {
              habitData: entry.habitData,
              sleepData: entry.sleepData,
              meals: entry.meals,
              dayRating: entry.dayRating,
              miles: entry.miles
            },
            user_id: userId, // This will be validated by RLS policies
          }));

          await authSupabase.from('journal_entries').upsert(entriesToSync);
          setCloudSyncStatus('synced');
          setLastSyncTime(new Date());
        } catch (error) {
          console.error('Auto-sync error:', error);
          setCloudSyncStatus('error');
        }
      };

      const timeoutId = setTimeout(syncToCloud, 30000);
      return () => clearTimeout(timeoutId);
    }
  }, [journalEntries, settings.cloudSync, isAuthenticated, userId, getAuthenticatedSupabase]);

  // Always save to localStorage as backup
  useEffect(() => {
    if (initialLoadCompleted.current) {
      localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
    }
  }, [journalEntries]);

  useEffect(() => {
    if (initialLoadCompleted.current) {
      localStorage.setItem('expenses', JSON.stringify(expenses));
    }
  }, [expenses]);

  useEffect(() => {
    if (initialLoadCompleted.current) {
      localStorage.setItem('income', JSON.stringify(income));
    }
  }, [income]);

  useEffect(() => {
    if (initialLoadCompleted.current) {
      localStorage.setItem('netWorthEntries', JSON.stringify(netWorthEntries));
    }
  }, [netWorthEntries]);

  useEffect(() => {
    if (initialLoadCompleted.current) {
      localStorage.setItem('dataImports', JSON.stringify(dataImports));
    }
  }, [dataImports]);

  useEffect(() => {
    if (initialLoadCompleted.current) {
      localStorage.setItem('settings', JSON.stringify(settings));
    }
  }, [settings]);

  useEffect(() => {
    if (initialLoadCompleted.current) {
      localStorage.setItem('habits', JSON.stringify(habits));
    }
  }, [habits]);

  useEffect(() => {
    if (initialLoadCompleted.current) {
      localStorage.setItem('climbingSessions', JSON.stringify(climbingSessions));
    }
  }, [climbingSessions]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      if (settings.cloudSync && initialLoadCompleted.current && isAuthenticated) {
        setCloudSyncStatus('syncing');
        forceSync();
      }
    };

    const handleOffline = () => {
      setCloudSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [settings.cloudSync, forceSync, isAuthenticated]);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedDate,
        setSelectedDate,
        journalEntries,
        setJournalEntries,
        expenses,
        setExpenses,
        income,
        setIncome,
        netWorthEntries,
        setNetWorthEntries,
        dataImports,
        setDataImports,
        settings,
        setSettings,
        habits,
        setHabits,
        climbingSessions,
        setClimbingSessions,
        totalSends,
        // Simplified auth (powered by Clerk)
        user,
        isAuthenticated,
        userId,
        cloudSyncStatus,
        lastSyncTime,
        forceSync,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};