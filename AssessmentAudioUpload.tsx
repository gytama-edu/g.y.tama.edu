/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Music,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Volume2,
  Loader2,
  FileAudio,
  Play,
  Pause,
} from 'lucide-react';
import { AudioMetadata, AudioUploadProgress } from '../../types/audio';
import {
  uploadAudioFile,
  validateAudioFileLocally,
  formatAudioSize,
  getAudioStreamUrl,
  deleteAudioFileById,
  AudioServiceError,
  checkAudioAvailability,
} from '../../utils/audioStorage';
import { Button } from '../ui/Button';

interface AssessmentAudioUploadProps {
  audioId?: string;
  audioMetadata?: AudioMetadata;
  onChangeAudio: (
    audioId: string | undefined,
    metadata: AudioMetadata | undefined
  ) => void;
  className?: string;
  disabled?: boolean;
}

export function AssessmentAudioUpload({
  audioId,
  audioMetadata,
  onChangeAudio,
  className = '',
  disabled = false,
}: AssessmentAudioUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<AudioUploadProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTestingPlayback, setIsTestingPlayback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clear transient success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Clean up playback on unmount or audio change
  useEffect(() => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlaying(false);
    }
  }, [audioId]);

  const handleFileSelection = useCallback(
    async (file: File) => {
      setErrorMessage(null);
      setErrorCode(null);
      setSuccessMessage(null);

      // 1. Client-side pre-validation
      const validation = validateAudioFileLocally(file);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid audio file selected.');
        setErrorCode(validation.code || 'VALIDATION_FAILED');
        return;
      }

      // 2. Prepare upload state
      setSelectedFile({ name: file.name, size: file.size });
      setIsUploading(true);
      setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });

      // Create abort controller for cancelability
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const metadata = await uploadAudioFile(file, {
          signal: abortController.signal,
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
        });

        // 3. Upload succeeded: link to assessment
        onChangeAudio(metadata.id, metadata);
        setSuccessMessage(`Audio "${metadata.originalFilename}" uploaded and attached successfully.`);
        setSelectedFile(null);
        setUploadProgress(null);
      } catch (err: any) {
        console.error('[AssessmentAudioUpload] Upload error:', err);
        if (err instanceof AudioServiceError) {
          setErrorMessage(err.message);
          setErrorCode(err.code);
        } else if (err?.name === 'AbortError' || err?.code === 'ABORTED') {
          setErrorMessage('Upload cancelled.');
          setErrorCode('ABORTED');
        } else {
          setErrorMessage(err?.message || 'Failed to upload audio file. Check server configuration.');
          setErrorCode('STORAGE_ERROR');
        }
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onChangeAudio]
  );

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    setSelectedFile(null);
    setUploadProgress(null);
    setErrorMessage('Upload was cancelled.');
  };

  const handleRemoveAudio = async () => {
    const previousId = audioId;
    // Unlink immediately from assessment
    onChangeAudio(undefined, undefined);
    setSuccessMessage('Audio removed from assessment.');
    setErrorMessage(null);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlaying(false);
    }

    // Attempt server deletion in background
    if (previousId) {
      deleteAudioFileById(previousId).catch(() => {});
    }
  };

  const handleOpenPicker = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isUploading) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const togglePlaybackPreview = () => {
    if (!audioId) return;

    if (!audioPreviewRef.current) {
      const audio = new Audio(getAudioStreamUrl(audioId));
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        setErrorMessage('Failed to stream audio from server. File may be unavailable.');
      };
      audioPreviewRef.current = audio;
    }

    if (isPlaying) {
      audioPreviewRef.current.pause();
    } else {
      audioPreviewRef.current.play().catch((err) => {
        console.warn('Playback preview error:', err);
        setErrorMessage('Playback could not be started.');
      });
    }
  };

  const hasAudioAttached = Boolean(audioId || audioMetadata);
  const displayFilename = audioMetadata?.originalFilename || (audioId ? `${audioId}.mp3` : '');
  const displaySize = audioMetadata?.fileSize ? formatAudioSize(audioMetadata.fileSize) : '';
  const displayFormat =
    audioMetadata?.mimeType?.split('/')[1]?.toUpperCase() ||
    (displayFilename.endsWith('.wav')
      ? 'WAV'
      : displayFilename.endsWith('.m4a')
      ? 'M4A'
      : 'MP3');

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a"
        onChange={onFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
        aria-label="Upload Audio File"
      />

      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-200/60">
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#173B72] tracking-wide">
                Assessment Audio Track
              </span>
              <span className="text-3xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                Optional
              </span>
            </div>
            <p className="text-2xs text-slate-500">
              Attach an audio recording for listening sections or spoken instructions.
            </p>
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <span className="text-3xs text-slate-500 font-medium">
            MP3, WAV, M4A · Max 25 MB
          </span>
        </div>
      </div>

      {/* Error Alert Message */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start justify-between gap-2.5 animate-in fade-in duration-150">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMessage}</p>
              {errorCode && (
                <p className="text-3xs font-mono text-rose-500 mt-0.5">
                  Code: {errorCode}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-700 p-0.5 rounded transition-colors"
            title="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Success Alert Message */}
      {successMessage && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-800 p-0.5"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Case 1: Uploading in Progress */}
      {isUploading ? (
        <div className="p-4 bg-white border border-blue-200 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate" title={selectedFile?.name}>
                  {selectedFile?.name || 'Uploading audio...'}
                </p>
                <p className="text-2xs text-slate-500">
                  {selectedFile?.size ? formatAudioSize(selectedFile.size) : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono font-bold text-[#2563EB]">
                {uploadProgress?.percentage ?? 0}%
              </span>
              <button
                type="button"
                onClick={handleCancelUpload}
                className="text-xs text-slate-500 hover:text-rose-600 px-2 py-1 rounded border border-slate-200 hover:border-rose-200 bg-white"
                title="Cancel upload"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
            <div
              className="bg-[#2563EB] h-full transition-all duration-150 ease-out rounded-full"
              style={{ width: `${uploadProgress?.percentage || 0}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-3xs text-slate-500">
            <span>
              {uploadProgress?.loaded ? formatAudioSize(uploadProgress.loaded) : '0 B'} of{' '}
              {uploadProgress?.total ? formatAudioSize(uploadProgress.total) : '0 B'}
            </span>
            <span>Uploading to cloud storage...</span>
          </div>
        </div>
      ) : hasAudioAttached ? (
        /* Case 2: Audio File Attached to Assessment */
        <div className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <FileAudio className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p
                  className="text-xs font-bold text-[#173B72] truncate max-w-xs sm:max-w-md"
                  title={displayFilename}
                >
                  {displayFilename}
                </p>
                <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {displayFormat}
                </span>
                {displaySize && (
                  <span className="text-3xs text-slate-500 font-medium">
                    {displaySize}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-3xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Attached to assessment
                </span>
                {audioId && (
                  <>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={togglePlaybackPreview}
                      className="text-3xs font-semibold text-[#2563EB] hover:text-blue-800 flex items-center gap-1"
                      title={isPlaying ? 'Pause preview' : 'Preview playback'}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3 h-3 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>Preview Audio</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: Replace & Remove */}
          <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenPicker}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              title="Replace with another audio file"
            >
              Replace
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveAudio}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              title="Remove audio file"
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        /* Case 3: Idle / No Audio Attached -> Compact Upload Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-4 rounded-xl border-2 border-dashed transition-all ${
            isDragging
              ? 'border-[#2563EB] bg-blue-50/60 ring-2 ring-[#2563EB]/20'
              : 'border-[#CBD5E1] bg-[#F8FAFC] hover:border-blue-300 hover:bg-[#F1F5F9]'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center shrink-0">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#173B72]">
                  Add Audio to Assessment
                </p>
                <p className="text-2xs text-slate-500">
                  Drag and drop an audio file here or click Upload Audio.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenPicker}
                leftIcon={<Upload className="w-4 h-4 text-[#2563EB]" />}
                className="bg-white border-[#2563EB]/40 text-[#2563EB] hover:bg-blue-50 font-semibold"
                disabled={disabled}
              >
                Upload Audio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
