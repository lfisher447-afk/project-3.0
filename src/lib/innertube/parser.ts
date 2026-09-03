/**
 * YouTube URL Parser
 * Converted directly from Kotlin: com.metrolist.innertube.utils.YouTubeUrlParser
 * Comprehensive URL parser for YouTube, YouTube Music, Shorts, Playlists, Channels, and Embeds.
 */

import { WatchEndpoint } from './models';
import {
  extractVideoId,
  extractPlaylistId,
  YOUTUBE_VIDEO_ID_REGEX,
  YOUTUBE_PLAYLIST_ID_REGEX,
} from './utils';

export interface ParsedYouTubeUrl {
  type: 'video' | 'playlist' | 'channel' | 'search' | 'unknown';
  videoId?: string;
  playlistId?: string;
  channelId?: string;
  query?: string;
  startTimeSeconds?: number;
  endpoint?: WatchEndpoint;
  rawUrl: string;
}

export class YouTubeUrlParser {
  /**
   * Parse any YouTube or YouTube Music URL into structured components
   */
  static parse(url: string): ParsedYouTubeUrl {
    if (!url || typeof url !== 'string') {
      return { type: 'unknown', rawUrl: url || '' };
    }

    const trimmed = url.trim();

    // Check if it is a bare 11-char video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return {
        type: 'video',
        videoId: trimmed,
        rawUrl: trimmed,
        endpoint: { videoId: trimmed },
      };
    }

    // Video ID extraction
    const videoId = extractVideoId(trimmed);
    const playlistId = extractPlaylistId(trimmed);

    // Extract timestamp (?t=120 or ?t=2m30s)
    let startTimeSeconds: number | undefined = undefined;
    const timeMatch = trimmed.match(/[?&]t=([0-9hms]+)/);
    if (timeMatch && timeMatch[1]) {
      startTimeSeconds = this.parseTimestamp(timeMatch[1]);
    }

    // Channel check (youtube.com/@channel or /channel/UC...)
    const channelMatch = trimmed.match(/(?:youtube\.com\/(?:@|channel\/|c\/|user\/))([a-zA-Z0-9_-]+)/);
    if (channelMatch && channelMatch[1] && !videoId) {
      return {
        type: 'channel',
        channelId: channelMatch[1],
        rawUrl: trimmed,
      };
    }

    // Search query check (youtube.com/results?search_query=...)
    const searchMatch = trimmed.match(/[?&](?:search_query|q)=([^&]+)/);
    if (searchMatch && searchMatch[1] && !videoId) {
      return {
        type: 'search',
        query: decodeURIComponent(searchMatch[1].replace(/\+/g, ' ')),
        rawUrl: trimmed,
      };
    }

    if (videoId) {
      return {
        type: 'video',
        videoId,
        playlistId: playlistId || undefined,
        startTimeSeconds,
        endpoint: {
          videoId,
          playlistId: playlistId || undefined,
        },
        rawUrl: trimmed,
      };
    }

    if (playlistId) {
      return {
        type: 'playlist',
        playlistId,
        endpoint: { playlistId },
        rawUrl: trimmed,
      };
    }

    return {
      type: 'unknown',
      rawUrl: trimmed,
    };
  }

  /**
   * Parse timestamp strings like "1h30m15s", "90s", "120"
   */
  static parseTimestamp(timeStr: string): number {
    if (!timeStr) return 0;
    if (/^\d+$/.test(timeStr)) {
      return parseInt(timeStr, 10);
    }
    let totalSec = 0;
    const hours = timeStr.match(/(\d+)h/);
    const minutes = timeStr.match(/(\d+)m/);
    const seconds = timeStr.match(/(\d+)s/);

    if (hours && hours[1]) totalSec += parseInt(hours[1], 10) * 3600;
    if (minutes && minutes[1]) totalSec += parseInt(minutes[1], 10) * 60;
    if (seconds && seconds[1]) totalSec += parseInt(seconds[1], 10);

    return totalSec;
  }

  /**
   * Create an InnerTube WatchEndpoint object from a video/playlist ID
   */
  static createWatchEndpoint(videoId?: string, playlistId?: string, index?: number): WatchEndpoint {
    return {
      videoId: videoId || undefined,
      playlistId: playlistId || undefined,
      index: index !== undefined ? index : undefined,
    };
  }
}
