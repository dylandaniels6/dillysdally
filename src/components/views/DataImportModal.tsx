import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Edit3, Calendar, Brain, Download, RotateCcw, Database, Type } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';
import { useAppContext } from '../../context/AppContext';
import { Card } from '../common/Card';

interface ParsedEntry {
  id: string;
  detectedDate: string | null;
  detectedContent: string | null;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
  rawMatch: {
    dateText: string;
    contentText: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
}

interface ImportStep {
  step: 'input' | 'review' | 'import' | 'complete';
  data: {
    rawText?: string;
    parsedEntries?: ParsedEntry[];
    importResults?: {
      successful: number;
      failed: number;
      total: number;
      duplicatesSkipped?: number;
      backupId?: string;
      canRollback?: boolean;
    };
  };
}

interface ImportBackup {
  id: string;
  timestamp: string;
  totalEntries: number;
  importedIds: string[];
  metadata: {
    selectedYear: number;
    originalData: string;
    userId: string;
  };
  rolledBack?: boolean;
  rollbackTimestamp?: string;
}

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DataImportModal: React.FC<DataImportModalProps> = ({ isOpen, onClose }) => {
  const { getToken } = useAuth();
  const { forceSync, userId: clerkUserId, setJournalEntries, journalEntries } = useAppContext(); // Get Clerk user ID and state setters from context
  const [currentStep, setCurrentStep] = useState<ImportStep>({
    step: 'input',
    data: {}
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get available years (current year back to 2020)
  const availableYears = Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 
    new Date().getFullYear() - i
  );

  // Parse date with year injection - PRESERVED EXACTLY
  const parseDate = (dateText: string, targetYear: number): { date: string | null; confidence: number } => {
    if (!dateText || typeof dateText !== 'string') return { date: null, confidence: 0 };
    
    const cleanStr = dateText.trim();
    
    // Enhanced patterns for your specific format
    const patterns = [
      // "Sun, Jun 1" or "Thu, Jun 1" format (your main format)
      /^(sun|mon|tue|wed|thu|thurs|fri|sat),?\s+([a-z]{3})\s+(\d{1,2})$/i,
      // "June 1" format (fallback)
      /^([a-z]{3,})\s+(\d{1,2})$/i,
      // ISO date format "2024-06-01" (if any exist)
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    ];

    const monthMap: { [key: string]: number } = {
      'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
      'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
      'jul': 6, 'july': 6, 'aug': 7, 'august': 7, 'sep': 8, 'september': 8,
      'oct': 9, 'october': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11
    };

    for (let i = 0; i < patterns.length; i++) {
      const match = cleanStr.match(patterns[i]);
      if (match) {
        try {
          let date: Date;
          let confidence = 0.95 - (i * 0.1); // High confidence for your main format
          
          if (i === 0) { // "Sun, Jun 1" format (your primary format)
            const month = monthMap[match[2].toLowerCase()];
            const day = parseInt(match[3]);
            date = new Date(targetYear, month, day);
            confidence = 0.98; // Very high confidence
          } else if (i === 1) { // "Jun 1" format
            const month = monthMap[match[1].toLowerCase()];
            const day = parseInt(match[2]);
            date = new Date(targetYear, month, day);
            confidence = 0.85;
          } else if (i === 2) { // ISO format
            date = new Date(match[1] + '-' + match[2].padStart(2, '0') + '-' + match[3].padStart(2, '0'));
            confidence = 0.95;
          }

          if (!isNaN(date.getTime())) {
            return { 
              date: date.toISOString().split('T')[0], 
              confidence 
            };
          }
        } catch (error) {
          continue;
        }
      }
    }

    return { date: null, confidence: 0 };
  };

  // SIMPLE: Just clean quotes and return ALL content - PRESERVED EXACTLY
  const parseContent = (contentText: string): { content: string | null; confidence: number } => {
    if (!contentText || typeof contentText !== 'string') return { content: null, confidence: 0 };

    let content = contentText.trim();
    
    console.log(`🔍 parseContent input: ${content.length} chars`);
    console.log(`🔍 First 200 chars: "${content.substring(0, 200)}"`);

    // Remove quotes if present
    if ((content.startsWith('"') && content.endsWith('"')) || 
        (content.startsWith("'") && content.endsWith("'"))) {
      content = content.slice(1, -1).trim();
      console.log(`🔍 After removing quotes: ${content.length} chars`);
    }

    // Return ALL content
    console.log(`🔍 Final content: ${content.length} chars`);
    return { 
      content: content.length > 5 ? content : null, 
      confidence: 0.9 
    };
  };

  // Enhanced content extraction - PRESERVED EXACTLY
  const extractContent = (fullText: string, dateText: string): { content: string | null; confidence: number } => {
    if (!fullText || !dateText) {
      return { 
        content: null, 
        confidence: 0.9 
      };
    }
  };

  // Helper function to create entries consistently - PRESERVED EXACTLY
  const createEntry = (
    dateDetection: { date: string | null; confidence: number },
    contentDetection: { content: string | null; confidence: number },
    dateText: string,
    contentText: string,
    index: number
  ): ParsedEntry => {
    const issues: string[] = [];
    
    if (!dateDetection.date) {
      issues.push('Could not parse date format');
    }
    
    if (contentDetection.confidence < 0.5) {
      issues.push('Content confidence is low');
    }

    // Determine overall confidence
    const avgConfidence = (dateDetection.confidence + contentDetection.confidence) / 2;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (avgConfidence > 0.7) confidence = 'high';
    else if (avgConfidence > 0.4) confidence = 'medium';

    // Be more aggressive with auto-approval for flexible parsing
    let status: ParsedEntry['status'] = 'pending';
    if (confidence === 'high') {
      status = 'approved';
    } else if (confidence === 'medium' && issues.length <= 1) {
      status = 'approved';
    } else if (issues.length > 0) {
      status = 'needs_review';
    }

    return {
      id: `entry-${index}`,
      detectedDate: dateDetection.date,
      detectedContent: contentDetection.content,
      confidence,
      issues,
      rawMatch: {
        dateText,
        contentText
      },
      status
    };
  };

  // HYBRID APPROACH: Handle tab-separated dates + collect all content until next date - PRESERVED EXACTLY
  const parseJournalText = (text: string, targetYear: number): ParsedEntry[] => {
    if (!text || text.trim().length === 0) return [];

    console.log('🚀 Starting HYBRID parsing...');
    console.log('Input text length:', text.length);

    const entries: ParsedEntry[] = [];
    const lines = text.split('\n');
    
    console.log('Total lines after split:', lines.length);
    
    // Convert to JSON structure first
    const jsonEntries: Array<{date: string, content: string, rawDate: string}> = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        i++;
        continue;
      }
      
      console.log(`🔍 Processing line ${i}: ${line.length} chars`);
      
      // Check if this line contains a tab (date line)
      if (line.includes('\t')) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const datePart = parts[0].trim();
          const firstContentPart = parts.slice(1).join('\t').trim();
          
          console.log(`📋 TAB DATE FOUND: "${datePart}"`);
          console.log(`📋 First content part: ${firstContentPart.length} chars`);
          
          // Test date parsing on just the date part
          const dateDetection = parseDate(datePart, targetYear);
          
          if (dateDetection.confidence > 0.3) {
            console.log(`✅ VALID DATE: ${datePart} -> ${dateDetection.date}`);
            
            // Start collecting ALL content for this date
            let allContent: string[] = [];
            
            // Add the first content part (from same line as date)
            if (firstContentPart) {
              allContent.push(firstContentPart);
            }
            
            // Now collect all subsequent lines until we hit the next date
            let j = i + 1;
            while (j < lines.length) {
              const nextLine = lines[j].trim();
              
              // Check if this line is a new date
              if (nextLine.includes('\t')) {
                const nextParts = nextLine.split('\t');
                if (nextParts.length >= 2) {
                  const nextDatePart = nextParts[0].trim();
                  const nextDateDetection = parseDate(nextDatePart, targetYear);
                  
                  if (nextDateDetection.confidence > 0.3) {
                    console.log(`🛑 Found next date: ${nextDatePart}, stopping collection`);
                    break; // Stop here, this is the next entry
                  }
                }
              }
              
              // This line belongs to the current entry
              if (nextLine) {
                allContent.push(nextLine);
                console.log(`📝 Adding line ${j}: ${nextLine.length} chars`);
              } else {
                allContent.push(''); // Preserve empty lines for paragraph breaks
              }
              
              j++;
            }
            
            // Join all content
            const fullContent = allContent.join('\n').trim();
            console.log(`📊 Total content collected: ${fullContent.length} chars`);
            console.log(`📊 Content preview: "${fullContent.substring(0, 100)}..."`);
            
            // Clean up the content (remove surrounding quotes)
            let cleanContent = fullContent;
            if ((cleanContent.startsWith('"') && cleanContent.endsWith('"')) ||
                (cleanContent.startsWith("'") && cleanContent.endsWith("'"))) {
              cleanContent = cleanContent.slice(1, -1);
            }
            
            jsonEntries.push({
              date: dateDetection.date,
              content: cleanContent.trim(),
              rawDate: datePart
            });
            
            console.log(`✅ Entry complete: ${dateDetection.date} (${cleanContent.length} chars)`);
            
            // Jump to the next date line
            i = j;
            continue;
          } else {
            console.log(`❌ Date parsing failed for: "${datePart}"`);
          }
        }
      }
      
      i++;
    }
    
    console.log(`📊 JSON Entries Created: ${jsonEntries.length}`);
    jsonEntries.forEach((entry, i) => {
      console.log(`Entry ${i}: ${entry.rawDate} -> ${entry.date} (${entry.content.length} chars)`);
    });
    
    // Convert JSON entries to ParsedEntry format
    jsonEntries.forEach((jsonEntry, index) => {
      const contentDetection = parseContent(jsonEntry.content);
      
      if (contentDetection.content) {
        entries.push(createEntry(
          { date: jsonEntry.date, confidence: 0.9 },
          contentDetection,
          jsonEntry.rawDate,
          jsonEntry.content,
          index
        ));
      }
    });

    console.log('✅ Final ParsedEntries:', entries.length);
    return entries;
  };

  // NEW: Simple similarity calculation
  const calculateSimilarity = (text1: string, text2: string): number => {
    if (!text1 || !text2) return 0;
    
    // Normalize texts
    const normalize = (text: string) => text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);
    
    if (norm1 === norm2) return 1;
    
    // Simple character-based similarity
    const maxLength = Math.max(norm1.length, norm2.length);
    if (maxLength === 0) return 1;
    
    let matches = 0;
    const minLength = Math.min(norm1.length, norm2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (norm1[i] === norm2[i]) matches++;
    }
    
    return matches / maxLength;
  };

  // NEW: Check for existing entries before import
  const checkForDuplicates = async (entries: ParsedEntry[]): Promise<{
    duplicates: Array<{ entry: ParsedEntry; existingEntry: any }>;
    unique: ParsedEntry[];
  }> => {
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token, clerkUserId);
      
      // Get all dates we're trying to import
      const importDates = entries
        .filter(entry => entry.detectedDate)
        .map(entry => entry.detectedDate);
      
      console.log('🔍 Checking for duplicates on dates:', importDates);
      
      // Query existing entries for these dates
      const { data: existingEntries, error } = await supabase
        .from('journal_entries')
        .select('date, context_data, id')
        .in('date', importDates);
      
      if (error) {
        console.error('Error checking duplicates:', error);
        throw error;
      }
      
      console.log('📊 Found existing entries:', existingEntries?.length || 0);
      
      const duplicates: Array<{ entry: ParsedEntry; existingEntry: any }> = [];
      const unique: ParsedEntry[] = [];
      
      entries.forEach(entry => {
        const existingEntry = existingEntries?.find(existing => 
          existing.date === entry.detectedDate
        );
        
        if (existingEntry) {
          // Check if it's an exact duplicate or just same date
          const existingContent = existingEntry.context_data?.content || '';
          const newContent = entry.detectedContent || '';
          
          // Consider it a duplicate if content is very similar (90%+ match)
          const similarity = calculateSimilarity(existingContent, newContent);
          
          if (similarity > 0.9) {
            duplicates.push({ entry, existingEntry });
          } else {
            // Same date but different content - flag for review
            entry.issues.push(`Entry exists for this date but with different content (${Math.round(similarity * 100)}% similar)`);
            entry.status = 'needs_review';
            unique.push(entry);
          }
        } else {
          unique.push(entry);
        }
      });
      
      return { duplicates, unique };
      
    } catch (error) {
      console.error('Error checking duplicates:', error);
      throw error;
    }
  };

  // NEW: Create backup before import
  const createImportBackup = async (
    entriesToImport: ParsedEntry[],
    originalData: string
  ): Promise<string> => {
    try {
      const backupId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const backup: ImportBackup = {
        id: backupId,
        timestamp: new Date().toISOString(),
        totalEntries: entriesToImport.length,
        importedIds: [], // Will be populated during import
        metadata: {
          selectedYear,
          originalData,
          userId: clerkUserId
        }
      };
      
      // Save to localStorage as primary backup
      const existingBackups = JSON.parse(localStorage.getItem('importBackups') || '[]');
      existingBackups.push(backup);
      
      // Keep only last 10 backups
      if (existingBackups.length > 10) {
        existingBackups.splice(0, existingBackups.length - 10);
      }
      
      localStorage.setItem('importBackups', JSON.stringify(existingBackups));
      
      // Also save to Supabase for cloud backup
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const supabase = createAuthenticatedSupabaseClient(token, clerkUserId);
        
        await supabase.from('import_backups').insert([{
          backup_id: backupId,
          user_id: clerkUserId,
          backup_data: backup,
          created_at: new Date().toISOString()
        }]);
      }
      
      console.log('✅ Backup created:', backupId);
      return backupId;
      
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Could not create backup. Import cancelled for safety.');
    }
  };

  // NEW: Update backup with successful import IDs
  const updateBackupWithImportedIds = async (backupId: string, importedIds: string[]) => {
    try {
      // Update localStorage backup
      const existingBackups = JSON.parse(localStorage.getItem('importBackups') || '[]');
      const backupIndex = existingBackups.findIndex((b: ImportBackup) => b.id === backupId);
      
      if (backupIndex >= 0) {
        existingBackups[backupIndex].importedIds = importedIds;
        localStorage.setItem('importBackups', JSON.stringify(existingBackups));
      }
      
      // Update Supabase backup
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const supabase = createAuthenticatedSupabaseClient(token, clerkUserId);
        
        const backup = existingBackups[backupIndex];
        await supabase
          .from('import_backups')
          .update({ backup_data: backup })
          .eq('backup_id', backupId);
      }
      
      console.log('✅ Backup updated with imported IDs:', importedIds.length);
      
    } catch (error) {
      console.error('Failed to update backup:', error);
    }
  };

  // NEW: Rollback function
  const rollbackImport = async (backupId: string): Promise<boolean> => {
    try {
      // Get backup data
      const existingBackups = JSON.parse(localStorage.getItem('importBackups') || '[]');
      const backup = existingBackups.find((b: ImportBackup) => b.id === backupId);
      
      if (!backup || !backup.importedIds.length) {
        throw new Error('Backup not found or no entries to rollback');
      }
      
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');
      
      const supabase = createAuthenticatedSupabaseClient(token, clerkUserId);
      
      console.log(`🔄 Rolling back ${backup.importedIds.length} entries...`);
      
      // Delete imported entries from Supabase
      const { error: deleteError } = await supabase
        .from('journal_entries')
        .delete()
        .in('id', backup.importedIds);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Update local state - remove the imported entries
      setJournalEntries(prev => 
        prev.filter(entry => !backup.importedIds.includes(entry.id))
      );
      
      console.log('✅ Rollback completed successfully');
      
      // Mark backup as rolled back
      backup.rolledBack = true;
      backup.rollbackTimestamp = new Date().toISOString();
      localStorage.setItem('importBackups', JSON.stringify(existingBackups));
      
      return true;
      
    } catch (error) {
      console.error('Rollback failed:', error);
      alert('Rollback failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    }
  };

  // Handle text parsing - PRESERVED EXACTLY
  const handleParseText = () => {
    const text = textareaRef.current?.value;
    if (!text || text.trim().length === 0) {
      alert('Please paste your journal text first');
      return;
    }

    setIsProcessing(true);
    
    try {
      const parsedEntries = parseJournalText(text, selectedYear);
      
      if (parsedEntries.length === 0) {
        alert('No journal entries detected. Please check your text format.');
        setIsProcessing(false);
        return;
      }

      setCurrentStep({
        step: 'review',
        data: {
          rawText: text,
          parsedEntries
        }
      });

    } catch (error) {
      console.error('Parse error:', error);
      alert('Error parsing text: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Update a parsed entry - PRESERVED EXACTLY
  const updateParsedEntry = (entryId: string, updates: Partial<ParsedEntry>) => {
    setCurrentStep(prev => ({
      ...prev,
      data: {
        ...prev.data,
        parsedEntries: prev.data.parsedEntries?.map(entry => 
          entry.id === entryId ? { ...entry, ...updates } : entry
        )
      }
    }));
  };

  // Set entry status - PRESERVED EXACTLY
  const setEntryStatus = (entryId: string, status: ParsedEntry['status']) => {
    updateParsedEntry(entryId, { status });
  };

  // Bulk approve all entries - PRESERVED EXACTLY
  const approveAllEntries = () => {
    setCurrentStep(prev => ({
      ...prev,
      data: {
        ...prev.data,
        parsedEntries: prev.data.parsedEntries?.map(entry => ({ ...entry, status: 'approved' }))
      }
    }));
  };

  // ENHANCED: Import approved entries to Supabase (replaces original importEntries)
  const importEntries = async () => {
    const approvedEntries = currentStep.data.parsedEntries?.filter(entry => entry.status === 'approved') || [];
    
    if (approvedEntries.length === 0) {
      alert('No entries approved for import');
      return;
    }

    setIsProcessing(true);
    let backupId: string | null = null;
    let importedIds: string[] = [];
    
    try {
      // Step 1: Check for duplicates
      console.log('🔍 Checking for duplicates...');
      const { duplicates, unique } = await checkForDuplicates(approvedEntries);
      
      if (duplicates.length > 0) {
        const message = `Found ${duplicates.length} potential duplicates:\n\n` +
          duplicates.map(d => `• ${d.entry.detectedDate}: ${d.entry.detectedContent?.substring(0, 50)}...`).join('\n') +
          `\n\nProceed with importing ${unique.length} unique entries only?`;
        
        if (!confirm(message)) {
          setIsProcessing(false);
          return;
        }
      }
      
      const entriesToImport = unique;
      
      // Step 2: Create backup
      console.log('💾 Creating backup...');
      backupId = await createImportBackup(entriesToImport, currentStep.data.rawText || '');

      console.log('🚀 Starting actual Supabase import...');
      console.log('Importing entries:', entriesToImport);
      
      // 🔧 FIXED: Use Clerk user ID from context - no need to get it from Supabase
      if (!clerkUserId) {
        throw new Error('No authenticated user found. Please sign in and try again.');
      }
      
      console.log('✅ Using Clerk user ID:', clerkUserId);
      
      // Get Supabase client once for all imports
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token received');
      }
      
      const supabase = createAuthenticatedSupabaseClient(token, clerkUserId);
      console.log('✅ Supabase client created');
      
      let successful = 0;
      let failed = 0;
      
      // Import each entry to Supabase
      for (const entry of entriesToImport) {
        try {
          // Create the journal entry object with Clerk user ID
          const journalEntry = {
            date: entry.detectedDate,
            user_id: clerkUserId, // 🔧 FIXED: Use Clerk user ID directly
            context_data: {
              content: entry.detectedContent,
              title: `Journal Entry - ${entry.detectedDate}`,
              mood: 'neutral',
              tags: [],
              imported: true,
              import_date: new Date().toISOString(),
              import_backup_id: backupId, // Link to backup for easy rollback
              original_raw_date: entry.rawMatch.dateText,
              original_content_length: entry.detectedContent?.length || 0
            },
            ai_reflection: null
          };
          
          console.log(`📝 Importing entry for ${entry.detectedDate}:`, journalEntry);

          // Insert the journal entry
          const { data, error } = await supabase
            .from('journal_entries')
            .insert([journalEntry])
            .select()
            .single();

          if (error) {
            console.error('❌ Supabase insert error:', error);
            console.error('Error details:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
            throw error;
          }
          
          importedIds.push(data.id);
          successful++;
          console.log(`✅ Successfully imported ${entry.detectedDate}:`, data);
          
        } catch (error) {
          console.error(`❌ Failed to import ${entry.detectedDate}:`, error);
          console.error('Full error object:', error);
          failed++;
        }
      }
      
      // Step 4: Update backup with imported IDs
      if (importedIds.length > 0) {
        await updateBackupWithImportedIds(backupId, importedIds);
      }
      
      // Save selected year to localStorage for next time
      localStorage.setItem('importSelectedYear', selectedYear.toString());
      
      setCurrentStep({
        step: 'complete',
        data: {
          ...currentStep.data,
          importResults: {
            successful,
            failed,
            total: entriesToImport.length,
            duplicatesSkipped: duplicates.length,
            backupId: backupId,
            canRollback: importedIds.length > 0
          }
        }
      });
      
      console.log(`🏁 Import complete: ${successful} successful, ${failed} failed, ${duplicates.length} duplicates skipped`);
      
      // 🔄 NEW: Directly update local state like manual entries do (instead of forceSync)
      if (successful > 0) {
        console.log('🔄 Adding imported entries to local state...');
        
        // Convert approved entries to the proper format that matches your JournalEntry interface
        const newJournalEntries = entriesToImport
          .filter((_, index) => index < successful) // Only successful ones
          .map((entry, index) => ({
            id: importedIds[index],
            date: entry.detectedDate!,
            content: entry.detectedContent!,
            title: `Journal Entry - ${entry.detectedDate}`,
            mood: 'neutral' as const,
            tags: [] as string[],
            ai_reflection: null,
            context_data: {
              imported: true,
              import_date: new Date().toISOString(),
              import_backup_id: backupId,
              original_raw_date: entry.rawMatch.dateText,
              original_content_length: entry.detectedContent?.length || 0
            }
          }));
        
        // Add to existing entries (same pattern as manual entry creation)
        setJournalEntries([...journalEntries, ...newJournalEntries]);
        
        console.log('✅ Local state updated with imported entries');
      }
      
    } catch (error) {
      console.error('Import error:', error);
      
      // Offer rollback if any entries were imported
      if (importedIds.length > 0 && backupId) {
        const shouldRollback = confirm(
          `Import failed after importing ${importedIds.length} entries. ` +
          `Would you like to rollback these entries?`
        );
        
        if (shouldRollback) {
          await rollbackImport(backupId);
        }
      }
      
      alert('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImport = () => {
    setCurrentStep({ step: 'input', data: {} });
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }
  };

  const handleClose = () => {
    // Only show confirmation if we're in the middle of parsing/reviewing
    // Don't show it after successful import (complete step)
    if (currentStep.step !== 'input' && currentStep.step !== 'complete' && !confirm('Are you sure you want to close? All progress will be lost.')) {
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <Upload size={24} className="text-purple-400" />
            <h2 className="text-xl font-bold text-white">Import Journal Data</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-white/60" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Input step */}
          {currentStep.step === 'input' && (
            <div className="space-y-6">
              <div className="text-center">
                <FileText size={48} className="mx-auto text-purple-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Import Your Journal Data</h3>
                <p className="text-white/60 mb-4">
                  Parse tab-separated journal entries from your exported data.
                </p>
                <div className="text-center mb-6">
                  <p className="text-white/60 text-sm mb-2">
                    The format should be:
                  </p>
                  <div className="bg-white/5 rounded-lg p-4 mb-4 text-sm font-mono">
                    <div className="text-green-400">Sun, Jun 1</div>
                    <div className="text-blue-400 mt-1">"Your journal entry content here..."</div>
                    <div className="text-green-400 mt-3">Mon, Jun 2</div>
                    <div className="text-blue-400 mt-1">"Another journal entry..."</div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-white/80 mb-2 block">Journal Text</label>
                  <textarea
                    ref={textareaRef}
                    placeholder="Paste your journal entries here..."
                    className="w-full h-96 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none focus:outline-none focus:border-purple-500/50"
                  />
                  <p className="text-xs text-white/50 mt-2">
                    Supports massive amounts of text. Paste multiple months or years at once.
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-white/60">
                    Ready to parse entries for <span className="text-purple-400 font-semibold">{selectedYear}</span>
                  </div>
                  <button
                    onClick={handleParseText}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-white/50 rounded-lg text-white font-medium transition-colors"
                  >
                    {isProcessing ? 'Parsing...' : 'Parse Text'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Review step */}
          {currentStep.step === 'review' && (
            <div className="space-y-6">
              <Card variant="default" padding="lg">
                <div className="text-center mb-6">
                  <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Review Parsed Entries</h3>
                  <p className="text-white/60">
                    Found {currentStep.data.parsedEntries?.length || 0} potential journal entries for {selectedYear}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 justify-center mb-6">
                  <div className="bg-green-500/20 rounded-lg px-4 py-2">
                    <span className="text-green-400 font-medium">
                      {currentStep.data.parsedEntries?.filter(e => e.status === 'approved').length || 0} Approved
                    </span>
                  </div>
                  <div className="bg-yellow-500/20 rounded-lg px-4 py-2">
                    <span className="text-yellow-400 font-medium">
                      {currentStep.data.parsedEntries?.filter(e => e.status === 'needs_review').length || 0} Need Review
                    </span>
                  </div>
                  <div className="bg-red-500/20 rounded-lg px-4 py-2">
                    <span className="text-red-400 font-medium">
                      {currentStep.data.parsedEntries?.filter(e => e.status === 'rejected').length || 0} Rejected
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 justify-center mb-6">
                  <button
                    onClick={approveAllEntries}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    Approve All
                  </button>
                  <button
                    onClick={() => setCurrentStep({ step: 'input', data: {} })}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white/80 text-sm transition-colors"
                  >
                    Back to Edit
                  </button>
                  <button
                    onClick={importEntries}
                    disabled={isProcessing || !currentStep.data.parsedEntries?.some(e => e.status === 'approved')}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Database size={16} />
                        {isProcessing ? 'Importing...' : 'Import Approved'}
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {currentStep.data.parsedEntries?.map((entry) => (
                    <Card key={entry.id} variant="default" padding="md">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              entry.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                              entry.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {entry.confidence} confidence
                            </span>
                            <span className="text-xs text-white/40">
                              {entry.detectedContent?.length || 0} characters
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="text-xs text-white/60 mb-1 block">Detected Date ({selectedYear})</label>
                              <div className="text-sm text-white/80 bg-white/5 px-3 py-2 rounded font-mono">
                                {entry.detectedDate || 'No date detected'}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-white/60 mb-1 block">Status</label>
                              <select
                                value={entry.status}
                                onChange={(e) => setEntryStatus(entry.id, e.target.value as ParsedEntry['status'])}
                                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                              >
                                <option value="approved" className="bg-gray-800">Approved</option>
                                <option value="needs_review" className="bg-gray-800">Needs Review</option>
                                <option value="rejected" className="bg-gray-800">Rejected</option>
                              </select>
                            </div>
                          </div>

                          <div className="mb-3">
                            <label className="text-xs text-white/60 mb-1 block">Content Preview</label>
                            <div className="text-sm text-white/80 bg-white/5 px-3 py-2 rounded max-h-20 overflow-y-auto">
                              {entry.detectedContent || 'No content detected'}
                            </div>
                          </div>

                          {entry.issues.length > 0 && (
                            <div className="mb-3">
                              <label className="text-xs text-white/60 mb-1 block">Issues Found</label>
                              <div className="space-y-1">
                                {entry.issues.map((issue, index) => (
                                  <div key={index} className="flex items-center gap-2 text-xs text-yellow-400">
                                    <AlertCircle size={12} />
                                    {issue}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <details className="group">
                            <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 transition-colors">
                              View Raw Data
                            </summary>
                            <div className="mt-2 p-2 bg-black/20 rounded text-xs font-mono">
                              <div className="text-white/60">Date Text: <span className="text-white/80">"{entry.rawMatch.dateText}"</span></div>
                              <div className="text-white/60">Content Text: <span className="text-white/80">"{entry.rawMatch.contentText.substring(0, 100)}..."</span></div>
                            </div>
                          </details>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setEntryStatus(entry.id, 'approved')}
                            className={`p-2 rounded transition-colors ${
                              entry.status === 'approved' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            }`}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => setEntryStatus(entry.id, 'rejected')}
                            className={`p-2 rounded transition-colors ${
                              entry.status === 'rejected' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            }`}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Complete step */}
          {currentStep.step === 'complete' && (
            <Card variant="default" padding="lg">
              <div className="text-center">
                <CheckCircle size={64} className="mx-auto text-green-400 mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">Import Complete!</h3>
                <p className="text-white/60 mb-6">
                  Successfully imported {currentStep.data.importResults?.successful || 0} journal entries for {selectedYear}.
                  {currentStep.data.importResults?.duplicatesSkipped ? ` Skipped ${currentStep.data.importResults.duplicatesSkipped} duplicates.` : ''}
                </p>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-green-500/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">{currentStep.data.importResults?.successful || 0}</div>
                    <div className="text-green-200 text-sm">Successful</div>
                  </div>
                  <div className="bg-red-500/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-400">{currentStep.data.importResults?.failed || 0}</div>
                    <div className="text-red-200 text-sm">Failed</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">{currentStep.data.importResults?.total || 0}</div>
                    <div className="text-white/60 text-sm">Total</div>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  {currentStep.data.importResults?.canRollback && (
                    <button
                      onClick={() => {
                        if (currentStep.data.importResults?.backupId) {
                          rollbackImport(currentStep.data.importResults.backupId);
                        }
                      }}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                    >
                      <RotateCcw size={16} />
                      Rollback Import
                    </button>
                  )}
                  <button
                    onClick={resetImport}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
                  >
                    Import More Data
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white/80 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataImportModal;