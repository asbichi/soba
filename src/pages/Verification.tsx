import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, FileText } from 'lucide-react';

export function Verification() {
  const { user } = useAuth() as any;
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    fetchResults();
  }, [user]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/results', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setResults(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: number, status: 'VERIFIED' | 'REJECTED') => {
    if (!window.confirm(`Are you sure you want to mark this result as ${status}?`)) return;
    
    setProcessing(id);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/results/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, verificationNotes: '' })
      });
      
      if (res.ok) {
        // Remove from list
        setResults((prev) => (Array.isArray(prev) ? prev.filter(r => r.id !== id) : []));
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading pending results...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-[#484848] tracking-tight">Result Verification</h1>
        <p className="mt-2 text-sm text-slate-500">Review and verify submitted polling unit results against uploaded evidence.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ward & Polling Unit</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted By</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Evidence</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {results.length > 0 ? (
                results.map((result) => (
                  <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-slate-900">{result.wardName}</p>
                      <p className="text-xs font-medium text-slate-500">{result.puName} ({result.puCode})</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                      {result.submittedBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                      {new Date(result.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                      {result.evidenceUrl ? (
                        <a href={result.evidenceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                           <FileText className="w-4 h-4" /> View EC8A
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No file</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => handleVerify(result.id, 'VERIFIED')}
                        disabled={processing === result.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-[#5cb85c] hover:bg-green-100 rounded-lg font-bold transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Verify
                      </button>
                      <button
                        onClick={() => handleVerify(result.id, 'REJECTED')}
                        disabled={processing === result.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-bold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm font-medium text-slate-500">
                    No results pending verification.
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
