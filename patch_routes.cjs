const fs = require('fs');
let code = fs.readFileSync('src/api/routes.ts', 'utf8');

// Insert evidence processing in POST /results
code = code.replace(
  /const { electionId, pollingUnitId, registeredVoters, accreditedVoters, totalVotesCast, rejectedVotes, totalValidVotes, candidateVotes } = req.body;/g,
  `const { electionId, pollingUnitId, registeredVoters, accreditedVoters, totalVotesCast, rejectedVotes, totalValidVotes, candidateVotes, evidence } = req.body;`
);

code = code.replace(
  /res.json\(\{ success: true, resultId: puResult.id \}\);/g,
  `// Save evidence if provided
      if (evidence && evidence.data) {
        await db.insert(resultEvidence).values({
          pollingUnitResultId: puResult.id,
          fileName: evidence.fileName,
          fileUrl: evidence.data, // storing base64 for simplicity in demo
          uploadedById: dbUser.id
        });
      }
      
      res.json({ success: true, resultId: puResult.id });`
);

fs.writeFileSync('src/api/routes.ts', code);
