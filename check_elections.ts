import { db } from './src/db';
import { elections, candidates, pollingUnitResults } from './src/db/schema';

async function check() {
  const el = await db.select().from(elections);
  console.log("Elections:", el.map(e => e.name));
  process.exit(0);
}
check();
