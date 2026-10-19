/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioMetadata } from '../../types/audio';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Headphones,
  AlertCircle,
  RefreshCw,
  FileAudio,
  Sliders,
} from 'lucide-react';

export interface StudentAudioPlayerProps {
  audioId: string;
  audioMetadata?: AudioMetadata;
  instructions?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Formats time in seconds to mm:ss format.
 */
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats file size in readable units.
 */
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extracts clean extension from filename or mime type.
 */
function getFormatBadge(filename?: string, mimeType?: string): string {
  if (filename) {
    const match = filename.match(/\.([a-zA-Z0-9]+)$/);
    if (match) return match[1].toUpperCase();
  }
  if (mimeType) {
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'MP3';
    if (mimeType.includes('wav')) return 'WAV';
    if (mimeType.includes('m4a') || mimeType.includes('mp4')) return 'M4A';
  }
  return 'AUDIO';
}

export function StudentAudioPlayer({
  audioId,
  audioMetadata: initialMetadata,
  instructions,
  className = '',
  compact = false,
}: StudentAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio metadata state (uses passed prop or fetches if missing)
  const [metadata, setMetadata] = useState<AudioMetadata | undefined>(initialMetadata);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialMetadata?.duration || 0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Volume & Speed states
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Scrubbing drag state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  const cleanAudioId = audioId?.trim();
  const audioSrc = cleanAudioId ? `/api/audio/${encodeURIComponent(cleanAudioId)}` : '';

  // Synchronize initialMetadata if it updates
  useEffect(() => {
    if (initialMetadata) {
      setMetadata(initialMetadata);
      if (initialMetadata.duration && initialMetadata.duration > 0) {
        setDuration(initialMetadata.duration);
      }
    }
  }, [initialMetadata]);

  // If metadata is missing, fetch it from the server metadata endpoint
  useEffect(() => {
    if (!cleanAudioId || metadata) return;

    let isMounted = true;
    setIsLoadingMetadata(true);

    fetch(`/api/audio/${encodeURIComponent(cleanAudioId)}/metadata`)
      .then((res) => {
        if (!res.ok) throw new Error('Audio metadata not found');
        return res.json();
      })
      .then((data) => {
        if (isMounted && data.metadata) {
          setMetadata(data.metadata);
          if (data.metadata.duration && data.metadata.duration > 0) {
            setDuration(data.metadata.duration);
          }
        }
      })
      .catch(() => {
        // Fallback: minimal metadata object
        if (isMounted) {
          setMetadata({
            id: cleanAudioId,
            originalFilename: 'Assessment Audio',
            mimeType: 'audio/mpeg',
            fileSize: 0,
            storageReference: `audio/${cleanAudioId}`,
            url: `/api/audio/${cleanAudioId}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingMetadata(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cleanAudioId, metadata]);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setErrorMessage(null);
      setIsBuffering(false);
    };

    const handleTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
      setErrorMessage(null);
    };

    const handleError = () => {
      setIsBuffering(false);
      setIsPlaying(false);
      const mediaErr = audio.error;
      let msg = 'Audio could not be loaded from storage.';
      if (mediaErr) {
        if (mediaErr.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          msg = 'Audio format not supported or file not found on server.';
        } else if (mediaErr.code === MediaError.MEDIA_ERR_NETWORK) {
          msg = 'Network error while retrieving audio stream.';
        } else if (mediaErr.code === MediaError.MEDIA_ERR_DECODE) {
          msg = 'Error decoding audio file.';
        }
      }
      setErrorMessage(msg);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [isScrubbing, audioSrc]);

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      setErrorMessage(null);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[StudentAudioPlayer] Playback failed:', err);
          setIsPlaying(false);
          setErrorMessage('Click play to begin listening to audio.');
        });
      }
    }
  }, [isPlaying]);

  // Jump by relative seconds (+/- 10s)
  const jumpTime = useCallback(
    (offsetSeconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const targetTime = Math.max(0, Math.min(duration || 0, audio.currentTime + offsetSeconds));
      audio.currentTime = targetTime;
      setCurrentTime(targetTime);
    },
    [duration]
  );

  // Scrubber events
  const handleScrubStart = () => {
    setIsScrubbing(true);
    setScrubValue(currentTime);
  };

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setScrubValue(val);
    setCurrentTime(val);
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = scrubValue;
      setCurrentTime(scrubValue);
    }
  };

  // Volume & Mute
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audio.muted = nextMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = val;
      audio.muted = val === 0;
    }
  };

  // Playback Rate
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = rate;
    }
  };

  // Retry loading
  const handleRetry = () => {
    setErrorMessage(null);
    setIsBuffering(true);
    const audio = audioRef.current;
    if (audio) {
      audio.load();
    }
  };

  if (!cleanAudioId) {
    return null;
  }

  const effectiveDuration = duration > 0 ? duration : (metadata?.duration || 0);
  const activeCurrentTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = effectiveDuration > 0
    ? Math.min(100, Math.max(0, (activeCurrentTime / effectiveDuration) * 100))
    : 0;

  const filename = metadata?.originalFilename || 'Assessment Audio Track';
  const formatBadge = getFormatBadge(filename, metadata?.mimeType);
  const sizeText = formatFileSize(metadata?.fileSize);

  return (
    <section
      aria-label="Assessment Audio Track"
      className={`bg-white rounded-2xl border-2 border-[#DCE4EE] shadow-xs overflow-hidden transition-all ${className}`}
    >
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        playsInline
      />

      {/* Header bar: Listening Badge, Audio Track Name, and Format Info */}
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-3.5 sm:px-5 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#EEF5FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
            <Headphones className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-2xs font-extrabold text-[#173B72] tracking-wider uppercase">
                Listening Track
              </span>
              <span className="px-1.5 py-0.2 rounded-md bg-blue-100/70 text-[#173B72] text-3xs font-mono font-bold">
                {formatBadge}
              </span>
              {sizeText && (
                <span className="hidden sm:inline text-3xs text-slate-400 font-medium">
                  {sizeText}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-xs sm:max-w-md" title={filename}>
              {filename}
            </p>
          </div>
        </div>

        {/* Speed / Rate control toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSpeedMenu((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:text-[#173B72] shadow-2xs cursor-pointer transition-colors"
            title="Adjust playback speed"
            aria-label="Playback speed"
          >
            <Sliders className="w-3 h-3 text-slate-400" />
            <span>{playbackRate}x</span>
          </button>

          {showSpeedMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-24 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-30 animate-in fade-in zoom-in-95">
              {[0.75, 1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleRateChange(rate)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                    playbackRate === rate
                      ? 'bg-[#EEF5FF] text-[#2563EB]'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{rate}x</span>
                  {playbackRate === rate && <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Player Body */}
      <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        {/* Optional Listening Instructions banner */}
        {instructions && (
          <div className="text-xs text-slate-600 bg-[#F1F5F9]/80 rounded-xl px-3 py-2 border border-slate-200/80 leading-relaxed whitespace-pre-line">
            <span className="font-bold text-slate-700">Instructions: </span>
            {instructions}
          </div>
        )}

        {/* Error Alert Display */}
        {errorMessage ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-rose-900">Audio playback unavailable</p>
                <p className="text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-100/50 shadow-2xs cursor-pointer shrink-0 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <>
            {/* Scrubber / Progress Slider with custom styling */}
            <div className="space-y-1.5">
              <div className="relative flex items-center w-full touch-none group">
                <input
                  type="range"
                  min={0}
                  max={effectiveDuration > 0 ? effectiveDuration : 100}
                  step={0.1}
                  value={activeCurrentTime}
                  onMouseDown={handleScrubStart}
                  onTouchStart={handleScrubStart}
                  onChange={handleScrubChange}
                  onMouseUp={handleScrubEnd}
                  onTouchEnd={handleScrubEnd}
                  aria-label="Seek audio playback"
                  className="w-full h-2.5 sm:h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  style={{
                    background: `linear-gradient(to right, #2563EB 0%, #2563EB ${progressPercent}%, #E2E8F0 ${progressPercent}%, #E2E8F0 100%)`,
                  }}
                />
              </div>

              {/* Time Indicators */}
              <div className="flex items-center justify-between text-2xs sm:text-xs font-mono font-bold text-slate-500 px-0.5">
                <span className="text-[#173B72]">{formatTime(activeCurrentTime)}</span>
                <span className="text-slate-400">
                  {effectiveDuration > 0 ? formatTime(effectiveDuration) : '--:--'}
                </span>
              </div>
            </div>

            {/* Playback Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Play / Skip Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                {/* Skip -10s */}
                <button
                  type="button"
                  onClick={() => jumpTime(-10)}
                  disabled={Boolean(errorMessage)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Rewind 10 seconds"
                  aria-label="Rewind 10 seconds"
                >
                  <RotateCcw className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>

                {/* Primary Play / Pause Button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={Boolean(errorMessage)}
                  className={`min-w-[46px] h-11 sm:min-w-[52px] sm:h-12 px-4 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm text-white transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-700 border border-amber-700'
                      : 'bg-[#2563EB] hover:bg-blue-700 border border-blue-800'
                  }`}
                  title={isPlaying ? 'Pause Audio' : 'Play Audio'}
                  aria-label={isPlaying ? 'Pause Audio' : 'Play Audio'}
                >
                  {isBuffering ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : isPlaying ? (
                    <div className="flex items-center gap-1.5">
                      <Pause className="w-5 h-5 fill-current" />
                      <span className="hidden sm:inline font-extrabold uppercase tracking-wider text-2xs">Pause</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                      <span className="hidden sm:inline font-extrabold uppercase tracking-wider text-2xs">Play</span>
                    </div>
                  )}
                </button>

                {/* Skip +10s */}
                <button
                  type="button"
                  onClick={() => jumpTime(10)}
                  disabled={Boolean(errorMessage)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Forward 10 seconds"
                  aria-label="Forward 10 seconds"
                >
                  <RotateCw className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>
              </div>

              {/* Volume & Mute Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-500" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-slate-700" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume slider"
                  className="w-16 sm:w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
