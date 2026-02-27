"use client";
import { useState, useCallback, useRef } from "react";

const BATCH_SIZE = 5;
const COLLAPSE_THRESHOLD = 15;
const HEAD_COUNT = 3;
const TAIL_COUNT = 5;

export function useThreadMessages(listId) {
  const [threadMessages, setThreadMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bodyCache = useRef(new Map());
  const requestIdRef = useRef(0);

  const loadThread = useCallback(async (thread) => {
    const thisRequest = ++requestIdRef.current;

    setLoading(true);
    const rootHash = thread.rootHash || thread.messages?.[0]?.hash;
    if (!rootHash) { setLoading(false); return; }

    try {
      const rootRes = await fetch(`/api/messages/${listId}/${rootHash}`);
      const rootData = await rootRes.json();
      bodyCache.current.set(rootHash, rootData);

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

      // For large threads, only eagerly fetch bodies for the head + tail
      // (which are the only messages initially rendered).
      // For small threads, fetch all.
      let toFetch;
      if (enriched.length > COLLAPSE_THRESHOLD) {
        const visibleSet = new Set();
        for (let i = 0; i < Math.min(HEAD_COUNT, enriched.length); i++) {
          visibleSet.add(enriched[i].hash);
        }
        for (let i = Math.max(0, enriched.length - TAIL_COUNT); i < enriched.length; i++) {
          visibleSet.add(enriched[i].hash);
        }
        toFetch = enriched.filter((m) => !m.body && visibleSet.has(m.hash));
      } else {
        toFetch = enriched.filter((m) => !m.body && m.hash !== rootHash);
      }

      for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
        if (thisRequest !== requestIdRef.current) return;

        const batch = toFetch.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map((m) =>
            fetch(`/api/messages/${listId}/${m.hash}`)
              .then((r) => r.json())
              .then((d) => { bodyCache.current.set(m.hash, d); })
          )
        );

        if (thisRequest !== requestIdRef.current) return;

        setThreadMessages((prev) =>
          prev.map((m) => {
            const cached = bodyCache.current.get(m.hash);
            if (!cached) return m;
            return { ...m, body: cached.body, from: cached.from || m.from, date: cached.date || m.date };
          })
        );
      }
    } catch (err) {
      if (thisRequest !== requestIdRef.current) return;
      console.error("Failed to load thread:", err);
    } finally {
      if (thisRequest === requestIdRef.current) setLoading(false);
    }
  }, [listId]);

  // Batch-load bodies for a set of message hashes (used when expanding all)
  const loadBodies = useCallback(async (hashes) => {
    const thisRequest = requestIdRef.current;
    const toFetch = hashes.filter((h) => !bodyCache.current.has(h));

    for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
      if (requestIdRef.current !== thisRequest) return;

      const batch = toFetch.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map((h) =>
          fetch(`/api/messages/${listId}/${h}`)
            .then((r) => r.json())
            .then((d) => { bodyCache.current.set(h, d); })
        )
      );

      if (requestIdRef.current !== thisRequest) return;

      setThreadMessages((prev) =>
        prev.map((m) => {
          const cached = bodyCache.current.get(m.hash);
          if (!cached) return m;
          return { ...m, body: cached.body, from: cached.from || m.from, date: cached.date || m.date };
        })
      );
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

  return { threadMessages, loading, loadThread, loadMessageBody, loadBodies, clearMessages };
}
