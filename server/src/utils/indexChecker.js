const fs = require('fs');
const path = require('path');

/**
 * Dev-only startup self-check:
 * Runs each indexed query defined in firestore.indexes.json once with limit(1).
 * Detects missing composite indexes and prints the collection, fields, and Firebase Console link.
 */
async function runIndexSelfCheck(db) {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    return;
  }

  // Look for firestore.indexes.json in server directory or project root
  const serverPath = path.resolve(__dirname, '../../firestore.indexes.json');
  const rootPath = path.resolve(__dirname, '../../../firestore.indexes.json');
  const targetPath = fs.existsSync(serverPath) ? serverPath : (fs.existsSync(rootPath) ? rootPath : null);

  if (!targetPath || !db) return;

  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    const config = JSON.parse(raw);
    const indexes = config.indexes || [];

    console.log(`[Firestore Self-Check] Validating ${indexes.length} composite indexes in dev mode...`);

    let missingCount = 0;
    for (const idx of indexes) {
      const colName = idx.collectionGroup;
      try {
        let q = db.collection(colName);
        for (const field of idx.fields) {
          const dir = field.order === 'DESCENDING' ? 'desc' : 'asc';
          q = q.orderBy(field.fieldPath, dir);
        }
        await q.limit(1).get();
      } catch (err) {
        if (err.message && (err.message.includes('FAILED_PRECONDITION') || err.message.includes('requires an index'))) {
          missingCount++;
          const linkMatch = err.message.match(/https:\/\/[^\s]+/);
          const fieldsStr = idx.fields.map(f => `${f.fieldPath} (${f.order})`).join(', ');
          console.warn(`⚠️  [Missing Index #${missingCount}] Collection: "${colName}"`);
          console.warn(`    Fields: [${fieldsStr}]`);
          if (linkMatch) {
            console.warn(`    Create Link: ${linkMatch[0]}`);
          }
        }
      }
    }

    if (missingCount === 0) {
      console.log('✅ [Firestore Self-Check] All composite indexes verified and active.');
    } else {
      console.warn(`⚠️  [Firestore Self-Check] Found ${missingCount} missing index(es). Deploy via: firebase deploy --only firestore:indexes`);
    }
  } catch (err) {
    console.warn(`[Firestore Self-Check] Could not complete index check: ${err.message}`);
  }
}

module.exports = { runIndexSelfCheck };
