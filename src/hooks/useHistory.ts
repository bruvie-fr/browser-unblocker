import { useState, useEffect } from 'react';

export interface HistoryItem {
  url: string;
  title: string;
  visitedAt: string;
}

const HISTORY_KEY = 'etown_unblocker_history';
const MAX_HISTORY_ITEMS = 50;

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const addToHistory = (url: string, title: string) => {
    const newItem: HistoryItem = {
      url,
      title: title || url,
      visitedAt: new Date().toISOString(),
    };

    setHistory(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(item => item.url !== url);
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const removeFromHistory = (url: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.url !== url);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return { history, addToHistory, clearHistory, removeFromHistory };
}
