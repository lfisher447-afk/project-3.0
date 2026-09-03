import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Search,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Plus,
  ExternalLink,
  Youtube,
  Tv,
  ListMusic,
  Share2,
} from 'lucide-react';
import { YouTubeUrlParser } from '../lib/innertube/parser';
import { Track } from '../types';

interface YtPlayerViewProps {
  onPlayTrack?: (track: Track) => void;
  onAddToVault?: (track: Track) => void;
  onOpenDsp?: () => void;
}

export const YtPlayerView: React.FC<YtPlayerViewProps> = ({
  onPlayTrack,
  onAddToVault,
  onOpenDsp,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState('4NRXx6U8ABQ'); // Blinding Lights by default
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);

  useEffect(() => {
    loadVideoDetails(currentVideoId);
  }, [currentVideoId]);

  const loadVideoDetails = async (videoId: string) => {
    setLoading(true);
    setSavedToVault(false);
    try {
      const res = await fetch(`/api/innertube/video-info?id=${encodeURIComponent(videoId)}`);
      if (res.ok) {
        const data = await res.json();
        setVideoInfo(data);
      }
    } catch (e) {
      console.error('Failed to load video info:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/innertube/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const parsed = YouTubeUrlParser.parse(urlInput.trim());
    if (parsed && parsed.videoId) {
      setCurrentVideoId(parsed.videoId);
      setUrlInput('');
    } else {
      setSearchQuery(urlInput);
      handleSearch();
    }
  };

  const handleSelectVideo = (videoId: string) => {
    setCurrentVideoId(videoId);
  };

  const handleQueueTrack = () => {
    if (!videoInfo || !onPlayTrack) return;
    const newTrack: Track = {
      id: currentVideoId,
      title: videoInfo.title || 'YouTube Video',
      artist: videoInfo.author || 'YouTube Channel',
      album: 'YouTube Music',
      duration: videoInfo.durationSeconds || 210,
      durationText: videoInfo.durationFormatted || '3:30',
      artwork: videoInfo.thumbnail || `https://i.ytimg.com/vi/${currentVideoId}/hqdefault.jpg`,
      source: 'youtube',
      addedAt: Date.now(),
      streamUrl: `/api/audio/stream?id=${currentVideoId}`,
    };
    onPlayTrack(newTrack);
  };

  const handleSaveToVault = () => {
    if (!videoInfo) return;
    const newTrack: Track = {
      id: currentVideoId,
      title: videoInfo.title || 'YouTube Video',
      artist: videoInfo.author || 'YouTube Channel',
      album: 'YouTube Music',
      duration: videoInfo.durationSeconds || 210,
      durationText: videoInfo.durationFormatted || '3:30',
      artwork: videoInfo.thumbnail || `https://i.ytimg.com/vi/${currentVideoId}/hqdefault.jpg`,
      source: 'youtube',
      addedAt: Date.now(),
      streamUrl: `/api/audio/stream?id=${currentVideoId}`,
    };
    if (onAddToVault) onAddToVault(newTrack);
    setSavedToVault(true);
    setTimeout(() => setSavedToVault(false), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${currentVideoId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="yt-player-page" className="flex-1 flex flex-col min-h-0 bg-black overflow-y-auto">
      {/* Top Bar: URL Input & Search */}
      <div className="p-4 bg-zinc-950/95 border-b border-zinc-800 sticky top-0 z-30 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        {/* URL Bar */}
        <form onSubmit={handleUrlSubmit} className="flex-1 min-w-[280px] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="yt-url-input"
              type="text"
              placeholder="Paste any YouTube video link, watch ID, or search..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-cyan-400 focus:outline-none text-zinc-100 placeholder-zinc-500 transition"
            />
          </div>
          <button
            id="yt-load-btn"
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-white transition flex items-center gap-1.5 shadow-md shadow-rose-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Play
          </button>
        </form>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          {onOpenDsp && (
            <button
              onClick={onOpenDsp}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-purple-300 transition flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Audio DSP</span>
            </button>
          )}
          <button
            onClick={handleCopyLink}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 transition flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-4 md:p-6 flex-1 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full">
        {/* Left Side: Video Screen & Player Details */}
        <div className="flex-1 flex flex-col space-y-4">
          {/* Video Container */}
          <div className="relative w-full aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-zinc-950 text-cyan-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs font-mono text-zinc-400">Loading YouTube Stream...</span>
              </div>
            ) : (
              <iframe
                id="yt-video-embed"
                src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=1&enablejsapi=1&rel=0`}
                title="YouTube Video Player"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>

          {/* Video Metadata & Controls */}
          {videoInfo && (
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-white leading-snug line-clamp-2">
                    {videoInfo.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-200">{videoInfo.author}</span>
                    {videoInfo.viewCountFormatted && (
                      <>
                        <span>•</span>
                        <span>{videoInfo.viewCountFormatted}</span>
                      </>
                    )}
                    {videoInfo.durationFormatted && (
                      <>
                        <span>•</span>
                        <span>{videoInfo.durationFormatted}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleQueueTrack}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play in DSP Audio</span>
                  </button>

                  <button
                    onClick={handleSaveToVault}
                    disabled={savedToVault}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                      savedToVault
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                    }`}
                  >
                    {savedToVault ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Vault</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {videoInfo.description && (
                <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/60 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                  {videoInfo.description}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Search & Related Tracks */}
        <div className="w-full lg:w-96 flex flex-col space-y-4">
          {/* Quick Search */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Search YouTube Music</span>
            </h3>

            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artists, songs..."
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 text-black font-semibold text-xs hover:bg-cyan-400 transition disabled:opacity-50"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Go'}
              </button>
            </form>

            {/* Search Results List */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectVideo(item.id)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition group"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-12 h-9 object-cover rounded-lg shrink-0 border border-zinc-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-cyan-300 truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">{item.author}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Tracks */}
          {videoInfo?.relatedVideos && videoInfo.relatedVideos.length > 0 && (
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 flex-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                <ListMusic className="w-3.5 h-3.5 text-cyan-400" />
                <span>Up Next & Related</span>
              </h3>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {videoInfo.relatedVideos.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectVideo(item.id)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition group"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-12 h-9 object-cover rounded-lg shrink-0 border border-zinc-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-cyan-300 truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">{item.author}</div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {item.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
