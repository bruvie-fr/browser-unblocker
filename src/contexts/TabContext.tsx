import { createContext, useContext, useState, ReactNode } from 'react';

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
    const id = crypto.randomUUID();
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
