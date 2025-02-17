export const convertToUrl = (url: string | URL) => (url instanceof URL ? url : new URL(url));
export const getURLFilename = (url: URL) =>
  url.pathname.split("/").pop()?.toLocaleLowerCase() || url.searchParams.get("filename")?.toLocaleLowerCase();

export const IMAGE_EXT = [".svg", ".gif", ".png", ".jpg", ".jpeg", ".webp", ".avif"];
export const VIDEO_EXT = [".mp4", ".mkv", ".webm", ".mov"];
export const STREAM_EXT = [".m3u8"];
export const AUDIO_EXT = [".mp3", ".wav", ".ogg", ".aac"];

/** Checks if a url is a image URL */
export function isImageURL(url: string | URL) {
  url = convertToUrl(url);
  const filename = getURLFilename(url);
  return !!filename && IMAGE_EXT.some((ext) => filename.endsWith(ext));
}

/** Checks if a url is a video URL */
export function isVideoURL(url: string | URL) {
  url = convertToUrl(url);
  const filename = getURLFilename(url);
  return !!filename && VIDEO_EXT.some((ext) => filename.endsWith(ext));
}

/** Checks if a url is a stream URL */
export function isStreamURL(url: string | URL) {
  url = convertToUrl(url);
  const filename = getURLFilename(url);
  return !!filename && STREAM_EXT.some((ext) => filename.endsWith(ext));
}

/** Checks if a url is a audio URL */
export function isAudioURL(url: string | URL) {
  url = convertToUrl(url);
  const filename = getURLFilename(url);
  return !!filename && AUDIO_EXT.some((ext) => filename.endsWith(ext));
}

/** Tests if two URLs are the same */
export function isSameURL(a: string | URL, b: string | URL) {
  try {
    a = normalizeURL(a);
    b = normalizeURL(b);

    return a === b;
  } catch (error) {
    return false;
  }
}

/**
 * Normalizes a string into a relay URL
 * Does not remove the trailing slash
 */
export function normalizeURL<T extends string | URL>(url: T): T {
  let p = new URL(url);
  // remove any double slashes
  p.pathname = p.pathname.replace(/\/+/g, "/");
  // drop the port if its not needed
  if (
    (p.port === "80" && (p.protocol === "ws:" || p.protocol === "http:")) ||
    (p.port === "443" && (p.protocol === "wss:" || p.protocol === "https:"))
  )
    p.port = "";

  // return a string if a string was passed in
  // @ts-expect-error
  return typeof url === "string" ? p.toString() : p;
}
