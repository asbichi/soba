const fs = require('fs');
let code = fs.readFileSync('src/pages/Verification.tsx', 'utf8');

// Add "Evidence" column header
code = code.replace(
  /<th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time<\/th>/g,
  `<th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>\n                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Evidence</th>`
);

// Add "Evidence" cell
code = code.replace(
  /<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">\n                      \{new Date\(result.submittedAt\).toLocaleString\(\)\}\n                    <\/td>/g,
  `<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">\n                      {new Date(result.submittedAt).toLocaleString()}\n                    </td>\n                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">\n                      {result.evidenceUrl ? (\n                        <a href={result.evidenceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">\n                           <FileText className="w-4 h-4" /> View EC8A\n                        </a>\n                      ) : (\n                        <span className="text-slate-400 italic">No file</span>\n                      )}\n                    </td>`
);

fs.writeFileSync('src/pages/Verification.tsx', code);
