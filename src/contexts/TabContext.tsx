import { createContext, useContext, useState, ReactNode } from 'react';

// Helper function to generate unique IDs (works on HTTP and HTTPS)
const generateId = (): string => {
  // Try crypto.randomUUID first (requires secure context)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback using crypto.getRandomValues (works on HTTP)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    array[6] = (array[6] & 0x0f) | 0x40;
    array[8] = (array[8] & 0x3f) | 0x80;
    const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  
  // Final fallback
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
};

export interface Tab {
  id: string;
  url: string;
  title: string;
  content: string;
}

interface TabContextType {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (url: string, title: string, content: string) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  closeAllTabs: () => void;
}

const TabContext = createContext<TabContextType | null>(null);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const addTab = (url: string, title: string, content: string): string => {
    const id = generateId();
    const newTab: Tab = { id, url, title, content };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
    return id;
  };

  const removeTab = (id: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== id);
      if (activeTabId === id && newTabs.length > 0) {
        const index = prev.findIndex(tab => tab.id === id);
        const newActiveIndex = Math.min(index, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex]?.id ?? null);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      return newTabs;
    });
  };

  const setActiveTab = (id: string) => {
    setActiveTabId(id);
  };

  const updateTab = (id: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === id ? { ...tab, ...updates } : tab
    ));
  };

  const closeAllTabs = () => {
    setTabs([]);
    setActiveTabId(null);
  };

  return (
    <TabContext.Provider value={{ 
      tabs, 
      activeTabId, 
      addTab, 
      removeTab, 
      setActiveTab, 
      updateTab,
      closeAllTabs 
    }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
}
