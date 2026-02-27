"use client";
import { useState, useCallback, useRef, useEffect } from "react";

export function useSearch(listId) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q || q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    timerRef.current = setTimeout(async () => {
      // Abort previous in-flight search
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/search?list=${listId}&q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 400);
  }, [listId]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setSearching(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Reset when list changes
  useEffect(() => {
    setResults([]);
    setQuery("");
  }, [listId]);

  return { results, searching, query, search, clearSearch };
}
