const fs = require('fs');
let code = fs.readFileSync('src/api/routes.ts', 'utf8');

// Also join with resultEvidence if any
code = code.replace(
  /puCode: pollingUnits.code,\n      submittedBy: users.name\n    \}\)/g,
  `puCode: pollingUnits.code,\n      submittedBy: users.name,\n      evidenceUrl: resultEvidence.fileUrl\n    })`
);

code = code.replace(
  /\.innerJoin\(users, eq\(pollingUnitResults.submittedById, users.id\)\)/g,
  `.innerJoin(users, eq(pollingUnitResults.submittedById, users.id))\n    .leftJoin(resultEvidence, eq(pollingUnitResults.id, resultEvidence.pollingUnitResultId))`
);

// We need to also verify how verification displays evidence.
fs.writeFileSync('src/api/routes.ts', code);
