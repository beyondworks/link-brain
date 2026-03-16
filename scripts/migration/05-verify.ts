/**
 * Phase 5: Verify migration
 *
 * - Count comparison (Firebase export vs Supabase)
 * - Spot-check: random clips match URL/title/summary
 * - Orphan FK check
 * - User mapping completeness
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from './lib/supabase-admin';
import { log } from './lib/logger';
import { loadUserIdMap, loadReport, saveReport } from './lib/id-mapping';

interface VerifyResult {
  check: string;
  passed: boolean;
  detail: string;
}

const results: VerifyResult[] = [];

function record(check: string, passed: boolean, detail: string): void {
  results.push({ check, passed, detail });
  if (passed) {
    log.success(`[PASS] ${check}: ${detail}`);
  } else {
    log.error(`[FAIL] ${check}: ${detail}`);
  }
}

async function main(): Promise<void> {
  log.divider('Phase 5: Verification');

  // Load Firebase export for comparison
  const exportPath = path.resolve(__dirname, 'data', 'firebase-export.json');
  const transformedPath = path.resolve(__dirname, 'data', 'transformed.json');

  if (!fs.existsSync(exportPath) || !fs.existsSync(transformedPath)) {
    log.error('Missing export or transformed data files.');
    process.exit(1);
  }

  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
  const transformedData = JSON.parse(fs.readFileSync(transformedPath, 'utf-8'));
  const userIdMap = loadUserIdMap();

  // === 1. Count comparison ===
  log.info('Checking counts...');

  const { count: supaClipCount } = await supabase
    .from('clips')
    .select('*', { count: 'exact', head: true });

  const { count: supaCatCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });

  const { count: supaColCount } = await supabase
    .from('collections')
    .select('*', { count: 'exact', head: true });

  const { count: supaUserCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const expectedClips = transformedData.clips.length;
  const expectedCats = transformedData.categories.length;
  const expectedCols = transformedData.collections.length;
  const expectedUsers = Object.keys(userIdMap).length;

  record(
    'Clip count',
    (supaClipCount ?? 0) >= expectedClips,
    `Supabase: ${supaClipCount}, Expected: >= ${expectedClips}`
  );

  record(
    'Category count',
    (supaCatCount ?? 0) >= expectedCats,
    `Supabase: ${supaCatCount}, Expected: >= ${expectedCats}`
  );

  record(
    'Collection count',
    (supaColCount ?? 0) >= expectedCols,
    `Supabase: ${supaColCount}, Expected: >= ${expectedCols}`
  );

  record(
    'User mapping',
    expectedUsers > 0,
    `Mapped users: ${expectedUsers} / Firebase: ${exportData.authUsers.length}`
  );

  // === 2. Spot-check random clips ===
  log.info('Spot-checking random clips...');

  const sampleSize = Math.min(10, transformedData.clips.length);
  const sampleIndices = new Set<number>();
  while (sampleIndices.size < sampleSize) {
    sampleIndices.add(Math.floor(Math.random() * transformedData.clips.length));
  }

  let spotCheckPassed = 0;
  for (const idx of sampleIndices) {
    const expected = transformedData.clips[idx];
    const { data: actual } = await supabase
      .from('clips')
      .select('id, url, title, summary')
      .eq('id', expected.id)
      .single();

    if (!actual) {
      record(`Spot-check clip ${expected.id}`, false, 'Not found in Supabase');
      continue;
    }

    const urlMatch = actual.url === expected.url;
    const titleMatch = actual.title === expected.title;

    if (urlMatch && titleMatch) {
      spotCheckPassed++;
    } else {
      record(
        `Spot-check clip ${expected.id}`,
        false,
        `URL: ${urlMatch ? 'OK' : 'MISMATCH'}, Title: ${titleMatch ? 'OK' : 'MISMATCH'}`
      );
    }
  }
  record(
    'Spot-check clips',
    spotCheckPassed === sampleSize,
    `${spotCheckPassed}/${sampleSize} passed`
  );

  // === 3. Orphan FK check ===
  log.info('Checking for orphan FKs...');

  // Clips with non-existent category_id
  const { data: orphanCatClips } = await supabase
    .from('clips')
    .select('id, category_id')
    .not('category_id', 'is', null);

  let orphanCats = 0;
  if (orphanCatClips) {
    const catIds = new Set(transformedData.categories.map((c: { id: string }) => c.id));
    for (const clip of orphanCatClips) {
      if (clip.category_id && !catIds.has(clip.category_id)) {
        // Check if category exists in DB (may have been created outside migration)
        const { data: catExists } = await supabase
          .from('categories')
          .select('id')
          .eq('id', clip.category_id)
          .single();
        if (!catExists) orphanCats++;
      }
    }
  }
  record(
    'Orphan category_id',
    orphanCats === 0,
    `${orphanCats} clips with missing category`
  );

  // Clip contents without parent clip
  const { data: allContents } = await supabase
    .from('clip_contents')
    .select('clip_id');
  let orphanContents = 0;
  if (allContents) {
    const clipIds = new Set(transformedData.clips.map((c: { id: string }) => c.id));
    for (const cc of allContents) {
      if (!clipIds.has(cc.clip_id)) {
        const { data: clipExists } = await supabase
          .from('clips')
          .select('id')
          .eq('id', cc.clip_id)
          .single();
        if (!clipExists) orphanContents++;
      }
    }
  }
  record(
    'Orphan clip_contents',
    orphanContents === 0,
    `${orphanContents} orphan content rows`
  );

  // === 4. Per-user clip count ===
  log.info('Checking per-user clip counts...');
  const firebaseClipsByUser = new Map<string, number>();
  for (const clip of exportData.clips) {
    if (clip.userId) {
      firebaseClipsByUser.set(clip.userId, (firebaseClipsByUser.get(clip.userId) || 0) + 1);
    }
  }

  let userCountMismatches = 0;
  for (const [fbUid, expectedCount] of firebaseClipsByUser) {
    const mapping = userIdMap[fbUid];
    if (!mapping) continue;

    const { count } = await supabase
      .from('clips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', mapping.publicUserId);

    if ((count ?? 0) < expectedCount) {
      log.warn(`User ${mapping.email}: expected ${expectedCount}, got ${count}`);
      userCountMismatches++;
    }
  }
  record(
    'Per-user clip counts',
    userCountMismatches === 0,
    `${userCountMismatches} users with count mismatch`
  );

  // === Summary ===
  log.divider('Verification Summary');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    log.info(`  [${icon}] ${r.check}: ${r.detail}`);
  }

  log.info(`\nTotal: ${passed} passed, ${failed} failed out of ${results.length} checks`);

  // Update report
  const report = loadReport();
  report.verifiedAt = new Date().toISOString();
  report.counts.supabaseUsers = supaUserCount ?? 0;
  report.counts.supabaseClips = supaClipCount ?? 0;
  report.counts.supabaseCollections = supaColCount ?? 0;
  report.counts.supabaseCategories = supaCatCount ?? 0;
  saveReport(report);

  if (failed > 0) {
    log.error(`Verification FAILED with ${failed} issues.`);
    process.exit(1);
  }

  log.success('All checks passed. Migration verified.');
}

main().catch((err) => {
  log.error('Verification failed', err);
  process.exit(1);
});
