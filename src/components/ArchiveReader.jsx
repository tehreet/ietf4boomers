"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLists } from "@/hooks/useLists";
import { useThreads } from "@/hooks/useThreads";
import { useThreadMessages } from "@/hooks/useThreadMessages";
import { useSearch } from "@/hooks/useSearch";
import { ListSkeleton, ThreadSkeleton, MessageSkeleton } from "./LoadingStates";

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(d) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date)) return d || "";
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date)) return d || "";
  return date.toLocaleDateString("en-US", {
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
  if (!name) return "?";
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
  if (!name) return COLORS[0];
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
  const searchParams = useSearchParams();
  const router = useRouter();

  // Data hooks
  const { lists, areas, loading: listsLoading } = useLists();
  const [selectedList, setSelectedListRaw] = useState(searchParams.get("list") || "tls");
  const { threads, loading: threadsLoading } = useThreads(selectedList);
  const { threadMessages, loading: messagesLoading, loadThread, loadMessageBody, clearMessages } = useThreadMessages(selectedList);
  const { results: searchResults, searching, query: searchQuery, search: doSearch, clearSearch } = useSearch(selectedList);

  const [selectedThreadId, setSelectedThreadId] = useState(searchParams.get("thread") || null);
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("All");
  const [threadFilter, setThreadFilter] = useState("recent");
  const [showKbd, setShowKbd] = useState(false);
  const [collapsedMsgs, setCollapsedMsgs] = useState(new Set());
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [mobileView, setMobileView] = useState("threads");

  // Derive selectedThread from threads
  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  // Load thread messages when selection changes
  useEffect(() => {
    if (selectedThread) {
      loadThread(selectedThread);
    } else {
      clearMessages();
    }
  }, [selectedThread, loadThread, clearMessages]);

  // Update URL when list/thread changes
  const setSelectedList = useCallback((listId) => {
    setSelectedListRaw(listId);
    setSelectedThreadId(null);
    clearSearch();
    router.replace(`/?list=${listId}`, { scroll: false });
  }, [router, clearSearch]);

  const selectThread = useCallback((threadId) => {
    setSelectedThreadId(threadId);
    setCollapsedMsgs(new Set());
    setMobileView("messages");
    router.replace(`/?list=${selectedList}&thread=${threadId}`, { scroll: false });
  }, [router, selectedList]);

  const filteredLists = useMemo(() => {
    let result = lists;
    if (areaFilter !== "All") result = result.filter((l) => l.area === areaFilter);
    if (listSearchQuery) {
      const q = listSearchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.desc.toLowerCase().includes(q)
      );
    }
    return result;
  }, [lists, areaFilter, listSearchQuery]);

  const sortedThreads = useMemo(() => {
    let t = [...threads];
    if (threadFilter === "hot") t = t.filter((th) => th.hot || th.replyCount > 10);
    if (threadFilter === "recent") t.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
    return t;
  }, [threads, threadFilter]);

  // Items to show in thread panel: search results or sorted threads
  const displayThreads = searchQuery ? searchResults.map((r) => ({
    id: r.threadId || r.hash,
    subject: r.subject.replace(/^\[[\w-]+\]\s*/, ""),
    from: { name: r.from },
    date: r.date,
    lastActivity: r.date,
    replyCount: 0,
    hot: false,
    list: r.list,
    rootHash: r.hash,
    messages: [{ hash: r.hash, subject: r.subject, from: { name: r.from }, date: r.date, depth: r.depth || 0 }],
  })) : sortedThreads;

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
        else if (selectedThreadId) {
          setSelectedThreadId(null);
          setMobileView("threads");
          router.replace(`/?list=${selectedList}`, { scroll: false });
        }
      }
      if (e.key === "j" || e.key === "k") {
        const el = document.activeElement;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
        e.preventDefault();
        const idx = displayThreads.findIndex((t) => t.id === selectedThreadId);
        const next = e.key === "j" ? idx + 1 : idx - 1;
        if (next >= 0 && next < displayThreads.length) {
          selectThread(displayThreads[next].id);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showKbd, selectedThreadId, displayThreads, selectedList, router, selectThread]);

  const toggleMsg = (id) => {
    setCollapsedMsgs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentList = lists.find((l) => l.id === selectedList);

  // Messages to render — from threadMessages hook or fallback to selectedThread.messages
  const displayMessages = threadMessages.length > 0 ? threadMessages : (selectedThread?.messages || []);

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
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="area-filters no-select">
          {["All", ...areas].map((a) => (
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
          {listsLoading ? (
            <ListSkeleton />
          ) : (
            filteredLists.map((list) => (
              <div
                key={list.id}
                className={`list-item ${selectedList === list.id ? "active" : ""}`}
                onClick={() => {
                  setSelectedList(list.id);
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
                  {list.msgs > 0 ? `${(list.msgs / 1000).toFixed(1)}k` : ""}
                </div>
              </div>
            ))
          )}
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
            <span className="thread-count">
              {threadsLoading ? "loading..." : `${displayThreads.length} threads`}
            </span>
          </div>
          <div className="search-box" style={{ maxWidth: 180, minWidth: 120, marginLeft: "auto" }}>
            <SearchIcon />
            <input
              type="text"
              placeholder={`Search ${selectedList}...`}
              value={searchQuery}
              onChange={(e) => doSearch(e.target.value)}
            />
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
          {threadsLoading || searching ? (
            <ThreadSkeleton />
          ) : displayThreads.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
              {searchQuery ? "No results found" : "No threads found"}
            </div>
          ) : (
            displayThreads.map((thread) => (
              <div
                key={thread.id}
                className={`thread-item ${selectedThreadId === thread.id ? "active" : ""} ${thread.hot ? "hot" : ""}`}
                onClick={() => selectThread(thread.id)}
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
            ))
          )}
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
              <button onClick={() => { setSelectedThreadId(null); setMobileView("threads"); router.replace(`/?list=${selectedList}`, { scroll: false }); }}>
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
                <span>{displayMessages.length} messages in thread</span>
                <span>·</span>
                <span>
                  {formatDate(selectedThread.date)} —{" "}
                  {formatDate(selectedThread.lastActivity)}
                </span>
                <span
                  className="message-header-link"
                  onClick={() =>
                    window.open(
                      `https://mailarchive.ietf.org/arch/browse/${selectedList}/?gbt=1`,
                      "_blank"
                    )
                  }
                >
                  View on IETF <ExternalIcon />
                </span>
              </div>
            </div>

            <div className="message-thread">
              {messagesLoading && displayMessages.length === 0 ? (
                <MessageSkeleton />
              ) : (
                displayMessages.map((msg, i) => {
                  const msgId = msg.hash || msg.id;
                  const isCollapsed = collapsedMsgs.has(msgId);
                  const depth = msg.depth || 0;
                  const depthClass =
                    depth > 0
                      ? `msg-depth msg-depth-${Math.min(depth, 4)}`
                      : "";

                  return (
                    <div
                      key={msgId}
                      className={`msg fade-in ${depthClass}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className="msg-header">
                        <div
                          className="msg-avatar"
                          style={{ background: avatarColor(msg.from?.name || "") }}
                        >
                          {initials(msg.from?.name || "")}
                        </div>
                        <div className="msg-author-info">
                          <div
                            className="msg-toggle"
                            onClick={() => {
                              toggleMsg(msgId);
                              // Lazy load body if expanding and no body yet
                              if (isCollapsed && !msg.body && msg.hash) {
                                loadMessageBody(msg.hash);
                              }
                            }}
                          >
                            <ChevronIcon open={!isCollapsed} />
                            <span className="msg-author">
                              {msg.from?.name || "Unknown"}
                            </span>
                          </div>
                          <div className="msg-email">
                            {msg.from?.email ? `<${msg.from.email}>` : ""}
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
                        <div className="msg-body">
                          {msg.body ? (
                            msg.body
                          ) : (
                            <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
                              Loading message...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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
