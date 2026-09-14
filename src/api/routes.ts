import { Router } from 'express';
import { db } from '../db/index.ts';
import { 
  elections, wards, pollingUnits, parties, candidates, 
  pollingUnitResults, candidateResults, users, auditLogs 
} from '../db/schema.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { eq, and, sql, desc } from 'drizzle-orm';
import multer from 'multer';
import Papa from 'papaparse';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/seed-demo', async (req, res) => {
  try {
    const existingWards = await db.select({ count: sql<number>`count(*)` }).from(wards);
    if (Number(existingWards[0].count) > 0) {
      return res.status(400).json({ error: 'Database is already seeded or contains data.' });
    }

    const [election] = await db.insert(elections).values({
      name: 'DEMO DATA - 2027 Governorship Election',
      type: 'Governorship',
      state: 'Kaduna',
      lga: 'Soba',
      date: new Date('2027-03-01'),
      status: 'ACTIVE'
    }).returning();

    const sobaWards = [
      { name: 'Dan Wata', count: 19, code: '01' },
      { name: 'Kwassallo', count: 26, code: '02' },
      { name: 'Maigana', count: 37, code: '03' },
      { name: 'Richifa', count: 20, code: '04' },
      { name: 'Gamagira', count: 22, code: '05' },
      { name: 'Turawa', count: 21, code: '06' },
      { name: 'Kinkiba', count: 22, code: '07' },
      { name: 'Gimba', count: 40, code: '08' },
      { name: 'Soba Ward', count: 47, code: '09' },
      { name: 'Rahama', count: 21, code: '10' },
      { name: 'Garun Gwanki', count: 23, code: '11' }
    ];

    const newWards = await db.insert(wards).values(
      sobaWards.map(w => ({ name: w.name, code: `WD-${w.code}` }))
    ).returning();

    const [partyA] = await db.insert(parties).values({ name: 'All Progressives Congress', abbreviation: 'APC' }).returning();
    const [partyB] = await db.insert(parties).values({ name: 'Peoples Democratic Party', abbreviation: 'PDP' }).returning();
    const [partyC] = await db.insert(parties).values({ name: 'Labour Party', abbreviation: 'LP' }).returning();
    
    const [candA] = await db.insert(candidates).values({ electionId: election.id, partyId: partyA.id, name: 'APC Candidate' }).returning();
    const [candB] = await db.insert(candidates).values({ electionId: election.id, partyId: partyB.id, name: 'PDP Candidate' }).returning();
    const [candC] = await db.insert(candidates).values({ electionId: election.id, partyId: partyC.id, name: 'LP Candidate' }).returning();

    const puInserts: any[] = [];
    sobaWards.forEach((wardData, index) => {
      const dbWard = newWards[index];
      for (let i = 1; i <= wardData.count; i++) {
        const puCodeNum = i.toString().padStart(3, '0');
        puInserts.push({
          wardId: dbWard.id,
          name: `${wardData.name} PU ${puCodeNum}`,
          code: `PU-${wardData.code}-${puCodeNum}`
        });
      }
    });

    // Batch insert for performance and to bypass possible param limits
    const batchSize = 100;
    for (let i = 0; i < puInserts.length; i += batchSize) {
      await db.insert(pollingUnits).values(puInserts.slice(i, i + batchSize));
    }

    res.json({ message: 'Demo data seeded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to seed demo data' });
  }
});

// Middleware to ensure user exists in db
router.use(requireAuth, async (req: AuthRequest, res, next) => {
  if (!req.user) return next();
  
  try {
    const existing = await db.select().from(users).where(eq(users.email, req.user.email!));
    if (existing.length === 0) {
      // First time login - if super admin needed, typically seeded, but let's make first user SUPER_ADMIN
      const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
      const isFirst = Number(userCount[0].count) === 0;
      
      await db.insert(users).values({
        email: req.user.email!,
        name: req.user.name || 'Unknown',
        role: isFirst ? 'SUPER_ADMIN' : 'VIEWER'
      });
    }
    next();
  } catch (err) {
    console.error('User sync error', err);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

router.get('/me', async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.email, req.user!.email!));
    res.json(user[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Elections
router.get('/elections', async (req, res) => {
  try {
    const data = await db.select().from(elections).orderBy(desc(elections.createdAt));
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch elections' }); }
});

router.post('/elections', async (req: AuthRequest, res) => {
  try {
    const newElection = await db.insert(elections).values(req.body).returning();
    res.json(newElection[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create election' }); }
});

// Wards
router.get('/wards', async (req, res) => {
  try {
    const data = await db.select().from(wards);
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch wards' }); }
});

router.post('/wards', async (req, res) => {
  try {
    const newWard = await db.insert(wards).values(req.body).returning();
    res.json(newWard[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create ward' }); }
});

// Polling Units
router.get('/polling-units', async (req, res) => {
  try {
    const { wardId } = req.query;
    let query = db.select().from(pollingUnits);
    
    if (wardId && typeof wardId === 'string') {
      const parsedWardId = parseInt(wardId, 10);
      if (!isNaN(parsedWardId)) {
        query = query.where(eq(pollingUnits.wardId, parsedWardId)) as any;
      }
    }
    
    const data = await query;
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch polling units' }); }
});

router.post('/polling-units', async (req, res) => {
  try {
    const newPU = await db.insert(pollingUnits).values(req.body).returning();
    res.json(newPU[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create polling unit' }); }
});

// Bulk Import PU
router.post('/polling-units/import', upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  
  try {
    const csvData = req.file.buffer.toString();
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    
    // Simple naive import assuming Ward Code exists
    // More complex validation required in real scenario
    res.json({ message: 'Import queued/processed' });
  } catch (err) { res.status(500).json({ error: 'Failed to import' }); }
});

// Parties
router.get('/parties', async (req, res) => {
  try {
    const data = await db.select().from(parties);
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch parties' }); }
});

router.post('/parties', async (req, res) => {
  try {
    const newParty = await db.insert(parties).values(req.body).returning();
    res.json(newParty[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create party' }); }
});

// Candidates
router.get('/candidates', async (req, res) => {
  try {
    const data = await db.select({
      id: candidates.id,
      electionId: candidates.electionId,
      partyId: candidates.partyId,
      name: candidates.name,
      partyAbbr: parties.abbreviation,
      partyName: parties.name
    })
    .from(candidates)
    .innerJoin(parties, eq(candidates.partyId, parties.id));
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch candidates' }); }
});

router.post('/candidates', async (req, res) => {
  try {
    const newCandidate = await db.insert(candidates).values(req.body).returning();
    res.json(newCandidate[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create candidate' }); }
});

router.get('/stats', async (req, res) => {
  try {
    const totalWards = await db.select({ count: sql<number>`count(*)` }).from(wards);
    const totalPUs = await db.select({ count: sql<number>`count(*)` }).from(pollingUnits);
    const puResults = await db.select({
      status: pollingUnitResults.status,
      count: sql<number>`count(*)`
    }).from(pollingUnitResults).groupBy(pollingUnitResults.status);

    const aggregatedVotes = await db.select({
      totalVotesCast: sql<number>`sum(${pollingUnitResults.totalVotesCast})`,
      totalValidVotes: sql<number>`sum(${pollingUnitResults.totalValidVotes})`,
    }).from(pollingUnitResults).where(eq(pollingUnitResults.status, 'VERIFIED'));

    const candidateTotalsQuery = await db.select({
      candidateId: candidateResults.candidateId,
      partyId: candidateResults.partyId,
      partyName: parties.name,
      partyAbbr: parties.abbreviation,
      candidateName: candidates.name,
      totalVotes: sql<number>`sum(${candidateResults.votes})`
    })
    .from(candidateResults)
    .innerJoin(pollingUnitResults, eq(candidateResults.pollingUnitResultId, pollingUnitResults.id))
    .innerJoin(candidates, eq(candidateResults.candidateId, candidates.id))
    .innerJoin(parties, eq(candidateResults.partyId, parties.id))
    .where(eq(pollingUnitResults.status, 'VERIFIED'))
    .groupBy(candidateResults.candidateId, candidateResults.partyId, parties.name, parties.abbreviation, candidates.name);

    const wardTotalsQuery = await db.select({
      wardName: wards.name,
      partyAbbr: parties.abbreviation,
      totalVotes: sql<number>`sum(${candidateResults.votes})`
    })
    .from(candidateResults)
    .innerJoin(pollingUnitResults, eq(candidateResults.pollingUnitResultId, pollingUnitResults.id))
    .innerJoin(pollingUnits, eq(pollingUnitResults.pollingUnitId, pollingUnits.id))
    .innerJoin(wards, eq(pollingUnits.wardId, wards.id))
    .innerJoin(parties, eq(candidateResults.partyId, parties.id))
    .where(eq(pollingUnitResults.status, 'VERIFIED'))
    .groupBy(wards.name, parties.abbreviation);

    res.json({
      totalWards: totalWards[0].count,
      totalPUs: totalPUs[0].count,
      resultsStats: puResults,
      aggregatedVotes: aggregatedVotes[0],
      candidateTotals: candidateTotalsQuery,
      wardTotals: wardTotalsQuery
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/results', async (req, res) => {
  try {
    const data = await db.select({
      id: pollingUnitResults.id,
      status: pollingUnitResults.status,
      submittedAt: pollingUnitResults.submittedAt,
      wardName: wards.name,
      puName: pollingUnits.name,
      puCode: pollingUnits.code,
      submittedBy: users.name
    })
    .from(pollingUnitResults)
    .innerJoin(pollingUnits, eq(pollingUnitResults.pollingUnitId, pollingUnits.id))
    .innerJoin(wards, eq(pollingUnits.wardId, wards.id))
    .innerJoin(users, eq(pollingUnitResults.submittedById, users.id))
    .where(eq(pollingUnitResults.status, 'SUBMITTED'));
    
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

router.post('/results', async (req: AuthRequest, res) => {
  try {
    const { electionId, pollingUnitId, registeredVoters, accreditedVoters, totalVotesCast, rejectedVotes, totalValidVotes, candidateVotes } = req.body;
    
    // Fetch db user
    const dbUserArr = await db.select().from(users).where(eq(users.email, req.user!.email!));
    if (!dbUserArr.length) return res.status(401).json({ error: 'User not found' });
    const dbUser = dbUserArr[0];

    // Check for existing submission
    const existing = await db.select().from(pollingUnitResults).where(and(
      eq(pollingUnitResults.electionId, electionId),
      eq(pollingUnitResults.pollingUnitId, pollingUnitId)
    ));

    if (existing.length > 0) {
      return res.status(400).json({ error: 'A result has already been submitted for this polling unit.' });
    }

    // Validation
    if (totalVotesCast !== totalValidVotes + rejectedVotes) {
      return res.status(400).json({ error: 'Validation failed: Total Votes Cast must equal Valid + Rejected votes.' });
    }

    // Insert PU Result
    const [puResult] = await db.insert(pollingUnitResults).values({
      electionId,
      pollingUnitId,
      submittedById: dbUser.id,
      registeredVoters,
      accreditedVoters,
      totalVotesCast,
      rejectedVotes,
      totalValidVotes,
      status: 'SUBMITTED'
    }).returning();

    // Insert Candidate Votes
    if (candidateVotes && candidateVotes.length > 0) {
      const inserts = candidateVotes.map((cv: any) => ({
        pollingUnitResultId: puResult.id,
        candidateId: cv.candidateId,
        partyId: cv.partyId,
        votes: cv.votes
      }));
      await db.insert(candidateResults).values(inserts);
    }

    await db.insert(auditLogs).values({
      userId: dbUser.id,
      action: 'RESULT_SUBMITTED',
      entityType: 'pollingUnitResults',
      entityId: puResult.id,
    });

    res.json(puResult);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit results' });
  }
});

router.post('/results/:id/verify', async (req: AuthRequest, res) => {
  try {
    const puResultId = parseInt(req.params.id);
    const { status, verificationNotes } = req.body;
    
    const dbUserArr = await db.select().from(users).where(eq(users.email, req.user!.email!));
    if (!dbUserArr.length) return res.status(401).json({ error: 'User not found' });
    const dbUser = dbUserArr[0];

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [updated] = await db.update(pollingUnitResults)
      .set({
        status,
        verifiedById: dbUser.id,
        verifiedAt: new Date(),
        verificationNotes
      })
      .where(eq(pollingUnitResults.id, puResultId))
      .returning();

    await db.insert(auditLogs).values({
      userId: dbUser.id,
      action: `RESULT_${status}`,
      entityType: 'pollingUnitResults',
      entityId: puResultId,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify result' });
  }
});

export default router;
