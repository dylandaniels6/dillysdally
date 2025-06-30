// src/components/admin/VerifyUserIsolation.tsx

import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { createClerkSupabaseClient } from '../lib/supabase';

export default function VerifyUserIsolation() {
  const { isSignedIn, userId, getToken } = useAuth();
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runVerification = async () => {
    if (!isSignedIn || !userId) {
      setError('Please sign in to run verification');
      return;
    }

    setLoading(true);
    setError(null);
    const verificationResults: any = {};

    try {
      // Get authenticated Supabase client
      const supabase = await createClerkSupabaseClient(getToken, userId);
      
      // Test 1: Check current user ID
      verificationResults.currentUserId = userId;
      
      // Test 2: Count journal entries
      const { count: journalCount, error: journalError } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true });
      
      if (journalError) {
        verificationResults.journalEntries = `Error: ${journalError.message}`;
      } else {
        verificationResults.journalEntries = `Found ${journalCount || 0} entries`;
      }
      
      // Test 3: Try to query without user_id filter (RLS should handle this)
      const { data: allEntries, error: allError } = await supabase
        .from('journal_entries')
        .select('id, user_id, date')
        .limit(5);
      
      if (allError) {
        verificationResults.rlsTest = `RLS Error (good!): ${allError.message}`;
      } else {
        // Check if all returned entries belong to current user
        const otherUserEntries = allEntries?.filter(e => e.user_id !== userId) || [];
        if (otherUserEntries.length > 0) {
          verificationResults.rlsTest = `❌ FAILED: Found ${otherUserEntries.length} entries from other users!`;
          verificationResults.rlsDetails = otherUserEntries;
        } else {
          verificationResults.rlsTest = `✅ PASSED: All ${allEntries?.length || 0} entries belong to current user`;
        }
      }
      
      // Test 4: Check other tables
      const tables = ['habits', 'expenses', 'climbing_sessions', 'ai_analysis_summaries'];
      for (const table of tables) {
        const { count, error: tableError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (tableError) {
          verificationResults[table] = `Error: ${tableError.message}`;
        } else {
          verificationResults[table] = `Found ${count || 0} records`;
        }
      }
      
      // Test 5: Try to insert without user_id (should fail or auto-populate)
      const testEntry = {
        date: new Date().toISOString().split('T')[0],
        context_data: {
          title: 'Isolation Test Entry',
          content: 'This is a test to verify user isolation',
          mood: 'neutral',
          tags: ['test']
        },
        ai_reflection: null
      };
      
      const { error: insertError } = await supabase
        .from('journal_entries')
        .insert([testEntry]);
      
      if (insertError) {
        verificationResults.insertTest = `✅ Insert without user_id failed (good!): ${insertError.message}`;
      } else {
        verificationResults.insertTest = '❌ Insert without user_id succeeded - this is a security issue!';
      }
      
      // Test 6: Try to insert with correct user_id
      const { error: insertError2 } = await supabase
        .from('journal_entries')
        .insert([{ ...testEntry, user_id: userId }]);
      
      if (insertError2) {
        verificationResults.insertWithUserIdTest = `Error: ${insertError2.message}`;
      } else {
        verificationResults.insertWithUserIdTest = '✅ Insert with correct user_id succeeded';
        
        // Clean up test entry
        await supabase
          .from('journal_entries')
          .delete()
          .eq('context_data->title', 'Isolation Test Entry')
          .eq('user_id', userId);
      }
      
      setResults(verificationResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">User Isolation Verification</h2>
      
      {!isSignedIn ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Please sign in to run the verification tests.
        </div>
      ) : (
        <>
          <button
            onClick={runVerification}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? 'Running Tests...' : 'Run Verification'}
          </button>
          
          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              Error: {error}
            </div>
          )}
          
          {Object.keys(results).length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Verification Results:</h3>
              
              <div className="bg-gray-100 p-4 rounded space-y-2">
                {Object.entries(results).map(([key, value]) => (
                  <div key={key} className="border-b border-gray-300 pb-2 last:border-0">
                    <span className="font-semibold">{key}:</span>{' '}
                    {typeof value === 'object' ? (
                      <pre className="text-sm bg-white p-2 rounded mt-1">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <span className={value.includes('❌') ? 'text-red-600' : value.includes('✅') ? 'text-green-600' : ''}>
                        {value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-blue-100 rounded">
                <h4 className="font-semibold mb-2">What to look for:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All entries should belong to the current user (no entries from other users)</li>
                  <li>Insert without user_id should fail (RLS enforcement)</li>
                  <li>Insert with correct user_id should succeed</li>
                  <li>No errors when querying your own data</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}