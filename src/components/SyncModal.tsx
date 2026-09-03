import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  Music2,
  Youtube,
  CheckCircle2,
  ListMusic,
  ArrowRight,
  Plus,
  Search,
  Check,
} from 'lucide-react';
import { saveTracksBatch, savePlaylist } from '../lib/db';
import { Track, Playlist } from '../types';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
  isSpotifyConnected?: boolean;
  onConnectSpotify?: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [sourceType, setSourceType] = useState<'spotify' | 'youtube'>('spotify');
  const [urlInput, setUrlInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resolvedCollection, setResolvedCollection] = useState<{
    name: string;
    source: 'spotify' | 'youtube';
    tracks: Track[];
  } | null>(null);

  const [selectedTracks, setSelectedTracks] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleResolve = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setIsResolving(true);
    setError(null);
    setResolvedCollection(null);

    try {
      if (sourceType === 'spotify') {
        const res = await fetch(`/api/spotify/resolve-playlist?url=${encodeURIComponent(urlInput.trim())}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || 'Failed to resolve Spotify link');
        }
        const data = await res.json();
        const tracks: Track[] = (data.tracks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          album: data.name || 'Spotify Playlist',
          duration: t.duration || 210,
          durationText: t.durationText || '3:30',
          artwork: t.artwork || data.coverArt,
          source: 'spotify' as const,
          addedAt: Date.now(),
          streamUrl: t.audioPreview || `/api/audio/stream?id=${t.id}`,
        }));

        setResolvedCollection({
          name: data.name || 'Spotify Collection',
          source: 'spotify',
          tracks,
        });

        const initialSelected: Record<string, boolean> = {};
        tracks.forEach((t) => (initialSelected[t.id] = true));
        setSelectedTracks(initialSelected);
      } else {
        // YouTube search/resolve
        const res = await fetch(`/api/innertube/search?q=${encodeURIComponent(urlInput.trim())}`);
        if (!res.ok) throw new Error('Failed to query YouTube');
        const data = await res.json();
        const tracks: Track[] = (data.results || []).map((v: any) => ({
          id: v.id,
          title: v.title,
          artist: v.artist,
          album: 'YouTube Music',
          duration: v.duration || 210,
          durationText: v.durationText || '3:30',
          artwork: v.thumbnail,
          source: 'youtube' as const,
          addedAt: Date.now(),
          streamUrl: `/api/audio/stream?id=${v.id}`,
        }));

        setResolvedCollection({
          name: `YouTube: ${urlInput.trim()}`,
          source: 'youtube',
          tracks,
        });

        const initialSelected: Record<string, boolean> = {};
        tracks.forEach((t) => (initialSelected[t.id] = true));
        setSelectedTracks(initialSelected);
      }
    } catch (err: any) {
      setError(err.message || 'Error resolving playlist.');
    } finally {
      setIsResolving(false);
    }
  };

  const toggleTrack = (id: string) => {
    setSelectedTracks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = (select: boolean) => {
    if (!resolvedCollection) return;
    const next: Record<string, boolean> = {};
    resolvedCollection.tracks.forEach((t) => {
      next[t.id] = select;
    });
    setSelectedTracks(next);
  };

  const handleSaveToVault = async () => {
    if (!resolvedCollection) return;
    setIsSyncing(true);
    try {
      const tracksToSave = resolvedCollection.tracks.filter((t) => selectedTracks[t.id]);
      if (tracksToSave.length > 0) {
        await saveTracksBatch(tracksToSave);
        const playlist: Playlist = {
          id: `pl_${Date.now()}`,
          name: resolvedCollection.name,
          source: resolvedCollection.source,
          trackIds: tracksToSave.map((t) => t.id),
          createdAt: Date.now(),
          syncedAt: Date.now(),
        };
        await savePlaylist(playlist);
      }
      onSyncComplete();
      onClose();
    } catch (err: any) {
      setError('Failed to write tracks to vault: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <RefreshCw size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Universal Playlist & Vault Synchronizer
              </h3>
              <p className="text-xs text-zinc-400">
                Mirror any public Spotify or YouTube playlist directly into your local vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Service Selector Tabs */}
          <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
            <button
              onClick={() => {
                setSourceType('spotify');
                setResolvedCollection(null);
                setUrlInput('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                sourceType === 'spotify'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Music2 size={14} />
              <span>Spotify Playlist / Album URL</span>
            </button>
            <button
              onClick={() => {
                setSourceType('youtube');
                setResolvedCollection(null);
                setUrlInput('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                sourceType === 'youtube'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Youtube size={14} />
              <span>YouTube Search / Playlist</span>
            </button>
          </div>

          {/* URL Input Form */}
          <form onSubmit={handleResolve} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={
                  sourceType === 'spotify'
                    ? 'https://open.spotify.com/playlist/...'
                    : 'Search keywords or YouTube playlist URL...'
                }
                className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isResolving}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isResolving ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                <span>Resolve</span>
              </button>
            </div>

            {sourceType === 'spotify' && (
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="text-zinc-500">Quick examples:</span>
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
                  }}
                  className="hover:text-emerald-400 underline transition"
                >
                  Today's Top Hits
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa');
                  }}
                  className="hover:text-emerald-400 underline transition"
                >
                  Daft Punk RAM
                </button>
              </div>
            )}
          </form>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Resolved Tracks Checklist */}
          {resolvedCollection && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">{resolvedCollection.name}</h4>
                  <p className="text-xs text-zinc-400">
                    {Object.values(selectedTracks).filter(Boolean).length} of{' '}
                    {resolvedCollection.tracks.length} tracks selected for vault synchronization
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => handleSelectAll(true)}
                    className="text-cyan-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-zinc-600">|</span>
                  <button
                    onClick={() => handleSelectAll(false)}
                    className="text-zinc-400 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 border border-zinc-800 rounded-2xl p-2 bg-zinc-900/40">
                {resolvedCollection.tracks.map((track) => {
                  const isChecked = !!selectedTracks[track.id];
                  return (
                    <div
                      key={track.id}
                      onClick={() => toggleTrack(track.id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                        isChecked ? 'bg-zinc-800/80' : 'hover:bg-zinc-850 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                            isChecked
                              ? 'bg-cyan-500 border-cyan-500 text-black'
                              : 'border-zinc-700 bg-zinc-900'
                          }`}
                        >
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>
                        {track.artwork && (
                          <img
                            src={track.artwork}
                            alt={track.title}
                            className="w-8 h-8 rounded-lg object-cover border border-zinc-800 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate">
                            {track.title}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">{track.artist}</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-zinc-500 shrink-0 ml-2">
                        {track.durationText}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Sync Action Button */}
              <button
                onClick={handleSaveToVault}
                disabled={
                  isSyncing ||
                  Object.values(selectedTracks).filter(Boolean).length === 0
                }
                className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isSyncing ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                <span>
                  Synchronize{' '}
                  {Object.values(selectedTracks).filter(Boolean).length} Tracks to Local Vault
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
