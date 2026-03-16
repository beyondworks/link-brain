/**
 * Phase 1: Export Firebase data to JSON
 *
 * Exports: clips, collections, categories, auth users
 * Output: data/firebase-export.json
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { firestore, firebaseAuth } from './lib/firebase-admin';
import { log } from './lib/logger';
import { loadReport, saveReport } from './lib/id-mapping';

interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
  toDate?: () => Date;
}

function convertTimestamp(val: unknown): string | null {
  if (!val) return null;
  // Firestore Timestamp object
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as FirebaseTimestamp).toDate!().toISOString();
  }
  // Already a date-like object with _seconds
  if (typeof val === 'object' && val !== null && '_seconds' in val) {
    const ts = val as FirebaseTimestamp;
    return new Date(ts._seconds * 1000).toISOString();
  }
  // ISO string
  if (typeof val === 'string') return val;
  return null;
}

function convertDoc(doc: FirebaseFirestore.DocumentSnapshot): Record<string, unknown> {
  const data = doc.data();
  if (!data) return { id: doc.id };

  const converted: Record<string, unknown> = { id: doc.id };
  for (const [key, val] of Object.entries(data)) {
    if (key === 'createdAt' || key === 'updatedAt' || key === 'publishDate' || key === 'lastViewedAt') {
      converted[key] = convertTimestamp(val);
    } else {
      converted[key] = val;
    }
  }
  return converted;
}

async function exportCollection(name: string): Promise<Record<string, unknown>[]> {
  const snapshot = await firestore.collection(name).get();
  log.info(`Collection "${name}": ${snapshot.size} documents`);
  return snapshot.docs.map(convertDoc);
}

async function exportAuthUsers(): Promise<Array<{ uid: string; email: string; displayName?: string; photoURL?: string }>> {
  const users: Array<{ uid: string; email: string; displayName?: string; photoURL?: string }> = [];
  let nextPageToken: string | undefined;

  do {
    const listResult = await firebaseAuth.listUsers(1000, nextPageToken);
    for (const user of listResult.users) {
      users.push({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    }
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  log.info(`Auth users: ${users.length}`);
  return users;
}

async function main(): Promise<void> {
  log.divider('Phase 1: Export Firebase Data');

  const clips = await exportCollection('clips');
  const collections = await exportCollection('collections');
  const categories = await exportCollection('categories');
  const authUsers = await exportAuthUsers();

  const exportData = {
    exportedAt: new Date().toISOString(),
    authUsers,
    clips,
    collections,
    categories,
  };

  const outPath = path.resolve(__dirname, 'data', 'firebase-export.json');
  fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2), 'utf-8');

  log.success(`Exported to ${outPath}`);
  log.info(`  Auth users:   ${authUsers.length}`);
  log.info(`  Clips:        ${clips.length}`);
  log.info(`  Collections:  ${collections.length}`);
  log.info(`  Categories:   ${categories.length}`);

  // Update report
  const report = loadReport();
  report.exportedAt = new Date().toISOString();
  report.counts.firebaseUsers = authUsers.length;
  report.counts.firebaseClips = clips.length;
  report.counts.firebaseCollections = collections.length;
  report.counts.firebaseCategories = categories.length;
  saveReport(report);

  log.success('Phase 1 complete.');
}

main().catch((err) => {
  log.error('Export failed', err);
  process.exit(1);
});
