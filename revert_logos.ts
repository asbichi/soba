import { db } from './src/db';
import { parties } from './src/db/schema';
import { eq } from 'drizzle-orm';

const inecParties = [
  { name: 'Accord', abbreviation: 'A', color: '006600' },
  { name: 'Action Alliance', abbreviation: 'AA', color: 'FF6600' },
  { name: 'African Action Congress', abbreviation: 'AAC', color: 'FF0000' },
  { name: 'African Democratic Congress', abbreviation: 'ADC', color: '006600' },
  { name: 'Action Democratic Party', abbreviation: 'ADP', color: 'FF0000' },
  { name: 'All Progressives Congress', abbreviation: 'APC', color: '0099FF' },
  { name: 'All Progressives Grand Alliance', abbreviation: 'APGA', color: '006600' },
  { name: 'Allied Peoples Movement', abbreviation: 'APM', color: '000000' },
  { name: 'Action Peoples Party', abbreviation: 'APP', color: '003366' },
  { name: 'Boot Party', abbreviation: 'BP', color: '009900' },
  { name: 'Labour Party', abbreviation: 'LP', color: 'FF0000' },
  { name: 'New Nigeria Peoples Party', abbreviation: 'NNPP', color: '003399' },
  { name: 'National Rescue Movement', abbreviation: 'NRM', color: 'FF9900' },
  { name: 'Peoples Democratic Party', abbreviation: 'PDP', color: '006600' },
  { name: 'Peoples Redemption Party', abbreviation: 'PRP', color: 'FF0000' },
  { name: 'Social Democratic Party', abbreviation: 'SDP', color: '000000' },
  { name: 'Young Progressives Party', abbreviation: 'YPP', color: 'FFCC00' },
  { name: 'Zenith Labour Party', abbreviation: 'ZLP', color: 'FF0000' }
];

async function revertLogos() {
  for (const p of inecParties) {
    try {
      const url = `https://ui-avatars.com/api/?name=${p.abbreviation}&background=${p.color}&color=fff&size=128&font-size=0.33`;
      await db.update(parties).set({ logoUrl: url }).where(eq(parties.abbreviation, p.abbreviation));
    } catch(err) {}
  }
  console.log('Reverted logos');
  process.exit(0);
}
revertLogos();
