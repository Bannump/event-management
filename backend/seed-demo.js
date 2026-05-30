/**
 * Comprehensive demo seed — covers every use case + edge case in the app.
 * Run with:  node seed-demo.js
 */
require('dotenv').config();
const { Client } = require('./node_modules/pg');
const bcrypt = require('./node_modules/bcrypt');
const crypto = require('crypto');

const uid = () => crypto.randomUUID();
const PW = 'Test@1234'; // password for all demo users

// ─── IDs ──────────────────────────────────────────────────────────────────────
// Orgs
const org1 = '9896398d-33fd-464c-9cb6-13010d7a79ce';
const org2 = '08a30e48-db96-42bf-9117-eddc4bc5fcd9';
const org3 = '1a8c9d5d-6a4f-4eb0-8229-3e67228143f3';

// Users
const uAlice  = '73f1878a-9162-4a10-99be-a9b8e207d718'; // TechCorp admin
const uBob    = '1247559d-d36d-438e-8f26-eeac06429e5c'; // MedHealth admin
const uCarol  = '966b48ae-6b53-45ea-af28-9fd6db4bab88'; // EduLearn admin
const uDave   = 'bed562d0-47af-4681-a413-1c2a74b1552a'; // TechCorp user
const uEmma   = 'bc18f9dd-5a45-422f-ba36-09e8baa23aff'; // TechCorp user
const uFrank  = '5aa3f2f4-ceab-42e7-ac64-21753f4b00c0'; // TechCorp user
const uGrace  = '1241a703-54fc-436e-8e91-c05cc8663619'; // MedHealth user
const uHenry  = '14519562-67c4-4ede-8e96-83a61b23d7fc'; // MedHealth user
const uIris   = '6bfe619a-4a71-43d3-8fc5-5c30eead04fb'; // MedHealth user
const uJack   = '226bb1d9-6db4-4649-a309-ed6d8105e5d9'; // EduLearn user
const uKate   = '995aa78e-f62e-4681-8760-ac197ce5817f'; // EduLearn user
const uLiam   = '46f3d9b2-1da5-49ee-93f1-4c13560e1383'; // EduLearn user
const uMorgan = '4bf338b5-46df-4e56-af75-1f27c60bf0cd'; // independent user

// Resources
const r1  = 'e577f8f5-6bf3-4541-a0fe-e831bd0185b5'; // Main Conference Hall
const r2  = 'cc05992d-a44b-4fe2-87dc-51527a33b990'; // Training Room A
const r3  = '6bed73e0-5232-4868-b1cc-81e45d683329'; // AV Equipment Set
const r4  = '15b042e6-76ee-4e6f-b58e-4d61c7c147b2'; // Catering Service
const r5  = 'e5594c70-baeb-4f13-a327-73a5518ee08b'; // Laptop Pool
const r6  = '7dfcb373-f600-4c43-a7ae-2c114e4f0c46'; // Medical Seminar Hall
const r7  = 'cfa250f9-5ad8-47ac-bad4-f921b6498583'; // Lab Equipment Kit
const r8  = '74ccc539-8ce9-4fe8-8c8e-75eb26f5d9f5'; // Medical Supplies Pack
const r9  = '1e99f573-3da2-492a-884a-591a9e0aea52'; // Main Auditorium
const r10 = 'b1379ccc-8e1c-44cb-9168-1b85cd803765'; // Computer Lab
const r11 = 'b6e5b622-b638-4604-a19a-1a0e7878669f'; // Stationery Bundle

// Events — timestamps relative to now
const now = new Date();
const dt = (daysOffset, h=9, m=0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

// TechCorp events
const e1  = 'bee2cbe1-4301-4c94-b1fe-ab59b82ade11'; // Tech Innovation Summit 2026 (upcoming parent)
const e1a = '04650d40-bc81-4093-9055-cc700ef3886e'; // Summit Day 1 (child)
const e1b = '2df796b4-5ad2-481d-977f-32b274cb0dc8'; // Summit Day 2 (child)
const e2  = '7f19e670-005e-47af-97cb-552d8067f647'; // DevOps Workshop (overlaps with e3 → resource violation)
const e3  = '4e3a4ee3-8cdf-4e86-b744-2377de6f7873'; // Cybersecurity Training Sprint (ONGOING NOW)
const e4  = 'bd40b4fb-bb25-4c35-8876-a0b0718aa9b2'; // Q1 All-Hands (past — with check-ins and no-shows)
const e5  = '047469a3-dbf2-4c35-b950-856da6a7070e'; // New Employee Onboarding (past — EXACTLY at capacity 5)
const e6  = '247772e1-0a08-4d69-917d-5e24dd3437e4'; // Team Building Hackathon (DRAFT)
const e7  = '5190f7ee-b8b8-4203-8931-6382acfbeca7'; // Emergency Response Drill (ONGOING — overlaps e3, double-books Dave)

// MedHealth events
const e8  = 'baa1d78f-36c5-41c0-a761-48081c3ba018'; // International Medical Conference (upcoming, external)
const e9  = 'f9566b10-e0a7-4bae-8c47-723f5e9235d2'; // HIPAA Compliance Training (upcoming)
const e10 = '45ae8c39-18dd-45fa-ab47-bbc3a816326a'; // Annual Health Fair (past, external, check-ins)
const e11 = 'fc97a42e-7567-45a6-99d6-61e42aeee264'; // Medical Research Symposium (CANCELLED)

// EduLearn events
const e12 = 'd91dc866-e117-473d-99e2-d3b9eae49345'; // Annual Education Summit (upcoming, external)
const e13 = '008dddf7-ba8e-4f00-bd7b-84b52b5d7730'; // Advanced Teaching Methods Workshop (upcoming)
const e14 = 'ecaa1b85-a6ff-4406-b656-23711f893c63'; // Student Welcome Orientation (past, check-ins)
const e15 = '1b4c0f6b-ccae-49d7-a08b-2a2ae25a43f3'; // Curriculum Development Sprint (DRAFT)

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function run() {
  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'event_booking',
  });
  await db.connect();
  const q = (sql, p=[]) => db.query(sql, p);
  const log = (msg) => process.stdout.write(`  ${msg}\n`);

  try {
    // ── 0. CLEANUP previous seed data ─────────────────────────────────────────
    log('Cleaning up previous seed data...');
    const existingOrgs = await q(
      `SELECT id FROM organizations WHERE name = ANY($1::text[])`,
      [['TechCorp Inc', 'MedHealth Solutions', 'EduLearn Academy']]
    );
    const existingOrgIds = existingOrgs.rows.map(r => r.id);
    if (existingOrgIds.length > 0) {
      const evtRows = await q(`SELECT id FROM events WHERE "organizationId" = ANY($1::uuid[])`, [existingOrgIds]);
      const resRows = await q(`SELECT id FROM resources WHERE "organizationId" = ANY($1::uuid[])`, [existingOrgIds]);
      const evtIds  = evtRows.rows.map(r => r.id);
      const resIds  = resRows.rows.map(r => r.id);
      if (evtIds.length > 0) {
        await q(`DELETE FROM resource_allocations WHERE "eventId" = ANY($1::uuid[])`, [evtIds]);
        await q(`DELETE FROM attendances WHERE "eventId" = ANY($1::uuid[])`, [evtIds]);
        await q(`DELETE FROM invites WHERE "eventId" = ANY($1::uuid[])`, [evtIds]);
      }
      if (resIds.length > 0) {
        await q(`DELETE FROM inventory_transactions WHERE "resourceId" = ANY($1::uuid[])`, [resIds]);
        await q(`DELETE FROM resource_allocations WHERE "resourceId" = ANY($1::uuid[])`, [resIds]);
      }
      await q(`DELETE FROM events WHERE "organizationId" = ANY($1::uuid[])`, [existingOrgIds]);
      await q(`DELETE FROM resources WHERE "organizationId" = ANY($1::uuid[])`, [existingOrgIds]);
      await q(`DELETE FROM users WHERE "organizationId" = ANY($1::uuid[])`, [existingOrgIds]);
      await q(`DELETE FROM organizations WHERE id = ANY($1::uuid[])`, [existingOrgIds]);
    }
    await q(`DELETE FROM users WHERE email = 'morgan@personal.com'`);

    // ── 1. ORGANIZATIONS ──────────────────────────────────────────────────────
    log('Creating organizations...');
    await q(`INSERT INTO organizations (id, name, "emailTemplate", "createdAt") VALUES
      ($1,'TechCorp Inc','@techcorp.com',NOW()),
      ($2,'MedHealth Solutions','@medhealth.com',NOW()),
      ($3,'EduLearn Academy','@edulearn.com',NOW())
      ON CONFLICT DO NOTHING`,
      [org1, org2, org3]);

    // ── 2. USERS ──────────────────────────────────────────────────────────────
    log('Creating users...');
    const pw = await bcrypt.hash(PW, 10);

    const users = [
      // Org admins
      [uAlice, 'alice@techcorp.com',  'Alice Johnson',      pw, 'org',  org1],
      [uBob,   'bob@medhealth.com',   'Bob Williams',       pw, 'org',  org2],
      [uCarol, 'carol@edulearn.com',  'Carol Davis',        pw, 'org',  org3],
      // TechCorp members
      [uDave,  'dave@techcorp.com',   'Dave Brown',         pw, 'user', org1],
      [uEmma,  'emma@techcorp.com',   'Emma Wilson',        pw, 'user', org1],
      [uFrank, 'frank@techcorp.com',  'Frank Miller',       pw, 'user', org1],
      // MedHealth members
      [uGrace, 'grace@medhealth.com', 'Grace Taylor',       pw, 'user', org2],
      [uHenry, 'henry@medhealth.com', 'Henry Anderson',     pw, 'user', org2],
      [uIris,  'iris@medhealth.com',  'Iris Thomas',        pw, 'user', org2],
      // EduLearn members
      [uJack,  'jack@edulearn.com',   'Jack Jackson',       pw, 'user', org3],
      [uKate,  'kate@edulearn.com',   'Kate White',         pw, 'user', org3],
      [uLiam,  'liam@edulearn.com',   'Liam Harris',        pw, 'user', org3],
      // Independent user (no org)
      [uMorgan,'morgan@personal.com', 'Morgan Lee',         pw, 'user', null],
    ];
    for (const [id, email, name, password, role, orgId] of users) {
      await q(`INSERT INTO users (id, email, name, password, role, "organizationId", "createdAt")
               VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT (email) DO NOTHING`,
        [id, email, name, password, role, orgId]);
    }

    // ── 3. RESOURCES ──────────────────────────────────────────────────────────
    log('Creating resources...');
    const res = (id, name, desc, type, qty, maxC, orgId) =>
      q(`INSERT INTO resources (id, name, description, type, "availableQuantity", "maxConcurrentUsage", "isGlobal", "organizationId", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,false,$7,NOW()) ON CONFLICT DO NOTHING`,
        [id, name, desc, type, qty, maxC, orgId]);

    // TechCorp
    await res(r1, 'Main Conference Hall',  'Seats 200, full AV system and stage',              'exclusive',  1,    null, org1);
    await res(r2, 'Training Room A',       'Modular room for workshops, capacity 30',           'shareable',  1,    3,    org1);
    await res(r3, 'AV Equipment Set',      'Projectors, microphones and display screens',       'shareable',  5,    5,    org1);
    await res(r4, 'Catering Service',      'In-house catering — meals & refreshments',          'consumable', 0,    null, org1);
    await res(r5, 'Laptop Pool',           'Dell laptops for workshops and training',            'shareable',  20,   20,   org1);
    // MedHealth
    await res(r6, 'Medical Seminar Hall',  '500-seat hall with podium and AV',                 'exclusive',  1,    null, org2);
    await res(r7, 'Lab Equipment Kit',     'Diagnostic tools and lab instruments',              'shareable',  1,    2,    org2);
    await res(r8, 'Medical Supplies Pack', 'First aid and demonstration medical supplies',      'consumable', 0,    null, org2);
    // EduLearn
    await res(r9,  'Main Auditorium',      '600-seat auditorium with advanced AV',              'exclusive',  1,    null, org3);
    await res(r10, 'Computer Lab',         '40 workstations, shared access up to 4 concurrent', 'shareable',  1,    4,    org3);
    await res(r11, 'Stationery Bundle',    'Notebooks, pens and printed materials per attendee','consumable', 0,    null, org3);

    // ── 4. EVENTS ─────────────────────────────────────────────────────────────
    log('Creating events...');
    const evt = (id, title, desc, start, end, cap, status, external, orgId, parentId) =>
      q(`INSERT INTO events (id, title, description, "startTime", "endTime", capacity, status,
           "allowExternalAttendees", "organizationId", "parentEventId", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) ON CONFLICT DO NOTHING`,
        [id, title, desc, start, end, cap, status, external, orgId, parentId]);

    // ── TechCorp ──
    await evt(e1,  'Tech Innovation Summit 2026',
      'Two-day flagship technology summit covering AI, Cloud, DevOps and Security. Open to industry professionals.',
      dt(14,9), dt(15,18), 150, 'published', true,  org1, null);

    await evt(e1a, 'Summit Day 1: AI & Cloud Futures',
      'Morning keynotes on AI breakthroughs; afternoon deep-dives into cloud architecture.',
      dt(14,9), dt(14,17), 80,  'published', false, org1, e1);

    await evt(e1b, 'Summit Day 2: DevOps & Security',
      'Hands-on DevOps pipelines in the morning; cybersecurity threat modelling in the afternoon.',
      dt(15,9), dt(15,18), 80,  'published', false, org1, e1);

    // DevOps Workshop — upcoming but its time block OVERLAPS with e3 (both use Main Hall → VIOLATION)
    await evt(e2,  'Advanced DevOps Workshop',
      'Intensive workshop on CI/CD pipelines, infrastructure-as-code, and container orchestration. Main Hall double-booked.',
      new Date(now.getTime()-2*3600000).toISOString(),
      new Date(now.getTime()+5*3600000).toISOString(),
      30, 'published', false, org1, null);

    // Cybersecurity Sprint — ONGOING RIGHT NOW
    await evt(e3,  'Cybersecurity Training Sprint',
      'Live red-team vs blue-team exercise. Ongoing right now. Room double-booked with DevOps Workshop.',
      new Date(now.getTime()-2*3600000).toISOString(),
      new Date(now.getTime()+5*3600000).toISOString(),
      20, 'published', false, org1, null);

    await evt(e4,  'Q1 All-Hands Meeting',
      'Quarterly company-wide meeting with department presentations and Q&A with leadership.',
      dt(-45,9), dt(-45,18), 100, 'published', false, org1, null);

    await evt(e5,  'New Employee Onboarding Cohort 3',
      'Onboarding session for the latest cohort of 5 new hires. Event ran at full capacity.',
      dt(-30,9), dt(-30,13), 5,   'published', false, org1, null);

    await evt(e6,  'Team Building Hackathon Q2',
      'Internal hackathon for team bonding and cross-functional collaboration. Still being planned.',
      dt(21,9), dt(23,17),   50,  'draft',     false, org1, null);

    // Emergency Drill — ONGOING, overlaps e3 in time → Dave is in both (double-booked user)
    await evt(e7,  'Emergency Response Drill',
      'Mandatory drill for all staff. Running concurrently with the Cybersecurity Sprint — Dave Brown is registered for both.',
      new Date(now.getTime()-1*3600000).toISOString(),
      new Date(now.getTime()+4*3600000).toISOString(),
      15, 'published', false, org1, null);

    // ── MedHealth ──
    await evt(e8,  'International Medical Conference 2026',
      'Annual gathering of healthcare professionals covering latest research, treatment protocols and medical technology.',
      dt(20,9), dt(21,18), 200, 'published', true,  org2, null);

    await evt(e9,  'HIPAA Compliance Training',
      'Mandatory annual training on HIPAA regulations, patient data security and compliance procedures.',
      dt(28,9), dt(28,17),  40, 'published', false, org2, null);

    await evt(e10, 'Annual Health Fair 2026',
      'Community health fair open to the public. Free screenings, demonstrations and health awareness sessions.',
      dt(-20,10), dt(-20,16), 300, 'published', true,  org2, null);

    await evt(e11, 'Medical Research Symposium',
      'Symposium on clinical research findings. CANCELLED due to keynote speaker unavailability.',
      dt(-60,9), dt(-60,17), 100, 'cancelled', false, org2, null);

    // ── EduLearn ──
    await evt(e12, 'Annual Education Summit 2026',
      'Large-scale education forum with keynote speakers, panel discussions and breakout sessions. Open worldwide.',
      dt(35,9), dt(36,18), 500, 'published', true,  org3, null);

    await evt(e13, 'Advanced Teaching Methods Workshop',
      'Hands-on workshop covering project-based learning, differentiated instruction and technology integration.',
      dt(42,9), dt(42,17),  30, 'published', false, org3, null);

    await evt(e14, 'Student Welcome Orientation 2026',
      'Official orientation for incoming students covering campus policies, academic resources and student services.',
      dt(-15,9), dt(-15,16), 200, 'published', false, org3, null);

    await evt(e15, 'Curriculum Development Sprint',
      'Internal sprint to revise and modernise the core curriculum. Still in planning — not published yet.',
      dt(50,9), dt(52,17),   20, 'draft',     false, org3, null);

    // ── 5. RESOURCE ALLOCATIONS ───────────────────────────────────────────────
    log('Creating resource allocations (including constraint violations)...');

    // r1 (Main Conference Hall — EXCLUSIVE) allocated to BOTH e3 AND e2
    // Both overlap in time → EXCLUSIVE RESOURCE VIOLATION for reports
    await q(`INSERT INTO resource_allocations (id, "eventId", "resourceId", quantity, "allocatedAt") VALUES
      ($1,$2,$3,1,NOW()),  -- e3 sprint uses Main Hall
      ($4,$5,$6,1,NOW())   -- e2 DevOps also uses same Main Hall (OVERLAP → VIOLATION)`,
      [uid(),e3,r1, uid(),e2,r1]);

    // r2 (Training Room A — SHAREABLE maxConcurrent=3)
    // e3 uses 2 units, e7 uses 2 units, both ONGOING → total concurrent=4 > 3 → VIOLATION
    await q(`INSERT INTO resource_allocations (id, "eventId", "resourceId", quantity, "allocatedAt") VALUES
      ($1,$2,$3,2,NOW()),
      ($4,$5,$6,2,NOW())`,
      [uid(),e3,r2, uid(),e7,r2]);

    // Normal allocations
    await q(`INSERT INTO resource_allocations (id, "eventId", "resourceId", quantity, "allocatedAt") VALUES
      ($1,$2,$3,3,NOW()),   -- e1 summit: 3 AV sets
      ($4,$5,$6,15,NOW()),  -- e1 summit: 15 laptops
      ($7,$8,$9,2,NOW()),   -- e4 all-hands: 2 AV sets
      ($10,$11,$12,200,NOW()),-- e4 all-hands: 200 catering meals
      ($13,$14,$15,50,NOW()), -- e5 onboarding: 50 catering meals
      ($16,$17,$18,1,NOW()),  -- e8 medical conf: medical hall
      ($19,$20,$21,2,NOW()),  -- e9 HIPAA training: 2 lab kits
      ($22,$23,$24,1,NOW()),  -- e10 health fair: medical hall
      ($25,$26,$27,150,NOW()),-- e10 health fair: 150 medical supplies
      ($28,$29,$30,1,NOW()),  -- e12 edu summit: auditorium
      ($31,$32,$33,4,NOW()),  -- e13 teaching workshop: 4 computer labs
      ($34,$35,$36,30,NOW()), -- e13 workshop: 30 stationery bundles
      ($37,$38,$39,1,NOW()),  -- e14 orientation: auditorium
      ($40,$41,$42,180,NOW()) -- e14 orientation: 180 stationery bundles`,
      [
        uid(),e1,r3,  uid(),e1,r5,
        uid(),e4,r3,  uid(),e4,r4,
        uid(),e5,r4,
        uid(),e8,r6,
        uid(),e9,r7,
        uid(),e10,r6, uid(),e10,r8,
        uid(),e12,r9,
        uid(),e13,r10, uid(),e13,r11,
        uid(),e14,r9,  uid(),e14,r11,
      ]);

    // ── 6. INVENTORY TRANSACTIONS ─────────────────────────────────────────────
    log('Creating inventory transactions...');

    const itx = (resourceId, qty, type, date, relatedEventId, notes, createdBy) =>
      q(`INSERT INTO inventory_transactions
           (id, "resourceId", quantity, type, "transactionDate", "relatedEventId", notes, "createdBy", "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        [uid(), resourceId, qty, type, date, relatedEventId, notes, createdBy]);

    // r4 Catering Service — net balance: 500-200-50+100-25 = 325
    await itx(r4,  500, 'restock',    '2026-01-15 09:00', null, 'Initial stock for Q1 season',               uAlice);
    await itx(r4, -200, 'allocation', '2026-04-10 08:00', e4,   'Q1 All-Hands catering allocation',           uAlice);
    await itx(r4,  -50, 'allocation', '2026-04-29 08:00', e5,   'Onboarding Cohort 3 catering',               uAlice);
    await itx(r4,  100, 'restock',    '2026-05-01 09:00', null, 'Mid-year restock',                           uAlice);
    await itx(r4,  -25, 'adjustment', '2026-05-10 10:00', null, 'Spoilage write-off (fridge failure)',         uAlice);

    // r8 Medical Supplies — net balance: 300-150+30 = 180
    await itx(r8,  300, 'restock',    '2026-01-20 09:00', null, 'Annual supply stock',                        uBob);
    await itx(r8, -150, 'allocation', '2026-05-09 08:00', e10,  'Health Fair 2026 supplies',                  uBob);
    await itx(r8,   30, 'return',     '2026-03-30 14:00', e11,  'Return from cancelled symposium',            uBob);

    // r11 Stationery Bundle — net: 500-180+200-30-10 = 480
    await itx(r11,  500, 'restock',    '2026-01-10 09:00', null, 'Academic year opening stock',               uCarol);
    await itx(r11, -180, 'allocation', '2026-05-14 08:00', e14,  'Student Orientation 2026',                  uCarol);
    await itx(r11,  200, 'restock',    '2026-03-01 09:00', null, 'Semester 2 restock',                        uCarol);
    await itx(r11,  -30, 'allocation', '2026-04-01 08:00', e13,  'Teaching Methods Workshop pre-allocation',  uCarol);
    await itx(r11,  -10, 'adjustment', '2026-04-20 10:00', null, 'Damaged stock write-off',                   uCarol);

    // ── 7. ATTENDANCES ────────────────────────────────────────────────────────
    log('Creating attendances...');

    const checkedIn = (daysAgo, h=11) => dt(-daysAgo, h);
    const attend = (id, userId, eventId, userEmail, userName, checkedInAt) =>
      q(`INSERT INTO attendances (id, "userId", "eventId", "userEmail", "userName", "checkedInAt", "registeredAt")
         VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT DO NOTHING`,
        [id, userId, eventId, userEmail, userName, checkedInAt]);

    // e3 — Cybersecurity Sprint (ONGOING): registered, no check-ins yet
    await attend(uid(), uDave,  e3, null, null, null);   // ← double-booked (also in e7)
    await attend(uid(), uFrank, e3, null, null, null);
    await attend(uid(), uGrace, e3, null, null, null);   // cross-org attendance
    // External attendee at cybersecurity sprint
    await attend(uid(), null, e3, 'consultant@sec-extern.com', 'Alex Consultant', null);

    // e4 — Q1 All-Hands (PAST): mix of check-ins and no-shows
    await attend(uid(), uDave,  e4, null, null, dt(-45, 10));  // ✓ checked in
    await attend(uid(), uEmma,  e4, null, null, dt(-45, 10));  // ✓ checked in
    await attend(uid(), uFrank, e4, null, null, null);          // ✗ no-show
    await attend(uid(), uAlice, e4, null, null, dt(-45,  9));  // ✓ checked in (org admin attending)

    // e5 — Onboarding Cohort 3 (PAST, CAPACITY=5 — FULL)
    await attend(uid(), uDave,  e5, null, null, dt(-30, 10));  // ✓ checked in
    await attend(uid(), uEmma,  e5, null, null, dt(-30, 10));  // ✓ checked in
    await attend(uid(), uFrank, e5, null, null, dt(-30, 10));  // ✓ checked in
    await attend(uid(), uGrace, e5, null, null, null);          // ✗ no-show (cross-org)
    // 5th slot: external attendee — hits capacity exactly
    await attend(uid(), null,   e5, 'newhire5@techcorp.com', 'New Hire #5', dt(-30, 10));

    // e7 — Emergency Response Drill (ONGOING): Dave double-booked here too
    await attend(uid(), uDave,  e7, null, null, null);   // ← DOUBLE BOOKED (also in e3)
    await attend(uid(), uHenry, e7, null, null, null);   // cross-org
    await attend(uid(), uKate,  e7, null, null, null);   // cross-org

    // e8 — Medical Conference (UPCOMING): registered, not yet checked in
    await attend(uid(), uGrace,  e8, null, null, null);
    await attend(uid(), uHenry,  e8, null, null, null);
    await attend(uid(), uMorgan, e8, null, null, null);   // independent user, cross-org
    await attend(uid(), null,    e8, 'dr.smith@cityhosp.com', 'Dr. Smith', null);

    // e9 — HIPAA Training (UPCOMING)
    await attend(uid(), uGrace, e9, null, null, null);
    await attend(uid(), uIris,  e9, null, null, null);

    // e10 — Annual Health Fair (PAST): external + internal, mix of check-ins
    await attend(uid(), uGrace, e10, null, null, dt(-20, 11));   // ✓ checked in
    await attend(uid(), uHenry, e10, null, null, null);           // ✗ no-show
    await attend(uid(), uIris,  e10, null, null, dt(-20, 11));   // ✓ checked in
    await attend(uid(), null,   e10, 'visitor1@gmail.com',    'Sarah Visitor',   dt(-20, 12)); // ✓
    await attend(uid(), null,   e10, 'visitor2@outlook.com',  'Tom External',    null);        // ✗ no-show
    await attend(uid(), null,   e10, 'communitymed@clinic.com','Dr. Park',       dt(-20, 10)); // ✓

    // e12 — Education Summit (UPCOMING)
    await attend(uid(), uJack,   e12, null, null, null);
    await attend(uid(), uKate,   e12, null, null, null);
    await attend(uid(), uMorgan, e12, null, null, null);   // independent user

    // e13 — Teaching Methods Workshop (UPCOMING)
    await attend(uid(), uJack,  e13, null, null, null);
    await attend(uid(), uKate,  e13, null, null, null);
    await attend(uid(), uLiam,  e13, null, null, null);

    // e14 — Student Orientation (PAST): check-ins and no-shows
    await attend(uid(), uJack,  e14, null, null, dt(-15, 10));  // ✓ checked in
    await attend(uid(), uKate,  e14, null, null, dt(-15, 10));  // ✓ checked in
    await attend(uid(), uLiam,  e14, null, null, null);          // ✗ no-show

    // ── 8. INVITES ────────────────────────────────────────────────────────────
    log('Creating invites...');

    const inv = (id, eventId, userId, userEmail, userName, orgId, invitedBy, status, token, respondedAt) =>
      q(`INSERT INTO invites
          (id, "eventId", "userId", "userEmail", "userName", "invitedByOrganizationId",
           "invitedByUserId", status, token, "respondedAt", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) ON CONFLICT DO NOTHING`,
        [id, eventId, userId, userEmail, userName, orgId, invitedBy, status, token, respondedAt]);

    // Pending invites
    await inv(uid(), e8,  uAlice,  null,   null,              org2, uBob,   'pending',  null, null);
    await inv(uid(), e1,  null,    'prospect@bigcorp.com',    'Prospect BigCorp', org1, uAlice,'pending',  uid(), null);
    await inv(uid(), e12, uMorgan, null,   null,              org3, uCarol, 'pending',  null, null);

    // Accepted invites (the attendees above came through these invites)
    await inv(uid(), e7,  uDave,  null, null, org1, uAlice, 'accepted', null, new Date(Date.now()-86400000).toISOString());
    await inv(uid(), e8,  uHenry, null, null, org2, uBob,   'accepted', null, new Date(Date.now()-72000000).toISOString());
    await inv(uid(), e8,  null,   'dr.smith@cityhosp.com', 'Dr. Smith',  org2, uBob,   'accepted', uid(), new Date(Date.now()-50000000).toISOString());
    await inv(uid(), e10, null,   'communitymed@clinic.com','Dr. Park',  org2, uBob,   'accepted', uid(), dt(-22,9));
    await inv(uid(), e12, uJack,  null, null, org3, uCarol, 'accepted', null, new Date(Date.now()-36000000).toISOString());

    // Declined invites
    await inv(uid(), e8,  uFrank, null, null, org2, uBob,   'declined', null, new Date(Date.now()-60000000).toISOString());
    await inv(uid(), e9,  uLiam,  null, null, org2, uBob,   'declined', null, new Date(Date.now()-48000000).toISOString());
    await inv(uid(), e12, null,   'noshow@gmail.com', 'N. Show', org3, uCarol, 'declined', uid(), new Date(Date.now()-43200000).toISOString());

    // Cancelled invites (from the cancelled Medical Research Symposium)
    await inv(uid(), e11, uGrace, null, null, org2, uBob, 'cancelled', null, dt(-58, 9));
    await inv(uid(), e11, uIris,  null, null, org2, uBob, 'cancelled', null, dt(-58, 9));
    await inv(uid(), e11, null, 'researcher@university.edu', 'Prof. Chen', org2, uBob, 'cancelled', uid(), dt(-58, 9));

    // ── 9. UPDATE cachedCurrentStock for consumable resources ─────────────────
    log('Updating consumable stock cache...');
    await q(`UPDATE resources SET "cachedCurrentStock"=325 WHERE id=$1`, [r4]); // catering
    await q(`UPDATE resources SET "cachedCurrentStock"=180 WHERE id=$1`, [r8]); // medical supplies
    await q(`UPDATE resources SET "cachedCurrentStock"=480 WHERE id=$1`, [r11]); // stationery

    // ── SUMMARY ───────────────────────────────────────────────────────────────
    const [uCount] = (await q('SELECT COUNT(*) FROM users')).rows;
    const [eCount] = (await q('SELECT COUNT(*) FROM events')).rows;
    const [rCount] = (await q('SELECT COUNT(*) FROM resources')).rows;
    const [aCount] = (await q('SELECT COUNT(*) FROM attendances')).rows;
    const [iCount] = (await q('SELECT COUNT(*) FROM invites')).rows;
    const [itCount] = (await q('SELECT COUNT(*) FROM inventory_transactions')).rows;
    const [allocCount] = (await q('SELECT COUNT(*) FROM resource_allocations')).rows;

    console.log('\n✅ Seed complete!\n');
    console.log(`  Users:              ${uCount.count}`);
    console.log(`  Organizations:      3`);
    console.log(`  Events:             ${eCount.count}`);
    console.log(`  Resources:          ${rCount.count}`);
    console.log(`  Allocations:        ${allocCount.count}`);
    console.log(`  Attendances:        ${aCount.count}`);
    console.log(`  Invites:            ${iCount.count}`);
    console.log(`  Inventory txns:     ${itCount.count}`);
    console.log('\n  All user passwords: Test@1234');
    console.log('  Org admin logins:');
    console.log('    alice@techcorp.com   | TechCorp Inc');
    console.log('    bob@medhealth.com    | MedHealth Solutions');
    console.log('    carol@edulearn.com   | EduLearn Academy');
    console.log('\n  Edge cases seeded:');
    console.log('    ⚠️  Resource violation: Main Hall double-booked (e3 + e2, overlapping)');
    console.log('    ⚠️  Shareable violation: Training Room A over-concurrent (e3+e7, 4>3)');
    console.log('    👥 Double-booked user: Dave Brown in both e3+e7 (ongoing, overlapping)');
    console.log('    🔴 At-capacity event: Onboarding Cohort 3 (5/5 attendees)');
    console.log('    🌐 External attendees: Health Fair, Summit, Medical Conference');
    console.log('    🚫 Cancelled event: Medical Research Symposium with cancelled invites');
    console.log('    📝 Draft events: Team Building Hackathon, Curriculum Sprint');
    console.log('    👨‍👩‍👧 Parent-child: Tech Innovation Summit → Day 1 + Day 2');
    console.log('    📦 Inventory: Catering (325 left), Medical (180), Stationery (480)');
    console.log('    ✗  No-shows: Frank (All-Hands), Grace (Onboarding), Henry (Health Fair), Liam (Orientation)');

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    process.exit(1);
  } finally {
    await db.end();
  }
}

run();
