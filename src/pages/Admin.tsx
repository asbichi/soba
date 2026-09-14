import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Admin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const seedData = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/seed-demo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">System Setup</h2>
        <p className="text-sm text-gray-600">
          Load demonstration data including fictional wards, polling units, parties, and candidates for testing purposes.
        </p>
        <button
          onClick={seedData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Seeding...' : 'Seed Demo Data'}
        </button>
        {message && <p className="text-sm font-medium text-gray-700 mt-2">{message}</p>}
      </div>
    </div>
  );
}
