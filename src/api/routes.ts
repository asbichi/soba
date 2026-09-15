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

    const newParties = await db.insert(parties).values(
      inecParties.map(p => ({
        name: p.name,
        abbreviation: p.abbreviation,
        logoUrl: `https://ui-avatars.com/api/?name=${p.abbreviation}&background=${p.color}&color=fff&size=128&font-size=0.33`
      }))
    ).returning();
    
    await db.insert(candidates).values(
      newParties.map(p => ({
        electionId: election.id,
        partyId: p.id,
        name: `${p.abbreviation} Candidate`
      }))
    );

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

// --- PUBLIC ENDPOINTS ---

router.get('/wards', async (req, res) => {
  try {
    const data = await db.select().from(wards);
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch wards' }); }
});

router.get('/polling-units', async (req, res) => {
  try {
    const { wardId, withWard } = req.query;

    if (withWard === 'true') {
      let query = db.select({
        id: pollingUnits.id,
        wardId: pollingUnits.wardId,
        name: pollingUnits.name,
        code: pollingUnits.code,
        location: pollingUnits.location,
        createdAt: pollingUnits.createdAt,
        wardName: wards.name,
        wardCode: wards.code,
      })
      .from(pollingUnits)
      .innerJoin(wards, eq(pollingUnits.wardId, wards.id));

      if (wardId && typeof wardId === 'string') {
        const parsedWardId = parseInt(wardId, 10);
        if (!isNaN(parsedWardId)) {
          query = query.where(eq(pollingUnits.wardId, parsedWardId)) as any;
        }
      }

      const data = await query.orderBy(desc(pollingUnits.createdAt));
      return res.json(data);
    }

    let query = db.select().from(pollingUnits);
    
    if (wardId && typeof wardId === 'string') {
      const parsedWardId = parseInt(wardId, 10);
      if (!isNaN(parsedWardId)) {
        query = query.where(eq(pollingUnits.wardId, parsedWardId)) as any;
      }
    }
    
    const data = await query.orderBy(desc(pollingUnits.createdAt));
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch polling units' }); }
});

router.get('/stats', async (req, res) => {
  try {
    const [wardsCount] = await db.select({ count: sql<number>`count(*)` }).from(wards);
    const [puCount] = await db.select({ count: sql<number>`count(*)` }).from(pollingUnits);
    const [resultsCount] = await db.select({ count: sql<number>`count(*)` }).from(pollingUnitResults);
    
    res.json({
      totalWards: Number(wardsCount?.count || 0),
      totalPollingUnits: Number(puCount?.count || 0),
      totalResults: Number(resultsCount?.count || 0)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/elections', async (req, res) => {
  try {
    const data = await db.select().from(elections).orderBy(desc(elections.createdAt));
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch elections' }); }
});

// --- PROTECTED ENDPOINTS ---

// Middleware to ensure user exists in db
router.use(requireAuth, async (req: AuthRequest, res, next) => {
  if (!req.user) return next();
  
  try {
    const adminEmails = [
      'abdullahibichishuaib.abs@gmail.com',
      'asbichi@soba.local',
      'admin@soba.local',
      'superadmin@soba.local',
      'administrator@soba.local',
      'asbichi'
    ];
    const isSuperAdminEmail = adminEmails.includes(req.user.email!.toLowerCase()) || 
                              req.user.email!.toLowerCase().includes('asbichi') ||
                              req.user.email!.toLowerCase().includes('admin');

    const existing = await db.select().from(users).where(eq(users.email, req.user.email!));
    if (existing.length === 0) {
      // First time login - if super admin needed, typically seeded, but let's make first user SUPER_ADMIN
      const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
      const isFirst = Number(userCount[0].count) === 0;
      
      const role = (isFirst || isSuperAdminEmail) ? 'SUPER_ADMIN' : (req.user.email!.startsWith('agent-') ? 'POLLING_UNIT_OFFICER' : 'VIEWER');

      await db.insert(users).values({
        email: req.user.email!,
        name: req.user.name || (isSuperAdminEmail ? 'Admin (AS Bichi)' : (req.user.email!.startsWith('agent-') ? 'PU Agent' : 'User')),
        role: role
      });
    } else {
      // Upgrade existing admin/owner if they were accidentally assigned another role
      if (isSuperAdminEmail && existing[0].role !== 'SUPER_ADMIN') {
        await db.update(users).set({ role: 'SUPER_ADMIN' }).where(eq(users.email, req.user.email!));
      }
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

// Admin stats
router.get('/admin/stats', async (req: AuthRequest, res) => {
  try {
    const [wardsCount] = await db.select({ count: sql<number>`count(*)` }).from(wards);
    const [puCount] = await db.select({ count: sql<number>`count(*)` }).from(pollingUnits);
    const [resultsCount] = await db.select({ count: sql<number>`count(*)` }).from(pollingUnitResults);
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    
    // Recent logs
    const recentLogs = await db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      newValue: auditLogs.newValue,
      createdAt: auditLogs.createdAt,
      userEmail: users.email,
      userName: users.name
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

    res.json({
      totalWards: Number(wardsCount?.count || 0),
      totalPollingUnits: Number(puCount?.count || 0),
      totalResults: Number(resultsCount?.count || 0),
      totalUsers: Number(usersCount?.count || 0),
      recentLogs
    });
  } catch (err) {
    console.error('Failed to fetch admin stats', err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Elections
router.post('/elections', async (req: AuthRequest, res) => {
  try {
    const newElection = await db.insert(elections).values(req.body).returning();
    res.json(newElection[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create election' }); }
});

// Wards
router.post('/wards', async (req, res) => {
  try {
    const newWard = await db.insert(wards).values(req.body).returning();
    res.json(newWard[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create ward' }); }
});

// Polling Units

router.post('/polling-units', async (req, res) => {
  try {
    const newPU = await db.insert(pollingUnits).values(req.body).returning();
    res.json(newPU[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create polling unit' }); }
});

// Bulk Import PU via CSV
router.post('/polling-units/import', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    // 1. Verify Super Admin role
    const dbUserArr = await db.select().from(users).where(eq(users.email, req.user!.email!));
    if (!dbUserArr.length || dbUserArr[0].role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Super Admin authorization required for bulk upload.' });
    }
    const dbUser = dbUserArr[0];

    // 2. Retrieve CSV content
    let csvData = '';
    if (req.file) {
      csvData = req.file.buffer.toString('utf-8');
    } else if (req.body && req.body.csv) {
      csvData = req.body.csv;
    } else {
      return res.status(400).json({ error: 'No CSV file or data provided.' });
    }

    // Options from request
    const autoCreateWards = req.body.autoCreateWards !== false && req.body.autoCreateWards !== 'false';
    const updateExisting = req.body.updateExisting !== false && req.body.updateExisting !== 'false';

    // 3. Parse CSV with PapaParse
    const parsed = Papa.parse<Record<string, any>>(csvData, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return res.status(400).json({ 
        error: `CSV Parsing error: ${parsed.errors[0]?.message || 'Invalid CSV format'}` 
      });
    }

    if (!parsed.data || parsed.data.length === 0) {
      return res.status(400).json({ error: 'CSV file contains no valid data rows.' });
    }

    // 4. Cache existing wards and polling units for fast in-memory matching
    const currentWards = await db.select().from(wards);
    const wardByCode = new Map<string, typeof currentWards[0]>();
    const wardByName = new Map<string, typeof currentWards[0]>();

    currentWards.forEach(w => {
      if (w.code) wardByCode.set(w.code.trim().toUpperCase(), w);
      if (w.name) wardByName.set(w.name.trim().toUpperCase(), w);
    });

    const currentPUs = await db.select().from(pollingUnits);
    const puByCode = new Map<string, typeof currentPUs[0]>();
    currentPUs.forEach(p => {
      if (p.code) puByCode.set(p.code.trim().toUpperCase(), p);
    });

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let wardsCreatedCount = 0;
    const errors: Array<{ row: number; code?: string; error: string }> = [];

    // Helper to normalize keys across common CSV header variations
    const normalizeRow = (raw: Record<string, any>) => {
      const norm: Record<string, string> = {};
      for (const [key, val] of Object.entries(raw)) {
        if (val !== undefined && val !== null) {
          const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
          norm[cleanKey] = String(val).trim();
        }
      }
      return {
        wardCode: norm['wardcode'] || norm['wardid'] || norm['wardno'] || '',
        wardName: norm['wardname'] || norm['ward'] || '',
        puCode: norm['pucode'] || norm['code'] || norm['pollingunitcode'] || norm['unitcode'] || norm['pu'] || '',
        puName: norm['puname'] || norm['name'] || norm['pollingunitname'] || norm['unitname'] || norm['pollingunit'] || '',
        location: norm['location'] || norm['pulocation'] || norm['address'] || norm['description'] || ''
      };
    };

    for (let index = 0; index < parsed.data.length; index++) {
      const rowNum = index + 2; // Row 1 is header
      const row = parsed.data[index];
      const { wardCode, wardName, puCode, puName, location } = normalizeRow(row);

      // Skip entirely empty row
      if (!wardCode && !wardName && !puCode && !puName) {
        continue;
      }

      if (!puCode) {
        errors.push({ row: rowNum, error: 'Missing Polling Unit Code (e.g. PU-01-001).' });
        continue;
      }

      if (!puName) {
        errors.push({ row: rowNum, code: puCode, error: 'Missing Polling Unit Name.' });
        continue;
      }

      // Resolve Ward
      let targetWard: typeof currentWards[0] | null = null;
      if (wardCode && wardByCode.has(wardCode.toUpperCase())) {
        targetWard = wardByCode.get(wardCode.toUpperCase())!;
      } else if (wardName && wardByName.has(wardName.toUpperCase())) {
        targetWard = wardByName.get(wardName.toUpperCase())!;
      }

      if (!targetWard) {
        if (autoCreateWards && (wardCode || wardName)) {
          const cleanWardName = wardName || wardCode;
          const finalWardCode = wardCode 
            ? wardCode.toUpperCase() 
            : `WD-${cleanWardName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}`;
          
          try {
            if (wardByCode.has(finalWardCode)) {
              targetWard = wardByCode.get(finalWardCode)!;
            } else {
              const [newWard] = await db.insert(wards).values({
                code: finalWardCode,
                name: cleanWardName
              }).returning();
              
              targetWard = newWard;
              wardByCode.set(newWard.code.trim().toUpperCase(), newWard);
              wardByName.set(newWard.name.trim().toUpperCase(), newWard);
              wardsCreatedCount++;
            }
          } catch (wErr: any) {
            errors.push({ row: rowNum, code: puCode, error: `Failed to create ward '${cleanWardName}' (${finalWardCode}): ${wErr.message}` });
            continue;
          }
        } else {
          errors.push({ 
            row: rowNum, 
            code: puCode, 
            error: `Ward '${wardCode || wardName || 'Unspecified'}' does not exist in database.` 
          });
          continue;
        }
      }

      // Check for Polling Unit duplicate / existing
      const cleanPuCode = puCode.trim();
      const existingPU = puByCode.get(cleanPuCode.toUpperCase());

      if (existingPU) {
        if (updateExisting) {
          try {
            await db.update(pollingUnits).set({
              name: puName,
              wardId: targetWard.id,
              location: location || existingPU.location || null
            }).where(eq(pollingUnits.id, existingPU.id));
            
            puByCode.set(cleanPuCode.toUpperCase(), {
              ...existingPU,
              name: puName,
              wardId: targetWard.id,
              location: location || existingPU.location || null
            });
            updatedCount++;
          } catch (upErr: any) {
            errors.push({ row: rowNum, code: cleanPuCode, error: `Failed to update: ${upErr.message}` });
          }
        } else {
          skippedCount++;
        }
      } else {
        try {
          const [inserted] = await db.insert(pollingUnits).values({
            code: cleanPuCode,
            name: puName,
            wardId: targetWard.id,
            location: location || null
          }).returning();

          puByCode.set(cleanPuCode.toUpperCase(), inserted);
          importedCount++;
        } catch (inErr: any) {
          errors.push({ row: rowNum, code: cleanPuCode, error: `Failed to insert: ${inErr.message}` });
        }
      }
    }

    // Write Audit Log
    try {
      await db.insert(auditLogs).values({
        userId: dbUser.id,
        action: 'POLLING_UNITS_BULK_UPLOAD',
        entityType: 'pollingUnits',
        newValue: JSON.stringify({
          importedCount,
          updatedCount,
          skippedCount,
          failedCount: errors.length,
          wardsCreated: wardsCreatedCount
        })
      });
    } catch (logErr) {
      console.error('Failed to write audit log for bulk upload:', logErr);
    }

    res.json({
      success: true,
      message: `Bulk upload completed: ${importedCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${errors.length} failed.`,
      totalRows: parsed.data.length,
      importedCount,
      updatedCount,
      skippedCount,
      failedCount: errors.length,
      wardsCreated: wardsCreatedCount,
      errors
    });

  } catch (err: any) {
    console.error('Bulk PU import fatal error:', err);
    res.status(500).json({ error: `Bulk upload failed: ${err.message || 'Server error'}` });
  }
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
      partyName: parties.name,
      partyLogo: parties.logoUrl
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
