import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, FileText, CheckCircle, BarChart3 } from 'lucide-react';

export function IRevPortal() {
  const [wards, setWards] = useState<any[]>([]);
  const [pollingUnits, setPollingUnits] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedPU, setSelectedPU] = useState('');

  useEffect(() => {
    fetch('/api/wards').then(res => res.ok ? res.json() : []).then(data => Array.isArray(data) ? setWards(data) : setWards([]));
    fetch('/api/stats').then(res => res.ok ? res.json() : null).then(setStats);
  }, []);

  useEffect(() => {
    if (selectedWard) {
      fetch(`/api/polling-units?wardId=${selectedWard}`).then(res => res.ok ? res.json() : []).then(data => Array.isArray(data) ? setPollingUnits(data) : setPollingUnits([]));
    } else {
      setPollingUnits([]);
      setSelectedPU('');
    }
  }, [selectedWard]);

  const selectedPUDetails = pollingUnits.find(p => p.id.toString() === selectedPU);

  return (
    <div className="min-h-screen bg-[#f9fbfe] font-sans">
      {/* Portal Header */}
      <header className="bg-white border-b-4 border-[#5cb85c] shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-[#5cb85c] rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-white rounded-sm border-2 border-white flex items-center justify-center">
                <div className="w-4 h-4 bg-[#5cb85c] rounded-full"></div>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#484848] leading-tight">TRACKER OF SOBA ELECTION<br/><span className="text-sm font-normal text-slate-500">Tracking Result of Soba LGA</span></h1>
            </div>
          </div>
          <Link to="/login" className="text-sm font-semibold text-[#5cb85c] hover:text-green-700">
            Officer Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Banner */}
        <div className="bg-[#484848] rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mt-20 -mr-20"></div>
          <h2 className="text-3xl font-extrabold mb-2 relative z-10">Public Results Viewing Portal</h2>
          <p className="text-slate-300 max-w-2xl text-sm relative z-10">
            Access verified election results from polling units across Soba LGA in real-time. Transparency and credibility through digital collation.
          </p>
        </div>

        {/* Directory & Results Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-[#484848] border-b border-slate-100 pb-3 mb-4">Location Directory</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">State</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[#484848] font-semibold text-sm">
                    Kaduna
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Local Government Area</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[#484848] font-semibold text-sm">
                    Soba
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5cb85c] uppercase tracking-wider mb-2">Select Ward</label>
                  <select 
                    value={selectedWard}
                    onChange={e => setSelectedWard(e.target.value)}
                    className="w-full p-3 bg-white border border-[#5cb85c] rounded-lg text-[#484848] font-semibold text-sm focus:ring-2 focus:ring-[#5cb85c] focus:outline-none"
                  >
                    <option value="">-- Choose Ward --</option>
                    {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                {selectedWard && (
                  <div>
                    <label className="block text-xs font-bold text-[#5cb85c] uppercase tracking-wider mb-2">Select Polling Unit</label>
                    <select 
                      value={selectedPU}
                      onChange={e => setSelectedPU(e.target.value)}
                      className="w-full p-3 bg-white border border-[#5cb85c] rounded-lg text-[#484848] font-semibold text-sm focus:ring-2 focus:ring-[#5cb85c] focus:outline-none"
                    >
                      <option value="">-- Choose PU --</option>
                      {pollingUnits.map(pu => <option key={pu.id} value={pu.id}>{pu.name} ({pu.code})</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-[#5cb85c] rounded-xl shadow-sm p-6 text-white text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-90" />
              <h4 className="font-bold text-lg">Verified Data</h4>
              <p className="text-xs mt-1 text-green-100">Only results verified by the Returning Officer are displayed publicly.</p>
            </div>
          </div>

          {/* Results Viewer Area */}
          <div className="lg:col-span-2">
            {!selectedWard ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center">
                <BarChart3 className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-[#484848]">Select a Ward and Polling Unit</h3>
                <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">Use the location directory on the left to navigate the hierarchy and view uploaded EC8A results.</p>
              </div>
            ) : !selectedPU ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center">
                <FileText className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-[#484848]">Ward Selected</h3>
                <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">Now select a specific Polling Unit from the dropdown to view its tabulated result.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-[#484848] px-6 py-4 border-b border-slate-700">
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedPUDetails?.name}</h3>
                  <p className="text-slate-300 text-xs mt-1">{selectedPUDetails?.code} &bull; {selectedPUDetails?.location}</p>
                </div>
                
                <div className="p-6">
                  {/* Mock EC8A Display */}
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/2 space-y-4">
                       <h4 className="font-bold text-[#5cb85c] border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">Tabulated Votes</h4>
                       {stats?.candidateTotals ? (
                          <div className="space-y-3">
                            {stats.candidateTotals.slice(0, 5).map((ct: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                                <span className="font-bold text-[#484848]">{ct.partyAbbr}</span>
                                <span className="font-mono text-sm text-slate-600 bg-white px-2 py-1 border border-slate-300 rounded shadow-inner">{Math.floor(Math.random() * 200) + 10}</span>
                              </div>
                            ))}
                            <p className="text-xs text-slate-500 text-center mt-4 italic">*Note: Using randomized values for demo unit display.</p>
                          </div>
                       ) : (
                         <div className="text-sm text-slate-500 py-4">No results recorded yet.</div>
                       )}
                    </div>
                    
                    <div className="md:w-1/2">
                      <h4 className="font-bold text-[#5cb85c] border-b border-slate-100 pb-2 text-sm uppercase tracking-wider mb-4">Form EC8A Capture</h4>
                      <div className="aspect-[3/4] bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden group">
                        <div className="text-center p-6 relative z-10">
                           <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                           <span className="text-xs font-bold text-slate-400">EC8A_Scan_Capture.pdf</span>
                        </div>
                        {/* Simulated blur overlay of a document */}
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
