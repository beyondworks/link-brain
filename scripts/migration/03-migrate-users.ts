/**
 * Phase 3: Migrate users (Firebase Auth → Supabase Auth)
 *
 * - Pre-load all Supabase auth users, match by email
 * - Create missing users via supabase.auth.admin.createUser()
 * - handle_new_user() trigger auto-creates public.users + credits + subscriptions
 * - Output: data/user-id-map.json
 *
 * Run with DRY_RUN=true first to preview.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from './lib/supabase-admin';
import { log } from './lib/logger';
import { UserIdMap, saveUserIdMap } from './lib/id-mapping';

const DRY_RUN = process.env.DRY_RUN !== 'false';

interface FirebaseAuthUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

interface SupabaseAuthUser {
  id: string;
  email?: string;
}

/**
 * Load all Supabase auth users into a Map<email, user> for O(1) lookup.
 * Paginates through all pages (1000 per page max).
 */
async function loadAllSupabaseAuthUsers(): Promise<Map<string, SupabaseAuthUser>> {
  const emailMap = new Map<string, SupabaseAuthUser>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      log.error('Failed to list Supabase auth users', error);
      throw error;
    }
    if (!data?.users?.length) break;

    for (const u of data.users) {
      if (u.email) {
        emailMap.set(u.email.toLowerCase(), { id: u.id, email: u.email });
      }
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return emailMap;
}

async function main(): Promise<void> {
  log.divider(`Phase 3: Migrate Users ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);

  // Load Firebase export
  const exportPath = path.resolve(__dirname, 'data', 'firebase-export.json');
  if (!fs.existsSync(exportPath)) {
    log.error('firebase-export.json not found. Run 01-export-firebase.ts first.');
    process.exit(1);
  }

  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
  const firebaseUsers: FirebaseAuthUser[] = exportData.authUsers;

  log.info(`Firebase users to migrate: ${firebaseUsers.length}`);

  // Pre-load all Supabase auth users for efficient matching
  log.info('Loading existing Supabase auth users...');
  const supabaseUsersByEmail = await loadAllSupabaseAuthUsers();
  log.info(`Existing Supabase auth users: ${supabaseUsersByEmail.size}`);

  const userIdMap: UserIdMap = {};
  let matched = 0;
  let created = 0;
  let errors = 0;

  for (let i = 0; i < firebaseUsers.length; i++) {
    const fbUser = firebaseUsers[i];
    log.progress(i + 1, firebaseUsers.length, 'Users');

    if (!fbUser.email) {
      log.warn(`Skipping user ${fbUser.uid}: no email`);
      continue;
    }

    try {
      const emailLower = fbUser.email.toLowerCase();
      let supabaseAuthUser: SupabaseAuthUser | null = null;

      const found = supabaseUsersByEmail.get(emailLower);

      if (found) {
        supabaseAuthUser = found;
        matched++;
      } else if (!DRY_RUN) {
        // Create new auth user
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: fbUser.email,
          email_confirm: true,
          user_metadata: {
            display_name: fbUser.displayName,
            avatar_url: fbUser.photoURL,
            full_name: fbUser.displayName,
          },
        });

        if (error) {
          log.error(`Failed to create user ${fbUser.email}`, error);
          errors++;
          continue;
        }

        supabaseAuthUser = { id: newUser.user.id, email: newUser.user.email };
        // Add to local cache so subsequent lookups find it
        supabaseUsersByEmail.set(emailLower, supabaseAuthUser);
        created++;

        // Wait briefly for the trigger to create public.users
        await new Promise((r) => setTimeout(r, 500));
      } else {
        log.info(`  [DRY RUN] Would create: ${fbUser.email}`);
        continue;
      }

      if (!supabaseAuthUser) continue;

      // Get public.users.id for this auth user
      const { data: publicUser, error: pubErr } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', supabaseAuthUser.id)
        .single();

      if (pubErr || !publicUser) {
        log.error(`No public.users row for auth ${supabaseAuthUser.id} (${fbUser.email})`, pubErr);
        errors++;
        continue;
      }

      userIdMap[fbUser.uid] = {
        supabaseAuthId: supabaseAuthUser.id,
        publicUserId: publicUser.id,
        email: fbUser.email,
      };
    } catch (err) {
      log.error(`Error processing user ${fbUser.email}`, err);
      errors++;
    }
  }

  // Save mapping
  saveUserIdMap(userIdMap);

  log.divider('User Migration Summary');
  log.info(`Total Firebase users: ${firebaseUsers.length}`);
  log.info(`Matched existing:     ${matched}`);
  log.info(`Created new:          ${created}`);
  log.info(`Errors:               ${errors}`);
  log.info(`Mapped:               ${Object.keys(userIdMap).length}`);

  if (DRY_RUN) {
    log.warn('DRY RUN complete. Run with DRY_RUN=false to apply changes.');
  }

  log.success('Phase 3 complete.');
}

main().catch((err) => {
  log.error('User migration failed', err);
  process.exit(1);
});
