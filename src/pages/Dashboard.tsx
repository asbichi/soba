import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';

interface StatsData {
  totalWards: number;
  totalPUs: number;
  resultsStats: { status: string; count: number }[];
  aggregatedVotes: { totalVotesCast: number; totalValidVotes: number };
  candidateTotals: { partyAbbr: string; candidateName: string; totalVotes: number }[];
  wardTotals?: { wardName: string; partyAbbr: string; totalVotes: number }[];
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = await user?.getIdToken();
        const res = await fetch('/api/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  const resultsStats = Array.isArray(stats?.resultsStats) ? stats.resultsStats : [];
  const candidateTotals = Array.isArray(stats?.candidateTotals) ? stats.candidateTotals : [];
  const wardTotals = Array.isArray(stats?.wardTotals) ? stats.wardTotals : [];

  const resultsReceived = resultsStats.filter(s => s.status !== 'PENDING').reduce((acc, curr) => acc + Number(curr.count || 0), 0) || 0;
  const resultsVerified = resultsStats.find(s => s.status === 'VERIFIED')?.count || 0;
  const resultsPending = resultsStats.find(s => s.status === 'PENDING')?.count || 0;
  const resultsRejected = resultsStats.find(s => s.status === 'REJECTED')?.count || 0;
  
  const percentageReceived = stats?.totalPUs ? Math.round((resultsReceived / stats.totalPUs) * 100) : 0;
  const totalValidVotes = stats?.aggregatedVotes?.totalValidVotes || 0;

  // Prepare chart data
  const chartDataMap: Record<string, any> = {};
  if (wardTotals.length > 0) {
    wardTotals.forEach(row => {
      if (!chartDataMap[row.wardName]) {
        chartDataMap[row.wardName] = { name: row.wardName };
      }
      chartDataMap[row.wardName][row.partyAbbr] = Number(row.totalVotes);
    });
  }
  const chartData = Object.values(chartDataMap);

  // Get Top 5 Parties by overall votes for the chart
  const sortedParties = [...candidateTotals]
    .sort((a, b) => Number(b.totalVotes || 0) - Number(a.totalVotes || 0))
    .map(c => c.partyAbbr)
    .slice(0, 5);

  const colors = ["#1e40af", "#dc2626", "#15803d", "#d97706", "#7e22ce"];


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-[#484848] tracking-tight">Live Collation Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">Real-time vote aggregation and verification monitor.</p>
        </div>
        <span className="px-4 py-1.5 text-xs font-bold text-green-800 bg-green-100 rounded-full border border-green-200 shadow-sm">
          LIVE COLLATION ACTIVE
        </span>
      </div>
      
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#484848] tracking-wide">Results Received: {resultsReceived} / {stats?.totalPUs || 0} Polling Units</span>
          <span className="text-lg font-bold text-[#5cb85c]">{percentageReceived}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className="bg-[#5cb85c] h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentageReceived}%` }}></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Wards" value={stats?.totalWards || 0} />
        <StatCard title="Total Polling Units" value={stats?.totalPUs || 0} />
        <StatCard title="Results Received" value={resultsReceived} subtext={`${percentageReceived}%`} />
        <StatCard title="Results Verified" value={resultsVerified} />
        <StatCard title="Results Pending" value={resultsPending} />
        <StatCard title="Results Rejected" value={resultsRejected} />
        <StatCard title="Total Votes Cast" value={stats?.aggregatedVotes?.totalVotesCast || 0} />
        <StatCard title="Total Valid Votes" value={totalValidVotes} colorClass="bg-green-50 border-green-100 text-[#484848]" />
      </div>

      {chartData.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6 tracking-tight">Ward Performance</h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} angle={-45} textAnchor="end" height={60} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => val.toLocaleString()} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {sortedParties.map((partyAbbr, idx) => (
                  <Bar key={partyAbbr} dataKey={partyAbbr} fill={colors[idx % colors.length]} radius={[6, 6, 0, 0]} maxBarSize={60} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4 tracking-tight">Soba LGA Results Matrix</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Party</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Votes</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">% of Valid Votes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {candidateTotals.length > 0 ? (
                [...candidateTotals].sort((a, b) => b.totalVotes - a.totalVotes).map((ct, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{ct.partyAbbr}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{ct.candidateName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">{ct.totalVotes.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                      {totalValidVotes > 0 ? ((ct.totalVotes / totalValidVotes) * 100).toFixed(2) : 0}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                    No verified results yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtext, colorClass = "bg-white border-slate-200" }: { title: string, value: string | number, subtext?: string, colorClass?: string }) {
  return (
    <div className={clsx("p-6 rounded-2xl border shadow-sm transition-shadow hover:shadow-md flex flex-col justify-between", colorClass)}>
      <span className={clsx("text-sm font-semibold uppercase tracking-wider", colorClass.includes('text-[#484848]') ? "" : "text-slate-500")}>{title}</span>
      <div className="mt-4 flex items-baseline gap-2">
        <span className={clsx("text-3xl font-bold", colorClass.includes('text-[#484848]') ? "" : "text-[#484848]")}>{value.toLocaleString()}</span>
        {subtext && <span className="text-sm font-medium text-slate-400">{subtext}</span>}
      </div>
    </div>
  );
}
