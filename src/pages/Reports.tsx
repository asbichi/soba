import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Download, Search, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';

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
  const [searchQuery, setSearchQuery] = useState('');

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
  const candidateTotals = Array.isArray(stats?.candidateTotals) ? stats.candidateTotals : [];

  // Filter candidate totals based on search
  const filteredCandidates = candidateTotals.filter((ct: any) => {
    const q = searchQuery.toLowerCase();
    return (ct?.partyAbbr || '').toLowerCase().includes(q) || (ct?.candidateName || '').toLowerCase().includes(q);
  }).sort((a: any, b: any) => Number(b.totalVotes || 0) - Number(a.totalVotes || 0));

  const handleExportCsv = () => {
    if (!filteredCandidates || filteredCandidates.length === 0) return;
    
    const csvData = filteredCandidates.map((ct: any) => ({
      Party: ct.partyAbbr,
      Candidate: ct.candidateName,
      'Total Votes': ct.totalVotes,
      '% of Valid Votes': totalValidVotes > 0 ? ((ct.totalVotes / totalValidVotes) * 100).toFixed(2) + '%' : '0%'
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Soba_Election_Report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-[#484848] tracking-tight">Election Reports</h1>
          <p className="mt-2 text-sm text-slate-500">Official collation summaries and exportable data.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            Export CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#5cb85c] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-green-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Print PDF
          </button>
        </div>
      </div>

      <div className="bg-white p-10 md:p-14 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0" id="printable-report">
        <div className="text-center mb-10 pb-10 border-b border-slate-200">
          <h2 className="text-2xl font-extrabold uppercase text-[#484848] tracking-wider">Soba LGA Election Collation Report</h2>
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
          <div className="p-5 bg-green-50 rounded-xl border border-green-100 text-center">
            <p className="text-sm font-semibold text-green-700 uppercase tracking-wider">Valid Votes</p>
            <p className="text-3xl font-bold text-green-900 mt-2">{totalValidVotes.toLocaleString()}</p>
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 print:hidden">
            <h3 className="text-lg font-bold text-[#484848] tracking-tight">Candidate Performance (Verified Results)</h3>
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search party or candidate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-[#5cb85c] focus:border-[#5cb85c] sm:text-sm text-slate-900 bg-white outline-none"
              />
            </div>
          </div>
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
                {filteredCandidates.length > 0 ? (
                  filteredCandidates.map((ct: any, idx: number) => (
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
                      No results found matching your search.
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
