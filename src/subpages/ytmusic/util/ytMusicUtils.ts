/**
 * YouTube Music Utilities
 */

export function cleanTrackTitle(title: string): string {
  if (!title) return 'Unknown Title';
  return title
    .replace(/\s*\(Official (Music Video|Audio|Video|Lyric Video|Visualizer)\)/gi, '')
    .replace(/\s*\[Official (Music Video|Audio|Video|Lyric Video|Visualizer)\]/gi, '')
    .replace(/\s*\(HD\)/gi, '')
    .replace(/\s*\(Lyrics\)/gi, '')
    .trim();
}

export function cleanArtistName(artist: string): string {
  if (!artist) return 'Unknown Artist';
  return artist.replace(/\s*-\s*Topic$/i, '').trim();
}

export function formatTimeSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseYouTubeMusicUrl(url: string): { videoId?: string; playlistId?: string } | null {
  try {
    const parsed = new URL(url);
    const videoId = parsed.searchParams.get('v') || undefined;
    const playlistId = parsed.searchParams.get('list') || undefined;
    return { videoId, playlistId };
  } catch {
    return null;
  }
}
