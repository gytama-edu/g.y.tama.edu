/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Module 16: Persistent Audio Infrastructure
 * Type definitions for audio files, metadata, validation, and upload status.
 */

export type SupportedAudioMimeType =
  | 'audio/mpeg'
  | 'audio/mp3'
  | 'audio/wav'
  | 'audio/wave'
  | 'audio/x-wav'
  | 'audio/mp4'
  | 'audio/x-m4a'
  | 'audio/m4a'
  | 'audio/aac';

export type SupportedAudioExtension = 'mp3' | 'wav' | 'm4a';

export const SUPPORTED_AUDIO_EXTENSIONS: SupportedAudioExtension[] = ['mp3', 'wav', 'm4a'];

export const SUPPORTED_AUDIO_MIME_TYPES: string[] = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
];

/** Default maximum file size: 25 MB */
export const DEFAULT_MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Audio file metadata stored persistently on the server and referenced by assessments.
 */
export interface AudioMetadata {
  /** Unique persistent identifier (e.g., "audio_1728490000_a1b2c3d4") */
  id: string;

  /** Original filename of the uploaded audio (e.g., "listening_passage_1.mp3") */
  originalFilename: string;

  /** Canonical MIME type of the audio file (e.g., "audio/mpeg", "audio/wav", "audio/mp4") */
  mimeType: string;

  /** File size in bytes */
  fileSize: number;

  /** Internal relative storage reference (e.g., "audio/audio_1728490000_a1b2c3d4.mp3") */
  storageReference: string;

  /** Relative URL for streaming or downloading audio (e.g., "/api/audio/audio_1728490000_a1b2c3d4") */
  url: string;

  /** Timestamp when the audio was uploaded and stored */
  createdAt: string;

  /** Timestamp when the audio was last updated */
  updatedAt?: string;

  /** Optional audio duration in seconds if probed */
  duration?: number | null;

  /** Optional SHA-256 integrity hash */
  checksum?: string;
}

/**
 * Real-time progress update for client-side uploads.
 */
export interface AudioUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Server upload response payload.
 */
export interface AudioUploadResponse {
  success: boolean;
  audio?: AudioMetadata;
  error?: string;
  code?: string;
  details?: string;
}

/**
 * Configuration options returned by the server or used for validation.
 */
export interface AudioUploadConfig {
  maxFileSize: number;
  allowedExtensions: SupportedAudioExtension[];
  allowedMimeTypes: string[];
  backend?: 'supabase' | 'unconfigured';
  bucket?: string;
}

/**
 * Standard error codes for audio operations.
 */
export type AudioErrorCode =
  | 'NO_FILE_PROVIDED'
  | 'UNSUPPORTED_FORMAT'
  | 'FILE_TOO_LARGE'
  | 'CORRUPTED_FILE'
  | 'AUDIO_NOT_FOUND'
  | 'STORAGE_ERROR'
  | 'STORAGE_NOT_CONFIGURED'
  | 'NETWORK_ERROR'
  | 'ABORTED'
  | 'VALIDATION_FAILED';
