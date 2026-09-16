import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function ResultEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [elections, setElections] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [pollingUnits, setPollingUnits] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  
  const [selectedElection, setSelectedElection] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedPU, setSelectedPU] = useState('');
  
  const [registeredVoters, setRegisteredVoters] = useState('');
  const [accreditedVoters, setAccreditedVoters] = useState('');
  const [rejectedVotes, setRejectedVotes] = useState('');
  const [totalVotesCast, setTotalVotesCast] = useState('');
  const [candidateVotes, setCandidateVotes] = useState<Record<string, string>>({});
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceBase64, setEvidenceBase64] = useState('');

  useEffect(() => {
    async function loadInitial() {
      try {
        const token = await user?.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        
        const [elRes, wdRes, candRes] = await Promise.all([
          fetch('/api/elections', { headers }),
          fetch('/api/wards', { headers }),
          fetch('/api/candidates', { headers }) // Note: Might need electionId, but let's assume global for now
        ]);
        
        const elData = await elRes.json();
        const wdData = await wdRes.json();
        const candData = await candRes.json();
        
        setElections(elData);
        setWards(wdData);
        setCandidates(candData);
        
        if (elData.length > 0) setSelectedElection(elData[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [user]);

  useEffect(() => {
    async function fetchPUs() {
      if (!selectedWard) {
        setPollingUnits([]);
        setSelectedPU('');
        return;
      }
      try {
        const token = await user?.getIdToken();
        const res = await fetch(`/api/polling-units?wardId=${selectedWard}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setPollingUnits(data);
        if (data.length > 0) setSelectedPU(data[0].id);
      } catch (err) {
        console.error(err);
      }
    }
    fetchPUs();
  }, [selectedWard, user]);

  const totalValidVotes = Object.values(candidateVotes).reduce((sum, val) => Number(sum) + (parseInt(val as string) || 0), 0) as number;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB');
        return;
      }
      setEvidenceName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidenceBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedElection || !selectedPU) {
      setError('Please select an election and a polling unit.');
      return;
    }
    
    const regV = parseInt(registeredVoters) || 0;
    const accV = parseInt(accreditedVoters) || 0;
    const rejV = parseInt(rejectedVotes) || 0;
    const totC = parseInt(totalVotesCast) || 0;
    
    if (totC !== totalValidVotes + rejV) {
      setError(`Validation failed: Total Votes Cast (${totC}) must equal Valid (${totalValidVotes}) + Rejected (${rejV}) votes.`);
      return;
    }
    
    if (accV > regV) {
      setError('Accredited voters cannot exceed registered voters.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const payload = {
        electionId: selectedElection,
        pollingUnitId: selectedPU,
        registeredVoters: regV,
        accreditedVoters: accV,
        rejectedVotes: rejV,
        totalValidVotes,
        totalVotesCast: totC,
        evidence: evidenceBase64 ? { fileName: evidenceName, data: evidenceBase64 } : null,
        candidateVotes: candidates.map(c => ({
          candidateId: c.id,
          partyId: c.partyId,
          votes: parseInt(candidateVotes[c.id]) || 0
        }))
      };

      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit result');
      }

      alert('Result submitted successfully!');
      // Reset form
      setSelectedPU('');
      setRegisteredVoters('');
      setAccreditedVoters('');
      setRejectedVotes('');
      setTotalVotesCast('');
      setCandidateVotes({});
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading form...</div>;

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-[#484848] tracking-tight">Result Entry</h1>
        <p className="mt-2 text-sm text-slate-500">Enter and submit the votes exactly as recorded on the official polling unit sheet.</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-[#484848] tracking-tight border-b border-slate-100 pb-2">Location Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Election</label>
            <select 
              className="mt-2 block w-full rounded-lg border-slate-300 shadow-sm border p-3 focus:ring-[#5cb85c] focus:border-[#5cb85c] text-base sm:text-sm transition-shadow bg-white outline-none"
              value={selectedElection}
              onChange={(e) => setSelectedElection(e.target.value)}
              required
            >
              <option value="">Select Election</option>
              {elections.map(e => <option key={e.id} value={e.id}>{e.name || e.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Ward</label>
            <select 
              className="mt-2 block w-full rounded-lg border-slate-300 shadow-sm border p-3 focus:ring-[#5cb85c] focus:border-[#5cb85c] text-base sm:text-sm transition-shadow bg-white outline-none"
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              required
            >
              <option value="">Select Ward</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700">Polling Unit</label>
            <select 
              className="mt-2 block w-full rounded-lg border-slate-300 shadow-sm border p-3 focus:ring-[#5cb85c] focus:border-[#5cb85c] text-base sm:text-sm transition-shadow disabled:bg-slate-50 disabled:text-slate-400 bg-white outline-none"
              value={selectedPU}
              onChange={(e) => setSelectedPU(e.target.value)}
              required
              disabled={!selectedWard}
            >
              <option value="">Select Polling Unit</option>
              {pollingUnits.map(pu => <option key={pu.id} value={pu.id}>{pu.name} ({pu.code})</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-2 mb-6">Vote Entry & Authentication</h2>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-slate-100">
             <div>
               <label className="block text-sm font-semibold text-slate-700">Registered Voters</label>
               <input type="number" required value={registeredVoters} onChange={e => setRegisteredVoters(e.target.value)} className="mt-2 block w-full rounded-lg border-slate-300 shadow-sm border p-2.5 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-shadow font-medium" placeholder="0" />
             </div>
             <div>
               <label className="block text-sm font-semibold text-slate-700">Accredited Voters</label>
               <input type="number" required value={accreditedVoters} onChange={e => setAccreditedVoters(e.target.value)} className="mt-2 block w-full rounded-lg border-slate-300 shadow-sm border p-2.5 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-shadow font-medium" placeholder="0" />
             </div>
          </div>

          <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Votes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {candidates.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center shadow-sm">
                        <span className="text-sm font-black text-slate-800 tracking-tight">{c.partyAbbr}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{c.partyName || c.partyAbbr}</span>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{c.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right">
                    <input 
                      type="number" 
                      className="block w-full text-right font-bold rounded-lg border-slate-300 shadow-sm border p-2 focus:ring-[#5cb85c] focus:border-[#5cb85c] sm:text-sm transition-shadow outline-none" 
                      placeholder="0"
                      value={candidateVotes[c.id] || ''}
                      onChange={(e) => setCandidateVotes({...candidateVotes, [c.id]: e.target.value})}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-100">
             <div>
               <label className="block text-sm font-semibold text-slate-700">Total Valid Votes (Auto)</label>
               <input type="number" readOnly className="mt-2 block w-full rounded-lg border-slate-200 bg-slate-50 shadow-inner border p-2.5 text-slate-600 sm:text-sm font-bold cursor-not-allowed outline-none" value={totalValidVotes} />
             </div>
             <div>
               <label className="block text-sm font-semibold text-slate-700">Rejected / Invalid Votes</label>
               <input type="number" required value={rejectedVotes} onChange={e => setRejectedVotes(e.target.value)} className="mt-2 block w-full rounded-lg border-slate-300 shadow-sm border p-2.5 focus:ring-[#5cb85c] focus:border-[#5cb85c] sm:text-sm transition-shadow font-medium outline-none" placeholder="0" />
             </div>
             <div>
               <label className="block text-sm font-semibold text-slate-700">Total Votes Cast</label>
               <input type="number" required value={totalVotesCast} onChange={e => setTotalVotesCast(e.target.value)} className="mt-2 block w-full rounded-lg border-slate-300 shadow-sm border p-2.5 focus:ring-[#5cb85c] focus:border-[#5cb85c] sm:text-sm transition-shadow font-medium outline-none" placeholder="0" />
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
         <h2 className="text-lg font-bold text-[#484848] tracking-tight border-b border-slate-100 pb-2 mb-4">Evidence Upload</h2>
         <div className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="text-center">
              <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                <label className="relative cursor-pointer rounded-md font-bold text-[#5cb85c] hover:text-green-600">
                  <span>Upload official EC8A form (Optional)</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".png,.jpg,.jpeg,.pdf" onChange={handleFileChange} />
                </label>
              </div>
              <p className="text-xs leading-5 text-slate-500 mt-1">PNG, JPG, PDF up to 10MB</p>
              {evidenceName && <p className="mt-2 text-sm font-bold text-[#5cb85c]">Selected: {evidenceName}</p>}
            </div>
          </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={() => navigate('/dashboard')} className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">Cancel</button>
        <button type="submit" disabled={submitting} className="px-6 py-2.5 text-sm font-bold text-white bg-[#5cb85c] border border-transparent rounded-lg shadow-sm hover:bg-green-600 transition-colors disabled:opacity-50">
          {submitting ? 'Submitting...' : 'Submit Official Result'}
        </button>
      </div>
    </form>
  );
}
