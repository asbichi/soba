import { db } from './src/db';
import { elections, candidates, pollingUnitResults } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function clean() {
  const oldEl = await db.select().from(elections).where(eq(elections.name, '2027 Soba LGA Chairmanship & Council Election'));
  if (oldEl.length > 0) {
    const id = oldEl[0].id;
    // Check results
    const results = await db.select().from(pollingUnitResults).where(eq(pollingUnitResults.electionId, id));
    if (results.length === 0) {
      await db.delete(candidates).where(eq(candidates.electionId, id));
      await db.delete(elections).where(eq(elections.id, id));
      console.log('Cleaned old election');
    } else {
      console.log('Old election has results, skipping deletion');
    }
  }
  process.exit(0);
}
clean();
