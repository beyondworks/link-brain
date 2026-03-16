/**
 * Rollback: Remove migrated data from Supabase
 *
 * Uses migration-report.json to identify which IDs were inserted,
 * then deletes in reverse FK order.
 *
 * Run with DRY_RUN=true first.
 */
import 'dotenv/config';
import { supabase } from './lib/supabase-admin';
import { log } from './lib/logger';
import { loadReport } from './lib/id-mapping';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);

async function deleteBatch(table: string, ids: string[], idColumn = 'id'): Promise<number> {
  if (ids.length === 0) return 0;

  let deleted = 0;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    log.progress(Math.min(i + BATCH_SIZE, ids.length), ids.length, `Delete ${table}`);

    if (!DRY_RUN) {
      const { error } = await supabase
        .from(table)
        .delete()
        .in(idColumn, batch);

      if (error) {
        log.error(`Delete ${table} batch failed`, error);
        throw error;
      }
    }

    deleted += batch.length;
  }

  return deleted;
}

async function main(): Promise<void> {
  log.divider(`Rollback ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);

  const report = loadReport();

  if (!report.migratedClipIds?.length && !report.migratedCollectionIds?.length && !report.migratedCategoryIds?.length) {
    log.warn('No migrated IDs found in migration-report.json. Nothing to rollback.');
    return;
  }

  const clipIds = report.migratedClipIds || [];
  const colIds = report.migratedCollectionIds || [];
  const catIds = report.migratedCategoryIds || [];

  log.info(`IDs to rollback:`);
  log.info(`  Clips:        ${clipIds.length}`);
  log.info(`  Collections:  ${colIds.length}`);
  log.info(`  Categories:   ${catIds.length}`);

  // Reverse FK order: clip_tags → tags → clip_collections → clip_contents → clips → collections → categories
  // Note: CASCADE handles clip_tags, clip_collections, clip_contents when clips are deleted

  // 1. Delete clips (CASCADE removes clip_contents, clip_collections, clip_tags)
  log.info('Deleting clips (cascade: contents, junctions)...');
  const deletedClips = await deleteBatch('clips', clipIds);
  log.success(`Deleted clips: ${deletedClips}`);

  // 2. Delete collections
  log.info('Deleting collections...');
  const deletedCols = await deleteBatch('collections', colIds);
  log.success(`Deleted collections: ${deletedCols}`);

  // 3. Delete categories
  log.info('Deleting categories...');
  const deletedCats = await deleteBatch('categories', catIds);
  log.success(`Deleted categories: ${deletedCats}`);

  // 4. Clean up orphan tags (tags with no clip_tags references)
  if (!DRY_RUN) {
    log.info('Cleaning orphan tags...');
    const { data: orphanTags } = await supabase
      .rpc('delete_orphan_tags' as never);
    // If RPC doesn't exist, do it manually
    if (!orphanTags) {
      // Find tags not referenced by any clip_tag
      const { data: allTags } = await supabase.from('tags').select('id');
      if (allTags) {
        for (const tag of allTags) {
          const { count } = await supabase
            .from('clip_tags')
            .select('*', { count: 'exact', head: true })
            .eq('tag_id', tag.id);
          if (count === 0) {
            await supabase.from('tags').delete().eq('id', tag.id);
          }
        }
      }
    }
    log.success('Orphan tags cleaned.');
  }

  log.divider('Rollback Summary');
  log.info(`Clips deleted:        ${deletedClips}`);
  log.info(`Collections deleted:  ${deletedCols}`);
  log.info(`Categories deleted:   ${deletedCats}`);

  if (DRY_RUN) {
    log.warn('DRY RUN complete. Run with DRY_RUN=false to apply.');
  }

  log.success('Rollback complete.');
}

main().catch((err) => {
  log.error('Rollback failed', err);
  process.exit(1);
});
