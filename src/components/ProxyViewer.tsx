import { useRef, useState, useEffect, useCallback } from 'react';
import { X, ExternalLink, Terminal, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabBar } from '@/components/TabBar';
import { DevConsole } from '@/components/DevConsole';
import { useTabs } from '@/contexts/TabContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProxyViewerProps {
  onNewTab: () => void;
}

export function ProxyViewer({ onNewTab }: ProxyViewerProps) {
  const { tabs, activeTabId, updateTab } = useTabs();
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [history, setHistory] = useState<{ [tabId: string]: { urls: string[], index: number } }>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Navigate to URL through proxy
  const navigateToUrl = useCallback(async (url: string, addToHistory = true) => {
    if (!activeTabId || isNavigating) return;
    
    setIsNavigating(true);
    try {
      const { data, error } = await supabase.functions.invoke('proxy', {
        body: { url }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      updateTab(activeTabId, {
        url: data.url || url,
        title: data.title || url,
        content: data.content
      });

      // Update history
      if (addToHistory) {
        setHistory(prev => {
          const tabHistory = prev[activeTabId] || { urls: [], index: -1 };
          const newUrls = [...tabHistory.urls.slice(0, tabHistory.index + 1), data.url || url];
          return {
            ...prev,
            [activeTabId]: { urls: newUrls, index: newUrls.length - 1 }
          };
        });
      }
    } catch (err) {
      console.error('Navigation error:', err);
      toast({
        title: "Navigation Failed",
        description: err instanceof Error ? err.message : "Could not load the page",
        variant: "destructive"
      });
    } finally {
      setIsNavigating(false);
    }
  }, [activeTabId, isNavigating, updateTab, toast]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'proxy-navigate' && event.data?.url) {
        navigateToUrl(event.data.url);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigateToUrl]);

  // Initialize history for new tabs
  useEffect(() => {
    if (activeTabId && activeTab && !history[activeTabId]) {
      setHistory(prev => ({
        ...prev,
        [activeTabId]: { urls: [activeTab.url], index: 0 }
      }));
    }
  }, [activeTabId, activeTab, history]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        setConsoleOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const canGoBack = activeTabId && history[activeTabId]?.index > 0;
  const canGoForward = activeTabId && history[activeTabId] && 
    history[activeTabId].index < history[activeTabId].urls.length - 1;

  const goBack = () => {
    if (!activeTabId || !canGoBack) return;
    const tabHistory = history[activeTabId];
    const newIndex = tabHistory.index - 1;
    setHistory(prev => ({
      ...prev,
      [activeTabId]: { ...tabHistory, index: newIndex }
    }));
    navigateToUrl(tabHistory.urls[newIndex], false);
  };

  const goForward = () => {
    if (!activeTabId || !canGoForward) return;
    const tabHistory = history[activeTabId];
    const newIndex = tabHistory.index + 1;
    setHistory(prev => ({
      ...prev,
      [activeTabId]: { ...tabHistory, index: newIndex }
    }));
    navigateToUrl(tabHistory.urls[newIndex], false);
  };

  const refresh = () => {
    if (activeTab) {
      navigateToUrl(activeTab.url, false);
    }
  };

  if (!activeTab) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <TabBar onNewTab={onNewTab} />

      {/* Navigation Bar */}
      <div className="h-10 border-b border-border bg-card flex items-center justify-between px-2 gap-2">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={goBack}
            disabled={!canGoBack || isNavigating}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={goForward}
            disabled={!canGoForward || isNavigating}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={refresh}
            disabled={isNavigating}
          >
            <RefreshCw className={`h-4 w-4 ${isNavigating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 flex-1 min-w-0 mx-2">
          <div className="flex-1 bg-muted rounded px-2 py-1 text-xs text-muted-foreground truncate">
            {activeTab.url}
          </div>
          <a 
            href={activeTab.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2"
            onClick={() => setConsoleOpen(prev => !prev)}
          >
            <Terminal className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">DevTools</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onNewTab}>
            <X className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Close</span>
          </Button>
        </div>
      </div>

      {/* Loading indicator */}
      {isNavigating && (
        <div className="h-0.5 bg-primary/20">
          <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <iframe
          ref={iframeRef}
          srcDoc={activeTab.content}
          className="flex-1 w-full"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          title="Proxied content"
        />

        <DevConsole 
          iframeRef={iframeRef} 
          isOpen={consoleOpen} 
          onToggle={() => setConsoleOpen(prev => !prev)} 
        />
      </div>
    </div>
  );
}
