import { v5 as uuidv5 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Deterministic namespace for Linkbrain migration
// Generated once, never change this
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace UUID

/**
 * Convert a Firebase document ID to a deterministic UUID v5.
 * Same input always produces the same UUID — safe for re-runs.
 */
export function firebaseIdToUuid(firebaseId: string): string {
  return uuidv5(firebaseId, NAMESPACE);
}

// --- User ID mapping (Firebase UID → Supabase public.users.id) ---

export interface UserIdMap {
  [firebaseUid: string]: {
    supabaseAuthId: string;
    publicUserId: string;
    email: string;
  };
}

const DATA_DIR = path.resolve(__dirname, '..', 'data');

export function saveUserIdMap(map: UserIdMap): void {
  fs.writeFileSync(
    path.join(DATA_DIR, 'user-id-map.json'),
    JSON.stringify(map, null, 2),
    'utf-8'
  );
}

export function loadUserIdMap(): UserIdMap {
  const filePath = path.join(DATA_DIR, 'user-id-map.json');
  if (!fs.existsSync(filePath)) {
    throw new Error('user-id-map.json not found. Run 03-migrate-users.ts first.');
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// --- Migration report ---

export interface MigrationReport {
  exportedAt?: string;
  transformedAt?: string;
  importedAt?: string;
  verifiedAt?: string;
  counts: {
    firebaseUsers?: number;
    firebaseClips?: number;
    firebaseCollections?: number;
    firebaseCategories?: number;
    supabaseUsers?: number;
    supabaseClips?: number;
    supabaseCollections?: number;
    supabaseCategories?: number;
  };
  migratedClipIds?: string[];
  migratedCollectionIds?: string[];
  migratedCategoryIds?: string[];
  errors?: Array<{ phase: string; message: string; detail?: string }>;
}

export function saveReport(report: MigrationReport): void {
  fs.writeFileSync(
    path.join(DATA_DIR, 'migration-report.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );
}

export function loadReport(): MigrationReport {
  const filePath = path.join(DATA_DIR, 'migration-report.json');
  if (!fs.existsSync(filePath)) {
    return { counts: {} };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}
