import { NextResponse } from "next/server";
import { ietfFetch } from "@/lib/scraper";
import { getCached, setCached } from "@/lib/cache";

const CURATED_LISTS = [
  { id: "tls", name: "TLS", desc: "Transport Layer Security", area: "Security", active: true },
  { id: "ietf", name: "IETF", desc: "General Discussion", area: "General", active: true },
  { id: "dnsop", name: "DNSOP", desc: "DNS Operations", area: "Operations", active: true },
  { id: "httpapi", name: "HTTPAPI", desc: "Building Blocks for HTTP APIs", area: "Applications", active: true },
  { id: "quic", name: "QUIC", desc: "QUIC Protocol", area: "Transport", active: true },
  { id: "oauth", name: "OAUTH", desc: "Web Authorization Protocol", area: "Security", active: true },
  { id: "rats", name: "RATS", desc: "Remote ATtestation procedureS", area: "Security", active: true },
  { id: "pqc", name: "PQC", desc: "Post-Quantum Cryptography", area: "Security", active: true },
  { id: "secdispatch", name: "SECDISPATCH", desc: "Security Dispatch", area: "Security", active: true },
  { id: "openpgp", name: "OPENPGP", desc: "Open PGP", area: "Security", active: true },
  { id: "add", name: "ADD", desc: "Adaptive DNS Discovery", area: "Internet", active: true },
  { id: "dns-privacy", name: "DNS-PRIVACY", desc: "DNS PRIVate Exchange", area: "Internet", active: true },
  { id: "masque", name: "MASQUE", desc: "Multiplexed App Substrate over QUIC Encryption", area: "Transport", active: true },
  { id: "mls", name: "MLS", desc: "Messaging Layer Security", area: "Security", active: true },
  { id: "ohai", name: "OHAI", desc: "Oblivious HTTP Application Intermediation", area: "Applications", active: true },
];

export const dynamic = "force-dynamic";

const CACHE_KEY = "lists";
const CACHE_TTL = 3600000; // 1 hour

export async function GET() {
  const cached = getCached(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  let msgCounts = {};

  // Fetch counts individually since the API errors if any single list is unknown
  const fetches = CURATED_LISTS.map(async (l) => {
    try {
      const res = await ietfFetch(
        `/api/v1/stats/msg_counts/?list=${l.id}&start=20000101&end=20271231`
      );
      const data = await res.json();
      if (data.msg_counts?.[l.id]) {
        msgCounts[l.id] = data.msg_counts[l.id];
      }
    } catch {
      // Skip this list
    }
  });
  await Promise.allSettled(fetches);

  const lists = CURATED_LISTS.map((l) => ({
    ...l,
    msgs: msgCounts[l.id] || 0,
  }));

  const areas = [...new Set(lists.map((l) => l.area))].sort();
  const result = { lists, areas };

  setCached(CACHE_KEY, result, CACHE_TTL);
  return NextResponse.json(result);
}
