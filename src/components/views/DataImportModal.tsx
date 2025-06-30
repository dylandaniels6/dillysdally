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
    importResults?: any;
  };
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

  // Parse date with year injection
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

  // SIMPLE: Just clean quotes and return ALL content
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

  // Helper function to create entries consistently
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

  // HYBRID APPROACH: Handle tab-separated dates + collect all content until next date
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

  // Handle text parsing
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

  // Update a parsed entry
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

  // Set entry status
  const setEntryStatus = (entryId: string, status: ParsedEntry['status']) => {
    updateParsedEntry(entryId, { status });
  };

  // Bulk approve all entries
  const approveAllEntries = () => {
    setCurrentStep(prev => ({
      ...prev,
      data: {
        ...prev.data,
        parsedEntries: prev.data.parsedEntries?.map(entry => ({ ...entry, status: 'approved' }))
      }
    }));
  };

  // Import approved entries to Supabase
  const importEntries = async () => {
    const approvedEntries = currentStep.data.parsedEntries?.filter(entry => entry.status === 'approved') || [];
    
    if (approvedEntries.length === 0) {
      alert('No entries approved for import');
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('🚀 Starting actual Supabase import...');
      console.log('Importing entries:', approvedEntries);
      
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
      for (const entry of approvedEntries) {
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
          
          successful++;
          console.log(`✅ Successfully imported ${entry.detectedDate}:`, data);
          
        } catch (error) {
          console.error(`❌ Failed to import ${entry.detectedDate}:`, error);
          console.error('Full error object:', error);
          failed++;
        }
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
            total: approvedEntries.length
          }
        }
      });
      
      console.log(`🏁 Import complete: ${successful} successful, ${failed} failed`);
      
      // 🔄 NEW: Directly update local state like manual entries do (instead of forceSync)
      if (successful > 0) {
        console.log('🔄 Adding imported entries to local state...');
        
        // Convert approved entries to the proper format that matches your JournalEntry interface
        const newJournalEntries = approvedEntries.map(entry => ({
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
          date: entry.detectedDate!,
          content: entry.detectedContent!,
          title: `Journal Entry - ${entry.detectedDate}`,
          mood: 'neutral' as const,
          tags: [] as string[],
          ai_reflection: null,
          context_data: {
            imported: true,
            import_date: new Date().toISOString(),
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
    resetImport();
    onClose();
  };

  // Load saved year on mount
  React.useEffect(() => {
    const savedYear = localStorage.getItem('importSelectedYear');
    if (savedYear && !isNaN(parseInt(savedYear))) {
      setSelectedYear(parseInt(savedYear));
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Type className="text-purple-400" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white">Import Journal Text</h2>
              <p className="text-sm text-white/60">Paste your journal entries directly from Google Sheets</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="text-white/60" size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Year Selection - Always visible */}
          <Card variant="gradient" padding="md" className="mb-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white mb-1">Target Year</h3>
                <p className="text-sm text-white/60">Select which year these journal entries belong to</p>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
              >
                {availableYears.map(year => (
                  <option key={year} value={year} className="bg-gray-900">
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Input step */}
          {currentStep.step === 'input' && (
            <Card variant="default" padding="lg">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Paste Your Journal Text</h3>
                  <p className="text-white/60 mb-4">
                    Copy your journal entries from Google Sheets and paste them below.
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
                    {isProcessing ? 'Parsing...' : 'Parse Entries'}
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Review step */}
          {currentStep.step === 'review' && (
            <div className="space-y-6">
              {/* JSON Preview */}
              <Card variant="gradient" padding="md" className="bg-gradient-to-r from-blue-500/20 to-purple-500/20">
                <h3 className="text-lg font-semibold text-white mb-2">📊 Parsed JSON Structure</h3>
                <details className="mb-4">
                  <summary className="cursor-pointer text-blue-300 hover:text-blue-200">
                    View Raw JSON Data ({currentStep.data.parsedEntries?.length || 0} entries)
                  </summary>
                  <pre className="mt-2 p-4 bg-black/50 rounded-lg text-xs text-green-300 overflow-auto max-h-64">
                    {JSON.stringify(
                      currentStep.data.parsedEntries?.map(entry => ({
                        date: entry.detectedDate,
                        contentLength: entry.detectedContent?.length || 0,
                        content: entry.detectedContent?.substring(0, 200) + '...',
                        confidence: entry.confidence
                      })), 
                      null, 
                      2
                    )}
                  </pre>
                </details>
              </Card>

              <Card variant="default" padding="lg">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Review Parsed Entries</h3>
                    <p className="text-white/60">
                      Found {currentStep.data.parsedEntries?.length || 0} journal entries for {selectedYear}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={approveAllEntries}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm transition-colors"
                    >
                      Approve All
                    </button>
                    <button
                      onClick={importEntries}
                      disabled={isProcessing}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-white/50 rounded-lg text-white font-medium transition-colors"
                    >
                      {isProcessing ? 'Importing...' : 'Import Approved'}
                    </button>
                  </div>
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
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="needs_review">Needs Review</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </div>
                          </div>

                          <div className="mb-3">
                            <label className="text-xs text-white/60 mb-1 block">
                              Full Journal Content 
                              <span className="text-white/40">({entry.detectedContent?.split('\n').length || 0} lines)</span>
                            </label>
                            <div className="bg-white/5 rounded p-3 max-h-40 overflow-y-auto">
                              <div className="text-sm text-white/80 whitespace-pre-wrap font-mono leading-relaxed">
                                {entry.detectedContent || 'No content detected'}
                              </div>
                            </div>
                          </div>

                          {entry.issues.length > 0 && (
                            <div className="mb-3">
                              <label className="text-xs text-red-400 mb-1 block">Issues Detected</label>
                              <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                                {entry.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
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