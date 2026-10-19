/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Module 16: Supabase Storage Integration for Assessora Audio
 * Handles persistent audio uploads, downloads, range-seeking streaming, metadata persistence,
 * and bucket management using the official Supabase JavaScript client.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  AudioMetadata,
  AudioUploadConfig,
  AudioErrorCode,
  DEFAULT_MAX_AUDIO_SIZE_BYTES,
  SUPPORTED_AUDIO_EXTENSIONS,
  SUPPORTED_AUDIO_MIME_TYPES,
} from '../types/audio';
import { validateAudioBuffer } from './db';

/** Bucket name in Supabase Storage */
export const SUPABASE_AUDIO_BUCKET =
  process.env.SUPABASE_AUDIO_BUCKET?.trim() || 'assessment-audio';

/** Maximum audio file size in bytes (25MB default) */
export const MAX_AUDIO_SIZE_BYTES =
  Number(process.env.MAX_AUDIO_SIZE_BYTES) || DEFAULT_MAX_AUDIO_SIZE_BYTES;

/** Allowed MIME types for the storage bucket (audio files + JSON metadata records) */
export const BUCKET_ALLOWED_MIME_TYPES = [
  ...SUPPORTED_AUDIO_MIME_TYPES,
  'application/json',
];

let cachedClient: SupabaseClient | null = null;
let bucketVerified = false;

/**
 * Memory buffer cache for active audio files.
 * Caches recently accessed audio buffers to allow instant,
 * zero-latency HTTP Range requests during audio scrubbing and playback.
 */
interface CachedAudioEntry {
  buffer: Buffer;
  metadata: AudioMetadata;
  accessedAt: number;
}

const audioBufferCache = new Map<string, CachedAudioEntry>();
const MAX_CACHE_ENTRIES = 12;

/**
 * In-process serialization mutex to prevent concurrent manifest updates
 * from overwriting or losing records.
 */
let manifestQueue: Promise<void> = Promise.resolve();

export function runWithManifestLock<T>(task: () => Promise<T>): Promise<T> {
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const currentLock = manifestQueue;
  manifestQueue = nextLock;

  return currentLock
    .catch(() => {})
    .then(task)
    .finally(() => {
      release();
    });
}

export interface StorageDiagnostic {
  verified: boolean;
  bucket: string;
  urlHost?: string;
  hasUrl: boolean;
  hasKey: boolean;
  error?: string;
  errorName?: string;
  errorStatus?: number | string;
  lastChecked: string;
}

let lastDiagnostic: StorageDiagnostic | null = null;
let cachedClientUrl: string | null = null;
let cachedClientKey: string | null = null;

export function getStorageDiagnostic(): StorageDiagnostic | null {
  return lastDiagnostic;
}

/**
 * Normalizes a Supabase project URL by removing any trailing paths like /rest/v1
 * and trailing slashes so the Supabase SDK can properly format storage endpoints.
 */
export function normalizeSupabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  try {
    const parsed = new URL(url);
    if (parsed.pathname && parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname
        .replace(/\/rest\/v1\/?$/, '')
        .replace(/\/storage\/v1\/?$/, '')
        .replace(/\/auth\/v1\/?$/, '')
        .replace(/\/+$/, '');
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return url
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/storage\/v1\/?$/, '')
      .replace(/\/auth\/v1\/?$/, '')
      .replace(/\/+$/, '');
  }
}

/**
 * Checks if Supabase credentials are configured in environment variables.
 */
export function isSupabaseConfigured(): boolean {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY
  )?.trim();
  return Boolean(url && key);
}

/**
 * Retrieves the initialized Supabase client with the service role secret key.
 * Throws a descriptive error if credentials are not configured.
 */
export function getSupabaseClient(): SupabaseClient {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const url = normalizeSupabaseUrl(rawUrl);
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY
  )?.trim();

  if (!url || !key) {
    const isProd = process.env.NODE_ENV === 'production';
    const msg = isProd
      ? 'Supabase Storage is required in production, but SUPABASE_URL or SUPABASE_SECRET_KEY is missing. Configure these environment variables to connect to bucket "assessment-audio".'
      : 'Supabase Storage is not configured. Please set SUPABASE_URL and SUPABASE_SECRET_KEY in your environment variables to connect to bucket "assessment-audio".';
    throw new Error(msg);
  }

  if (!cachedClient || cachedClientUrl !== url || cachedClientKey !== key) {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedClientUrl = url;
    cachedClientKey = key;
  }

  return cachedClient;
}

/**
 * Ensures that the target Supabase Storage bucket exists and is private.
 * Returns true if the bucket is confirmed to exist and be accessible.
 * If verification or creation fails, returns false without setting bucketVerified.
 */
export async function ensureSupabaseAudioBucket(): Promise<boolean> {
  if (bucketVerified) return true;
  if (!isSupabaseConfigured()) {
    bucketVerified = false;
    lastDiagnostic = {
      verified: false,
      bucket: SUPABASE_AUDIO_BUCKET,
      hasUrl: Boolean(process.env.SUPABASE_URL?.trim()),
      hasKey: Boolean(
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_KEY
      ),
      error: 'Supabase credentials not configured in environment variables',
      lastChecked: new Date().toISOString(),
    };
    return false;
  }

  let host = '';
  try {
    const rawUrl = process.env.SUPABASE_URL?.trim();
    const cleanUrl = normalizeSupabaseUrl(rawUrl);
    host = new URL(cleanUrl).host;
  } catch {
    host = 'unknown-host';
  }

  try {
    const supabase = getSupabaseClient();
    console.log(`[Supabase Storage] Verifying bucket "${SUPABASE_AUDIO_BUCKET}" on host: ${host}`);

    // 1. Direct bucket check: query the specific bucket
    const { data: bucketData, error: getErr } = await supabase.storage.getBucket(SUPABASE_AUDIO_BUCKET);

    if (bucketData) {
      // Bucket exists! Verify that it is private and allows required MIME types
      const allowed = bucketData.allowed_mime_types || [];
      const needsJson = allowed.length > 0 && !allowed.includes('application/json');
      const isPublic = Boolean(bucketData.public);

      if (isPublic || needsJson) {
        console.warn(`[Supabase Storage] Updating bucket "${SUPABASE_AUDIO_BUCKET}" configuration (private: true, includes json: true)...`);
        const updatedAllowed = Array.from(new Set([...allowed, ...BUCKET_ALLOWED_MIME_TYPES]));
        const { error: updateErr } = await supabase.storage.updateBucket(
          SUPABASE_AUDIO_BUCKET,
          {
            public: false,
            fileSizeLimit: MAX_AUDIO_SIZE_BYTES,
            allowedMimeTypes: updatedAllowed,
          }
        );
        if (updateErr) {
          console.warn(`[Supabase Storage] Notice: Could not update bucket config: ${updateErr.message}`);
        } else {
          console.log(`[Supabase Storage] Successfully updated bucket "${SUPABASE_AUDIO_BUCKET}" permissions and allowed MIME types.`);
        }
      } else {
        console.log(`[Supabase Storage] Bucket "${SUPABASE_AUDIO_BUCKET}" verified and confirmed private.`);
      }

      bucketVerified = true;
      lastDiagnostic = {
        verified: true,
        bucket: SUPABASE_AUDIO_BUCKET,
        urlHost: host,
        hasUrl: true,
        hasKey: true,
        lastChecked: new Date().toISOString(),
      };
      return true;
    }

    // 2. If getBucket failed, check if it's because the bucket does not exist (404 / not found)
    const isNotFound =
      (getErr as any)?.status === 404 ||
      getErr?.message?.toLowerCase().includes('not found');

    if (isNotFound) {
      console.log(`[Supabase Storage] Bucket "${SUPABASE_AUDIO_BUCKET}" does not exist. Creating as private...`);
      const { error: createErr } = await supabase.storage.createBucket(
        SUPABASE_AUDIO_BUCKET,
        {
          public: false,
          fileSizeLimit: MAX_AUDIO_SIZE_BYTES,
          allowedMimeTypes: BUCKET_ALLOWED_MIME_TYPES,
        }
      );

      if (createErr) {
        console.error(`[Supabase Storage] Failed to create private bucket "${SUPABASE_AUDIO_BUCKET}":`, {
          name: createErr.name,
          message: createErr.message,
        });
        bucketVerified = false;
        lastDiagnostic = {
          verified: false,
          bucket: SUPABASE_AUDIO_BUCKET,
          urlHost: host,
          hasUrl: true,
          hasKey: true,
          error: `Failed to create bucket: ${createErr.message}`,
          errorName: createErr.name,
          lastChecked: new Date().toISOString(),
        };
        return false;
      }

      console.log(`[Supabase Storage] Created private bucket: "${SUPABASE_AUDIO_BUCKET}"`);
      bucketVerified = true;
      lastDiagnostic = {
        verified: true,
        bucket: SUPABASE_AUDIO_BUCKET,
        urlHost: host,
        hasUrl: true,
        hasKey: true,
        lastChecked: new Date().toISOString(),
      };
      return true;
    }

    // 3. Fallback: try listBuckets in case getBucket permissions differ
    console.warn(`[Supabase Storage] getBucket returned error (${getErr?.message}). Falling back to listBuckets...`);
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (!listError && buckets) {
      const existing = buckets.find((b) => b.name === SUPABASE_AUDIO_BUCKET);
      if (existing) {
        const allowed = existing.allowed_mime_types || [];
        const needsJson = allowed.length > 0 && !allowed.includes('application/json');
        if (existing.public || needsJson) {
          const updatedAllowed = Array.from(new Set([...allowed, ...BUCKET_ALLOWED_MIME_TYPES]));
          await supabase.storage.updateBucket(SUPABASE_AUDIO_BUCKET, {
            public: false,
            fileSizeLimit: MAX_AUDIO_SIZE_BYTES,
            allowedMimeTypes: updatedAllowed,
          });
        }
        console.log(`[Supabase Storage] Bucket "${SUPABASE_AUDIO_BUCKET}" found via listBuckets.`);
        bucketVerified = true;
        lastDiagnostic = {
          verified: true,
          bucket: SUPABASE_AUDIO_BUCKET,
          urlHost: host,
          hasUrl: true,
          hasKey: true,
          lastChecked: new Date().toISOString(),
        };
        return true;
      }
    }

    // 4. Verification failed: log diagnostic details (no secrets!)
    const activeErr = getErr || listError;
    console.error(`[Supabase Storage] Bucket verification failed on host ${host}:`, {
      name: activeErr?.name,
      message: activeErr?.message,
      status: (activeErr as any)?.status,
      statusCode: (activeErr as any)?.statusCode,
    });

    bucketVerified = false;
    lastDiagnostic = {
      verified: false,
      bucket: SUPABASE_AUDIO_BUCKET,
      urlHost: host,
      hasUrl: true,
      hasKey: true,
      error: activeErr?.message || 'Bucket verification failed',
      errorName: activeErr?.name,
      errorStatus: (activeErr as any)?.status || (activeErr as any)?.statusCode,
      lastChecked: new Date().toISOString(),
    };
    return false;
  } catch (err: any) {
    console.error(`[Supabase Storage] Unexpected error verifying bucket on ${host}:`, err?.message || err);
    bucketVerified = false;
    lastDiagnostic = {
      verified: false,
      bucket: SUPABASE_AUDIO_BUCKET,
      urlHost: host,
      hasUrl: true,
      hasKey: true,
      error: err?.message || 'Unexpected verification failure',
      lastChecked: new Date().toISOString(),
    };
    return false;
  }
}

/**
 * Stores an entry in the in-memory audio buffer cache with eviction.
 */
function putInAudioCache(metadata: AudioMetadata, buffer: Buffer): void {
  if (audioBufferCache.size >= MAX_CACHE_ENTRIES) {
    let oldestId: string | null = null;
    let oldestTime = Infinity;
    for (const [id, entry] of audioBufferCache.entries()) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt;
        oldestId = id;
      }
    }
    if (oldestId) {
      audioBufferCache.delete(oldestId);
    }
  }

  audioBufferCache.set(metadata.id, {
    buffer,
    metadata,
    accessedAt: Date.now(),
  });
}

/**
 * Evicts an entry from the audio cache.
 */
export function evictFromAudioCache(id: string): void {
  audioBufferCache.delete(id);
}

/**
 * Safely updates the master audio manifest in Supabase Storage with serialization.
 * Guarantees concurrent uploads or deletions do not overwrite or drop records.
 */
export async function updateManifestSafely(
  updateFn: (current: AudioMetadata[]) => AudioMetadata[]
): Promise<AudioMetadata[]> {
  return runWithManifestLock(async () => {
    const supabase = getSupabaseClient();

    // 1. Fetch current manifest directly from Supabase Storage
    let current: AudioMetadata[] = [];
    try {
      const { data: blob, error } = await supabase.storage
        .from(SUPABASE_AUDIO_BUCKET)
        .download('_metadata/audio_manifest.json');

      if (!error && blob) {
        const text = await blob.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          current = parsed;
        }
      }
    } catch {
      // Manifest does not exist yet or is empty
    }

    // 2. Apply transformation
    const updated = updateFn(current);

    // 3. Persist updated manifest
    const manifestBuffer = Buffer.from(JSON.stringify(updated, null, 2), 'utf-8');
    const { error: uploadErr } = await supabase.storage
      .from(SUPABASE_AUDIO_BUCKET)
      .upload('_metadata/audio_manifest.json', manifestBuffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadErr) {
      console.warn('[Supabase Storage] Failed to upload updated audio_manifest.json:', uploadErr.message);
      throw new Error(`Failed to update audio manifest: ${uploadErr.message}`);
    }

    return updated;
  });
}

/**
 * Persists an individual metadata JSON file to Supabase Storage and updates the manifest.
 * Throws an error if metadata file persistence fails.
 */
async function persistMetadataToSupabase(metadata: AudioMetadata): Promise<void> {
  const supabase = getSupabaseClient();
  const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8');
  const metadataPath = `_metadata/${metadata.id}.json`;

  // 1. Save individual durable record
  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_AUDIO_BUCKET)
    .upload(metadataPath, metadataBuffer, {
      contentType: 'application/json',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `Failed to upload metadata file "${metadataPath}": ${uploadError.message}`
    );
  }

  // 2. Update master manifest with concurrency protection
  try {
    await updateManifestSafely((current) => {
      const map = new Map<string, AudioMetadata>();
      for (const item of current) {
        if (item?.id) map.set(item.id, item);
      }
      map.set(metadata.id, metadata);
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    });
  } catch (manifestErr: any) {
    console.warn(
      `[Supabase Storage] Notice: Manifest index update delayed for ${metadata.id}:`,
      manifestErr?.message
    );
    // The individual metadata file _metadata/${metadata.id}.json is already durably saved
  }
}

/**
 * Uploads, validates, and persists an audio file in Supabase Storage.
 *
 * CRITICAL RELIABILITY:
 * - Does not report upload success unless BOTH the audio binary object and its metadata are durably saved.
 * - Handles failures cleanly and removes the newly uploaded audio object if metadata persistence fails.
 */
export async function saveAudioToSupabase(
  buffer: Buffer,
  originalFilename: string,
  declaredMimeType?: string
): Promise<
  | { success: true; metadata: AudioMetadata }
  | { success: false; error: string; code: AudioErrorCode }
> {
  // 1. Check Supabase configuration first
  if (!isSupabaseConfigured()) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      success: false,
      error: isProd
        ? 'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY to enable audio storage in bucket "assessment-audio".'
        : 'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in your environment to upload audio.',
      code: 'STORAGE_ERROR',
    };
  }

  // 2. Validate audio buffer
  const validation = validateAudioBuffer(buffer, originalFilename, declaredMimeType);
  if (!validation.valid || !validation.extension || !validation.canonicalMimeType) {
    return {
      success: false,
      error: validation.error || 'Audio validation failed',
      code: validation.code || 'VALIDATION_FAILED',
    };
  }

  const { extension, canonicalMimeType, cleanFilename } = validation;

  // 3. Ensure bucket is verified and ready
  const isBucketReady = await ensureSupabaseAudioBucket();
  if (!isBucketReady) {
    const diag = getStorageDiagnostic();
    const detailMsg = diag?.error ? ` (${diag.error})` : '';
    return {
      success: false,
      error: `Supabase Storage bucket "${SUPABASE_AUDIO_BUCKET}" could not be verified or accessed${detailMsg}. Check Supabase credentials and bucket permissions.`,
      code: 'STORAGE_ERROR',
    };
  }

  // Generate unique file ID and storage paths
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(5).toString('hex');
  const fileId = `audio_${timestamp}_${randomSuffix}`;
  const storagePath = `audio/${fileId}.${extension}`;

  // Calculate SHA-256 checksum
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  const supabase = getSupabaseClient();

  try {
    // 4. Upload audio file binary to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_AUDIO_BUCKET)
      .upload(storagePath, buffer, {
        contentType: canonicalMimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Supabase Storage] Upload error:', uploadError);
      return {
        success: false,
        error: `Supabase Storage upload failed: ${uploadError.message}`,
        code: 'STORAGE_ERROR',
      };
    }

    const now = new Date().toISOString();
    const metadata: AudioMetadata = {
      id: fileId,
      originalFilename: cleanFilename || `audio_${timestamp}.${extension}`,
      mimeType: canonicalMimeType,
      fileSize: buffer.length,
      storageReference: storagePath,
      url: `/api/audio/${fileId}`,
      createdAt: now,
      updatedAt: now,
      checksum,
    };

    // 5. Persist metadata to Supabase Storage
    // If metadata persistence fails, roll back and remove the newly uploaded audio object
    try {
      await persistMetadataToSupabase(metadata);
    } catch (metaErr: any) {
      console.error(
        `[Supabase Storage] Metadata persistence failed for ${fileId}; rolling back uploaded audio object:`,
        metaErr?.message
      );

      // Rollback: delete the orphaned audio binary
      try {
        await supabase.storage.from(SUPABASE_AUDIO_BUCKET).remove([storagePath]);
      } catch (cleanupErr: any) {
        console.error(
          `[Supabase Storage] Failed to remove orphaned audio object ${storagePath}:`,
          cleanupErr?.message
        );
      }

      // Evict from cache
      evictFromAudioCache(fileId);

      return {
        success: false,
        error: `Failed to persist audio metadata: ${metaErr?.message || 'Storage error'}. Audio upload rolled back.`,
        code: 'STORAGE_ERROR',
      };
    }

    // 6. Only after both binary and metadata are durably saved, add to cache and report success
    putInAudioCache(metadata, buffer);

    return {
      success: true,
      metadata,
    };
  } catch (err: any) {
    console.error('[Supabase Storage] Failed to save audio file:', err);

    // Rollback attempt if an uncaught error occurred after upload
    try {
      await supabase.storage.from(SUPABASE_AUDIO_BUCKET).remove([storagePath]);
    } catch {
      // Best-effort cleanup
    }

    evictFromAudioCache(fileId);

    return {
      success: false,
      error: `Failed to save audio file to Supabase: ${err?.message || 'Storage error'}`,
      code: 'STORAGE_ERROR',
    };
  }
}

/**
 * Retrieves audio buffer and metadata for streaming and HTTP Range seeking.
 */
export async function getAudioBufferFromSupabase(
  id: string
): Promise<{ buffer: Buffer; metadata: AudioMetadata } | null> {
  if (!id || typeof id !== 'string') return null;
  const cleanId = id.trim();

  // 1. Check in-memory buffer cache first
  const cached = audioBufferCache.get(cleanId);
  if (cached) {
    cached.accessedAt = Date.now();
    return { buffer: cached.buffer, metadata: cached.metadata };
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = getSupabaseClient();
    const metadata = await getAudioMetadataFromSupabase(cleanId);
    if (!metadata) return null;

    // Download audio binary from Supabase Storage
    const { data: blob, error } = await supabase.storage
      .from(SUPABASE_AUDIO_BUCKET)
      .download(metadata.storageReference);

    if (error || !blob) {
      console.warn(`[Supabase Storage] Failed to download audio ${cleanId}:`, error?.message);
      return null;
    }

    const arrayBuf = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Cache the downloaded buffer
    putInAudioCache(metadata, buffer);

    return { buffer, metadata };
  } catch (err: any) {
    console.error(`[Supabase Storage] Error fetching audio buffer for ${cleanId}:`, err);
    return null;
  }
}

/**
 * Retrieves metadata for a single audio file from Supabase Storage.
 */
export async function getAudioMetadataFromSupabase(
  id: string
): Promise<AudioMetadata | null> {
  if (!id || typeof id !== 'string') return null;
  const cleanId = id.trim();

  // Check cache
  const cached = audioBufferCache.get(cleanId);
  if (cached) return cached.metadata;

  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabaseClient();

    // 1. Try individual metadata file first (direct point lookup)
    const { data: blob, error } = await supabase.storage
      .from(SUPABASE_AUDIO_BUCKET)
      .download(`_metadata/${cleanId}.json`);

    if (!error && blob) {
      const text = await blob.text();
      const meta = JSON.parse(text) as AudioMetadata;
      if (meta?.id) return meta;
    }

    // 2. Fall back to reading master manifest
    const all = await getAllAudioMetadataFromSupabase();
    return all.find((item) => item.id === cleanId) || null;
  } catch (err) {
    console.error(`[Supabase Storage] Error fetching metadata for ${cleanId}:`, err);
    return null;
  }
}

/**
 * Paginates through all metadata files in the _metadata directory in Supabase Storage.
 * Does not limit listing to 200 records.
 */
async function listAllMetadataFilesFromSupabase(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const PAGE_SIZE = 100;
  let offset = 0;
  const jsonFiles: string[] = [];

  while (true) {
    const { data: files, error } = await supabase.storage
      .from(SUPABASE_AUDIO_BUCKET)
      .list('_metadata', {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error || !files || files.length === 0) {
      break;
    }

    for (const f of files) {
      if (f.name.endsWith('.json') && f.name !== 'audio_manifest.json') {
        jsonFiles.push(f.name);
      }
    }

    if (files.length < PAGE_SIZE) {
      break;
    }
    offset += files.length;
  }

  return jsonFiles;
}

/**
 * Reads all audio metadata records from Supabase Storage.
 * Uses master manifest if available, or falls back to paginating all metadata files without 200 limit.
 */
export async function getAllAudioMetadataFromSupabase(): Promise<AudioMetadata[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseClient();

    // 1. Try reading master manifest
    const { data: blob, error } = await supabase.storage
      .from(SUPABASE_AUDIO_BUCKET)
      .download('_metadata/audio_manifest.json');

    if (!error && blob) {
      const text = await blob.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // 2. Fall back to paginating all individual metadata files (NO 200-file limit)
    const filenames = await listAllMetadataFilesFromSupabase();
    if (filenames.length === 0) {
      return [];
    }

    const records: AudioMetadata[] = [];
    // Process in batches of 10 to balance performance and connection limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < filenames.length; i += BATCH_SIZE) {
      const batch = filenames.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (filename) => {
          const { data: fileBlob } = await supabase.storage
            .from(SUPABASE_AUDIO_BUCKET)
            .download(`_metadata/${filename}`);
          if (fileBlob) {
            const parsed = JSON.parse(await fileBlob.text());
            if (parsed?.id) return parsed as AudioMetadata;
          }
          return null;
        })
      );

      for (const res of batchResults) {
        if (res.status === 'fulfilled' && res.value) {
          records.push(res.value);
        }
      }
    }

    // Self-heal manifest if records were found
    if (records.length > 0) {
      try {
        const manifestBuffer = Buffer.from(JSON.stringify(records, null, 2), 'utf-8');
        await supabase.storage
          .from(SUPABASE_AUDIO_BUCKET)
          .upload('_metadata/audio_manifest.json', manifestBuffer, {
            contentType: 'application/json',
            upsert: true,
          });
      } catch {
        // Non-critical background healing
      }
    }

    return records;
  } catch (err) {
    console.error('[Supabase Storage] Error fetching all audio metadata:', err);
    return [];
  }
}

/**
 * Deletes an audio file and its metadata from Supabase Storage.
 * Handles concurrency safely and removes entries from the manifest.
 */
export async function deleteAudioFromSupabase(
  id: string
): Promise<{ success: boolean; error?: string; code?: AudioErrorCode }> {
  if (!id || typeof id !== 'string') {
    return { success: false, error: 'Missing audio id', code: 'NO_FILE_PROVIDED' };
  }

  if (!isSupabaseConfigured()) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      success: false,
      error: isProd
        ? 'Supabase Storage is not configured in production.'
        : 'Supabase Storage is not configured.',
      code: 'STORAGE_ERROR',
    };
  }

  const cleanId = id.trim();
  const metadata = await getAudioMetadataFromSupabase(cleanId);

  if (!metadata) {
    return { success: false, error: 'Audio file not found', code: 'AUDIO_NOT_FOUND' };
  }

  // Evict from in-memory cache
  evictFromAudioCache(cleanId);

  try {
    const supabase = getSupabaseClient();
    const filesToRemove = [
      metadata.storageReference,
      `_metadata/${cleanId}.json`,
    ];

    const { error: removeError } = await supabase.storage
      .from(SUPABASE_AUDIO_BUCKET)
      .remove(filesToRemove);

    if (removeError) {
      console.warn(`[Supabase Storage] Error removing ${cleanId}:`, removeError.message);
      return {
        success: false,
        error: `Failed to remove audio files: ${removeError.message}`,
        code: 'STORAGE_ERROR',
      };
    }

    // Safely update manifest with serialization
    try {
      await updateManifestSafely((current) => current.filter((m) => m && m.id !== cleanId));
    } catch (manifestErr: any) {
      console.warn('[Supabase Storage] Notice: Manifest update on deletion:', manifestErr?.message);
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[Supabase Storage] Failed to delete audio ${cleanId}:`, err);
    return {
      success: false,
      error: `Failed to delete audio from Supabase: ${err?.message}`,
      code: 'STORAGE_ERROR',
    };
  }
}

/**
 * Returns configuration settings for audio uploads, reporting the active backend.
 */
export function getAudioStorageConfig(): AudioUploadConfig & {
  backend: 'supabase' | 'unconfigured';
  bucket: string;
} {
  return {
    maxFileSize: MAX_AUDIO_SIZE_BYTES,
    allowedExtensions: [...SUPPORTED_AUDIO_EXTENSIONS],
    allowedMimeTypes: [...SUPPORTED_AUDIO_MIME_TYPES],
    backend: isSupabaseConfigured() ? 'supabase' : 'unconfigured',
    bucket: SUPABASE_AUDIO_BUCKET,
  };
}
