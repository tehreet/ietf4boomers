"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export function useThreads(listId) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchThreads = useCallback(async (qdr = "") => {
    if (!listId) return;

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = qdr ? `?qdr=${qdr}` : "";
      const res = await fetch(`/api/threads/${listId}${params}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    fetchThreads();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [fetchThreads]);

  return { threads, loading, error, refetch: fetchThreads };
}
