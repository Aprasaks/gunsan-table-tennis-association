/**
 * A YouTube video is always represented as a normal hyperlink in stored HTML.
 * Iframes are created only at render-time from validated video IDs.
 */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;

    if (host === 'youtu.be' || host === 'www.youtu.be') {
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length === 1) id = segments[0];
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length === 1 && segments[0] === 'watch') {
        id = url.searchParams.get('v');
      } else if (segments.length === 2 && ['shorts', 'live', 'embed', 'v'].includes(segments[0])) {
        id = segments[1];
      }
    }

    return id && VIDEO_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function youtubeWatchUrl(id: string) {
  return 'https://www.youtube.com/watch?v=' + id;
}

export function youtubeEmbedUrl(id: string) {
  return 'https://www.youtube-nocookie.com/embed/' + id;
}
