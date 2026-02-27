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
  if (!d) return "";
  // Date-only strings ("2026-02-26") are parsed as UTC midnight by Date(),
  // causing off-by-one in western timezones. Treat as local noon instead.
  let date;
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-");
    date = new Date(+y, +m - 1, +day, 12, 0, 0);
  } else {
    date = typeof d === "string" ? new Date(d) : d;
  }
  if (isNaN(date)) return d || "";
  const now = new Date();
  const diff = now - date;
  if (diff < 0) return "just now";
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const FlameIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 23c-3.6 0-7-2.4-7-7 0-3.1 2.1-5.7 3.4-7.1.5-.5 1.4-.2 1.4.5 0 1.2.5 2.2 1.4 2.8.3-.8.7-1.8 1.3-2.7C13.8 7.5 15 5 15 2c0-.7.8-1 1.3-.5C18.7 4 21 8 21 11.5c0 6.4-4.4 11.5-9 11.5z" /></svg>
);
const ChevronIcon = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }} aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
);
const MailIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
);
const ExternalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
);
const KbdIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="M6 8h.001" /><path d="M10 8h.001" /><path d="M14 8h.001" /><path d="M18 8h.001" /><path d="M8 12h.001" /><path d="M12 12h.001" /><path d="M16 12h.001" /><path d="M7 16h10" /></svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
);
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
);
const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
);
const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
);

// ── Main Component ────────────────────────────────────────────────────────
export default function ArchiveReader() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Data hooks
  const { lists, areas, loading: listsLoading, error: listsError } = useLists();
  const [selectedList, setSelectedListRaw] = useState(searchParams.get("list") || "tls");
  const { threads, loading: threadsLoading, error: threadsError, refetch: refetchThreads } = useThreads(selectedList);
  const { threadMessages, loading: messagesLoading, loadThread, loadMessageBody, loadBodies, clearMessages } = useThreadMessages(selectedList);
  const { results: searchResults, searching, query: searchQuery, search: doSearch, clearSearch } = useSearch(selectedList);

  const [selectedThreadId, setSelectedThreadId] = useState(searchParams.get("thread") || null);
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("All");
  const [threadFilter, setThreadFilter] = useState("recent");
  const [showKbd, setShowKbd] = useState(false);
  const [collapsedMsgs, setCollapsedMsgs] = useState(new Set());
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [mobileView, setMobileView] = useState("threads");

  const [theme, setTheme] = useState("light");
  const kbdCloseRef = useRef(null);
  const kbdTriggerRef = useRef(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "light");
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }, [theme]);

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
    setShowAllMessages(false);
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

  // C3 — Modal focus trap
  useEffect(() => {
    if (!showKbd) return;
    const closeBtn = kbdCloseRef.current;
    if (closeBtn) closeBtn.focus();

    const trap = (e) => {
      if (e.key !== "Tab") return;
      const modal = closeBtn?.closest(".kbd-modal");
      if (!modal) return;
      const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      window.removeEventListener("keydown", trap);
      if (kbdTriggerRef.current) kbdTriggerRef.current.focus();
    };
  }, [showKbd]);

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
  const allMessages = threadMessages.length > 0 ? threadMessages : (selectedThread?.messages || []);

  const THREAD_HEAD = 3;
  const THREAD_TAIL = 5;
  const isLargeThread = allMessages.length > 15;
  const hiddenCount = isLargeThread && !showAllMessages
    ? allMessages.length - THREAD_HEAD - THREAD_TAIL
    : 0;

  const displayMessages = useMemo(() => {
    if (!isLargeThread || showAllMessages) return allMessages;
    return [
      ...allMessages.slice(0, THREAD_HEAD),
      { _divider: true, count: allMessages.length - THREAD_HEAD - THREAD_TAIL },
      ...allMessages.slice(-THREAD_TAIL),
    ];
  }, [allMessages, isLargeThread, showAllMessages]);

  const handleShowAll = useCallback(() => {
    setShowAllMessages(true);
    const middleHashes = allMessages
      .slice(THREAD_HEAD, -THREAD_TAIL)
      .map((m) => m.hash)
      .filter(Boolean);
    loadBodies(middleHashes);
  }, [allMessages, loadBodies]);

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileSidebar ? "mobile-open" : ""}`} aria-label="Mailing lists">
        <div className="sidebar-header">
          <div>
            <div className="sidebar-logo">IETF</div>
            <div className="sidebar-title">Mail Archive</div>
          </div>
          {mobileSidebar && (
            <button
              onClick={() => setMobileSidebar(false)}
              aria-label="Close sidebar"
              className="icon-btn"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        <div className="sidebar-search">
          <div className="search-box">
            <SearchIcon />
            <label className="sr-only" htmlFor="list-search">Filter mailing lists</label>
            <input
              id="list-search"
              type="text"
              placeholder="Filter lists..."
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="area-filters no-select">
          {["All", ...areas].map((a) => (
            <button
              key={a}
              className={`area-chip ${areaFilter === a ? "active" : ""}`}
              onClick={() => setAreaFilter(a)}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="sidebar-lists">
          {listsLoading ? (
            <ListSkeleton />
          ) : listsError ? (
            <div className="status-message" role="status">
              Failed to load lists.
            </div>
          ) : (
            filteredLists.map((list) => (
              <button
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
              </button>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button
            ref={kbdTriggerRef}
            className="sidebar-footer-trigger"
            onClick={() => setShowKbd(true)}
          >
            <KbdIcon />
            <span>Shortcuts</span>
            <kbd>?</kbd>
          </button>
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="icon-btn"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </aside>

      {/* ── Thread Panel ── */}
      <section className={`thread-panel ${mobileView !== "threads" ? "hidden-mobile" : ""}`} aria-label="Threads">
        <div className="mobile-bar">
          <button onClick={() => setMobileSidebar(true)}>
            <MenuIcon />
          </button>
          <span className="mobile-bar-title">{currentList?.name || "—"}</span>
        </div>

        <div className="thread-header">
          <div className="thread-header-left">
            <h2>{currentList?.name || "—"}</h2>
            <span className="thread-count" aria-live="polite">
              {threadsLoading ? "Loading\u2026" : `${displayThreads.length} threads`}
            </span>
          </div>
          <div className="search-box thread-search">
            <SearchIcon />
            <label className="sr-only" htmlFor="thread-search">Search threads</label>
            <input
              id="thread-search"
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
          ) : threadsError && !searchQuery ? (
            <div className="status-message" role="status">
              Failed to load threads.{" "}
              <button onClick={() => refetchThreads()} className="retry-btn">
                Retry
              </button>
            </div>
          ) : displayThreads.length === 0 ? (
            <div className="status-message" role="status">
              {searchQuery ? "No results found" : "No threads found"}
            </div>
          ) : (
            displayThreads.map((thread) => (
              <button
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
              </button>
            ))
          )}
        </div>
      </section>

      {/* ── Message Panel ── */}
      <main className={`message-panel ${mobileView !== "messages" ? "hidden-mobile" : ""}`}>
        {!selectedThread ? (
          <div className="message-panel-empty">
            <MailIcon />
            <p>
              Select a thread to read
              <br />
              <span className="empty-hint">
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
              <span className="mobile-bar-title">
                {selectedThread.subject}
              </span>
            </div>

            <div className="message-header fade-in">
              <h1>{selectedThread.subject}</h1>
              <div className="message-header-meta">
                <span className="message-header-list">
                  {selectedList.toUpperCase()}
                </span>
                <span>{allMessages.length} messages in thread</span>
                <span>·</span>
                <span>
                  {formatDate(selectedThread.date)} —{" "}
                  {formatDate(selectedThread.lastActivity)}
                </span>
                <a
                  className="message-header-link"
                  href={`https://mailarchive.ietf.org/arch/browse/${selectedList}/?gbt=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on IETF <ExternalIcon />
                </a>
              </div>
            </div>

            <div className="message-thread">
              {messagesLoading && displayMessages.length === 0 ? (
                <MessageSkeleton />
              ) : (
                displayMessages.map((msg, i) => {
                  if (msg._divider) {
                    return (
                      <button
                        key="divider"
                        className="thread-divider"
                        onClick={handleShowAll}
                      >
                        Show {msg.count} earlier messages
                      </button>
                    );
                  }

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
                      className={`msg ${i < 8 ? "fade-in" : ""} ${depthClass}`}
                      style={i < 8 ? { animationDelay: `${i * 30}ms` } : undefined}
                    >
                      <div className="msg-header">
                        <div
                          className="msg-avatar"
                          style={{ background: avatarColor(msg.from?.name || "") }}
                        >
                          {initials(msg.from?.name || "")}
                        </div>
                        <div className="msg-author-info">
                          <button
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
                          </button>
                          <div className="msg-email">
                            {msg.from?.email ? `<${msg.from.email}>` : ""}
                          </div>
                        </div>
                        <div className="msg-date">
                          <span className="msg-date-full">{formatFullDate(msg.date)}</span>
                          <span className="msg-date-short">{formatDate(msg.date)}</span>
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
                            <span className="msg-loading">
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
      </main>

      {/* ── Keyboard Shortcuts Modal ── */}
      {showKbd && (
        <div className="kbd-overlay" onClick={() => setShowKbd(false)}>
          <div
            className="kbd-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kbd-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kbd-header">
              <h3 id="kbd-title">Keyboard Shortcuts</h3>
              <button
                ref={kbdCloseRef}
                aria-label="Close"
                onClick={() => setShowKbd(false)}
                className="icon-btn"
              >
                <CloseIcon />
              </button>
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
