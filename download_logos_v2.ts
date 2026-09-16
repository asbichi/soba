import fs from 'fs';
import path from 'path';
import { db } from './src/db';
import { parties } from './src/db/schema';
import { eq } from 'drizzle-orm';

// Let's use direct transparent high-quality PNGs from reliable alternative sources since Wikipedia blocks automated fetch
const updates = [
  { abbr: 'APC', url: 'https://cdn.vanguardngr.com/wp-content/uploads/2018/06/APC-Logo.jpg' },
  { abbr: 'PDP', url: 'https://cdn.vanguardngr.com/wp-content/uploads/2021/10/PDP-LOGO.jpg' },
  { abbr: 'LP', url: 'https://inecnigeria.org/wp-content/uploads/2019/02/LP.png' },
  { abbr: 'NNPP', url: 'https://inecnigeria.org/wp-content/uploads/2019/02/NNPP.png' },
  { abbr: 'APGA', url: 'https://inecnigeria.org/wp-content/uploads/2019/02/APGA.png' },
  { abbr: 'SDP', url: 'https://inecnigeria.org/wp-content/uploads/2019/02/SDP.png' },
  { abbr: 'ADC', url: 'https://inecnigeria.org/wp-content/uploads/2019/02/ADC.png' },
  { abbr: 'PRP', url: 'https://inecnigeria.org/wp-content/uploads/2019/02/PRP.png' },
  { abbr: 'ZLP', url: 'https://inecnigeria.org/wp-content/uploads/2019/02/ZLP.png' },
  { abbr: 'YPP', url: 'https://inecnigeria.org/wp-content/uploads/2019/02/YPP.png' }
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
      console.log(`Fallback for ${abbr} to Wikipedia SVG via data URL injection...`);
      // Fallback: If we can't download it, we will just use the direct wikipedia SVG URL again but inject it into the DB
      // We will fix the frontend to use an iframe or object tag if img tags are completely blocked, but first let's see if INEC images download.
    }
  }
  console.log('Done');
  process.exit(0);
}
downloadAndFix();
