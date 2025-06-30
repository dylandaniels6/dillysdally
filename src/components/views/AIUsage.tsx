import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Brain, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';
import { Card } from '../common/Card';
import { useAppContext } from '../../context/AppContext';

interface UsageStats {
  function_name: string;
  total_calls: number;
  total_tokens: number;
  total_cost: number;
}

const AIUsage: React.FC = () => {
  const { settings } = useAppContext();
  const [usage, setUsage] = useState<UsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    loadUsageStats();
  }, [timeRange]);

  const loadUsageStats = async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // First, let's check if the table exists and has data
      const { data: testData, error: testError } = await supabase
        .from('ai_usage')
        .select('*')
        .limit(5);

      console.log('Test query:', { testData, testError });

      // If table doesn't exist, show a message
      if (testError?.message?.includes('relation') || testError?.message?.includes('does not exist')) {
        console.error('ai_usage table does not exist. Please run the migration.');
        setUsage([]);
        setLoading(false);
        return;
      }

      // Now get the aggregated stats
      const { data, error } = await supabase
        .from('ai_usage')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.error('Failed to load usage stats:', error);
        setUsage([]);
        return;
      }

      // Aggregate the data manually since Supabase doesn't support aggregate functions in select
      const aggregated = data?.reduce((acc: Record<string, UsageStats>, row) => {
        const fn = row.function_name;
        if (!acc[fn]) {
          acc[fn] = {
            function_name: fn,
            total_calls: 0,
            total_tokens: 0,
            total_cost: 0,
          };
        }
        acc[fn].total_calls += 1;
        acc[fn].total_tokens += row.total_tokens || 0;
        acc[fn].total_cost += row.cost_estimate || 0;
        return acc;
      }, {}) || {};

      setUsage(Object.values(aggregated));
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      setUsage([]);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = usage.reduce((sum, u) => sum + u.total_cost, 0);
  const totalTokens = usage.reduce((sum, u) => sum + u.total_tokens, 0);
  const totalCalls = usage.reduce((sum, u) => sum + u.total_calls, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500/60 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading usage stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-white">AI Usage Analytics</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={loadUsageStats}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={18} className="text-white/60" />
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="gradient" padding="lg" className="bg-gradient-to-br from-purple-500/20 to-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Total Calls</p>
              <p className="text-3xl font-bold text-white">{totalCalls.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Brain className="text-purple-400" size={28} />
            </div>
          </div>
        </Card>

        <Card variant="gradient" padding="lg" className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Tokens Used</p>
              <p className="text-3xl font-bold text-white">{totalTokens.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <TrendingUp className="text-blue-400" size={28} />
            </div>
          </div>
        </Card>

        <Card variant="gradient" padding="lg" className="bg-gradient-to-br from-green-500/20 to-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Total Cost</p>
              <p className="text-3xl font-bold text-white">${totalCost.toFixed(4)}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-xl">
              <DollarSign className="text-green-400" size={28} />
            </div>
          </div>
        </Card>
      </div>

      {/* No data message */}
      {usage.length === 0 && (
        <Card variant="default" padding="lg">
          <div className="text-center py-12">
            <Brain size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/60 mb-2">No usage data yet</p>
            <p className="text-sm text-white/40">
              AI usage will appear here once you start using the AI features.
            </p>
            <p className="text-xs text-white/30 mt-4">
              Last checked: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
        </Card>
      )}

      {/* Usage Chart */}
      {usage.length > 0 && (
        <Card variant="default" padding="lg">
          <h4 className="text-lg font-semibold text-white mb-6">Usage by Function</h4>
          <div className="w-full overflow-x-auto">
            <BarChart width={Math.max(600, usage.length * 150)} height={300} data={usage}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="function_name" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="total_calls" fill="#8b5cf6" name="Calls" radius={[8, 8, 0, 0]} />
              <Bar dataKey="total_cost" fill="#10b981" name="Cost ($)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </div>
        </Card>
      )}

      {/* Detailed Table */}
      {usage.length > 0 && (
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h4 className="text-lg font-semibold text-white">Detailed Breakdown</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Function
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Avg Tokens/Call
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {usage.map((stat) => (
                  <tr key={stat.function_name} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-white">
                      {stat.function_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-white/80">
                      {stat.total_calls.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-white/80">
                      {stat.total_tokens.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-white/80">
                      {stat.total_calls > 0 ? Math.round(stat.total_tokens / stat.total_calls) : 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-400">
                      ${stat.total_cost.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AIUsage;