const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// Ensure z-index is extremely high for the sidebar on mobile and it functions correctly
code = code.replace(
  /"bg-\[\#484848\] border-r border-slate-700 fixed md:sticky top-0 h-screen w-64 z-50 transition-transform duration-300 ease-in-out md:translate-x-0 shrink-0",/g,
  `"bg-[#484848] border-r border-slate-700 fixed md:sticky top-0 h-[100dvh] w-64 z-[100] transition-transform duration-300 ease-in-out md:translate-x-0 shrink-0 shadow-2xl",`
);

code = code.replace(
  /className="fixed inset-0 bg-black\/60 z-40 md:hidden"/g,
  `className="fixed inset-0 bg-black/60 z-[90] md:hidden"`
);

fs.writeFileSync('src/components/Layout.tsx', code);
