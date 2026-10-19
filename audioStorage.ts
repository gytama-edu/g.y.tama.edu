/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Module 16: Persistent Audio Infrastructure
 * Client-side utilities and service for audio file validation, upload with progress tracking,
 * retrieval, and metadata management.
 */

import {
  AudioMetadata,
  AudioUploadProgress,
  AudioUploadConfig,
  AudioErrorCode,
  DEFAULT_MAX_AUDIO_SIZE_BYTES,
  SUPPORTED_AUDIO_EXTENSIONS,
  SUPPORTED_AUDIO_MIME_TYPES,
  SupportedAudioExtension,
} from '../types/audio';

export class AudioServiceError extends Error {
  code: AudioErrorCode;
  details?: string;

  constructor(message: string, code: AudioErrorCode = 'VALIDATION_FAILED', details?: string) {
    super(message);
    this.name = 'AudioServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
export function formatAudioSize(bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Formats duration in seconds to mm:ss format.
 */
export function formatAudioDuration(seconds?: number | null): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Extracts the file extension from a filename.
 */
export function getAudioExtension(filename: string): string {
  const match = (filename || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

/**
 * Validates an audio file on the client before uploading.
 */
export function validateAudioFileLocally(
  file: File,
  maxSizeBytes: number = DEFAULT_MAX_AUDIO_SIZE_BYTES
): { valid: boolean; error?: string; code?: AudioErrorCode; extension?: SupportedAudioExtension } {
  if (!file) {
    return {
      valid: false,
      error: 'No audio file selected.',
      code: 'NO_FILE_PROVIDED',
    };
  }

  // 1. File size check
  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${formatAudioSize(file.size)}) exceeds the maximum limit of ${maxMb} MB.`,
      code: 'FILE_TOO_LARGE',
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'The selected file is empty (0 bytes).',
      code: 'CORRUPTED_FILE',
    };
  }

  // 2. Extension check
  const ext = getAudioExtension(file.name);
  if (!SUPPORTED_AUDIO_EXTENSIONS.includes(ext as SupportedAudioExtension)) {
    return {
      valid: false,
      error: `Unsupported file format (.${ext || 'unknown'}). Please upload an MP3, WAV, or M4A audio file.`,
      code: 'UNSUPPORTED_FORMAT',
    };
  }

  // 3. MIME type check if present
  if (file.type) {
    const typeLower = file.type.toLowerCase();
    const isMimeRecognized =
      SUPPORTED_AUDIO_MIME_TYPES.some((m) => typeLower.includes(m)) ||
      typeLower.startsWith('audio/');

    if (!isMimeRecognized) {
      return {
        valid: false,
        error: `Invalid file MIME type (${file.type}). Only MP3, WAV, and M4A audio files are allowed.`,
        code: 'UNSUPPORTED_FORMAT',
      };
    }
  }

  return {
    valid: true,
    extension: ext as SupportedAudioExtension,
  };
}

/**
 * Fetches server configuration for audio uploads.
 */
export async function getAudioUploadConfig(): Promise<AudioUploadConfig> {
  try {
    const res = await fetch('/api/audio/config');
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    const data = await res.json();
    return (
      data.config || {
        maxFileSize: DEFAULT_MAX_AUDIO_SIZE_BYTES,
        allowedExtensions: SUPPORTED_AUDIO_EXTENSIONS,
        allowedMimeTypes: SUPPORTED_AUDIO_MIME_TYPES,
      }
    );
  } catch (err) {
    console.warn('[AudioService] Could not fetch server audio config, using defaults:', err);
    return {
      maxFileSize: DEFAULT_MAX_AUDIO_SIZE_BYTES,
      allowedExtensions: SUPPORTED_AUDIO_EXTENSIONS,
      allowedMimeTypes: SUPPORTED_AUDIO_MIME_TYPES,
    };
  }
}

/**
 * Uploads an audio file to persistent server storage with real-time progress callbacks.
 */
export function uploadAudioFile(
  file: File,
  options?: {
    onProgress?: (progress: AudioUploadProgress) => void;
    signal?: AbortSignal;
    maxSizeBytes?: number;
  }
): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    // 1. Client-side pre-validation
    const validation = validateAudioFileLocally(
      file,
      options?.maxSizeBytes || DEFAULT_MAX_AUDIO_SIZE_BYTES
    );

    if (!validation.valid) {
      return reject(
        new AudioServiceError(
          validation.error || 'Invalid audio file',
          validation.code || 'VALIDATION_FAILED'
        )
      );
    }

    // 2. Abort signal check
    if (options?.signal?.aborted) {
      return reject(new AudioServiceError('Upload was aborted by user.', 'ABORTED'));
    }

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('audio', file, file.name);

    // 3. Track upload progress
    if (xhr.upload && options?.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          options.onProgress?.({
            loaded: event.loaded,
            total: event.total,
            percentage,
          });
        }
      };
    }

    // 4. Handle abort signal
    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new AudioServiceError('Upload was cancelled.', 'ABORTED'));
      });
    }

    // 5. Completion handlers
    xhr.onload = () => {
      try {
        const responseText = xhr.responseText;
        let responseJson: any = null;
        try {
          responseJson = JSON.parse(responseText);
        } catch {
          // If non-JSON returned
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          if (responseJson?.success && responseJson?.audio) {
            resolve(responseJson.audio as AudioMetadata);
          } else {
            reject(
              new AudioServiceError(
                responseJson?.error || 'Invalid server response.',
                'STORAGE_ERROR'
              )
            );
          }
        } else {
          const errorMsg =
            responseJson?.error || `Upload failed with status code ${xhr.status}.`;
          const errorCode: AudioErrorCode = responseJson?.code || 'STORAGE_ERROR';
          reject(new AudioServiceError(errorMsg, errorCode, responseJson?.details));
        }
      } catch (err: any) {
        reject(
          new AudioServiceError(
            `Failed to parse upload response: ${err?.message}`,
            'STORAGE_ERROR'
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new AudioServiceError(
          'Network error while uploading audio file. Please check your connection and retry.',
          'NETWORK_ERROR'
        )
      );
    };

    xhr.ontimeout = () => {
      reject(
        new AudioServiceError(
          'Upload timed out. Please check your internet connection and try again.',
          'NETWORK_ERROR'
        )
      );
    };

    xhr.open('POST', '/api/audio/upload', true);
    // Send upload request
    xhr.send(formData);
  });
}

/**
 * Retrieves audio metadata by ID from the persistent server API.
 */
export async function getAudioMetadata(audioId: string): Promise<AudioMetadata | null> {
  if (!audioId || typeof audioId !== 'string') return null;
  const cleanId = audioId.trim();

  try {
    const res = await fetch(`/api/audio/${encodeURIComponent(cleanId)}/metadata`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return data?.audio || null;
  } catch (err) {
    console.error(`[AudioService] Error fetching metadata for ${cleanId}:`, err);
    return null;
  }
}

/**
 * Retrieves all registered audio files from persistent server storage.
 */
export async function getAllAudioFiles(): Promise<AudioMetadata[]> {
  try {
    const res = await fetch('/api/audio');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data?.audioFiles) ? data.audioFiles : [];
  } catch (err) {
    console.error('[AudioService] Error fetching audio files list:', err);
    return [];
  }
}

/**
 * Returns the direct stream URL for an audio ID.
 */
export function getAudioStreamUrl(audioId: string): string {
  if (!audioId) return '';
  return `/api/audio/${encodeURIComponent(audioId.trim())}`;
}

/**
 * Checks whether an audio file is accessible and available on the server.
 */
export async function checkAudioAvailability(audioId: string): Promise<boolean> {
  if (!audioId) return false;
  try {
    const res = await fetch(`/api/audio/${encodeURIComponent(audioId.trim())}`, {
      method: 'HEAD',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Deletes an audio file and its metadata from the server.
 */
export async function deleteAudioFileById(audioId: string): Promise<boolean> {
  if (!audioId) return false;
  try {
    const res = await fetch(`/api/audio/${encodeURIComponent(audioId.trim())}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return Boolean(data?.success);
  } catch (err) {
    console.error(`[AudioService] Error deleting audio ${audioId}:`, err);
    return false;
  }
}
