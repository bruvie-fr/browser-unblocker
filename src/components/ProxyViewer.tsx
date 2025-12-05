import { useRef, useState, useEffect } from 'react';
import { X, ExternalLink, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabBar } from '@/components/TabBar';
import { DevConsole } from '@/components/DevConsole';
import { useTabs, Tab } from '@/contexts/TabContext';

interface ProxyViewerProps {
  onNewTab: () => void;
}

export function ProxyViewer({ onNewTab }: ProxyViewerProps) {
  const { tabs, activeTabId } = useTabs();
  const [consoleOpen, setConsoleOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 or Ctrl+Shift+I to toggle console
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        setConsoleOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!activeTab) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Tab Bar */}
      <TabBar onNewTab={onNewTab} />

      {/* URL Bar */}
      <div className="h-10 border-b border-border bg-card flex items-center justify-between px-3 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground truncate">{activeTab.url}</span>
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

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Iframe */}
        <iframe
          ref={iframeRef}
          srcDoc={activeTab.content}
          className="flex-1 w-full"
          sandbox="allow-same-origin allow-scripts allow-forms"
          title="Proxied content"
        />

        {/* Dev Console */}
        <DevConsole 
          iframeRef={iframeRef} 
          isOpen={consoleOpen} 
          onToggle={() => setConsoleOpen(prev => !prev)} 
        />
      </div>
    </div>
  );
}
