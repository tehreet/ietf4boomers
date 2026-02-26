const IETF_BASE = "https://mailarchive.ietf.org";
const USER_AGENT = "IETF4Boomers/1.0 (Next.js archive reader)";

async function ietfFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${IETF_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, ...options.headers },
    signal: AbortSignal.timeout(15000),
    ...options,
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}: ${url}`);
  return res;
}

module.exports = { IETF_BASE, ietfFetch };
