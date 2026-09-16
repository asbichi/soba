import fs from 'fs';
import path from 'path';
import { db } from './src/db';
import { parties } from './src/db/schema';
import { eq } from 'drizzle-orm';

const updates = [
  { abbr: 'APC', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/All_Progressives_Congress_logo.svg/200px-All_Progressives_Congress_logo.svg.png' },
  { abbr: 'PDP', url: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/61/People%27s_Democratic_Party_%28Nigeria%29_logo.svg/200px-People%27s_Democratic_Party_%28Nigeria%29_logo.svg.png' },
  { abbr: 'LP', url: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b2/Labour_Party_%28Nigeria%29_logo.svg/200px-Labour_Party_%28Nigeria%29_logo.svg.png' },
  { abbr: 'NNPP', url: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/91/New_Nigeria_Peoples_Party_logo.svg/200px-New_Nigeria_Peoples_Party_logo.svg.png' },
  { abbr: 'APGA', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/APGA_Logo.svg/200px-APGA_Logo.svg.png' },
  { abbr: 'SDP', url: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4b/Social_Democratic_Party_%28Nigeria%29_Logo.png/200px-Social_Democratic_Party_%28Nigeria%29_Logo.png' },
  { abbr: 'ADC', url: 'https://upload.wikimedia.org/wikipedia/en/2/29/ADC_Logo.png' }
];

async function downloadAndFix() {
  const dir = path.join(process.cwd(), 'public', 'logos');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  for (const { abbr, url } of updates) {
    try {
      const res = await fetch(url, { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' 
        } 
      });
      if (!res.ok) throw new Error('Failed to fetch ' + url);
      const buffer = await res.arrayBuffer();
      const filePath = path.join(dir, `${abbr.toLowerCase()}.png`);
      fs.writeFileSync(filePath, Buffer.from(buffer));
      
      const localUrl = `/logos/${abbr.toLowerCase()}.png`;
      await db.update(parties).set({ logoUrl: localUrl }).where(eq(parties.abbreviation, abbr));
      console.log(`Downloaded and updated ${abbr}`);
    } catch (err) {
      console.error(`Error for ${abbr}:`, err.message);
    }
  }
  console.log('Fixed URLs');
  process.exit(0);
}
downloadAndFix();
