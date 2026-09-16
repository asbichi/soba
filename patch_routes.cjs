const fs = require('fs');
let code = fs.readFileSync('src/api/routes.ts', 'utf8');

if (!code.includes('resultEvidence')) {
  code = code.replace(
    /import \{ eq, and, sql, desc \} from 'drizzle-orm';/,
    `import { eq, and, sql, desc } from 'drizzle-orm';\nimport { resultEvidence } from '../db/schema.ts';`
  );
}

// ensure it's imported at the top from schema
code = code.replace(
  /  pollingUnitResults, candidateResults, users, auditLogs \n\} from '\.\.\/db\/schema\.ts';/,
  `  pollingUnitResults, candidateResults, users, auditLogs, resultEvidence \n} from '../db/schema.ts';`
);

fs.writeFileSync('src/api/routes.ts', code);
