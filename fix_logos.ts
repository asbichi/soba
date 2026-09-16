import { db } from './src/db';
import { parties } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function fix() {
  const updates = [
    { abbr: 'APC', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/All_Progressives_Congress_logo.svg/200px-All_Progressives_Congress_logo.svg.png' },
    { abbr: 'PDP', url: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/61/People%27s_Democratic_Party_%28Nigeria%29_logo.svg/200px-People%27s_Democratic_Party_%28Nigeria%29_logo.svg.png' },
    { abbr: 'LP', url: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b2/Labour_Party_%28Nigeria%29_logo.svg/200px-Labour_Party_%28Nigeria%29_logo.svg.png' },
    { abbr: 'NNPP', url: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/91/New_Nigeria_Peoples_Party_logo.svg/200px-New_Nigeria_Peoples_Party_logo.svg.png' },
    { abbr: 'APGA', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/APGA_Logo.svg/200px-APGA_Logo.svg.png' },
    { abbr: 'SDP', url: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4b/Social_Democratic_Party_%28Nigeria%29_Logo.png/200px-Social_Democratic_Party_%28Nigeria%29_Logo.png' }
  ];

  for (const { abbr, url } of updates) {
    try {
      await db.update(parties).set({ logoUrl: url }).where(eq(parties.abbreviation, abbr));
    } catch(err) {
      console.log('Error updating', abbr);
    }
  }
  console.log('Fixed URLs');
  process.exit(0);
}
fix();
