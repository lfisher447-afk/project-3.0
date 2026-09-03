import React, { useState, useEffect } from 'react';
import { YtMusicSearch } from './search/YtMusicSearch';
import { YtMusicPlayer } from './player/YtMusicPlayer';
import { YtMusicTrack, ytMusicHandler } from './handler/YtMusicHandler';
import { Track } from '../../types';
import { Play, Flame, Sparkles, Radio, Loader2 } from 'lucide-react';

interface YtMusicMainProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  queue: Track[];
  onAddToQueue: (track: Track) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onOpenDsp: () => void;
}

export const YtMusicMain: React.FC<YtMusicMainProps> = ({
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onNext,
  onPrev,
  queue,
  onAddToQueue,
  onRemoveFromQueue,
  onClearQueue,
  onOpenDsp,
}) => {
  const [charts, setCharts] = useState<YtMusicTrack[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    let mounted = true;
    ytMusicHandler
      .getTrendingCharts()
      .then((data) => {
        if (mounted) {
          setCharts(data);
          setLoadingCharts(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingCharts(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Hero */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#07161e] via-[#0b2430] to-[#040e13] border border-[#163847] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#143d4e] text-[#48e4ff] text-xs font-mono font-bold tracking-wider uppercase border border-[#225c75]">
              YouTube Music • InnerTube Core
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
              Live Stream Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Lossless Opus Streaming Deck
          </h1>
          <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Direct audio stream decoding from YouTube Music web remix servers without reliance on iframe embeds. Fully routed through your customizable 5-band DSP master equalizer.
          </p>
        </div>
      </div>

      {/* Primary Dedicated Player Deck */}
      <YtMusicPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        onNext={onNext}
        onPrev={onPrev}
        queue={queue}
        onRemoveFromQueue={onRemoveFromQueue}
        onClearQueue={onClearQueue}
        onOpenDsp={onOpenDsp}
      />

      {/* Real Search Component */}
      <YtMusicSearch onPlayTrack={onPlayTrack} onAddToQueue={onAddToQueue} />

      {/* Trending Charts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Flame size={20} className="text-amber-400" />
            <span>Top Trending Music Hits</span>
          </div>
          <span className="text-xs font-mono text-zinc-400">InnerTube Web Remix Feed</span>
        </div>

        {loadingCharts ? (
          <div className="p-10 rounded-2xl bg-[#07161e] border border-[#163847] text-center text-xs font-mono text-zinc-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-[#48e4ff]" />
            <span>Fetching Global Music Charts...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {charts.slice(0, 12).map((song) => (
              <div
                key={song.id}
                onClick={() => onPlayTrack(ytMusicHandler.toAudioTrack(song))}
                className="p-3 rounded-2xl bg-[#07161e] border border-[#153847] hover:border-[#48e4ff]/50 transition group cursor-pointer space-y-2"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900">
                  <img
                    src={song.artwork}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#48e4ff]">
                    <div className="w-10 h-10 rounded-full bg-[#48e4ff] text-[#051a24] flex items-center justify-center shadow-lg">
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-[#48e4ff] transition-colors">
                    {song.title}
                  </h4>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
