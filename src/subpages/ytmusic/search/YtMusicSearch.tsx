import React, { useState } from 'react';
import { Search, Play, Plus, Check, Music, Radio, Disc, Sparkles, Loader2 } from 'lucide-react';
import { YtMusicTrack, ytMusicHandler } from '../handler/YtMusicHandler';
import { Track } from '../../../types';
import { saveTrack } from '../../../lib/db';

interface YtMusicSearchProps {
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
}

export const YtMusicSearch: React.FC<YtMusicSearchProps> = ({ onPlayTrack, onAddToQueue }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'songs' | 'videos' | 'all'>('songs');
  const [results, setResults] = useState<YtMusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await ytMusicHandler.search(query, filter);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (track: YtMusicTrack) => {
    const audioTrack = ytMusicHandler.toAudioTrack(track);
    await saveTrack(audioTrack);
    setSavedIds((prev) => new Set(prev).add(track.id));
    setTimeout(() => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Search Header & Input */}
      <div className="p-6 rounded-3xl bg-[#08151c] border border-[#163644] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#48e4ff]">
            <Music size={20} />
            <h2 className="text-base font-bold text-white tracking-wide">
              YouTube Music High-Res Search
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 bg-[#0d232e] px-2.5 py-1 rounded-full border border-[#183a48]">
            Opus 160kbps Direct Native Stream
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks, artists, remixes, albums..."
              className="w-full pl-11 pr-4 py-3 bg-[#040e13] border border-[#1b4354] focus:border-[#48e4ff] rounded-2xl text-sm text-white placeholder-zinc-500 outline-none transition font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#48e4ff] hover:bg-[#38cbe6] disabled:opacity-50 text-[#051a24] rounded-2xl text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(72,228,255,0.3)]"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            <span>Search</span>
          </button>
        </form>

        {/* Filters */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Type:</span>
          {(['songs', 'videos', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-xl text-xs font-mono capitalize transition ${
                filter === f
                  ? 'bg-[#1b4354] text-[#48e4ff] font-bold border border-[#2b657d]'
                  : 'text-zinc-400 hover:text-white bg-[#06141a]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            Results ({results.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((track) => (
              <div
                key={track.id}
                className="p-3 bg-[#071720] border border-[#153847] hover:border-[#48e4ff]/50 rounded-2xl transition flex items-center justify-between gap-3 group"
              >
                <div
                  onClick={() => onPlayTrack(ytMusicHandler.toAudioTrack(track))}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-zinc-900 shrink-0 group/cover">
                    <img
                      src={track.artwork}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center text-[#48e4ff]">
                      <Play size={20} fill="currentColor" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-[#48e4ff] transition-colors">
                      {track.title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-500">
                      <span>{track.durationText}</span>
                      {track.views && (
                        <>
                          <span>•</span>
                          <span>{track.views}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onAddToQueue(ytMusicHandler.toAudioTrack(track))}
                    className="p-2 rounded-xl bg-[#0d2633] hover:bg-[#163f54] text-zinc-300 hover:text-white border border-[#1b4354] transition"
                    title="Add to Queue"
                  >
                    <Plus size={15} />
                  </button>

                  <button
                    onClick={() => handleSave(track)}
                    className={`p-2 rounded-xl border transition ${
                      savedIds.has(track.id)
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-[#0d2633] hover:bg-[#163f54] text-zinc-300 hover:text-white border-[#1b4354]'
                    }`}
                    title="Save to Library Vault"
                  >
                    {savedIds.has(track.id) ? <Check size={15} /> : <Disc size={15} />}
                  </button>

                  <button
                    onClick={() => onPlayTrack(ytMusicHandler.toAudioTrack(track))}
                    className="p-2.5 rounded-xl bg-[#48e4ff] hover:bg-[#38cbe6] text-[#051a24] font-bold transition shadow-md"
                    title="Play Track"
                  >
                    <Play size={15} fill="currentColor" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
