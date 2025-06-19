import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, File, Calendar, Trash2 } from 'lucide-react';
import { PDFParser, ParsedPDFData } from '../../utils/pdfParser';
import { useAppContext, DataImport, JournalEntry } from '../../context/AppContext';
import { formatDate, parseDateString } from '../../utils/dateUtils';

interface ImportProgress {
  total: number;
  processed: number;
  errors: string[];
  status: 'idle' | 'parsing' | 'processing' | 'complete' | 'error';
  parsedData?: ParsedPDFData;
}

const DataImportComponent: React.FC = () => {
  const {
    dataImports,
    setDataImports,
    setJournalEntries,
    journalEntries,
    selectedDate,
    setSelectedDate,
    settings
  } = useAppContext();

  const [importProgress, setImportProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    errors: [],
    status: 'idle'
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportProgress({
        total: 0,
        processed: 0,
        errors: [],
        status: 'parsing'
      });

      let data: any;
      let fileType: 'pdf' | 'json';

      if (file.type === 'application/pdf') {
        fileType = 'pdf';
        const parsedData = await PDFParser.parsePDF(file);
        setImportProgress(prev => ({ ...prev, parsedData }));
        data = parsedData;
      } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
        fileType = 'json';
        const text = await file.text();
        data = JSON.parse(text);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or JSON file.');
      }

      setImportProgress(prev => ({ ...prev, status: 'processing' }));
      await importData(data, file.name, fileType);
    } catch (error: any) {
      console.error('Error reading file:', error);
      setImportProgress(prev => ({
        ...prev,
        status: 'error',
        errors: [error.message || 'Failed to read file. Please ensure it\'s a valid PDF or JSON file.']
      }));
    }
  };

  const importData = async (data: any, fileName: string, fileType: 'pdf' | 'json') => {
    const errors: string[] = [];
    let totalItems = 0;
    let processedItems = 0;

    const importedItems = {
      journalEntries: 0,
      habits: 0,
      climbingSessions: 0
    };

    const isSimpleJournalArray = Array.isArray(data) && data[0]?.date && data[0]?.entry;

    const entries = isSimpleJournalArray
      ? data
      : Array.isArray(data.journalEntries)
      ? data.journalEntries
      : [];

    totalItems = entries.length;
    setImportProgress(prev => ({ ...prev, total: totalItems }));

    const newJournalEntries = [...journalEntries];
    let earliestDate = new Date().toISOString().split('T')[0];
    let latestDate = new Date().toISOString().split('T')[0];

    for (const entry of entries) {
      try {
        const parsedDate = parseDateString(entry.date, 2025);
        if (!parsedDate) throw new Error(`Could not parse date "${entry.date}"`);

        const newEntry: JournalEntry = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          date: parsedDate,
          content: entry.entry || entry.content || '',
          habits: {
            hangboard: false,
            eatingOut: false,
            outreach: false,
            coldShower: false,
            techUsage: false,
            porn: false,
            climbing: false,
          },
          wakeTime: '07:00',
          sleepTime: '23:00',
          dayRating: 3,
          miles: 0,
          meals: '',
          climbed: false,
          sends: { V6: 0, V7: 0, V8: 0, V9: 0, V10: 0 },
        };

        const exists = newJournalEntries.find(e => e.date === parsedDate);
        if (!exists) {
          newJournalEntries.push(newEntry);
          importedItems.journalEntries++;

          if (parsedDate < earliestDate) earliestDate = parsedDate;
          if (parsedDate > latestDate) latestDate = parsedDate;
        }

        processedItems++;
      } catch (error: any) {
        errors.push(`Failed to import journal entry for ${entry.date}: ${error.message}`);
      }

      setImportProgress(prev => ({ ...prev, processed: processedItems }));
    }

    setJournalEntries(newJournalEntries);

    const importRecord: DataImport = {
      id: Date.now().toString(),
      fileName,
      fileType,
      uploadDate: new Date().toISOString(),
      status: errors.length > 0 ? 'error' : 'completed',
      itemsImported: importedItems,
      dateRange: {
        start: earliestDate,
        end: latestDate
      },
      errors: errors.length > 0 ? errors : undefined
    };

    setDataImports(prev => [importRecord, ...prev]);
    setImportProgress(prev => ({
      ...prev,
      status: errors.length > 0 ? 'error' : 'complete',
      errors
    }));
  };

  const resetImport = () => {
    setImportProgress({
      total: 0,
      processed: 0,
      errors: [],
      status: 'idle'
    });
  };

  const deleteImport = (importId: string) => {
    if (confirm('Are you sure you want to delete this import record? This will not affect the imported data.')) {
      setDataImports(prev => prev.filter(imp => imp.id !== importId));
    }
  };

  const jumpToDate = (date: string) => {
    setSelectedDate(new Date(date));
  };

  const renderParsedDataPreview = () => {
    if (!importProgress.parsedData) return null;

    const { journalEntries, habits, climbingSessions } = importProgress.parsedData;

    return (
      <div className={`rounded-lg p-4 mb-4 ${
        settings.darkMode ? 'bg-blue-900/20' : 'bg-blue-50'
      }`}>
        <h4 className={`font-medium mb-2 ${
          settings.darkMode ? 'text-blue-200' : 'text-blue-800'
        }`}>
          PDF Parsing Results:
        </h4>
        <div className={`text-sm space-y-1 ${
          settings.darkMode ? 'text-blue-300' : 'text-blue-700'
        }`}>
          <p>• {journalEntries.length} journal entries found</p>
          <p>• {habits.length} habits detected</p>
          <p>• {climbingSessions.length} climbing sessions identified</p>
        </div>
        {journalEntries.length === 0 && habits.length === 0 && climbingSessions.length === 0 && (
          <p className={`text-sm mt-2 ${
            settings.darkMode ? 'text-orange-400' : 'text-orange-600'
          }`}>
            No structured data found. The PDF may need manual formatting or contain unrecognized patterns.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl p-6 ${
        settings.darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Import Historical Data
        </h3>

        {importProgress.status === 'idle' && (
          <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
            settings.darkMode ? 'border-gray-600' : 'border-gray-300'
          }`}>
            <Upload size={48} className={`mx-auto mb-4 ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-400'
            }`} />
            <p className={`mb-4 ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Upload your historical data as a PDF or JSON file
            </p>
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              <File size={16} className="mr-2" />
              Choose File
              <input
                type="file"
                accept=".pdf,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <div className={`mt-4 text-xs space-y-1 ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <p><strong>PDF:</strong> Automatically extracts journal entries, habits, and climbing data</p>
              <p><strong>JSON:</strong> Structured data import for journal entries, habits, and climbing sessions</p>
            </div>
          </div>
        )}

        {importProgress.status === 'parsing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={settings.darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Parsing file and extracting data...
            </p>
          </div>
        )}

        {importProgress.status === 'processing' && (
          <div className="text-center">
            {renderParsedDataPreview()}
            <div className="mb-4">
              <div className={`w-full h-2 rounded-full ${
                settings.darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
            <p className={settings.darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Importing data... {importProgress.processed} of {importProgress.total} items processed
            </p>
          </div>
        )}

        {importProgress.status === 'complete' && (
          <div className="text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <p className={`font-medium mb-2 ${
              settings.darkMode ? 'text-green-400' : 'text-green-600'
            }`}>
              Import completed successfully!
            </p>
            <p className={`mb-4 ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {importProgress.processed} items imported and added to your calendar.
            </p>
            <button
              onClick={resetImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import More Data
            </button>
          </div>
        )}

        {importProgress.status === 'error' && (
          <div className="text-center">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <p className={`font-medium mb-2 ${
              settings.darkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              Import completed with errors
            </p>
            <p className={`mb-4 ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {importProgress.processed} of {importProgress.total} items imported successfully
            </p>
            {importProgress.errors.length > 0 && (
              <div className={`rounded-lg p-4 mb-4 text-left ${
                settings.darkMode ? 'bg-red-900/20' : 'bg-red-50'
              }`}>
                <h4 className={`font-medium mb-2 ${
                  settings.darkMode ? 'text-red-200' : 'text-red-800'
                }`}>
                  Errors:
                </h4>
                <ul className={`text-sm space-y-1 ${
                  settings.darkMode ? 'text-red-300' : 'text-red-700'
                }`}>
                  {importProgress.errors.slice(0, 5).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {importProgress.errors.length > 5 && (
                    <li>• ... and {importProgress.errors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            )}
            <button
              onClick={resetImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Import History */}
      {dataImports.length > 0 && (
        <div className={`rounded-2xl p-6 ${
          settings.darkMode 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${
            settings.darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Import History
          </h3>
          
          <div className="space-y-3">
            {dataImports.map((importRecord) => (
              <div
                key={importRecord.id}
                className={`p-4 rounded-lg transition-colors ${
                  settings.darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={16} className={
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      } />
                      <span className={`font-medium ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {importRecord.fileName}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        importRecord.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {importRecord.status}
                      </span>
                    </div>
                    <div className={`text-sm ${
                      settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {importRecord.itemsImported.journalEntries} journal entries • 
                      {new Date(importRecord.uploadDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => jumpToDate(importRecord.dateRange.start)}
                        className={`text-xs flex items-center gap-1 hover:underline ${
                          settings.darkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}
                      >
                        <Calendar size={12} />
                        Jump to {formatDate(new Date(importRecord.dateRange.start))}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteImport(importRecord.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {importRecord.errors && importRecord.errors.length > 0 && (
                  <div className={`mt-3 p-3 rounded text-sm ${
                    settings.darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'
                  }`}>
                    <details>
                      <summary className="cursor-pointer font-medium">
                        {importRecord.errors.length} errors occurred
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {importRecord.errors.slice(0, 3).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {importRecord.errors.length > 3 && (
                          <li>• ... and {importRecord.errors.length - 3} more</li>
                        )}
                      </ul>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataImportComponent;