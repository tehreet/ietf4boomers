"use client";
import { useState, useCallback, useRef } from "react";

export function useThreadMessages(listId) {
  const [threadMessages, setThreadMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bodyCache = useRef(new Map());

  const loadThread = useCallback(async (thread) => {
    setLoading(true);
    const rootHash = thread.rootHash || thread.messages?.[0]?.hash;
    if (!rootHash) { setLoading(false); return; }

    try {
      // Fetch root message to get thread snippet + body
      const rootRes = await fetch(`/api/messages/${listId}/${rootHash}`);
      const rootData = await rootRes.json();
      bodyCache.current.set(rootHash, rootData);

      // Use threadSnippet if available, else fall back to thread.messages
      const msgList = rootData.threadSnippet?.length > 1
        ? rootData.threadSnippet
        : thread.messages || [];

      // Build enriched message list
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

      // Update state with fetched bodies
      setThreadMessages((prev) =>
        prev.map((m) => {
          const cached = bodyCache.current.get(m.hash);
          if (!cached) return m;
          return { ...m, body: cached.body, from: cached.from || m.from, date: cached.date || m.date };
        })
      );
    } catch (err) {
      console.error("Failed to load thread:", err);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  const loadMessageBody = useCallback(async (hash) => {
    if (bodyCache.current.has(hash)) {
      // Already cached, just update state
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
