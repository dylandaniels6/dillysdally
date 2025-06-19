import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Habit, ClimbingSession } from '../types';
import { ClimbingRoute } from '../types';

export type ViewMode = 'overview' | 'journal' | 'habits' | 'climbing' | 'expenses' | 'networth' | 'settings';

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

export interface User {
  id: string;
  email: string;
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
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  enableAuthentication: () => void;
  anonymousUserId: string;
  cloudSyncStatus: 'synced' | 'syncing' | 'error' | 'offline';
  lastSyncTime: Date | null;
  forceSync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Generate a valid UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Validate if a string is a valid UUID
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Generate or retrieve anonymous user ID as a valid UUID
const getAnonymousUserId = (): string => {
  let anonymousId = localStorage.getItem('anonymousUserId');
  
  // Check if the stored ID is a valid UUID, if not generate a new one
  if (!anonymousId || !isValidUUID(anonymousId)) {
    anonymousId = generateUUID();
    localStorage.setItem('anonymousUserId', anonymousId);
  }
  
  return anonymousId;
};

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
    assets: typeof entry.assets === 'number' && entry.assets > 0 ? [{
      id: `legacy-asset-${entry.id}`,
      name: 'Legacy Assets',
      value: entry.assets,
      category: 'other' as const,
      addedDate: entry.date,
      isActive: true,
    }] : [],
    notes: entry.notes,
    createdAt: entry.createdAt || entry.created_at,
    updatedAt: entry.updatedAt || entry.updated_at,
  };
};

// Generate example climbing data
const generateExampleClimbingData = (): ClimbingSession[] => {
  const exampleSessions: ClimbingSession[] = [];
  const today = new Date();
  const gymOptions = ['Crux Pflugerville', 'Crux Central', 'Mesa Rim', 'ABP - Westgate', 'ABP - Springdale'];
  
  // Generate 30 days of example data
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    // Skip some days to make it more realistic (only climb ~70% of days)
    if (Math.random() > 0.7) continue;
    
    const routes: ClimbingRoute[] = [];
    const grades = ['V6', 'V7', 'V8', 'V9', 'V10'];
    
    // Generate random routes for each session
    const numRoutes = Math.floor(Math.random() * 8) + 2; // 2-10 routes
    for (let j = 0; j < numRoutes; j++) {
      const grade = grades[Math.floor(Math.random() * grades.length)];
      routes.push({
        id: `route-${i}-${j}`,
        name: `${grade} Route ${j + 1}`,
        grade,
        type: 'boulder',
        attempts: Math.floor(Math.random() * 5) + 1,
        completed: Math.random() > 0.3, // 70% completion rate
        notes: ''
      });
    }
    
    exampleSessions.push({
      id: `session-${i}`,
      date: date.toISOString().split('T')[0],
      location: gymOptions[Math.floor(Math.random() * gymOptions.length)],
      duration: 60 + Math.floor(Math.random() * 120), // 60-180 minutes
      routes,
      notes: `Great session! Worked on technique and sent some challenging routes.`
    });
  }
  
  return exampleSessions;
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
  const [currentView, setCurrentView] = useState<ViewMode>('overview');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [netWorthEntries, setNetWorthEntries] = useState<NetWorthEntry[]>([]);
  const [dataImports, setDataImports] = useState<DataImport[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: false,
    autoSave: true,
    notifications: true,
    gyms: ['Crux Pflugerville', 'Crux Central', 'Mesa Rim', 'ABP - Westgate', 'ABP - Springdale'],
    categories: ['eating out', 'groceries', 'transportation', 'entertainment', 'shopping', 'subscriptions', 'bills'],
    authenticationEnabled: false,
    cloudSync: true,
    autoBackup: true,
  });
  const [habits, setHabits] = useState<Habit[]>([]);
  const [climbingSessions, setClimbingSessions] = useState<ClimbingSession[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [anonymousUserId, setAnonymousUserId] = useState<string>('');

useEffect(() => {
  if (typeof window !== 'undefined') {
    setAnonymousUserId(getAnonymousUserId());
  }
}, []);

  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Track if initial data load has been completed
  const initialLoadCompleted = useRef(false);

  // Authentication is only active when enabled in settings
  const isAuthenticated = settings.authenticationEnabled && !!user;

  const totalSends = React.useMemo(() => {
    return journalEntries.reduce(
      (total, entry) => ({
        V6: total.V6 + (entry.sends?.V6 || 0),
        V7: total.V7 + (entry.sends?.V7 || 0),
        V8: total.V8 + (entry.sends?.V8 || 0),
        V9: total.V9 + (entry.sends?.V9 || 0),
        V10: total.V10 + (entry.sends?.V10 || 0),
      }),
      { V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 }
    );
  }, [journalEntries]);

  const signIn = async (email: string, password: string) => {
    if (!settings.authenticationEnabled) {
      throw new Error('Authentication is not enabled');
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) setUser({ id: data.user.id, email: data.user.email! });
  };

  const signUp = async (email: string, password: string) => {
    if (!settings.authenticationEnabled) {
      throw new Error('Authentication is not enabled');
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) setUser({ id: data.user.id, email: data.user.email! });
  };

  const signOut = async () => {
    if (!settings.authenticationEnabled) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  const enableAuthentication = () => {
    setSettings(prev => ({ ...prev, authenticationEnabled: true }));
  };

  // Load data from localStorage
  const loadDataFromLocalStorage = useCallback(() => {
    try {
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

  // Cloud sync functions
  const loadDataFromCloud = useCallback(async (currentSettings: AppSettings) => {
    if (!currentSettings.cloudSync) return null;
    
    setCloudSyncStatus('syncing');
    try {
      // For anonymous users, query with user_id IS NULL
      // For authenticated users, query with user_id = user.id
      const userFilter = isAuthenticated ? user?.id : null;
      
      // Load all data types
      const [journalData, expensesData, incomeData, netWorthData, habitsData, climbingData, profileData] = await Promise.all([
        userFilter 
          ? supabase.from('journal_entries').select('*').eq('user_id', userFilter).order('date', { ascending: false })
          : supabase.from('journal_entries').select('*').is('user_id', null).order('date', { ascending: false }),
        userFilter 
          ? supabase.from('expenses').select('*').eq('user_id', userFilter).order('date', { ascending: false })
          : supabase.from('expenses').select('*').is('user_id', null).order('date', { ascending: false }),
        userFilter 
          ? supabase.from('income').select('*').eq('user_id', userFilter).order('date', { ascending: false })
          : supabase.from('income').select('*').is('user_id', null).order('date', { ascending: false }),
        userFilter 
          ? supabase.from('net_worth_entries').select('*').eq('user_id', userFilter).order('date', { ascending: false })
          : supabase.from('net_worth_entries').select('*').is('user_id', null).order('date', { ascending: false }),
        userFilter 
          ? supabase.from('habits').select('*').eq('user_id', userFilter)
          : supabase.from('habits').select('*').is('user_id', null),
        userFilter 
          ? supabase.from('climbing_sessions').select('*').eq('user_id', userFilter)
          : supabase.from('climbing_sessions').select('*').is('user_id', null),
        userFilter 
          ? supabase.from('user_profiles').select('settings').eq('user_id', userFilter).maybeSingle()
          : supabase.from('user_profiles').select('settings').is('user_id', null).maybeSingle()
      ]);

      const cloudData = {
        journalEntries: journalData.data || [],
        expenses: expensesData.data || [],
        income: incomeData.data || [],
        netWorthEntries: netWorthData.data || [],
        habits: habitsData.data || [],
        climbingSessions: climbingData.data || [],
        settings: profileData.data?.settings || null
      };

      setCloudSyncStatus('synced');
      setLastSyncTime(new Date());
      return cloudData;
    } catch (error) {
      console.error('Cloud load error:', error);
      setCloudSyncStatus('error');
      return null;
    }
  }, [isAuthenticated, user?.id]);

  const forceSync = useCallback(async () => {
    const cloudData = await loadDataFromCloud(settings);
    if (cloudData) {
      // Process and update state with cloud data
      if (cloudData.journalEntries.length > 0) {
        setJournalEntries(cloudData.journalEntries.map(entry => ({
          ...entry,
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
      
      if (cloudData.climbingSessions.length > 0) setClimbingSessions(cloudData.climbingSessions);

      if (cloudData.settings) {
        setSettings(prev => ({
          ...prev, ...cloudData.settings,
          gyms: cloudData.settings.gyms || prev.gyms,
          categories: cloudData.settings.categories || prev.categories,
        }));
      }
    }
  }, [loadDataFromCloud, settings]);

  // Initial data load - runs only once
  useEffect(() => {
    if (initialLoadCompleted.current) return;
    
    const initializeData = async () => {
      // 1. Load from localStorage first
      const localData = loadDataFromLocalStorage();
      
      // 2. Update settings first (needed for cloud sync decision)
      if (localData.settings) {
        setSettings(prev => ({
          ...prev,
          ...localData.settings,
          authenticationEnabled: localData.settings.authenticationEnabled ?? false,
          cloudSync: localData.settings.cloudSync ?? true,
          autoBackup: localData.settings.autoBackup ?? true,
        }));
      }
      
      // 3. Set local data to state
      setJournalEntries(localData.journalEntries);
      setExpenses(localData.expenses);
      setIncome(localData.income);
      if (localData.netWorthEntries.length === 0) {
        const exampleNetWorthData = generateExampleNetWorthData();
        setNetWorthEntries(exampleNetWorthData);
      } else {
        setNetWorthEntries(localData.netWorthEntries);
      }
      setDataImports(localData.dataImports);
      setHabits(localData.habits);
      setClimbingSessions(localData.climbingSessions);
      
      // 4. Try to load from cloud
      const currentSettings = localData.settings || settings;
      const cloudData = await loadDataFromCloud(currentSettings);
      
      if (cloudData) {
        // 5. Update with cloud data if available, otherwise keep local data
        if (cloudData.journalEntries.length > 0) {
          setJournalEntries(cloudData.journalEntries.map(entry => ({
            ...entry,
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
      
      initialLoadCompleted.current = true;
    };

    initializeData();
  }, [loadDataFromLocalStorage, loadDataFromCloud, settings]);

  // Auto-sync data changes to cloud
  useEffect(() => {
    if (settings.cloudSync && journalEntries.length > 0 && initialLoadCompleted.current) {
      const timeoutId = setTimeout(() => {
        journalEntries.forEach(entry => {
          const entryData = {
            id: entry.id,
            date: entry.date,
            title: entry.title || `Journal Entry - ${entry.date}`,
            content: entry.content,
            mood: entry.mood || 'neutral',
            tags: entry.tags || [],
            ai_reflection: entry.ai_reflection,
            meal_ai_reflection: entry.meal_ai_reflection,
            context_data: {
              habitData: entry.habitData,
              sleepData: entry.sleepData,
              meals: entry.meals,
              dayRating: entry.dayRating,
              miles: entry.miles,
              // Include legacy fields in context_data for backward compatibility
              wakeTime: entry.wakeTime,
              sleepTime: entry.sleepTime,
              climbed: entry.climbed,
              gym: entry.gym,
              sessionNotes: entry.sessionNotes,
              sends: entry.sends,
            },
            user_id: isAuthenticated ? user?.id : null,
          };
          // Sync to cloud logic here
        });
      }, 30000);
      return () => clearTimeout(timeoutId);
    }
  }, [journalEntries, settings.cloudSync, isAuthenticated, user?.id]);

  // Only check for existing session if authentication is enabled
  useEffect(() => {
    if (!settings.authenticationEnabled) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email! });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email! } : null);
    });

    return () => subscription.unsubscribe();
  }, [settings.authenticationEnabled]);

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
      if (settings.cloudSync && initialLoadCompleted.current) {
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
  }, [settings.cloudSync, forceSync]);

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
        user,
        setUser,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        enableAuthentication,
        anonymousUserId,
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