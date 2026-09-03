import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  MessageSquare,
  ListVideo,
  ExternalLink,
  Plus,
  Check,
  RotateCcw,
  Gauge,
  Layers,
  RotateCw,
  PictureInPicture,
  Minimize2,
  Server,
  Radio,
  Loader2,
} from 'lucide-react';
import { VideoMetadata, VideoComment, invidiousHandler } from '../handler/InvidiousHandler';
import { Track } from '../../../types';
import { saveTrack } from '../../../lib/db';

interface InvidiousPlayerProps {
  metadata: VideoMetadata | null;
  onSelectVideo: (id: string) => void;
  onSendToAudioDeck: (track: Track) => void;
  onOpenDsp: () => void;
}

export const InvidiousPlayer: React.FC<InvidiousPlayerProps> = ({
  metadata,
  onSelectVideo,
  onSendToAudioDeck,
  onOpenDsp,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedResolution, setSelectedResolution] = useState<string>('720p');
  const [activeTab, setActiveTab] = useState<'related' | 'comments' | 'description'>('related');
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isTheater, setIsTheater] = useState(false);

  // Native Video Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<string>('native');
  const controlsTimeoutRef = useRef<any>(null);

  // When metadata changes, reset and load
  useEffect(() => {
    if (metadata?.videoId) {
      setLoadingComments(true);
      invidiousHandler
        .getComments(metadata.videoId)
        .then(setComments)
        .finally(() => setLoadingComments(false));

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        setCurrentTime(0);
        setIsBuffering(true);
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  }, [metadata?.videoId]);

  // Handle Fullscreen events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!metadata) {
    return null;
  }

  // Stream URL calculation
  const videoStreamSrc =
    selectedNode === 'native'
      ? `/api/video/stream?id=${metadata.videoId}&res=${selectedResolution}`
      : `/api/video/stream?id=${metadata.videoId}&res=${selectedResolution}&node=${selectedNode}`;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true));
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || metadata.durationSeconds || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipSeconds = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(videoRef.current.duration || 9999, videoRef.current.currentTime + seconds)
      );
    }
  };

  const handleVolume = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const next = !isMuted;
      setIsMuted(next);
      videoRef.current.muted = next;
    }
  };

  const changeResolution = (res: string) => {
    const prevTime = videoRef.current ? videoRef.current.currentTime : 0;
    setSelectedResolution(res);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = prevTime;
        if (isPlaying) {
          videoRef.current.play().catch(() => {});
        }
      }
    }, 100);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleSaveToVault = async () => {
    try {
      const track: Track = {
        id: `yt_${metadata.videoId}`,
        title: metadata.title,
        artist: metadata.author,
        album: 'YouTube Video',
        duration: metadata.durationSeconds || 210,
        durationText: metadata.durationFormatted,
        artwork: metadata.thumbnail,
        source: 'youtube',
        addedAt: Date.now(),
        streamUrl: `/api/audio/stream?id=${metadata.videoId}`,
      };
      await saveTrack(track);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendToAudio = () => {
    const track: Track = {
      id: `yt_${metadata.videoId}`,
      title: metadata.title,
      artist: metadata.author,
      album: 'YouTube Video',
      duration: metadata.durationSeconds || 210,
      durationText: metadata.durationFormatted,
      artwork: metadata.thumbnail,
      source: 'youtube',
      addedAt: Date.now(),
      streamUrl: `/api/audio/stream?id=${metadata.videoId}`,
    };
    onSendToAudioDeck(track);
  };

  return (
    <div className={`space-y-6 select-none ${isTheater ? 'max-w-none' : ''}`}>
      {/* NATIVE VIDEO STAGE (ZERO EMBED LINKS / IFRAMES) */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className={`relative bg-[#020608] border border-[#14343d] rounded-3xl overflow-hidden shadow-2xl group ${
          isFullscreen ? 'w-screen h-screen rounded-none border-0' : 'w-full aspect-video'
        }`}
      >
        {/* Real HTML5 Video Element */}
        <video
          ref={videoRef}
          src={videoStreamSrc}
          poster={metadata.thumbnail}
          crossOrigin="anonymous"
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsBuffering(false);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsBuffering(false)}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Buffering Indicator */}
        {isBuffering && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none z-10">
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#05161a]/90 border border-[#1b434e] text-[#48e4ff]">
              <Loader2 size={36} className="animate-spin text-[#48e4ff]" />
              <span className="text-xs font-mono font-bold tracking-wider">Streaming Chunks...</span>
            </div>
          </div>
        )}

        {/* Big Center Play Overlay (when paused) */}
        {!isPlaying && !isBuffering && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-[#48e4ff]/90 text-[#051a20] flex items-center justify-center shadow-[0_0_40px_rgba(72,228,255,0.6)] hover:scale-110 transition-transform cursor-pointer z-10"
          >
            <Play size={36} fill="currentColor" className="ml-1" />
          </button>
        )}

        {/* Custom Video Overlay Controls Bar */}
        <div
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 transition-opacity duration-300 z-20 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Timeline Scrubber */}
          <div className="space-y-1 mb-3">
            <div className="relative w-full flex items-center group/scrubber">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-[#1b3d45] rounded-lg appearance-none cursor-pointer accent-[#48e4ff] hover:h-2.5 transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="text-[#48e4ff] font-bold">{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left Controls: Play, Skips, Volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-2 rounded-xl bg-[#091f24] hover:bg-[#12363f] text-[#48e4ff] border border-[#19404a] transition"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>

              <button
                onClick={() => skipSeconds(-10)}
                className="p-2 rounded-xl bg-[#091f24] hover:bg-[#12363f] text-zinc-300 hover:text-white border border-[#19404a] transition"
                title="Rewind 10s"
              >
                <RotateCcw size={15} />
              </button>

              <button
                onClick={() => skipSeconds(10)}
                className="p-2 rounded-xl bg-[#091f24] hover:bg-[#12363f] text-zinc-300 hover:text-white border border-[#19404a] transition"
                title="Forward 10s"
              >
                <RotateCw size={15} />
              </button>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 bg-[#091f24] px-3 py-1.5 rounded-xl border border-[#19404a]">
                <button onClick={toggleMute} className="text-zinc-300 hover:text-white">
                  {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-[#163942] rounded-lg appearance-none cursor-pointer accent-[#48e4ff]"
                />
              </div>
            </div>

            {/* Right Controls: Resolution, Speed, DSP, PiP, Theater, Fullscreen */}
            <div className="flex items-center gap-2">
              {/* Resolution Switcher */}
              <div className="flex items-center gap-1 bg-[#091f24] p-1 rounded-xl border border-[#19404a]">
                {['1080p', '720p', '480p', '360p'].map((res) => (
                  <button
                    key={res}
                    onClick={() => changeResolution(res)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                      selectedResolution === res
                        ? 'bg-[#48e4ff] text-[#051a20]'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>

              {/* Playback Speed */}
              <div className="flex items-center gap-1 bg-[#091f24] px-2 py-1 rounded-xl border border-[#19404a] text-xs font-mono text-zinc-400">
                <Gauge size={13} className="text-[#48e4ff]" />
                {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`px-1 rounded text-[10px] font-bold ${
                      playbackSpeed === s ? 'text-[#48e4ff]' : 'hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Route DSP */}
              <button
                onClick={handleSendToAudio}
                className="px-3 py-1 bg-[#0d262d] hover:bg-[#163a44] text-[#48e4ff] border border-[#1a4955] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="Route into 5-Band Audio DSP Deck"
              >
                <Sliders size={13} />
                <span className="hidden sm:inline">Route to DSP</span>
              </button>

              {/* Picture-in-Picture */}
              <button
                onClick={togglePictureInPicture}
                className="p-1.5 bg-[#091f24] hover:bg-[#12363f] text-zinc-300 hover:text-white rounded-xl border border-[#19404a] transition"
                title="Picture in Picture"
              >
                <PictureInPicture size={15} />
              </button>

              {/* Theater Mode */}
              <button
                onClick={() => setIsTheater(!isTheater)}
                className="p-1.5 bg-[#091f24] hover:bg-[#12363f] text-zinc-300 hover:text-white rounded-xl border border-[#19404a] transition"
                title="Toggle Theater Mode"
              >
                <Layers size={15} />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 bg-[#091f24] hover:bg-[#12363f] text-zinc-300 hover:text-white rounded-xl border border-[#19404a] transition"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Details & Meta Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Title, Author, Tabs */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-3xl bg-[#07171a] border border-[#15343c] shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#123942] text-[#48e4ff] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Radio size={11} className="animate-pulse" /> Native HTML5 Video Stream
              </span>
              <span className="text-[10px] font-mono text-zinc-500">ID: {metadata.videoId}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
              {metadata.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-[#133038]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#48e4ff] to-[#0ea5e9] text-[#051a20] flex items-center justify-center font-bold text-sm shadow-md">
                  {metadata.author.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{metadata.author}</div>
                  <div className="text-[11px] text-zinc-400">
                    {metadata.viewCountFormatted || 'Public Stream Node'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveToVault}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                    isSaved
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-[#0a1e23] hover:bg-[#13353d] text-white border-[#1c4049]'
                  }`}
                >
                  {isSaved ? <Check size={14} /> : <Plus size={14} />}
                  <span>{isSaved ? 'Saved to Vault' : 'Save to Vault'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation: Description / Comments */}
          <div className="p-6 rounded-3xl bg-[#07171a] border border-[#15343c]">
            <div className="flex items-center gap-2 border-b border-[#14343d] pb-4 mb-4">
              <button
                onClick={() => setActiveTab('related')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'related'
                    ? 'bg-[#48e4ff] text-[#051a20] shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Description & Info
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'comments'
                    ? 'bg-[#48e4ff] text-[#051a20] shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <MessageSquare size={14} />
                <span>Comments ({comments.length})</span>
              </button>
            </div>

            {activeTab === 'related' && (
              <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                {metadata.description || 'No description provided by creator.'}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {loadingComments ? (
                  <div className="text-xs text-zinc-500 font-mono py-4 text-center">
                    Loading community comments...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-xs text-zinc-500 py-4 text-center">
                    No comments found on this node.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl bg-[#051114] border border-[#133037] flex gap-3"
                    >
                      <img
                        src={c.authorThumb}
                        alt={c.author}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-800"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{c.author}</span>
                          <span className="text-[10px] font-mono text-zinc-500">{c.publishedText}</span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Related Videos */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ListVideo size={16} className="text-[#48e4ff]" /> Related Videos
          </h3>

          <div className="space-y-2.5">
            {metadata.relatedVideos.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectVideo(rel.id)}
                className="p-2.5 rounded-2xl bg-[#07171a] border border-[#14333b] hover:border-[#48e4ff]/60 transition cursor-pointer flex gap-3 group"
              >
                <div className="relative w-28 aspect-video rounded-xl overflow-hidden shrink-0 bg-zinc-900">
                  <img
                    src={rel.thumbnail}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white">
                    {rel.duration}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-[#48e4ff] transition-colors">
                    {rel.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate mt-1">{rel.author}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
