import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Sliders,
  ListMusic,
  Heart,
  Plus,
  Check,
  Disc,
  Radio,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Track } from '../../../types';
import { saveTrack } from '../../../lib/db';

interface SpotifyPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  queue: Track[];
  onSelectTrack: (track: Track) => void;
  onOpenDsp: () => void;
}

export const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  queue,
  onSelectTrack,
  onOpenDsp,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'queue' | 'lyrics'>('visualizer');
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSaveToVault = async () => {
    if (!currentTrack) return;
    try {
      await saveTrack(currentTrack);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-b from-[#0a1f24] to-[#051114] border border-[#163b44] rounded-3xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1db954]/20 border border-[#1db954]/40 flex items-center justify-center text-[#1db954] mb-4 shadow-[0_0_30px_rgba(29,185,84,0.2)]">
          <Disc size={32} className="animate-spin" style={{ animationDuration: '10s' }} />
        </div>
        <h3 className="text-xl font-bold text-white mb-1">Spotify Master Deck Idle</h3>
        <p className="text-xs text-zinc-400 max-w-md mb-6">
          Select any track from featured playlists, run a search query, or resolve a Spotify URL to commence lossless streaming.
        </p>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gradient-to-b from-[#091b20] via-[#061417] to-[#040e10] border border-[#173d47] rounded-3xl overflow-hidden shadow-2xl p-6 select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#14343d] mb-6">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1db954] animate-pulse shadow-[0_0_10px_#1db954]" />
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Spotify High-Bitrate Pipeline
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
            48kHz / 320kbps
          </span>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1 bg-[#091f24] p-1 rounded-xl border border-[#163942]">
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'visualizer'
                ? 'bg-[#1db954] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Visualizer
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-[#1db954] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic size={13} />
            <span>Queue ({queue.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'lyrics'
                ? 'bg-[#1db954] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles size={13} />
            <span>Lyrics</span>
          </button>
        </div>
      </div>

      {/* Main Player Core */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-6">
        {/* Artwork & Metadata */}
        <div className="lg:col-span-4 flex items-center gap-4">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 shadow-2xl border border-[#1a444f] group bg-zinc-900">
            <img
              src={
                currentTrack.artwork ||
                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80'
              }
              alt={currentTrack.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="flex items-end gap-1 h-6">
                  <span className="w-1 bg-[#1db954] animate-bounce h-4" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 bg-[#1db954] animate-bounce h-6" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 bg-[#1db954] animate-bounce h-3" style={{ animationDelay: '300ms' }} />
                  <span className="w-1 bg-[#1db954] animate-bounce h-5" style={{ animationDelay: '450ms' }} />
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-base font-bold text-white truncate tracking-tight">
              {currentTrack.title}
            </div>
            <div className="text-xs text-[#789d9a] truncate mt-0.5 font-medium">
              {currentTrack.artist}
            </div>
            <div className="text-[11px] text-zinc-500 truncate mt-1">
              Album: {currentTrack.album || 'Spotify Stream'}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`p-2 rounded-xl border text-xs transition ${
                  isLiked
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-[#0a1e23] hover:bg-[#122e36] text-zinc-400 hover:text-white border-[#193a43]'
                }`}
              >
                <Heart size={14} className={isLiked ? 'fill-current' : ''} />
              </button>
              <button
                onClick={handleSaveToVault}
                className={`p-2 rounded-xl border text-xs transition flex items-center gap-1 ${
                  isSaved
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-[#0a1e23] hover:bg-[#122e36] text-zinc-400 hover:text-white border-[#193a43]'
                }`}
              >
                {isSaved ? <Check size={14} /> : <Plus size={14} />}
                <span className="text-[10px] font-mono">{isSaved ? 'Vaulted' : 'Add Vault'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Visualizer / Queue / Lyrics Center Window */}
        <div className="lg:col-span-8 bg-[#051114] border border-[#14343d] rounded-2xl p-4 h-48 overflow-y-auto">
          {activeTab === 'visualizer' && (
            <div className="h-full flex flex-col justify-center items-center">
              <div className="flex items-end justify-center gap-1.5 h-24 w-full px-4">
                {Array.from({ length: 32 }).map((_, i) => {
                  const height = isPlaying
                    ? Math.max(12, Math.sin(i * 0.4 + currentTime * 3) * 40 + Math.random() * 35 + 20)
                    : 8;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-[#1db954] via-[#48e4ff] to-[#38bdf8] rounded-full transition-all duration-75"
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono mt-3">
                Decoded Opus Spectrum • Real-time Web Audio Synthesizer
              </div>
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-white mb-2">Upcoming Stream Queue</div>
              {queue.map((t, idx) => (
                <div
                  key={t.id + idx}
                  onClick={() => onSelectTrack(t)}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                    currentTrack.id === t.id
                      ? 'bg-[#143e47] text-white font-bold'
                      : 'hover:bg-[#0c242a] text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-mono text-zinc-500 w-4">{idx + 1}</span>
                    <span className="truncate">{t.title}</span>
                    <span className="text-zinc-500 truncate">- {t.artist}</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 shrink-0 ml-2">
                    {t.durationText || '3:30'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'lyrics' && (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <Sparkles size={20} className="text-[#1db954] mb-2 animate-pulse" />
              <div className="text-sm font-bold text-white mb-1">
                Singing along to "{currentTrack.title}"
              </div>
              <div className="text-xs text-zinc-400 italic max-w-sm">
                "{currentTrack.artist} — Audio stream synchronized. Enhanced stereo acoustics active on Web Audio pipeline."
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Scrubber */}
      <div className="space-y-1.5 mb-5">
        <div className="relative w-full h-2 bg-[#091b20] rounded-full overflow-hidden cursor-pointer group">
          <div
            className="h-full bg-gradient-to-r from-[#1db954] to-[#48e4ff] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Control Buttons & Volume */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2.5 rounded-xl border text-xs transition ${
              isShuffle
                ? 'bg-emerald-500/20 text-[#1db954] border-emerald-500/40'
                : 'bg-[#0a1e23] hover:bg-[#122e36] text-zinc-400 hover:text-white border-[#193a43]'
            }`}
          >
            <Shuffle size={16} />
          </button>
          <button
            onClick={() =>
              setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'))
            }
            className={`p-2.5 rounded-xl border text-xs transition ${
              repeatMode !== 'off'
                ? 'bg-emerald-500/20 text-[#1db954] border-emerald-500/40'
                : 'bg-[#0a1e23] hover:bg-[#122e36] text-zinc-400 hover:text-white border-[#193a43]'
            }`}
          >
            <Repeat size={16} />
          </button>
        </div>

        {/* Core Transport */}
        <div className="flex items-center gap-4">
          <button
            onClick={onPrev}
            className="p-3 rounded-2xl bg-[#0d262d] hover:bg-[#163a44] text-white border border-[#1b4854] transition shadow-md"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={onTogglePlay}
            className="p-4 rounded-3xl bg-[#1db954] hover:bg-[#22c55e] text-black font-bold shadow-[0_0_24px_rgba(29,185,84,0.4)] transition hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause size={22} className="fill-current" /> : <Play size={22} className="fill-current" />}
          </button>
          <button
            onClick={onNext}
            className="p-3 rounded-2xl bg-[#0d262d] hover:bg-[#163a44] text-white border border-[#1b4854] transition shadow-md"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Volume & DSP Modal Shortcut */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenDsp}
            className="px-3 py-2 bg-[#0d262d] hover:bg-[#163a44] text-[#48e4ff] border border-[#1b4854] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Sliders size={14} />
            <span>5-Band DSP</span>
          </button>

          <div className="flex items-center gap-2 bg-[#091c20] px-3 py-2 rounded-xl border border-[#173a43]">
            {volume === 0 ? (
              <VolumeX size={16} className="text-zinc-500" />
            ) : (
              <Volume2 size={16} className="text-[#1db954]" />
            )}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-20 accent-[#1db954]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
