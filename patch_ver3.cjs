const fs = require('fs');
let code = fs.readFileSync('src/pages/Verification.tsx', 'utf8');

code = code.replace(
  /import \{ CheckCircle, XCircle \} from 'lucide-react';/g,
  `import { CheckCircle, XCircle, FileText } from 'lucide-react';`
);

fs.writeFileSync('src/pages/Verification.tsx', code);
