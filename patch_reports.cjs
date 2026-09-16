const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf8');

// 1. Add states for PU results and searches
code = code.replace(
  /const \[searchQuery, setSearchQuery\] = useState\(''\);/,
  `const [searchQuery, setSearchQuery] = useState('');
  const [wardSearchQuery, setWardSearchQuery] = useState('');
  const [puSearchQuery, setPuSearchQuery] = useState('');
  const [detailedPUs, setDetailedPUs] = useState<any[]>([]);`
);

// 2. Fetch Detailed PUs in useEffect
code = code.replace(
  /setStats\(await res\.json\(\)\);\n        \}/,
  `setStats(await res.json());
        }
        const puRes = await fetch('/api/reports/detailed-results', {
          headers: token ? { Authorization: \`Bearer \${token}\` } : {}
        });
        if (puRes.ok) {
          setDetailedPUs(await puRes.json());
        }`
);

// 3. Filter Ward Summaries
code = code.replace(
  /const wardSummaryList = Object\.keys\(wardMap\)\.map\(\(wName\) => \{/,
  `const wardSummaryList = Object.keys(wardMap).map((wName) => {`
);

code = code.replace(
  /\}\)\.sort\(\(a, b\) => b\.totalValidVotes - a\.totalValidVotes\);/,
  `}).sort((a, b) => b.totalValidVotes - a.totalValidVotes).filter(w => w.wardName.toLowerCase().includes(wardSearchQuery.toLowerCase()));`
);

// 4. Add Filter for Detailed PUs
code = code.replace(
  /const totalVotesCast = Number\(stats\?\.aggregatedVotes\?\.totalVotesCast \|\| 0\);/,
  `const totalVotesCast = Number(stats?.aggregatedVotes?.totalVotesCast || 0);
  const filteredPUs = detailedPUs.filter(pu => 
    (pu.puName || '').toLowerCase().includes(puSearchQuery.toLowerCase()) ||
    (pu.wardName || '').toLowerCase().includes(puSearchQuery.toLowerCase()) ||
    (pu.puCode || '').toLowerCase().includes(puSearchQuery.toLowerCase())
  );`
);

// 5. Add search bar to Ward section
code = code.replace(
  /                <h3 className="text-lg font-bold text-\[\#484848\] tracking-tight">Ward Collation Breakdown<\/h3>\n                <p className="text-xs text-slate-500">Verified vote totals broken down across electoral wards<\/p>\n              <\/div>/,
  `                <h3 className="text-lg font-bold text-[#484848] tracking-tight">Ward Collation Breakdown</h3>
                <p className="text-xs text-slate-500">Verified vote totals broken down across electoral wards</p>
              </div>
              <div className="flex-1 max-w-sm mx-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search wards..."
                    value={wardSearchQuery}
                    onChange={(e) => setWardSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-[#5cb85c] focus:border-[#5cb85c] sm:text-sm text-slate-900 bg-white outline-none"
                  />
                </div>
              </div>`
);

// 6. Add new Polling Units Table below Ward section
const newTable = `
        {/* Polling Units Table */}
        <div className="space-y-4 mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
            <div>
              <h3 className="text-lg font-bold text-[#484848] tracking-tight">Polling Unit Results</h3>
              <p className="text-xs text-slate-500">Detailed records of individual polling units</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search PU name, code or ward..."
                  value={puSearchQuery}
                  onChange={(e) => setPuSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-[#5cb85c] focus:border-[#5cb85c] sm:text-sm text-slate-900 bg-white outline-none"
                />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ward</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Polling Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Registered</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Accredited</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100/70">Total Valid</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredPUs.length > 0 ? (
                  filteredPUs.map((pu, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">{pu.wardName}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                        {pu.puName}
                        <div className="text-[10px] text-slate-400 font-normal">{pu.puCode}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={\`inline-block px-2 py-1 text-[10px] font-bold rounded-full \${
                          pu.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                          pu.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          pu.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-600'
                        }\`}>
                          {pu.status || 'NO DATA'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{pu.registeredVoters?.toLocaleString() || '-'}</td>
                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{pu.accreditedVoters?.toLocaleString() || '-'}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 bg-slate-50/50 whitespace-nowrap">
                        {pu.totalValidVotes?.toLocaleString() || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm font-medium text-slate-500">
                      No polling units match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
`;

code = code.replace(
  /        \{\/\* Official Signatures Section for PDF & Printing \*\/\}/,
  newTable + "\n        {/* Official Signatures Section for PDF & Printing */}"
);

fs.writeFileSync('src/pages/Reports.tsx', code);
