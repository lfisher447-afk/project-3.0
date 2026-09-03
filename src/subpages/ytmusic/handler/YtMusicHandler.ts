/**
 * YouTube Music Client Handler
 * Integrates InnerTube Web Remix API & Search Scraper
 */

import { cleanTrackTitle, cleanArtistName, formatTimeSeconds } from '../util/ytMusicUtils';
import { Track } from '../../../types';

export interface YtMusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  durationText: string;
  artwork: string;
  streamUrl: string;
  videoId: string;
  views?: string;
}

export class YtMusicHandler {
  /**
   * Search YouTube Music
   */
  async search(query: string, filter: 'all' | 'songs' | 'albums' | 'videos' = 'songs'): Promise<YtMusicTrack[]> {
    if (!query.trim()) return [];

    try {
      const filterParam = filter === 'songs' ? '&filter=songs' : '';
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}${filterParam}`);
      if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);

      const items: any[] = await res.json();
      return items.map((item) => {
        const title = cleanTrackTitle(item.title);
        const artist = cleanArtistName(item.author || item.channelTitle || 'Unknown Artist');
        const videoId = item.id || item.videoId;

        return {
          id: `yt_${videoId}`,
          videoId,
          title,
          artist,
          album: 'YouTube Music',
          duration: item.durationSeconds || 195,
          durationText: item.duration || formatTimeSeconds(item.durationSeconds || 195),
          artwork: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          streamUrl: `/api/audio/stream?id=${videoId}`,
          views: item.viewCountFormatted || item.views || '',
        };
      });
    } catch (err) {
      console.warn('[YtMusicHandler] search failed:', err);
      return [];
    }
  }

  /**
   * Fetch Trending / Charts for YouTube Music
   */
  async getTrendingCharts(): Promise<YtMusicTrack[]> {
    const popularQueries = ['Top Music Hits 2024', 'Global Top 50 Songs', 'Viral Hits Music'];
    const randomQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)];
    return this.search(randomQuery, 'songs');
  }

  /**
   * Convert YtMusicTrack to app Audio Track
   */
  toAudioTrack(track: YtMusicTrack): Track {
    return {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      durationText: track.durationText,
      artwork: track.artwork,
      source: 'youtube',
      addedAt: Date.now(),
      streamUrl: track.streamUrl,
    };
  }
}

export const ytMusicHandler = new YtMusicHandler();
