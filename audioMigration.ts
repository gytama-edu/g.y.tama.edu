/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Module 16: Safe Migration Utility for Audio Files
 * Migrates existing audio files from the local filesystem to Supabase Storage bucket 'assessment-audio'.
 * Verifies uploaded objects and metadata before marking complete.
 * NEVER deletes original local files.
 * Idempotent: can be run repeatedly without duplicating or corrupting objects.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  SUPABASE_AUDIO_BUCKET,
  ensureSupabaseAudioBucket,
  getAllAudioMetadataFromSupabase,
  getAudioMetadataFromSupabase,
  updateManifestSafely,
  getStorageDiagnostic,
} from './supabaseAudio';
import { AudioMetadata } from '../types/audio';

export interface MigrationFileDetail {
  id: string;
  filename: string;
  fileSize: number;
  status: 'migrated' | 'already_existed' | 'failed';
  verified: boolean;
  error?: string;
}

export interface AudioMigrationReport {
  success: boolean;
  totalLocalFiles: number;
  migratedCount: number;
  alreadyMigratedCount: number;
  failedCount: number;
  verifiedCount: number;
  details: MigrationFileDetail[];
  message: string;
  timestamp: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_AUDIO_DIR = path.join(DATA_DIR, 'audio');
const LOCAL_METADATA_FILE = path.join(DATA_DIR, 'audio_metadata.json');

/**
 * Migrates local audio files to Supabase Storage bucket 'assessment-audio'.
 *
 * Safe by design:
 * - Ensures bucket exists and is private before migrating.
 * - Verifies checksum and byte size of uploaded objects in Supabase.
 * - Durably saves both audio file and its metadata.
 * - Rolls back remote binary if metadata upload fails.
 * - NEVER deletes original local files or local metadata.
 * - Idempotent: safe to run multiple times.
 */
export async function migrateLocalAudioToSupabase(): Promise<AudioMigrationReport> {
  const timestamp = new Date().toISOString();

  // 1. Check Supabase credentials
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      totalLocalFiles: 0,
      migratedCount: 0,
      alreadyMigratedCount: 0,
      failedCount: 0,
      verifiedCount: 0,
      details: [],
      message:
        'Cannot migrate: Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in environment variables.',
      timestamp,
    };
  }

  // 2. Read local metadata
  let localMetadataList: AudioMetadata[] = [];
  try {
    const raw = await fs.readFile(LOCAL_METADATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      localMetadataList = parsed;
    }
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      console.warn('[AudioMigration] Error reading local metadata file:', err?.message);
    }
  }

  // Also check if any raw audio files exist in local folder without metadata entry
  try {
    const dirEntries = await fs.readdir(LOCAL_AUDIO_DIR).catch(() => []);
    for (const file of dirEntries) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.mp3' || ext === '.wav' || ext === '.m4a') {
        const fileId = path.basename(file, ext);
        if (!localMetadataList.some((m) => m.id === fileId || path.basename(m.storageReference) === file)) {
          const stats = await fs.stat(path.join(LOCAL_AUDIO_DIR, file)).catch(() => null);
          if (stats) {
            localMetadataList.push({
              id: fileId,
              originalFilename: file,
              mimeType: ext === '.wav' ? 'audio/wav' : ext === '.m4a' ? 'audio/mp4' : 'audio/mpeg',
              fileSize: stats.size,
              storageReference: `audio/${file}`,
              url: `/api/audio/${fileId}`,
              createdAt: stats.birthtime.toISOString(),
              updatedAt: stats.mtime.toISOString(),
            });
          }
        }
      }
    }
  } catch {
    // Non-fatal if local directory is unreadable
  }

  if (localMetadataList.length === 0) {
    return {
      success: true,
      totalLocalFiles: 0,
      migratedCount: 0,
      alreadyMigratedCount: 0,
      failedCount: 0,
      verifiedCount: 0,
      details: [],
      message: 'No local audio files found to migrate.',
      timestamp,
    };
  }

  const details: MigrationFileDetail[] = [];
  let migratedCount = 0;
  let alreadyMigratedCount = 0;
  let failedCount = 0;
  let verifiedCount = 0;

  try {
    const supabase = getSupabaseClient();

    // 3. Ensure bucket is verified and ready
    const isBucketReady = await ensureSupabaseAudioBucket();
    if (!isBucketReady) {
      const diag = getStorageDiagnostic();
      const detailMsg = diag?.error ? ` (${diag.error})` : '';
      return {
        success: false,
        totalLocalFiles: localMetadataList.length,
        migratedCount: 0,
        alreadyMigratedCount: 0,
        failedCount: localMetadataList.length,
        verifiedCount: 0,
        details: [],
        message: `Migration aborted: Could not verify or access Supabase Storage bucket "${SUPABASE_AUDIO_BUCKET}"${detailMsg}. Check permissions.`,
        timestamp,
      };
    }

    // Fetch existing Supabase metadata
    const existingSupabaseMetadata = await getAllAudioMetadataFromSupabase();
    const existingSupabaseMap = new Map<string, AudioMetadata>(
      existingSupabaseMetadata.map((m) => [m.id, m])
    );

    const successfullyMigratedItems: AudioMetadata[] = [];

    for (const item of localMetadataList) {
      const fileName = path.basename(item.storageReference);
      const localFilePath = path.join(LOCAL_AUDIO_DIR, fileName);

      let localBuffer: Buffer;
      try {
        localBuffer = await fs.readFile(localFilePath);
      } catch (err: any) {
        failedCount++;
        details.push({
          id: item.id,
          filename: item.originalFilename,
          fileSize: item.fileSize || 0,
          status: 'failed',
          verified: false,
          error: `Local file not found on disk at ${localFilePath}: ${err?.message}`,
        });
        continue;
      }

      // Compute local SHA-256 checksum
      const localChecksum = crypto.createHash('sha256').update(localBuffer).digest('hex');
      const storagePath = `audio/${fileName}`;

      // Check if file already exists in Supabase Storage with identical size and checksum
      const existingInSupabase = existingSupabaseMap.get(item.id);
      let needsUpload = true;

      if (existingInSupabase && existingInSupabase.fileSize === localBuffer.length) {
        try {
          const { data: blob, error: dlErr } = await supabase.storage
            .from(SUPABASE_AUDIO_BUCKET)
            .download(storagePath);

          if (!dlErr && blob) {
            const remoteBuffer = Buffer.from(await blob.arrayBuffer());
            const remoteChecksum = crypto.createHash('sha256').update(remoteBuffer).digest('hex');

            if (remoteChecksum === localChecksum) {
              // Remote file is identical; also verify metadata file
              const remoteMeta = await getAudioMetadataFromSupabase(item.id);
              if (remoteMeta) {
                needsUpload = false;
                alreadyMigratedCount++;
                verifiedCount++;
                successfullyMigratedItems.push({
                  ...item,
                  storageReference: storagePath,
                  checksum: localChecksum,
                });
                details.push({
                  id: item.id,
                  filename: item.originalFilename,
                  fileSize: localBuffer.length,
                  status: 'already_existed',
                  verified: true,
                });
              }
            }
          }
        } catch {
          needsUpload = true;
        }
      }

      if (needsUpload) {
        try {
          // 1. Upload audio file binary to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from(SUPABASE_AUDIO_BUCKET)
            .upload(storagePath, localBuffer, {
              contentType: item.mimeType || 'audio/mpeg',
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Upload error: ${uploadError.message}`);
          }

          // 2. VERIFY the uploaded object in Supabase by downloading and checking checksum
          const { data: verifyBlob, error: verifyError } = await supabase.storage
            .from(SUPABASE_AUDIO_BUCKET)
            .download(storagePath);

          if (verifyError || !verifyBlob) {
            // Cleanup on verification failure
            await supabase.storage.from(SUPABASE_AUDIO_BUCKET).remove([storagePath]);
            throw new Error(`Verification download failed: ${verifyError?.message || 'Empty object'}`);
          }

          const verifyBuffer = Buffer.from(await verifyBlob.arrayBuffer());
          const verifyChecksum = crypto.createHash('sha256').update(verifyBuffer).digest('hex');

          if (verifyBuffer.length !== localBuffer.length || verifyChecksum !== localChecksum) {
            // Cleanup corrupted upload
            await supabase.storage.from(SUPABASE_AUDIO_BUCKET).remove([storagePath]);
            throw new Error(
              `Integrity check mismatch! Local checksum ${localChecksum} vs Remote ${verifyChecksum}`
            );
          }

          // 3. Persist metadata in Supabase
          const updatedMeta: AudioMetadata = {
            ...item,
            storageReference: storagePath,
            checksum: localChecksum,
            fileSize: localBuffer.length,
            updatedAt: new Date().toISOString(),
          };

          const metaBuffer = Buffer.from(JSON.stringify(updatedMeta, null, 2), 'utf-8');
          const { error: metaUploadErr } = await supabase.storage
            .from(SUPABASE_AUDIO_BUCKET)
            .upload(`_metadata/${item.id}.json`, metaBuffer, {
              contentType: 'application/json',
              upsert: true,
            });

          if (metaUploadErr) {
            // Roll back uploaded audio file if metadata failed
            await supabase.storage.from(SUPABASE_AUDIO_BUCKET).remove([storagePath]);
            throw new Error(`Metadata upload failed: ${metaUploadErr.message}`);
          }

          migratedCount++;
          verifiedCount++;
          successfullyMigratedItems.push(updatedMeta);
          details.push({
            id: item.id,
            filename: item.originalFilename,
            fileSize: localBuffer.length,
            status: 'migrated',
            verified: true,
          });
        } catch (uploadErr: any) {
          failedCount++;
          details.push({
            id: item.id,
            filename: item.originalFilename,
            fileSize: localBuffer.length,
            status: 'failed',
            verified: false,
            error: uploadErr?.message,
          });
        }
      }
    }

    // 4. Update master manifest in Supabase Storage with all verified items
    if (successfullyMigratedItems.length > 0) {
      try {
        await updateManifestSafely((current) => {
          const map = new Map<string, AudioMetadata>();
          for (const item of current) {
            if (item?.id) map.set(item.id, item);
          }
          for (const migrated of successfullyMigratedItems) {
            map.set(migrated.id, migrated);
          }
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        });
      } catch (manifestErr: any) {
        console.warn('[AudioMigration] Notice: Remote manifest update delayed:', manifestErr?.message);
      }
    }

    const overallSuccess = failedCount === 0;
    return {
      success: overallSuccess,
      totalLocalFiles: localMetadataList.length,
      migratedCount,
      alreadyMigratedCount,
      failedCount,
      verifiedCount,
      details,
      message: overallSuccess
        ? `Migration completed successfully: ${migratedCount} migrated, ${alreadyMigratedCount} already in Supabase, ${verifiedCount} verified. Local originals preserved.`
        : `Migration partially completed: ${migratedCount} migrated, ${alreadyMigratedCount} already in Supabase, ${failedCount} failed. Local originals preserved.`,
      timestamp,
    };
  } catch (err: any) {
    console.error('[AudioMigration] Fatal migration error:', err);
    return {
      success: false,
      totalLocalFiles: localMetadataList.length,
      migratedCount,
      alreadyMigratedCount,
      failedCount: failedCount || localMetadataList.length,
      verifiedCount,
      details,
      message: `Migration failed: ${err?.message}`,
      timestamp,
    };
  }
}
