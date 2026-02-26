"use client";
import { useState, useEffect, useCallback } from "react";

export function useThreads(listId) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchThreads = useCallback(async (qdr = "") => {
    if (!listId) return;
    setLoading(true);
    setError(null);
    try {
      const params = qdr ? `?qdr=${qdr}` : "";
      const res = await fetch(`/api/threads/${listId}${params}`);
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return { threads, loading, error, refetch: fetchThreads };
}
