const fs = require('fs');
let code = fs.readFileSync('src/pages/IRevPortal.tsx', 'utf8');

// Add LIVE badge in header
code = code.replace(
  /<Link to="\/login" className="text-sm font-semibold text-\[#5cb85c\] hover:text-green-700">/g,
  `<div className="flex items-center gap-4">\n            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-100 shadow-sm">\n              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>\n              LIVE UPDATES\n            </div>\n            <Link to="/login" className="text-sm font-semibold text-[#5cb85c] hover:text-green-700">`
);

// Close the new flex div around Link
code = code.replace(
  /Officer Login\n          <\/Link>\n        <\/div>/g,
  `Officer Login\n          </Link>\n          </div>\n        </div>`
);

// Change Banner to Red Gradient
code = code.replace(
  /className="bg-\[#484848\] rounded-xl p-8 text-white shadow-lg relative overflow-hidden"/g,
  `className="bg-gradient-to-br from-red-800 via-red-900 to-slate-900 rounded-xl p-8 text-white shadow-xl relative overflow-hidden ring-1 ring-red-900/50"`
);

// Add a decorative graphic to the banner
code = code.replace(
  /<div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mt-20 -mr-20"><\/div>/g,
  `<div className="absolute top-0 right-0 w-64 h-64 bg-red-500 opacity-10 rounded-full blur-3xl -mt-10 -mr-10"></div>\n          <div className="absolute bottom-0 left-20 w-48 h-48 bg-red-600 opacity-10 rounded-full blur-2xl -mb-10"></div>`
);

fs.writeFileSync('src/pages/IRevPortal.tsx', code);
