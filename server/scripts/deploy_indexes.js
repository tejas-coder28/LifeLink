/**
 * Deploy Firestore composite indexes using Firebase Admin SDK (same pattern as server)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const indexes = require('../firestore.indexes.json');

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = admin.initializeApp({
  credential: admin.cert(serviceAccount),
});

const db = getFirestore(app);

async function main() {
  console.log('🔍 Checking Firestore composite indexes...\n');
  
  let missingCount = 0;
  const missingIndexes = [];

  for (const idx of indexes.indexes) {
    try {
      let q = db.collection(idx.collectionGroup);
      for (const field of idx.fields) {
        const dir = field.order === 'DESCENDING' ? 'desc' : 'asc';
        q = q.orderBy(field.fieldPath, dir);
      }
      await q.limit(1).get();
      console.log(`✅ ${idx.collectionGroup} [${idx.fields.map(f => `${f.fieldPath} ${f.order}`).join(', ')}]`);
    } catch (err) {
      if (err.message && (err.message.includes('FAILED_PRECONDITION') || err.message.includes('requires an index'))) {
        missingCount++;
        const linkMatch = err.message.match(/https:\/\/[^\s]+/);
        const fields = idx.fields.map(f => `${f.fieldPath} ${f.order}`).join(', ');
        missingIndexes.push({ collection: idx.collectionGroup, fields, link: linkMatch ? linkMatch[0] : null });
        console.log(`⚠️  MISSING: ${idx.collectionGroup} [${fields}]`);
      } else {
        console.log(`❓ Error checking ${idx.collectionGroup}: ${err.message.slice(0, 100)}`);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  if (missingCount === 0) {
    console.log('✅ All indexes are active! No action needed.');
  } else {
    console.log(`⚠️  Found ${missingCount} missing indexes.`);
    console.log('');
    console.log('To create them, click each link in your browser:');
    missingIndexes.forEach((idx, i) => {
      console.log(`\n${i + 1}. ${idx.collection} [${idx.fields}]`);
      if (idx.link) console.log(`   ${idx.link}`);
    });
    console.log('');
    console.log('Or deploy all at once after logging in:');
    console.log('  npx firebase-tools login');
    console.log('  npx firebase-tools deploy --only firestore:indexes --project lifelink-f6f3b');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
