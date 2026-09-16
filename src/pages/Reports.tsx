import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Download, Search, FileSpreadsheet, Check, ChevronDown, Layers, MapPin, Printer } from 'lucide-react';
import Papa from 'papaparse';

interface WardCollationItem {
  wardName: string;
  partyAbbr: string;
  totalVotes: number;
}

export function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await user?.getIdToken();
        const res = await fetch('/api/stats', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
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

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-sans">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#5cb85c] border-t-transparent mb-3"></div>
        <p className="font-medium text-sm">Loading election reports and collation data...</p>
      </div>
    );
  }

  const totalValidVotes = Number(stats?.aggregatedVotes?.totalValidVotes || 0);
  const totalVotesCast = Number(stats?.aggregatedVotes?.totalVotesCast || 0);
  const candidateTotals = Array.isArray(stats?.candidateTotals) ? stats.candidateTotals : [];
  const wardTotals: WardCollationItem[] = Array.isArray(stats?.wardTotals) ? stats.wardTotals : [];

  // Filter candidate totals based on search
  const filteredCandidates = candidateTotals.filter((ct: any) => {
    const q = searchQuery.toLowerCase();
    return (ct?.partyAbbr || '').toLowerCase().includes(q) || (ct?.candidateName || '').toLowerCase().includes(q);
  }).sort((a: any, b: any) => Number(b.totalVotes || 0) - Number(a.totalVotes || 0));

  // Process Ward Summaries from wardTotals
  const wardMap: Record<string, Record<string, number>> = {};
  const uniqueParties = Array.from(new Set(candidateTotals.map((c: any) => c.partyAbbr)));

  wardTotals.forEach((wt) => {
    if (!wardMap[wt.wardName]) {
      wardMap[wt.wardName] = {};
    }
    wardMap[wt.wardName][wt.partyAbbr] = Number(wt.totalVotes || 0);
  });

  const wardSummaryList = Object.keys(wardMap).map((wName) => {
    const pVotes = wardMap[wName];
    const totalWardVotes = Object.values(pVotes).reduce((sum, v) => sum + v, 0);
    return {
      wardName: wName,
      partyVotes: pVotes,
      totalValidVotes: totalWardVotes
    };
  }).sort((a, b) => b.totalValidVotes - a.totalValidVotes);

  const downloadBlob = (csvString: string, filename: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const showNotification = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 4000);
  };

  // 1. Export Candidate Results Summary CSV
  const handleExportCandidateSummaryCsv = () => {
    if (filteredCandidates.length === 0) {
      showNotification('No candidate records available to export.');
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const csvData = filteredCandidates.map((ct: any, idx: number) => ({
      Position: idx + 1,
      Party: ct.partyAbbr,
      Candidate: ct.candidateName,
      'Total Votes': Number(ct.totalVotes || 0),
      '% of Valid Votes': totalValidVotes > 0 ? ((Number(ct.totalVotes || 0) / totalValidVotes) * 100).toFixed(2) + '%' : '0%',
      'LGA': 'Soba',
      'State': 'Kaduna',
      'Report Date': new Date().toLocaleString()
    }));

    const csv = Papa.unparse(csvData);
    downloadBlob(csv, `Soba_LGA_Candidate_Results_${dateStr}.csv`);
    showNotification('Candidate results summary downloaded as CSV successfully.');
    setShowExportMenu(false);
  };

  // 2. Export Ward-by-Ward Collation CSV
  const handleExportWardBreakdownCsv = () => {
    if (wardSummaryList.length === 0) {
      showNotification('No ward collation records available yet.');
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const csvData = wardSummaryList.map((w, idx) => {
      const row: Record<string, any> = {
        'S/N': idx + 1,
        'Ward Name': w.wardName,
        'LGA': 'Soba',
        'State': 'Kaduna'
      };
      uniqueParties.forEach((p) => {
        row[`${p} Votes`] = w.partyVotes[p as string] || 0;
      });
      row['Total Valid Votes'] = w.totalValidVotes;
      return row;
    });

    const csv = Papa.unparse(csvData);
    downloadBlob(csv, `Soba_LGA_Ward_Collation_Breakdown_${dateStr}.csv`);
    showNotification('Ward collation breakdown downloaded as CSV successfully.');
    setShowExportMenu(false);
  };

  // 3. Export Detailed Polling Unit Results Master CSV
  const handleExportDetailedPUsCsv = async () => {
    setIsExporting(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/reports/detailed-results', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) throw new Error('Failed to fetch detailed records');
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        showNotification('No polling unit records available to export.');
        setIsExporting(false);
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const csvData = data.map((item: any, idx: number) => ({
        'S/N': idx + 1,
        'Ward Name': item.wardName || '',
        'Ward Code': item.wardCode || '',
        'Polling Unit Name': item.puName || '',
        'Polling Unit Code': item.puCode || '',
        'Location': item.location || '',
        'Collation Status': item.status || 'NOT SUBMITTED',
        'Registered Voters': item.registeredVoters ?? '',
        'Accredited Voters': item.accreditedVoters ?? '',
        'Total Valid Votes': item.totalValidVotes ?? '',
        'Rejected Votes': item.rejectedVotes ?? '',
        'Total Votes Cast': item.totalVotesCast ?? '',
        'Submission Timestamp': item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '',
        'Verification Timestamp': item.verifiedAt ? new Date(item.verifiedAt).toLocaleString() : ''
      }));

      const csv = Papa.unparse(csvData);
      downloadBlob(csv, `Soba_LGA_Polling_Units_Master_${dateStr}.csv`);
      showNotification('Detailed Polling Unit master records downloaded as CSV.');
    } catch (err) {
      console.error(err);
      showNotification('Error exporting detailed polling unit records.');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
      {/* Toast notification */}
      {exportNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#484848] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-fade-in">
          <div className="w-6 h-6 rounded-full bg-[#5cb85c] flex items-center justify-center text-white shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">{exportNotice}</span>
        </div>
      )}

      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-[#484848] tracking-tight">Election Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Official collation summaries, audit trails, and exportable election data.</p>
        </div>
        <div className="flex items-center gap-3 relative">
          {/* Main Download CSV Button with Dropdown Options */}
          <div className="relative inline-block text-left">
            <div className="flex rounded-lg shadow-sm">
              <button 
                id="download-csv-btn"
                onClick={handleExportCandidateSummaryCsv}
                disabled={isExporting}
                title="Download verified candidate election results CSV"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#5cb85c] text-white rounded-l-lg text-sm font-bold shadow-sm hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {isExporting ? 'Generating CSV...' : 'Download CSV'}
              </button>
              <button
                type="button"
                id="download-csv-options-btn"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-2.5 py-2.5 bg-[#4ea34e] hover:bg-[#439043] text-white rounded-r-lg border-l border-green-400/30 transition-colors cursor-pointer"
                title="More CSV export formats"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown Menu for Detailed CSV Exports */}
            {showExportMenu && (
              <div 
                className="origin-top-right absolute right-0 mt-2 w-72 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 divide-y divide-slate-100 z-50 border border-slate-100"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <div className="p-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1">CSV Export Options</p>
                  
                  <button
                    onClick={handleExportCandidateSummaryCsv}
                    className="w-full text-left flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#5cb85c] mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Candidate Results Summary</p>
                      <p className="text-[11px] text-slate-500">Party totals, candidate votes, and percentage shares</p>
                    </div>
                  </button>

                  <button
                    onClick={handleExportWardBreakdownCsv}
                    className="w-full text-left flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group mt-1"
                  >
                    <Layers className="w-4 h-4 text-blue-600 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Ward Collation Breakdown</p>
                      <p className="text-[11px] text-slate-500">Party vote distribution across all 15 Soba wards</p>
                    </div>
                  </button>

                  <button
                    onClick={handleExportDetailedPUsCsv}
                    className="w-full text-left flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group mt-1"
                  >
                    <MapPin className="w-4 h-4 text-amber-600 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Polling Units Master Sheet</p>
                      <p className="text-[11px] text-slate-500">Complete PU registry with status and turnout metrics</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print PDF
          </button>
        </div>
      </div>

      {/* Printable Report Document */}
      <div className="bg-white p-8 md:p-14 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0" id="printable-report">
        <div className="text-center mb-10 pb-8 border-b border-slate-200">
          <div className="inline-block px-3 py-1 bg-green-50 text-[#5cb85c] rounded-full text-xs font-bold tracking-wide uppercase mb-3">
            Official Collation Summary
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase text-[#484848] tracking-wider">TRACKER OF SOBA ELECTION</h2>
          <p className="text-slate-600 mt-2 font-medium">Tracking Result of Soba LGA &bull; Kaduna State, Nigeria</p>
          <p className="text-xs font-semibold text-slate-400 mt-3">Generated on: {new Date().toLocaleString()}</p>
        </div>

        {/* High-Level Statistics Bento */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Wards</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{stats?.totalWards || 15}</p>
          </div>
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Polling Units</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{stats?.totalPUs || 250}</p>
          </div>
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Votes Cast</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{totalVotesCast.toLocaleString()}</p>
          </div>
          <div className="p-5 bg-green-50 rounded-xl border border-green-200/60 text-center">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Total Valid Votes</p>
            <p className="text-3xl font-black text-green-900 mt-2">{totalValidVotes.toLocaleString()}</p>
          </div>
        </div>

        {/* Candidate Performance Section */}
        <div className="space-y-4 mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
            <div>
              <h3 className="text-lg font-bold text-[#484848] tracking-tight">Candidate Performance (Verified Results)</h3>
              <p className="text-xs text-slate-500">Aggregated from officially verified polling unit result sheets</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
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
              <button
                onClick={handleExportCandidateSummaryCsv}
                title="Download this table as CSV"
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Party</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Name</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Votes</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">% of Valid Votes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredCandidates.length > 0 ? (
                  filteredCandidates.map((ct: any, idx: number) => {
                    const percentage = totalValidVotes > 0 ? ((Number(ct.totalVotes || 0) / totalValidVotes) * 100).toFixed(2) : '0.00';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400">#{idx + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded bg-slate-100 font-extrabold text-xs text-slate-900 border border-slate-200">
                            {ct.partyAbbr}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{ct.candidateName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-900 text-right">{Number(ct.totalVotes || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{percentage}%</span>
                            <div className="w-16 bg-slate-100 rounded-full h-2 hidden sm:block overflow-hidden">
                              <div 
                                className="bg-[#5cb85c] h-2 rounded-full" 
                                style={{ width: `${Math.min(100, Number(percentage))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm font-medium text-slate-500">
                      No candidate results recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ward Collation Summary Table */}
        {wardSummaryList.length > 0 && (
          <div className="space-y-4 mb-12">
            <div className="flex justify-between items-center print:hidden">
              <div>
                <h3 className="text-lg font-bold text-[#484848] tracking-tight">Ward Collation Breakdown</h3>
                <p className="text-xs text-slate-500">Verified vote totals broken down across electoral wards</p>
              </div>
              <button
                onClick={handleExportWardBreakdownCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                Export Ward CSV
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ward</th>
                    {uniqueParties.map((p) => (
                      <th key={p as string} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {p as string}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100/70">
                      Total Valid Votes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {wardSummaryList.map((w, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{w.wardName}</td>
                      {uniqueParties.map((p) => (
                        <td key={p as string} className="px-4 py-3 text-right text-slate-600 font-medium whitespace-nowrap">
                          {(w.partyVotes[p as string] || 0).toLocaleString()}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-black text-slate-900 bg-slate-50/50 whitespace-nowrap">
                        {w.totalValidVotes.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Official Signatures Section for PDF & Printing */}
        <div className="mt-16 pt-10 border-t border-slate-200 grid grid-cols-2 gap-12 text-center print:flex print:justify-between print:mt-16">
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

