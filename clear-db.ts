import { db } from './src/db/index.ts';
import { wards, pollingUnits, elections, parties, candidates, pollingUnitResults, candidateResults, auditLogs } from './src/db/schema.ts';

async function clear() {
  await db.delete(candidateResults);
  await db.delete(pollingUnitResults);
  await db.delete(auditLogs);
  await db.delete(candidates);
  await db.delete(parties);
  await db.delete(pollingUnits);
  await db.delete(wards);
  await db.delete(elections);
  console.log('Database cleared');
}

clear().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
