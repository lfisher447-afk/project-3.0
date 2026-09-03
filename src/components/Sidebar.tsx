import React from 'react';
import {
  Home,
  Library,
  Search,
  Settings,
  Mic,
  Globe,
  Sliders,
  UploadCloud,
  RefreshCw,
  Shield,
  Music2,
  Music,
  Youtube,
  Disc,
  Server,
} from 'lucide-react';
import { ThemePalette } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSync: () => void;
  onOpenNovaAc: () => void;
  onOpenShazam: () => void;
  onOpenDsp: () => void;
  onLaunchCloak: () => void;
  isSpotifyConnected: boolean;
  palette: ThemePalette;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSync,
  onOpenNovaAc,
  onOpenShazam,
  onOpenDsp,
  onLaunchCloak,
  isSpotifyConnected,
  palette,
}) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Signal Deck' },
    { id: 'yt-music', icon: Music, label: 'YouTube Music', badge: 'Opus 48k' },
    { id: 'yt-player', icon: Youtube, label: 'YouTube Player', badge: 'Video & Audio' },
    { id: 'spotify', icon: Music2, label: 'Spotify Player', badge: 'Playlists' },
    { id: 'servers', icon: Server, label: 'Proxy Matrix', badge: '12 Nodes' },
    { id: 'web-proxy', icon: Globe, label: 'Web Proxy Browser' },
    { id: 'library', icon: Library, label: 'Vault Library' },
    { id: 'search', icon: Search, label: 'Music Search' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-72 border-r border-[#1a333a] bg-gradient-to-b from-[#091519]/95 via-[#061013]/95 to-[#040b0d]/95 backdrop-blur-2xl p-5 flex flex-col z-20 shrink-0 select-none overflow-y-auto">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#48e4ff] via-[#22d3ee] to-[#0ea5e9] flex items-center justify-center shadow-[0_0_24px_rgba(72,228,255,0.35)] relative overflow-hidden shrink-0">
          <Disc className="text-[#051a20] animate-spin" style={{ animationDuration: '8s' }} size={22} />
        </div>
        <div>
          <div className="font-serif font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
            Spotui <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#48e4ff]/15 text-[#48e4ff] font-mono border border-[#48e4ff]/30">Web</span>
          </div>
          <div className="text-[10px] text-[#789d9a] tracking-wider uppercase font-mono">Universal Media Portal</div>
        </div>
      </div>

      {/* Main Navigation with Sub-Pages */}
      <nav className="space-y-1 mb-5">
        <div className="text-[10px] uppercase tracking-widest text-[#789d9a] font-bold px-2 mb-1.5">
          Portal Hub
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                window.location.hash = `#/${item.id}`;
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all font-medium text-xs text-left ${
                isActive
                  ? 'bg-gradient-to-r from-[#143e47] to-[#0d2a30] text-white shadow-lg border border-[#48e4ff]/30 shadow-[#48e4ff]/5'
                  : 'text-[#90b1b8] hover:bg-[#12282e]/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <item.icon size={16} className={isActive ? 'text-[#48e4ff]' : 'text-[#628991]'} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 bg-cyan-500/20 text-cyan-300">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Action Tools */}
      <div className="space-y-2 mb-6">
        <div className="text-[10px] uppercase tracking-widest text-[#789d9a] font-bold px-2 mb-1">
          Audio & Vault Engines
        </div>

        <button
          onClick={onOpenDsp}
          className="w-full flex items-center justify-between px-3 py-2 bg-[#0a1b20] hover:bg-[#112a32] border border-[#1d3c45] rounded-xl text-xs font-semibold text-[#c8e9ee] transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Sliders size={15} className="text-[#48e4ff] group-hover:rotate-45 transition-transform" />
            <span>5-Band Web Audio DSP EQ</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#143e47] text-[#48e4ff]">Live</span>
        </button>

        <button
          onClick={onOpenShazam}
          className="w-full flex items-center justify-between px-3 py-2 bg-[#0a1b20] hover:bg-[#112a32] border border-[#1d3c45] rounded-xl text-xs font-semibold text-[#c8e9ee] transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Mic size={15} className="text-[#c084fc] group-hover:scale-110 transition-transform" />
            <span>Acoustic Spectrum & Match</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#6b21a8]/40 text-[#c084fc]">Mic</span>
        </button>

        <button
          onClick={onOpenNovaAc}
          className="w-full flex items-center justify-between px-3 py-2 bg-[#0a1b20] hover:bg-[#112a32] border border-[#1d3c45] rounded-xl text-xs font-semibold text-[#c8e9ee] transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <UploadCloud size={15} className="text-[#34d399] group-hover:-translate-y-0.5 transition-transform" />
            <span>Archive Importer</span>
          </div>
          <span className="text-[10px] font-mono text-[#5c828a]">.novaac</span>
        </button>

        <button
          onClick={onOpenSync}
          className="w-full flex items-center justify-between px-3 py-2 bg-[#0a1b20] hover:bg-[#112a32] border border-[#1d3c45] rounded-xl text-xs font-semibold text-[#c8e9ee] transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw size={15} className="text-[#fbbf24] group-hover:rotate-180 transition-transform duration-500" />
            <span>Playlist Vault Sync</span>
          </div>
        </button>
      </div>

      {/* Stealth Panic Button & Status */}
      <div className="mt-auto pt-4 border-t border-[#1a333a] space-y-3">
        <button
          onClick={onLaunchCloak}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#201016] to-[#12080c] hover:from-[#351823] hover:to-[#1c0c13] text-[#f43f5e] border border-[#4a1822] text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <Shield size={14} />
          <span>Stealth about:blank Tab</span>
        </button>

        <div className="flex items-center justify-between px-1 text-[11px] text-[#789d9a] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Engine Ready</span>
          </div>
          <span>v3.0.0</span>
        </div>
      </div>
    </aside>
  );
};
