/**
 * CLI script to execute audio migration from local filesystem to Supabase Storage.
 * Run with: npx tsx scripts/migrate_audio.ts
 */

import { migrateLocalAudioToSupabase } from '../src/server/audioMigration';
import { isSupabaseConfigured, SUPABASE_AUDIO_BUCKET } from '../src/server/supabaseAudio';

async function main() {
  console.log('=====================================================');
  console.log('Assessora - Audio Storage Migration to Supabase');
  console.log(`Target Bucket: ${SUPABASE_AUDIO_BUCKET}`);
  console.log('=====================================================');

  if (!isSupabaseConfigured()) {
    console.error('ERROR: Supabase credentials are not configured.');
    console.error('Please set SUPABASE_URL and SUPABASE_SECRET_KEY in your environment before running this script.');
    process.exit(1);
  }

  console.log('Starting migration...');
  const report = await migrateLocalAudioToSupabase();

  console.log('\n--- Migration Report ---');
  console.log(`Success: ${report.success}`);
  console.log(`Total local files found: ${report.totalLocalFiles}`);
  console.log(`Migrated: ${report.migratedCount}`);
  console.log(`Already existed: ${report.alreadyMigratedCount}`);
  console.log(`Verified: ${report.verifiedCount}`);
  console.log(`Failed: ${report.failedCount}`);
  console.log(`Message: ${report.message}`);

  if (report.details.length > 0) {
    console.log('\nFile Details:');
    for (const d of report.details) {
      console.log(`- [${d.status.toUpperCase()}] ${d.filename} (${d.fileSize} bytes) - Verified: ${d.verified}${d.error ? ` - Error: ${d.error}` : ''}`);
    }
  }

  console.log('\nLocal originals were NOT deleted.');
  process.exit(report.success ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
