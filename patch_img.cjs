const fs = require('fs');
let code = fs.readFileSync('src/pages/ResultEntry.tsx', 'utf8');

// Ensure image handles any type of rendering, and restores the letter-fallback badge!
code = code.replace(
  /<img src=\{c.partyLogo\} alt=\{c.partyAbbr\} className="w-10 h-10 rounded-full border border-slate-200 shadow-sm object-contain bg-white p-0.5" \/>/g,
  `<div className="relative w-10 h-10">
                            <div className="absolute inset-0 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center -z-10">
                              <span className="text-xs font-bold text-slate-500">{c.partyAbbr}</span>
                            </div>
                            <img src={c.partyLogo} alt={c.partyAbbr} className="w-10 h-10 rounded-full border border-slate-200 shadow-sm object-contain bg-white p-0.5" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>`
);

fs.writeFileSync('src/pages/ResultEntry.tsx', code);
