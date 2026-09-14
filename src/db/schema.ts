import { pgTable, serial, text, timestamp, integer, varchar, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // SUPER_ADMIN, COLLATION_OFFICER, POLLING_UNIT_OFFICER, VIEWER
  assignedWardId: integer('assigned_ward_id'),
  assignedPollingUnitId: integer('assigned_polling_unit_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const elections = pgTable('elections', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  lga: varchar('lga', { length: 100 }).notNull(),
  date: timestamp('date').notNull(),
  status: varchar('status', { length: 50 }).default('UPCOMING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wards = pgTable('wards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pollingUnits = pgTable('polling_units', {
  id: serial('id').primaryKey(),
  wardId: integer('ward_id').references(() => wards.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  location: text('location'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const parties = pgTable('parties', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  abbreviation: varchar('abbreviation', { length: 20 }).notNull().unique(),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const candidates = pgTable('candidates', {
  id: serial('id').primaryKey(),
  electionId: integer('election_id').references(() => elections.id).notNull(),
  partyId: integer('party_id').references(() => parties.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pollingUnitResults = pgTable('polling_unit_results', {
  id: serial('id').primaryKey(),
  electionId: integer('election_id').references(() => elections.id).notNull(),
  pollingUnitId: integer('polling_unit_id').references(() => pollingUnits.id).notNull(),
  submittedById: integer('submitted_by_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, SUBMITTED, VERIFIED, REJECTED
  registeredVoters: integer('registered_voters'),
  accreditedVoters: integer('accredited_voters'),
  totalVotesCast: integer('total_votes_cast'),
  rejectedVotes: integer('rejected_votes'),
  totalValidVotes: integer('total_valid_votes'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  verifiedById: integer('verified_by_id').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  verificationNotes: text('verification_notes'),
}, (table) => [
  uniqueIndex('unq_pu_election').on(table.electionId, table.pollingUnitId)
]);

export const candidateResults = pgTable('candidate_results', {
  id: serial('id').primaryKey(),
  pollingUnitResultId: integer('polling_unit_result_id').references(() => pollingUnitResults.id).notNull(),
  candidateId: integer('candidate_id').references(() => candidates.id).notNull(),
  partyId: integer('party_id').references(() => parties.id).notNull(),
  votes: integer('votes').notNull().default(0),
});

export const resultEvidence = pgTable('result_evidence', {
  id: serial('id').primaryKey(),
  pollingUnitResultId: integer('polling_unit_result_id').references(() => pollingUnitResults.id).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  uploadedById: integer('uploaded_by_id').references(() => users.id).notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: integer('entity_id'),
  previousValue: text('previous_value'),
  newValue: text('new_value'),
  ipAddress: varchar('ip_address', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
