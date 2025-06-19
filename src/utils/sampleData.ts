import { Habit, JournalEntry, ClimbingSession } from '../types';

export const generateSampleData = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  const habits: Habit[] = [
    {
      id: '1',
      title: 'Drink water',
      description: 'Drink 8 glasses of water',
      frequency: 'daily',
      target: 8,
      progress: 3,
      createdAt: formatDate(new Date(today.setDate(today.getDate() - 10))),
      color: '#3B82F6',
      icon: 'droplets',
      completed: Array(7).fill(false).map((_, i) => i < 3)
    },
    {
      id: '2',
      title: 'Meditate',
      description: 'Meditate for 10 minutes',
      frequency: 'daily',
      target: 1,
      progress: 1,
      createdAt: formatDate(new Date(today.setDate(today.getDate() - 15))),
      color: '#10B981',
      icon: 'brain',
      completed: Array(7).fill(false).map((_, i) => i < 5)
    },
    {
      id: '3',
      title: 'Climb',
      description: 'Go climbing at the gym',
      frequency: 'weekly',
      target: 3,
      progress: 2,
      createdAt: formatDate(new Date(today.setDate(today.getDate() - 20))),
      color: '#F59E0B',
      icon: 'mountain',
      completed: Array(7).fill(false).map((_, i) => i < 2)
    }
  ];

  const journalEntries: JournalEntry[] = [
    {
      id: '1',
      date: formatDate(today),
      title: 'A productive day',
      content: 'Today was incredibly productive. I managed to complete all my tasks and even had time for a short walk in the evening.',
      mood: 'great',
      tags: ['productivity', 'work', 'success']
    },
    {
      id: '2',
      date: formatDate(yesterday),
      title: 'Climbing progress',
      content: 'Made some good progress on the V5 boulder problem I\'ve been working on. Almost got to the top today!',
      mood: 'good',
      tags: ['climbing', 'progress', 'gym']
    }
  ];

  const climbingSessions: ClimbingSession[] = [
    {
      id: '1',
      date: formatDate(today),
      location: 'Boulder Gym',
      duration: 120,
      routes: [
        {
          id: '1',
          name: 'Crimpy Problem',
          grade: 'V4',
          type: 'boulder',
          attempts: 3,
          completed: true,
          notes: 'Challenging start, but managed to complete it after a few attempts.'
        },
        {
          id: '2',
          name: 'Overhang Challenge',
          grade: 'V5',
          type: 'boulder',
          attempts: 5,
          completed: false,
          notes: 'Still struggling with the middle section. Need more core strength.'
        }
      ],
      notes: 'Good session overall. Felt strong on crimps but need to work on overhangs.'
    },
    {
      id: '2',
      date: formatDate(yesterday),
      location: 'Vertical World',
      duration: 90,
      routes: [
        {
          id: '3',
          name: 'Slab Master',
          grade: '5.11a',
          type: 'top-rope',
          attempts: 1,
          completed: true,
          notes: 'Smooth climbing, felt very comfortable on the slab.'
        }
      ],
      notes: 'Short but effective session. Focused on technique and footwork.'
    }
  ];

  return { habits, journalEntries, climbingSessions };
};