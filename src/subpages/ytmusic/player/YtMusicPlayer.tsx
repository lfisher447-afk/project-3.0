import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Sliders,
  Radio,
  Sparkles,
  Disc,
  ListMusic,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Track } from '../../../types';
import { audioEngine } from '../../../lib/audioEngine';
import { formatTimeSeconds } from '../util/ytMusicUtils';

interface YtMusicPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  queue: Track[];
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onOpenDsp: () => void;
}

export const YtMusicPlayer: React.FC<YtMusicPlayerProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  queue,
  onRemoveFromQueue,
  onClearQueue,
  onOpenDsp,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'queue'>('visualizer');

  // Sync with audio engine state
  useEffect(() => {
    const unsub = audioEngine.onStateChange((state) => {
      setCurrentTime(state.currentTime);
      setDuration(state.duration);
      setIsLooping(state.isLooping);
    });
    return () => unsub();
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioEngine.seek(val);
    setCurrentTime(val);
  };

  const handleVolume = (val: number) => {
    setVolume(val);
    setIsMuted(val === 0);
    audioEngine.setVolume(val);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setVolume(volume || 0.8);
    } else {
      setIsMuted(true);
      audioEngine.setVolume(0);
    }
  };

  const toggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    audioEngine.setLooping(next);
  };

  if (!currentTrack) {
    return (
      <div className="p-12 rounded-3xl bg-[#08151c] border border-[#163644] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#0d2633] text-[#48e4ff] mx-auto flex items-center justify-center border border-[#1b4354]">
          <Disc size={28} className="animate-spin" style={{ animationDuration: '8s' }} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">YouTube Music Player Idle</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Search songs above or select from charts to initiate direct Opus native stream playback.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl bg-[#07161e] border border-[#163847] shadow-2xl space-y-6">
      {/* Player Header */}
      <div className="flex items-center justify-between border-b border-[#143442] pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            YouTube Music Master Deck
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102d3b] text-[#48e4ff] border border-[#1d4b60]">
            Opus 48kHz Stereo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
              activeTab === 'visualizer'
                ? 'bg-[#48e4ff] text-[#051a24]'
                : 'text-zinc-400 hover:text-white bg-[#0b222d]'
            }`}
          >
            Track Deck
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-[#48e4ff] text-[#051a24]'
                : 'text-zinc-400 hover:text-white bg-[#0b222d]'
            }`}
          >
            <ListMusic size={14} />
            <span>Queue ({queue.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'visualizer' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Big Artwork */}
          <div className="md:col-span-5 flex justify-center">
            <div className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-2xl border-2 border-[#1c485a] bg-zinc-950 group">
              <img
                src={currentTrack.artwork}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-mono">
                <span className="bg-black/70 px-2 py-0.5 rounded-md border border-white/10">
                  {currentTrack.source.toUpperCase()}
                </span>
                <span className="bg-black/70 px-2 py-0.5 rounded-md border border-white/10">
                  {formatTimeSeconds(duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Track Details & Control Panel */}
          <div className="md:col-span-7 space-y-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white line-clamp-2 leading-tight">
                {currentTrack.title}
              </h2>
              <p className="text-sm font-semibold text-[#48e4ff] mt-1">{currentTrack.artist}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{currentTrack.album || 'YouTube Music'}</p>
            </div>

            {/* Scrubber Progress Bar */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-[#153847] rounded-lg appearance-none cursor-pointer accent-[#48e4ff]"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="text-[#48e4ff] font-bold">{formatTimeSeconds(currentTime)}</span>
                <span>{formatTimeSeconds(duration)}</span>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleLoop}
                  className={`p-2.5 rounded-xl border transition ${
                    isLooping
                      ? 'bg-[#48e4ff]/20 text-[#48e4ff] border-[#48e4ff]/40'
                      : 'bg-[#0a202b] text-zinc-400 hover:text-white border-[#194052]'
                  }`}
                  title="Toggle Repeat"
                >
                  <Repeat size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onPrev}
                  className="p-3 rounded-2xl bg-[#0a202b] hover:bg-[#133748] text-zinc-200 hover:text-white border border-[#194052] transition"
                  title="Previous Track"
                >
                  <SkipBack size={18} fill="currentColor" />
                </button>

                <button
                  onClick={onTogglePlay}
                  className="p-4 rounded-2xl bg-[#48e4ff] hover:bg-[#38cbe6] text-[#051a24] font-bold transition shadow-[0_0_25px_rgba(72,228,255,0.4)]"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={22} fill="currentColor" />
                  ) : (
                    <Play size={22} fill="currentColor" className="ml-0.5" />
                  )}
                </button>

                <button
                  onClick={onNext}
                  className="p-3 rounded-2xl bg-[#0a202b] hover:bg-[#133748] text-zinc-200 hover:text-white border border-[#194052] transition"
                  title="Next Track"
                >
                  <SkipForward size={18} fill="currentColor" />
                </button>
              </div>

              {/* DSP Quick Trigger */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenDsp}
                  className="p-2.5 rounded-xl bg-[#0a202b] hover:bg-[#133748] text-[#48e4ff] border border-[#194052] transition"
                  title="Open 5-Band Audio DSP Deck"
                >
                  <Sliders size={16} />
                </button>
              </div>
            </div>

            {/* Volume bar */}
            <div className="flex items-center gap-3 bg-[#0a202b] p-3 rounded-2xl border border-[#173d4e]">
              <button onClick={toggleMute} className="text-zinc-300 hover:text-white">
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#153847] rounded-lg appearance-none cursor-pointer accent-[#48e4ff]"
              />
              <span className="text-[11px] font-mono text-zinc-400 w-10 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Queue View */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
              Play Queue ({queue.length} Tracks)
            </span>
            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
              >
                <Trash2 size={13} />
                <span>Clear Queue</span>
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-zinc-500">
              Your playback queue is empty. Add songs from search results or charts.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {queue.map((track, idx) => (
                <div
                  key={`${track.id}_${idx}`}
                  className="p-2.5 rounded-xl bg-[#0a202b] border border-[#163b4b] flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs font-mono text-zinc-500 w-5">{idx + 1}</span>
                    <img
                      src={track.artwork}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover bg-zinc-900 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{track.title}</div>
                      <div className="text-[11px] text-zinc-400 truncate">{track.artist}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveFromQueue(idx)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
