"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";

// ── Realistic IETF Mailing List Data ──────────────────────────────────────
const LISTS = [
  { id: "tls", name: "TLS", desc: "Transport Layer Security", msgs: 14823, active: true, area: "Security" },
  { id: "ietf", name: "IETF", desc: "General Discussion", msgs: 89241, active: true, area: "General" },
  { id: "dnsop", name: "DNSOP", desc: "DNS Operations", msgs: 22156, active: true, area: "Operations" },
  { id: "httpapi", name: "HTTPAPI", desc: "Building Blocks for HTTP APIs", msgs: 3841, active: true, area: "Applications" },
  { id: "quic", name: "QUIC", desc: "QUIC Protocol", msgs: 18432, active: true, area: "Transport" },
  { id: "oauth", name: "OAUTH", desc: "Web Authorization Protocol", msgs: 12567, active: true, area: "Security" },
  { id: "rats", name: "RATS", desc: "Remote ATtestation procedureS", msgs: 4219, active: true, area: "Security" },
  { id: "pquip", name: "PQUIP", desc: "Post-Quantum Use in Protocols", msgs: 2841, active: true, area: "Security" },
  { id: "secdispatch", name: "SECDISPATCH", desc: "Security Dispatch", msgs: 1923, active: true, area: "Security" },
  { id: "openpgp", name: "OPENPGP", desc: "Open PGP", msgs: 8742, active: true, area: "Security" },
  { id: "add", name: "ADD", desc: "Adaptive DNS Discovery", msgs: 3156, active: true, area: "Internet" },
  { id: "dprive", name: "DPRIVE", desc: "DNS PRIVate Exchange", msgs: 5623, active: true, area: "Internet" },
  { id: "masque", name: "MASQUE", desc: "Multiplexed App Substrate over QUIC Encryption", msgs: 2987, active: true, area: "Transport" },
  { id: "mls", name: "MLS", desc: "Messaging Layer Security", msgs: 6234, active: true, area: "Security" },
  { id: "ohai", name: "OHAI", desc: "Oblivious HTTP Application Intermediation", msgs: 1456, active: true, area: "Applications" },
];

const AREAS = [...new Set(LISTS.map((l) => l.area))].sort();

const people = [
  { name: "Eric Rescorla", email: "ekr@rtfm.com" },
  { name: "Martin Thomson", email: "mt@lowentropy.net" },
  { name: "David Schinazi", email: "dschinazi.ietf@gmail.com" },
  { name: "Paul Wouters", email: "paul@nohats.ca" },
  { name: "Salz, Rich", email: "rsalz@akamai.com" },
  { name: "Stephen Farrell", email: "stephen.farrell@cs.tcd.ie" },
  { name: "Ben Schwartz", email: "bemasc@google.com" },
  { name: "Christopher Wood", email: "caw@heapingbits.net" },
  { name: "Viktor Dukhovni", email: "ietf-dane@dukhovni.org" },
  { name: "John Mattsson", email: "john.mattsson@ericsson.com" },
  { name: "DA PIEVE Fabiana", email: "fabiana@isoc.org" },
  { name: "Watson Ladd", email: "watsonbladd@gmail.com" },
  { name: "Karthik Bhargavan", email: "karthik.bhargavan@inria.fr" },
  { name: "Daniel Kahn Gillmor", email: "dkg@fifthhorseman.net" },
  { name: "Roman Danyliw", email: "rdd@cert.org" },
  { name: "Murray Kucherawy", email: "superuser@gmail.com" },
];

function randomPerson() {
  return people[Math.floor(Math.random() * people.length)];
}

function randomDate(daysBack = 30) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(
    Math.floor(Math.random() * 24),
    Math.floor(Math.random() * 60)
  );
  return d;
}

function generateThreads(listId) {
  const threadTemplates = {
    tls: [
      { subj: "WG Last Call: draft-ietf-tls-mlkem-05 (Ends 2026-02-27)", replies: 14, hot: true },
      { subj: "Complaint regarding recent TLS chair actions", replies: 31, hot: true },
      { subj: "Re: Post-quantum key exchange timeline", replies: 8 },
      { subj: "TLS 1.3 Encrypted Client Hello deployment observations", replies: 19 },
      { subj: "draft-ietf-tls-esni-22: editorial nits", replies: 3 },
      { subj: "Certificate Transparency in TLS — implementation survey", replies: 11 },
      { subj: "Deprecating RSA key exchange in TLS — consensus call", replies: 24, hot: true },
      { subj: "IETF 125 TLS session scheduling", replies: 5 },
      { subj: "Re: Hybrid key agreement negotiation", replies: 7 },
      { subj: "Delegated credentials update — adoption call", replies: 6 },
    ],
    ietf: [
      { subj: "AI slop 'contributions' to IETF working groups", replies: 47, hot: true },
      { subj: "AI disclosure [was: AI slop 'contributions']", replies: 38, hot: true },
      { subj: "IETF 125 Final Agenda", replies: 2 },
      { subj: "List moderator action", replies: 0 },
      { subj: "Messages from the ietf list for the week ending Feb 22", replies: 0 },
      { subj: "NomCom 2026 — Call for Volunteers", replies: 12 },
      { subj: "Side meeting: Open Source in IETF processes", replies: 9 },
      { subj: "Re: Inclusivity in IETF participation", replies: 15 },
      { subj: "Proposed changes to meeting fee structure", replies: 22, hot: true },
      { subj: "Remote participation experience at IETF 124", replies: 7 },
    ],
    dnsop: [
      { subj: "DNS error reporting — operational experience", replies: 11 },
      { subj: "draft-ietf-dnsop-dnssec-bootstrapping-08 WGLC", replies: 6 },
      { subj: "ZONEMD deployment tracking", replies: 4 },
      { subj: "Re: Catalog zones update", replies: 8 },
      { subj: "Resolver behavior with large responses", replies: 13 },
      { subj: "Multi-signer DNSSEC — operator feedback needed", replies: 9 },
      { subj: "DNS over QUIC implementation status", replies: 7 },
      { subj: "EDNS client subnet privacy concerns", replies: 16, hot: true },
    ],
    httpapi: [
      { subj: "Actual production API with a Deprecation: or Sunset: header?", replies: 6 },
      { subj: "Link Hint 02 feedback", replies: 4 },
      { subj: "Weekly github digest (HTTPAPI WG Activity Summary)", replies: 0 },
      { subj: "api-catalog: well-known URI — Protocol Action", replies: 3 },
      { subj: "Re: Rate limiting headers standardization", replies: 11 },
      { subj: "IETF 125 httpapi session request", replies: 1 },
    ],
    quic: [
      { subj: "Multipath QUIC — interop results", replies: 15, hot: true },
      { subj: "QUIC v2 deployment numbers", replies: 8 },
      { subj: "Connection migration edge cases", replies: 12 },
      { subj: "Re: Datagram extension usage patterns", replies: 6 },
      { subj: "NAT rebinding and QUIC — real-world measurements", replies: 9 },
      { subj: "0-RTT replay protection mechanisms", replies: 11 },
    ],
  };

  const templates = threadTemplates[listId] || [
    { subj: `[${listId.toUpperCase()}] Weekly digest`, replies: 0 },
    { subj: `[${listId.toUpperCase()}] New Internet-Draft submitted`, replies: 3 },
    { subj: `Re: ${listId.toUpperCase()} session at IETF 125`, replies: 5 },
    { subj: `[${listId.toUpperCase()}] Call for adoption`, replies: 8 },
    { subj: `[${listId.toUpperCase()}] Charter revision discussion`, replies: 4 },
  ];

  return templates
    .map((t, i) => {
      const starter = randomPerson();
      const date = randomDate(t.replies > 20 ? 14 : 30);
      const lastReply = new Date(date);
      lastReply.setHours(lastReply.getHours() + Math.floor(Math.random() * 72));

      const replyMessages = Array.from({ length: t.replies }, (_, ri) => {
        const p = randomPerson();
        const rd = new Date(date);
        rd.setHours(rd.getHours() + (ri + 1) * (1 + Math.random() * 12));
        return {
          id: `${listId}-${i}-r${ri}`,
          from: p,
          date: rd,
          subject: "Re: " + t.subj,
          body: generateReplyBody(t.subj, p.name, ri),
          depth: Math.min(Math.floor(ri / 2), 4),
        };
      });

      return {
        id: `${listId}-${i}`,
        subject: t.subj,
        from: starter,
        date,
        lastActivity:
          t.replies > 0
            ? replyMessages[replyMessages.length - 1].date
            : date,
        replyCount: t.replies,
        hot: t.hot || false,
        list: listId,
        messages: [
          {
            id: `${listId}-${i}-root`,
            from: starter,
            date,
            subject: t.subj,
            body: generateOriginalBody(t.subj, starter.name, listId),
            depth: 0,
          },
          ...replyMessages,
        ],
      };
    })
    .sort((a, b) => b.lastActivity - a.lastActivity);
}

function generateOriginalBody(subject, author, list) {
  const bodies = [
    `Hi all,\n\nI'd like to bring up the topic of "${subject}" for discussion on the ${list} list.\n\nAs many of you are aware, there have been ongoing conversations about this in various side channels, and I think it's time we had a proper discussion here where the broader community can weigh in.\n\nThe key points I'd like to address:\n\n1. The current approach has several known limitations that have been documented in the tracker.\n2. We have implementation experience from at least three independent implementations that suggests the proposed changes are viable.\n3. The security considerations need careful review, particularly around the interaction with existing deployed infrastructure.\n\nI've attached a summary of the relevant analysis. Looking forward to hearing the group's thoughts.\n\nBest regards,\n${author}`,
    `Dear colleagues,\n\nFollowing up on our discussion at IETF 124, I wanted to formally raise this on-list.\n\nThe draft has been updated to address the comments received during the last review cycle. The major changes include:\n\n- Clarified the negotiation mechanism in Section 4.2\n- Added new security considerations for the downgrade scenario\n- Incorporated the error handling feedback from implementers\n\nI believe this is ready for Working Group Last Call. Chairs, could we schedule this?\n\nThanks,\n${author}`,
    `All,\n\nI've been thinking about this issue and wanted to share some observations from our deployment.\n\nWe've been running a prototype implementation for the past 6 months and have collected data from approximately 50M connections. The results are encouraging but there are some edge cases that the current specification doesn't adequately address.\n\nSpecifically:\n- Middlebox interference is more prevalent than anticipated (~2.3% of connections)\n- The fallback mechanism works as designed but adds measurable latency\n- Interoperability with legacy systems requires careful handling of the version negotiation\n\nI'll present detailed numbers at the next IETF meeting, but wanted to get initial feedback here first.\n\n${author}`,
  ];
  return bodies[Math.floor(Math.random() * bodies.length)];
}

function generateReplyBody(subject, author, index) {
  const replies = [
    `I agree with the general direction here, but I have concerns about the backwards compatibility story. Have we considered the impact on existing deployments?\n\nSpecifically, Section 3.1 seems to assume that all implementations will upgrade simultaneously, which doesn't match operational reality.\n\n— ${author}`,
    `+1 to this approach.\n\nWe've done some preliminary testing and the results look promising. Happy to share our data if it would be useful for the group.\n\n${author}`,
    `I'm not sure I follow the reasoning in the second point. Could you elaborate on why the existing mechanism is insufficient?\n\nFrom my reading of the current RFC, the behavior described there should already handle this case. What am I missing?\n\nThanks,\n${author}`,
    `Strong support for moving forward with this. The WG has discussed this extensively and I believe we have rough consensus.\n\nOne minor nit: the IANA considerations section should reference the existing registry rather than creating a new one.\n\n${author}`,
    `I want to push back on this a bit.\n\nWhile I understand the motivation, the proposed change introduces complexity that may not be justified by the use cases presented. I'd like to see more concrete evidence of the problem before we commit to a solution.\n\nHas anyone done a survey of actual deployment patterns?\n\n${author}`,
    `Thanks for raising this. A few thoughts:\n\nThe security analysis in Section 7 needs strengthening. As written, it doesn't adequately address the case where an attacker controls the network path. We should at least acknowledge this limitation and provide guidance for implementers.\n\nAlso, the interaction with ${subject.includes("TLS") ? "certificate transparency" : "DNSSEC"} isn't fully specified. This could lead to interoperability issues down the line.\n\n${author}`,
    `Just to add some data points from our implementation:\n\n- Performance overhead: ~0.3ms per operation (measured on commodity hardware)\n- Memory footprint: negligible increase over baseline\n- Code complexity: approximately 200 additional lines in our C implementation\n\nIMO the overhead is acceptable given the security benefits.\n\n${author}`,
  ];
  return replies[index % replies.length];
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(d) {
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(d) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function initials(name) {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const COLORS = [
  "#E8594F", "#E8A04F", "#4FA8E8", "#4FE89C", "#A84FE8",
  "#E84FA8", "#4FE8E8", "#E8D44F", "#6B7FE8", "#E86B4F",
];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

// ── SVG Icons ─────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const FlameIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-3.6 0-7-2.4-7-7 0-3.1 2.1-5.7 3.4-7.1.5-.5 1.4-.2 1.4.5 0 1.2.5 2.2 1.4 2.8.3-.8.7-1.8 1.3-2.7C13.8 7.5 15 5 15 2c0-.7.8-1 1.3-.5C18.7 4 21 8 21 11.5c0 6.4-4.4 11.5-9 11.5z" /></svg>
);
const ChevronIcon = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}><path d="m9 18 6-6-6-6" /></svg>
);
const MailIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
);
const ExternalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
);
const KbdIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="M6 8h.001" /><path d="M10 8h.001" /><path d="M14 8h.001" /><path d="M18 8h.001" /><path d="M8 12h.001" /><path d="M12 12h.001" /><path d="M16 12h.001" /><path d="M7 16h10" /></svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
);
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
);

// ── Main Component ────────────────────────────────────────────────────────
export default function ArchiveReader() {
  const [selectedList, setSelectedList] = useState("tls");
  const [selectedThread, setSelectedThread] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("All");
  const [threadFilter, setThreadFilter] = useState("recent");
  const [showKbd, setShowKbd] = useState(false);
  const [collapsedMsgs, setCollapsedMsgs] = useState(new Set());
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [mobileView, setMobileView] = useState("threads"); // "threads" | "messages"

  const threadCache = useRef({});
  const getThreads = useCallback((listId) => {
    if (!threadCache.current[listId]) {
      threadCache.current[listId] = generateThreads(listId);
    }
    return threadCache.current[listId];
  }, []);

  const threads = useMemo(() => getThreads(selectedList), [selectedList, getThreads]);

  const filteredLists = useMemo(() => {
    let lists = LISTS;
    if (areaFilter !== "All") lists = lists.filter((l) => l.area === areaFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      lists = lists.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.desc.toLowerCase().includes(q)
      );
    }
    return lists;
  }, [areaFilter, searchQuery]);

  const sortedThreads = useMemo(() => {
    let t = [...threads];
    if (threadFilter === "hot") t = t.filter((th) => th.hot || th.replyCount > 10);
    if (threadFilter === "recent") t.sort((a, b) => b.lastActivity - a.lastActivity);
    return t;
  }, [threads, threadFilter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const el = document.activeElement;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
        e.preventDefault();
        setShowKbd((v) => !v);
      }
      if (e.key === "Escape") {
        if (showKbd) setShowKbd(false);
        else if (selectedThread) {
          setSelectedThread(null);
          setMobileView("threads");
        }
      }
      if (e.key === "j" || e.key === "k") {
        const el = document.activeElement;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
        e.preventDefault();
        const idx = sortedThreads.findIndex((t) => t.id === selectedThread?.id);
        const next = e.key === "j" ? idx + 1 : idx - 1;
        if (next >= 0 && next < sortedThreads.length) {
          setSelectedThread(sortedThreads[next]);
          setCollapsedMsgs(new Set());
          setMobileView("messages");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showKbd, selectedThread, sortedThreads]);

  const toggleMsg = (id) => {
    setCollapsedMsgs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentList = LISTS.find((l) => l.id === selectedList);

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <div className={`sidebar ${mobileSidebar ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="sidebar-logo">IETF</div>
              <div className="sidebar-title">Mail Archive</div>
            </div>
            {mobileSidebar && (
              <button
                onClick={() => setMobileSidebar(false)}
                style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}
              >
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        <div className="sidebar-search">
          <div className="search-box">
            <SearchIcon />
            <input
              type="text"
              placeholder="Filter lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="area-filters no-select">
          {["All", ...AREAS].map((a) => (
            <div
              key={a}
              className={`area-chip ${areaFilter === a ? "active" : ""}`}
              onClick={() => setAreaFilter(a)}
            >
              {a}
            </div>
          ))}
        </div>

        <div className="sidebar-lists">
          {filteredLists.map((list) => (
            <div
              key={list.id}
              className={`list-item ${selectedList === list.id ? "active" : ""}`}
              onClick={() => {
                setSelectedList(list.id);
                setSelectedThread(null);
                setCollapsedMsgs(new Set());
                setMobileSidebar(false);
                setMobileView("threads");
              }}
            >
              <div
                className="list-item-icon"
                style={{
                  background: avatarColor(list.name) + "18",
                  color: avatarColor(list.name),
                }}
              >
                {list.name.slice(0, 3)}
              </div>
              <div className="list-item-info">
                <div className="list-item-name">{list.name}</div>
                <div className="list-item-desc">{list.desc}</div>
              </div>
              <div className="list-item-count">
                {(list.msgs / 1000).toFixed(1)}k
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border-subtle)" }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              color: "var(--text-tertiary)", fontSize: 11, cursor: "pointer",
            }}
            onClick={() => setShowKbd(true)}
          >
            <KbdIcon />
            <span>Keyboard shortcuts</span>
            <kbd style={{ marginLeft: "auto" }}>?</kbd>
          </div>
        </div>
      </div>

      {/* ── Thread Panel ── */}
      <div className={`thread-panel ${mobileView !== "threads" ? "hidden-mobile" : ""}`}>
        <div className="mobile-bar">
          <button onClick={() => setMobileSidebar(true)}>
            <MenuIcon />
          </button>
          <span className="mobile-bar-title">{currentList?.name || "—"}</span>
        </div>

        <div className="thread-header">
          <div className="thread-header-left">
            <h2>{currentList?.name || "—"}</h2>
            <span className="thread-count">{sortedThreads.length} threads</span>
          </div>
        </div>

        <div className="thread-filters no-select">
          {[
            { id: "recent", label: "Recent" },
            { id: "hot", label: "🔥 Active" },
            { id: "all", label: "All" },
          ].map((f) => (
            <button
              key={f.id}
              className={`thread-filter-btn ${threadFilter === f.id ? "active" : ""}`}
              onClick={() => setThreadFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="thread-list">
          {sortedThreads.map((thread) => (
            <div
              key={thread.id}
              className={`thread-item ${selectedThread?.id === thread.id ? "active" : ""} ${thread.hot ? "hot" : ""}`}
              onClick={() => {
                setSelectedThread(thread);
                setCollapsedMsgs(new Set());
                setMobileView("messages");
              }}
            >
              <div className="thread-item-subject">{thread.subject}</div>
              <div className="thread-item-meta">
                <span className="thread-item-author">
                  {thread.from.name.split(",")[0].split(" ")[0]}
                </span>
                {thread.hot && (
                  <span className="thread-item-hot">
                    <FlameIcon /> hot
                  </span>
                )}
                {thread.replyCount > 0 && (
                  <span className="thread-item-replies">
                    <span className={`msg-count-badge ${thread.replyCount > 15 ? "hot-badge" : ""}`}>
                      {thread.replyCount}
                    </span>
                  </span>
                )}
                <span className="thread-item-date">
                  {formatDate(thread.lastActivity)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Message Panel ── */}
      <div className={`message-panel ${mobileView !== "messages" ? "hidden-mobile" : ""}`}>
        {!selectedThread ? (
          <div className="message-panel-empty">
            <MailIcon />
            <p>
              Select a thread to read
              <br />
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                Use <kbd>j</kbd> / <kbd>k</kbd> to navigate, <kbd>?</kbd> for
                shortcuts
              </span>
            </p>
          </div>
        ) : (
          <>
            <div className="mobile-bar">
              <button onClick={() => { setSelectedThread(null); setMobileView("threads"); }}>
                <BackIcon />
              </button>
              <span className="mobile-bar-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedThread.subject}
              </span>
            </div>

            <div className="message-header fade-in">
              <h1>{selectedThread.subject}</h1>
              <div className="message-header-meta">
                <span className="message-header-list">
                  {selectedList.toUpperCase()}
                </span>
                <span>{selectedThread.messages.length} messages in thread</span>
                <span>·</span>
                <span>
                  {formatDate(selectedThread.date)} —{" "}
                  {formatDate(selectedThread.lastActivity)}
                </span>
                <span
                  className="message-header-link"
                  onClick={() =>
                    window.open(
                      `https://mailarchive.ietf.org/arch/browse/${selectedList}/`,
                      "_blank"
                    )
                  }
                >
                  View on IETF <ExternalIcon />
                </span>
              </div>
            </div>

            <div className="message-thread">
              {selectedThread.messages.map((msg, i) => {
                const isCollapsed = collapsedMsgs.has(msg.id);
                const depthClass =
                  msg.depth > 0
                    ? `msg-depth msg-depth-${msg.depth}`
                    : "";

                return (
                  <div
                    key={msg.id}
                    className={`msg fade-in ${depthClass}`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="msg-header">
                      <div
                        className="msg-avatar"
                        style={{ background: avatarColor(msg.from.name) }}
                      >
                        {initials(msg.from.name)}
                      </div>
                      <div className="msg-author-info">
                        <div
                          className="msg-toggle"
                          onClick={() => toggleMsg(msg.id)}
                        >
                          <ChevronIcon open={!isCollapsed} />
                          <span className="msg-author">
                            {msg.from.name}
                          </span>
                        </div>
                        <div className="msg-email">
                          &lt;{msg.from.email}&gt;
                        </div>
                      </div>
                      <div className="msg-date">
                        {formatFullDate(msg.date)}
                      </div>
                    </div>
                    <div
                      className={
                        isCollapsed
                          ? "msg-body-collapsed"
                          : "msg-body-expanded"
                      }
                    >
                      <div className="msg-body">{msg.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Keyboard Shortcuts Modal ── */}
      {showKbd && (
        <div className="kbd-overlay" onClick={() => setShowKbd(false)}>
          <div className="kbd-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Keyboard Shortcuts</h3>
              <div style={{ cursor: "pointer", color: "var(--text-tertiary)" }} onClick={() => setShowKbd(false)}>
                <CloseIcon />
              </div>
            </div>

            <div className="kbd-section">
              <h4>Navigation</h4>
              <div className="kbd-row"><span>Next thread</span><kbd>j</kbd></div>
              <div className="kbd-row"><span>Previous thread</span><kbd>k</kbd></div>
              <div className="kbd-row"><span>Close thread / modal</span><kbd>Esc</kbd></div>
            </div>

            <div className="kbd-section">
              <h4>Interface</h4>
              <div className="kbd-row"><span>Show shortcuts</span><kbd>?</kbd></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
