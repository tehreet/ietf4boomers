"use client";
import { useState, useCallback, useRef } from "react";

export function useThreadMessages(listId) {
  const [threadMessages, setThreadMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bodyCache = useRef(new Map());
  const requestIdRef = useRef(0);

  const loadThread = useCallback(async (thread) => {
    // Increment request ID to guard against stale completions
    const thisRequest = ++requestIdRef.current;

    setLoading(true);
    const rootHash = thread.rootHash || thread.messages?.[0]?.hash;
    if (!rootHash) { setLoading(false); return; }

    try {
      const rootRes = await fetch(`/api/messages/${listId}/${rootHash}`);
      const rootData = await rootRes.json();
      bodyCache.current.set(rootHash, rootData);

      // Stale check: a newer loadThread was called
      if (thisRequest !== requestIdRef.current) return;

      const msgList = rootData.threadSnippet?.length > 1
        ? rootData.threadSnippet
        : thread.messages || [];

      const enriched = msgList.map((m) => {
        const cached = bodyCache.current.get(m.hash);
        return {
          ...m,
          id: m.hash,
          body: cached?.body || null,
          from: cached?.from || m.from,
          date: cached?.date || m.date || "",
        };
      });

      setThreadMessages(enriched);

      // Eagerly fetch first 5 non-root message bodies
      const toFetch = enriched.filter((m) => !m.body && m.hash !== rootHash).slice(0, 5);
      await Promise.allSettled(
        toFetch.map((m) =>
          fetch(`/api/messages/${listId}/${m.hash}`)
            .then((r) => r.json())
            .then((d) => { bodyCache.current.set(m.hash, d); })
        )
      );

      // Stale check again before updating state
      if (thisRequest !== requestIdRef.current) return;

      // Single update with all fetched bodies
      setThreadMessages((prev) =>
        prev.map((m) => {
          const cached = bodyCache.current.get(m.hash);
          if (!cached) return m;
          return { ...m, body: cached.body, from: cached.from || m.from, date: cached.date || m.date };
        })
      );
    } catch (err) {
      if (thisRequest !== requestIdRef.current) return;
      console.error("Failed to load thread:", err);
    } finally {
      if (thisRequest === requestIdRef.current) setLoading(false);
    }
  }, [listId]);

  const loadMessageBody = useCallback(async (hash) => {
    if (bodyCache.current.has(hash)) {
      setThreadMessages((prev) =>
        prev.map((m) => {
          if (m.hash !== hash) return m;
          const cached = bodyCache.current.get(hash);
          return { ...m, body: cached.body, from: cached.from || m.from, date: cached.date || m.date };
        })
      );
      return;
    }
    try {
      const res = await fetch(`/api/messages/${listId}/${hash}`);
      const data = await res.json();
      bodyCache.current.set(hash, data);
      setThreadMessages((prev) =>
        prev.map((m) =>
          m.hash === hash ? { ...m, body: data.body, from: data.from || m.from, date: data.date || m.date } : m
        )
      );
    } catch (err) {
      console.error("Failed to load message body:", err);
    }
  }, [listId]);

  const clearMessages = useCallback(() => {
    setThreadMessages([]);
  }, []);

  return { threadMessages, loading, loadThread, loadMessageBody, clearMessages };
}
