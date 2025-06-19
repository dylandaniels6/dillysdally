import * as pdfjsLib from 'pdfjs-dist';
import { ClimbingRoute } from '../types';

// Always set this for Bolt/Vite to avoid dynamic import issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

export interface ParsedPDFData {
  journalEntries: any[];
  habits: any[];
  climbingSessions: any[];
  rawText: string;
}

export class PDFParser {
  private static parseDate(dateStr: string): string | null {
    const datePatterns = [
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
      /(\d{1,2})\s+(\w+)\s+(\d{4})/,
    ];

    for (const pattern of datePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        try {
          let date: Date;

          if (pattern === datePatterns[0]) {
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          } else if (pattern === datePatterns[1] || pattern === datePatterns[2]) {
            date = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
          } else if (pattern === datePatterns[3]) {
            date = new Date(`${match[1]} ${match[2]}, ${match[3]}`);
          } else if (pattern === datePatterns[4]) {
            date = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
          } else {
            continue;
          }

          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  private static extractMood(text: string): string {
    const moodKeywords = {
      great: ['amazing', 'fantastic', 'wonderful', 'excellent', 'outstanding', 'incredible', 'perfect'],
      good: ['good', 'happy', 'positive', 'pleased', 'satisfied', 'content', 'cheerful', 'upbeat'],
      neutral: ['okay', 'fine', 'normal', 'average', 'alright', 'decent'],
      bad: ['bad', 'sad', 'down', 'upset', 'disappointed', 'frustrated', 'annoyed', 'stressed'],
      terrible: ['awful', 'horrible', 'terrible', 'devastating', 'miserable', 'depressed', 'anxious']
    };

    const lowerText = text.toLowerCase();
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return mood;
        }
      }
    }

    return 'neutral';
  }

  private static extractTags(text: string): string[] {
    const commonTags = [
      'work', 'family', 'friends', 'health', 'exercise', 'climbing', 'travel',
      'goals', 'productivity', 'stress', 'anxiety', 'happiness', 'growth',
      'learning', 'relationships', 'hobbies', 'meditation', 'sleep', 'food'
    ];

    const tags: string[] = [];
    const lowerText = text.toLowerCase();

    for (const tag of commonTags) {
      if (lowerText.includes(tag)) {
        tags.push(tag);
      }
    }

    const hashtagMatches = text.match(/#\w+/g);
    if (hashtagMatches) {
      tags.push(...hashtagMatches.map(tag => tag.substring(1).toLowerCase()));
    }

    return [...new Set(tags)];
  }

  private static parseJournalEntries(text: string): any[] {
    const entries: any[] = [];
    const lines = text.split('\n');
    
    let currentDate: string | null = null;
    let currentContent = '';
    let inEntry = false;
    let entryStartIndex = -1;
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if this line contains a date
      const parsedDate = this.parseDate(line);
      
      if (parsedDate) {
        // If we were already processing an entry, save it
        if (currentDate && inEntry) {
          // Extract content between quotes if possible
          let content = currentContent;
          const firstQuote = currentContent.indexOf('"');
          const lastQuote = currentContent.lastIndexOf('"');
          
          if (firstQuote !== -1 && lastQuote !== -1 && firstQuote !== lastQuote) {
            content = currentContent.substring(firstQuote + 1, lastQuote);
          }
          
          if (content.length > 10) {
            entries.push({
              date: currentDate,
              entry: content
            });
          }
        }
        
        // Start a new entry
        currentDate = parsedDate;
        currentContent = '';
        inEntry = true;
        entryStartIndex = i + 1;
      } else if (inEntry) {
        // Add this line to the current entry
        if (currentContent) {
          currentContent += '\n';
        }
        currentContent += line;
      }
    }
    
    // Don't forget to process the last entry
    if (currentDate && inEntry) {
      // Extract content between quotes if possible
      let content = currentContent;
      const firstQuote = currentContent.indexOf('"');
      const lastQuote = currentContent.lastIndexOf('"');
      
      if (firstQuote !== -1 && lastQuote !== -1 && firstQuote !== lastQuote) {
        content = currentContent.substring(firstQuote + 1, lastQuote);
      }
      
      if (content.length > 10) {
        entries.push({
          date: currentDate,
          entry: content
        });
      }
    }

    return entries;
  }

  private static parseHabits(text: string): any[] {
    const habits: any[] = [];
    const habitKeywords = ['habit', 'routine', 'daily', 'weekly', 'goal', 'target', 'completed', 'progress'];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      if (habitKeywords.some(keyword => line.includes(keyword))) {
        const date = this.parseDate(lines[i]) || new Date().toISOString().split('T')[0];
        const habitMatch = line.match(/(.*?)(habit|routine|goal)/);
        if (habitMatch) {
          const title = habitMatch[1].trim() || 'Daily Habit';

          habits.push({
            date,
            title: title.charAt(0).toUpperCase() + title.slice(1),
            description: lines[i].trim(),
            frequency: line.includes('weekly') ? 'weekly' : 'daily',
            target: 1,
            progress: line.includes('completed') || line.includes('done') ? 1 : 0,
            completed: line.includes('completed') || line.includes('done'),
            color: '#3B82F6'
          });
        }
      }
    }

    return habits;
  }

  private static parseClimbingSessions(text: string): any[] {
    const sessions: any[] = [];
    const climbingKeywords = ['climb', 'boulder', 'route', 'gym', 'crag', 'grade', 'v', '5.'];
    const sections = text.split(/(?:\n\s*\n|\n-{3,})/);

    for (const section of sections) {
      const lowerSection = section.toLowerCase();

      if (climbingKeywords.some(keyword => lowerSection.includes(keyword))) {
        const lines = section.split('\n');
        let date: string | null = null;

        for (const line of lines) {
          const parsedDate = this.parseDate(line);
          if (parsedDate) {
            date = parsedDate;
            break;
          }
        }

        if (!date) continue;

        const locationMatch = section.match(/(?:at|@)\s*([^.\n]+)/i);
        const location = locationMatch ? locationMatch[1].trim() : 'Unknown Location';

        const durationMatch = section.match(/(\d+)\s*(?:min|minutes|hour|hours)/i);
        let duration = 90;
        if (durationMatch) {
          duration = parseInt(durationMatch[1]);
          if (section.toLowerCase().includes('hour')) {
            duration *= 60;
          }
        }

        const routes: ClimbingRoute[] = [];        
        const routeMatches = section.match(/(?:v\d+|5\.\d+[a-d]?)/gi);
        if (routeMatches) {
          routeMatches.forEach((grade, index) => {
            routes.push({
              id: `route-${index}`,
              name: `Route ${index + 1}`,
              grade: grade.toUpperCase(),
              type: grade.toLowerCase().startsWith('v') ? 'boulder' : 'sport',
              attempts: 1,
              completed: section.includes('sent') || section.includes('completed'),
              notes: ''
            });
          });
        }

        sessions.push({
          date,
          location,
          duration,
          routes,
          notes: section.trim()
        });
      }
    }

    return sessions;
  }

  static async parsePDF(file: File): Promise<ParsedPDFData> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0
      }).promise;

      let fullText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }

      const journalEntries = this.parseJournalEntries(fullText);
      const habits = this.parseHabits(fullText);
      const climbingSessions = this.parseClimbingSessions(fullText);

      return {
        journalEntries,
        habits,
        climbingSessions,
        rawText: fullText
      };
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file. Please ensure it\'s a valid PDF document.');
    }
  }
}