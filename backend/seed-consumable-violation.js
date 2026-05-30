/**
 * Creates CONSUMABLE_EXCEEDED violations in the reports.
 * Run from the backend directory: node seed-consumable-violation.js
 *
 * This inserts inventory transactions that make the running balance go
 * negative at a point in time — something the API prevents, but which
 * represents a realistic scenario (e.g., data migrated from a legacy system,
 * or stock consumed before a delayed restock was recorded).
 */
require('dotenv').config();
const { Client } = require('./node_modules/pg');
const crypto = require('crypto');

const uid = () => crypto.randomUUID();

const DB = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  user:     process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'event_booking',
};

// Existing IDs from seed-demo.js
const R4_CATERING    = '15b042e6-76ee-4e6f-b58e-4d61c7c147b2';
const R8_MEDSUPPLIES = '74ccc539-8ce9-4fe8-8c8e-75eb26f5d9f5';
const R11_STATIONERY = 'b6e5b622-b638-4604-a19a-1a0e7878669f';

// Real event IDs to link ALLOCATION transactions to
const E_SUMMIT       = 'bee2cbe1-4301-4c94-b1fe-ab59b82ade11'; // Tech Innovation Summit
const E_MEDCONF      = 'baa1d78f-36c5-41c0-a761-48081c3ba018'; // International Medical Conference
const E_EDUSUM       = 'd91dc866-e117-473d-99e2-d3b9eae49345'; // Annual Education Summit

// Users (created-by)
const U_ALICE = '73f1878a-9162-4a10-99be-a9b8e207d718';
const U_BOB   = '1247559d-d36d-438e-8f26-eeac06429e5c';
const U_CAROL = '966b48ae-6b53-45ea-af28-9fd6db4bab88';

async function run() {
  const client = new Client(DB);
  await client.connect();
  console.log('Connected to database:', DB.database);

  const q = (sql, params = []) => client.query(sql, params);

  try {
    // ── Catering Service (r4): insert ALLOCATION before first restock ─────────
    // Current timeline: RESTOCK +500 @ 2026-01-15 → balance=500
    // Inserting: RESTOCK +80 @ 2025-12-01 → balance=80
    //            ALLOCATION -150 @ 2025-12-20 (tech summit) → balance=-70 VIOLATED
    console.log('\nCatering Service: inserting pre-restock allocation...');

    const catRestockId = uid();
    await q(
      `INSERT INTO inventory_transactions
         (id, "resourceId", quantity, type, "transactionDate", "relatedEventId", notes, "createdBy", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [catRestockId, R4_CATERING, 80, 'restock', '2025-12-01 09:00', null,
       'Pre-season catering stock', U_ALICE]
    );
    console.log('  ✓ RESTOCK +80 @ 2025-12-01');

    const catAllocId = uid();
    await q(
      `INSERT INTO inventory_transactions
         (id, "resourceId", quantity, type, "transactionDate", "relatedEventId", notes, "createdBy", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [catAllocId, R4_CATERING, -150, 'allocation', '2025-12-20 08:00', E_SUMMIT,
       'Tech Innovation Summit — advance catering reservation', U_ALICE]
    );
    console.log('  ✓ ALLOCATION -150 @ 2025-12-20 → running balance: 80-150 = -70 (VIOLATION)');

    // ── Medical Supplies (r8): insert ALLOCATION before first restock ──────────
    // Current timeline: RESTOCK +300 @ 2026-01-20 → balance=300
    // Inserting: RESTOCK +60 @ 2025-12-05 → balance=60
    //            ALLOCATION -100 @ 2025-12-28 (intl medical conf) → balance=-40 VIOLATED
    console.log('\nMedical Supplies Pack: inserting pre-restock allocation...');

    await q(
      `INSERT INTO inventory_transactions
         (id, "resourceId", quantity, type, "transactionDate", "relatedEventId", notes, "createdBy", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [uid(), R8_MEDSUPPLIES, 60, 'restock', '2025-12-05 09:00', null,
       'Emergency pre-stock order', U_BOB]
    );
    console.log('  ✓ RESTOCK +60 @ 2025-12-05');

    await q(
      `INSERT INTO inventory_transactions
         (id, "resourceId", quantity, type, "transactionDate", "relatedEventId", notes, "createdBy", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [uid(), R8_MEDSUPPLIES, -100, 'allocation', '2025-12-28 08:00', E_MEDCONF,
       'International Medical Conference — advance supplies allocation', U_BOB]
    );
    console.log('  ✓ ALLOCATION -100 @ 2025-12-28 → running balance: 60-100 = -40 (VIOLATION)');

    // ── Stationery Bundle (r11): insert ALLOCATION before first restock ────────
    // Current timeline: RESTOCK +500 @ 2026-01-10 → balance=500
    // Inserting: RESTOCK +40 @ 2025-11-15 → balance=40
    //            ALLOCATION -80 @ 2025-12-10 (edu summit) → balance=-40 VIOLATED
    console.log('\nStationery Bundle: inserting pre-restock allocation...');

    await q(
      `INSERT INTO inventory_transactions
         (id, "resourceId", quantity, type, "transactionDate", "relatedEventId", notes, "createdBy", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [uid(), R11_STATIONERY, 40, 'restock', '2025-11-15 09:00', null,
       'Pilot stock order', U_CAROL]
    );
    console.log('  ✓ RESTOCK +40 @ 2025-11-15');

    await q(
      `INSERT INTO inventory_transactions
         (id, "resourceId", quantity, type, "transactionDate", "relatedEventId", notes, "createdBy", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [uid(), R11_STATIONERY, -80, 'allocation', '2025-12-10 08:00', E_EDUSUM,
       'Annual Education Summit — stationery advance allocation', U_CAROL]
    );
    console.log('  ✓ ALLOCATION -80 @ 2025-12-10 → running balance: 40-80 = -40 (VIOLATION)');

    // ── Verify ─────────────────────────────────────────────────────────────────
    console.log('\nVerifying CONSUMABLE_EXCEEDED detections...');
    const result = await q(`
      SELECT
        r.name as resource_name,
        e.title as event_title,
        it.running_balance
      FROM (
        SELECT
          "resourceId", "relatedEventId",
          SUM(quantity) OVER (
            PARTITION BY "resourceId"
            ORDER BY "transactionDate", "createdAt"
          ) as running_balance
        FROM inventory_transactions
      ) it
      INNER JOIN resources r ON it."resourceId" = r.id
      INNER JOIN events e ON it."relatedEventId" = e.id
      WHERE r.type = 'consumable'
        AND it."relatedEventId" IS NOT NULL
        AND it.running_balance < 0
      ORDER BY r.name, it.running_balance
    `);

    console.log(`\nFound ${result.rows.length} CONSUMABLE_EXCEEDED violation(s):`);
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.resource_name} → "${row.event_title}" (balance: ${row.running_balance})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
