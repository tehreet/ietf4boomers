"use client";
import { useState, useEffect } from "react";

export function useLists() {
  const [lists, setLists] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/lists")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setLists(data.lists || []);
        setAreas(data.areas || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { lists, areas, loading, error };
}
