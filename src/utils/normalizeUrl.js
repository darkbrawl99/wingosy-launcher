/**
 * Normalizes a RomM server URL:
 * - Adds http:// or https:// if missing
 * - Uses http:// for local/private addresses (192.168.x.x, 10.x.x.x, localhost, etc.)
 * - Uses https:// for everything else
 * - Strips trailing slashes
 */
export default function normalizeUrl(input) {
  if (!input) return input;

  let url = input.trim();
  if (!url) return url;

  url = url.replace(/\/+$/, "");

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const host = url.split(":")[0].split("/")[0];

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.endsWith(".local") ||
    host.endsWith(".lan");

  const scheme = isLocal ? "http://" : "https://";
  return scheme + url;
}
