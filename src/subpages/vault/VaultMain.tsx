import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  Play,
  Trash2,
  Download,
  Plus,
  Music2,
  Disc,
  Search,
  HardDrive,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';
import { Track, Playlist } from '../../types';
import { getAllTracks, getAllPlaylists, deleteTrack, deletePlaylist, savePlaylist } from '../../lib/db';

interface VaultMainProps {
  onPlayTrack: (track: Track, trackList?: Track[]) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export const VaultMain: React.FC<VaultMainProps> = ({
  onPlayTrack,
  currentTrackId,
  isPlaying,
}) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists'>('tracks');
  const [searchFilter, setSearchFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const loadData = async () => {
    const [t, p] = await Promise.all([getAllTracks(), getAllPlaylists()]);
    setTracks(t);
    setPlaylists(p);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTrack(id);
    await loadData();
  };

  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deletePlaylist(id);
    await loadData();
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const newP: Playlist = {
      id: `pl_${Date.now()}`,
      name: newPlaylistName.trim(),
      source: 'local',
      trackIds: [],
      createdAt: Date.now(),
    };

    await savePlaylist(newP);
    setNewPlaylistName('');
    setShowCreateModal(false);
    await loadData();
  };

  const handleExportVault = () => {
    const vaultData = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      tracks,
      playlists,
    };
    const blob = new Blob([JSON.stringify(vaultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotui-vault-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTracks = tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-8 select-none pb-24 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#163842] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#48e4ff]/20 border border-[#48e4ff]/40 text-[#48e4ff]">
              <FolderLock size={18} />
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#48e4ff] font-bold">
              IndexedDB Persistent Storage
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Vault Audio Library
          </h1>
          <p className="text-xs text-[#789d9a] mt-1 max-w-xl">
            Offline-synced tracks, user-curated playlists, and lossless backups stored in browser persistence.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-[#091b20] hover:bg-[#122e36] text-zinc-300 hover:text-white border border-[#163942] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>New Playlist</span>
          </button>
          <button
            onClick={handleExportVault}
            className="px-4 py-2.5 bg-[#48e4ff] hover:bg-[#38bdf8] text-black font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-cyan-900/30"
          >
            <Download size={14} />
            <span>Export Vault</span>
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#081a1e] border border-[#153a43] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#48e4ff]/15 flex items-center justify-center text-[#48e4ff]">
            <Music2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{tracks.length}</div>
            <div className="text-xs text-[#789d9a]">Vaulted Tracks</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#081a1e] border border-[#153a43] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
            <Disc size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{playlists.length}</div>
            <div className="text-xs text-[#789d9a]">Custom Playlists</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#081a1e] border border-[#153a43] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <HardDrive size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">IndexedDB</div>
            <div className="text-xs text-[#789d9a]">Encrypted Local Cache</div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-[#091b20] p-1.5 rounded-2xl border border-[#163942] w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('tracks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial ${
              activeTab === 'tracks'
                ? 'bg-[#48e4ff] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Tracks ({tracks.length})
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial ${
              activeTab === 'playlists'
                ? 'bg-[#48e4ff] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Playlists ({playlists.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter library..."
            className="w-full bg-[#07171a] border border-[#14343d] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#48e4ff]"
          />
        </div>
      </div>

      {/* Tracks Tab */}
      {activeTab === 'tracks' && (
        <div className="border border-[#163842] rounded-3xl bg-[#061417] overflow-hidden shadow-xl">
          {filteredTracks.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs font-mono">
              No tracks in library yet. Add tracks from Spotify, YouTube, or Local Uploads.
            </div>
          ) : (
            <div className="divide-y divide-[#10272e]">
              {filteredTracks.map((track, idx) => {
                const isCurrent = currentTrackId === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track, filteredTracks)}
                    className={`p-3.5 px-6 flex items-center justify-between cursor-pointer transition ${
                      isCurrent
                        ? 'bg-[#123842] text-white font-bold'
                        : 'hover:bg-[#091f24] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <span className="text-xs font-mono text-zinc-500 w-8">
                        {isCurrent && isPlaying ? (
                          <span className="w-2 h-2 rounded-full bg-[#48e4ff] inline-block animate-ping" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      {track.artwork && (
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-800"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate text-white">{track.title}</div>
                        <div className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-zinc-400">{track.durationText}</span>
                      <button
                        onClick={(e) => handleDeleteTrack(track.id, e)}
                        className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        title="Delete from Vault"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Playlists Tab */}
      {activeTab === 'playlists' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="p-5 rounded-3xl bg-[#07171a] border border-[#15343c] hover:border-[#48e4ff]/60 transition flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-purple-950/40 text-purple-400 border border-purple-500/40 font-bold">
                    {pl.source}
                  </span>
                  <button
                    onClick={(e) => handleDeletePlaylist(pl.id, e)}
                    className="text-zinc-500 hover:text-rose-400 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 className="font-bold text-base text-white truncate">{pl.name}</h3>
                <p className="text-xs text-zinc-400 mt-1">{pl.trackIds.length} tracks included</p>
              </div>

              <div className="mt-6 pt-3 border-t border-[#122c33] flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">
                  {new Date(pl.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => {
                    const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
                    if (plTracks.length > 0) onPlayTrack(plTracks[0], plTracks);
                  }}
                  className="px-3 py-1.5 bg-[#48e4ff] text-black font-bold text-xs rounded-xl flex items-center gap-1 shadow-md shadow-cyan-950/40"
                >
                  <Play size={12} className="fill-current" />
                  <span>Play</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePlaylist}
            className="p-6 rounded-3xl bg-[#091b20] border border-[#1a3f4a] max-w-sm w-full shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-bold text-white">Create New Vault Playlist</h3>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name..."
              className="w-full bg-[#061215] border border-[#183a44] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#48e4ff]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#48e4ff] text-black font-bold text-xs rounded-xl"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
