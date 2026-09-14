import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Download } from 'lucide-react';

interface WardSummary {
  wardName: string;
  totalPUs: number;
  submittedPUs: number;
  totalVotes: number;
}

export function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await user?.getIdToken();
        const res = await fetch('/api/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading) return <div className="p-8 text-slate-500">Loading reports...</div>;

  const totalValidVotes = stats?.aggregatedVotes?.totalValidVotes || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Election Reports</h1>
          <p className="mt-2 text-sm text-slate-500">Official collation summaries and exportable data.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export / Print PDF
        </button>
      </div>

      <div className="bg-white p-10 md:p-14 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0" id="printable-report">
        <div className="text-center mb-10 pb-10 border-b border-slate-200">
          <h2 className="text-2xl font-extrabold uppercase text-slate-900 tracking-wider">Soba LGA Election Collation Report</h2>
          <p className="text-slate-600 mt-3 font-medium">Kaduna State, Nigeria</p>
          <p className="text-sm font-semibold text-slate-400 mt-4">Generated on: {new Date().toLocaleString()}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Wards</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.totalWards || 0}</p>
          </div>
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Polling Units</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.totalPUs || 0}</p>
          </div>
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Votes Cast</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.aggregatedVotes?.totalVotesCast?.toLocaleString() || 0}</p>
          </div>
          <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
            <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">Valid Votes</p>
            <p className="text-3xl font-bold text-emerald-900 mt-2">{totalValidVotes.toLocaleString()}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 tracking-tight">Candidate Performance (Verified Results)</h3>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
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
                {stats?.candidateTotals && stats.candidateTotals.length > 0 ? (
                  stats.candidateTotals.sort((a: any, b: any) => b.totalVotes - a.totalVotes).map((ct: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-slate-900">{ct.partyAbbr}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">{ct.candidateName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">{ct.totalVotes.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600 text-right">
                        {totalValidVotes > 0 ? ((ct.totalVotes / totalValidVotes) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm font-medium text-slate-500">
                      No verified results available for reporting.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-20 pt-10 border-t border-slate-200 grid grid-cols-2 gap-12 text-center print:flex print:justify-between print:mt-16">
          <div className="print:w-1/3">
            <div className="border-b-2 border-slate-800 w-full mx-auto mb-3 mt-12"></div>
            <p className="text-sm font-bold text-slate-800 uppercase tracking-wider">Electoral Officer</p>
            <p className="text-xs text-slate-500 mt-1">Signature & Date</p>
          </div>
          <div className="print:w-1/3">
            <div className="border-b-2 border-slate-800 w-full mx-auto mb-3 mt-12"></div>
            <p className="text-sm font-bold text-slate-800 uppercase tracking-wider">Returning Officer</p>
            <p className="text-xs text-slate-500 mt-1">Signature & Date</p>
          </div>
        </div>
      </div>
    </div>
  );
}
