import { db } from './src/db';
import { parties } from './src/db/schema';

async function check() {
  const p = await db.select().from(parties);
  console.log(p);
  process.exit(0);
}
check();
