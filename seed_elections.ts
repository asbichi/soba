import { db } from './src/db';
import { elections, candidates, parties, pollingUnitResults } from './src/db/schema';

async function seed() {
  const allParties = await db.select().from(parties);
  
  const newElections = [
    {
      name: 'Presidential Election',
      type: 'PRESIDENTIAL',
      state: 'National',
      lga: 'All',
      date: new Date('2027-02-20'),
      status: 'ONGOING'
    },
    {
      name: 'Senatorial Election (Kaduna North)',
      type: 'SENATORIAL',
      state: 'Kaduna',
      lga: 'Kaduna North',
      date: new Date('2027-02-20'),
      status: 'ONGOING'
    },
    {
      name: 'House of Representatives (Soba Constituency)',
      type: 'REPRESENTATIVE',
      state: 'Kaduna',
      lga: 'Soba',
      date: new Date('2027-02-20'),
      status: 'ONGOING'
    },
    {
      name: 'Gubernatorial Election (Kaduna)',
      type: 'GUBERNATORIAL',
      state: 'Kaduna',
      lga: 'All',
      date: new Date('2027-03-11'),
      status: 'ONGOING'
    }
  ];

  for (const elData of newElections) {
    const [insertedEl] = await db.insert(elections).values(elData).returning();
    
    const candidateData = allParties.map(p => ({
      electionId: insertedEl.id,
      partyId: p.id,
      name: `${p.abbreviation} Candidate`
    }));
    
    await db.insert(candidates).values(candidateData);
  }
  
  console.log("Seeded new elections!");
  process.exit(0);
}
seed();
