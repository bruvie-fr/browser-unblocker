import { Plus, X, Globe } from 'lucide-react';
import { useTabs } from '@/contexts/TabContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TabBarProps {
  onNewTab: () => void;
}

export function TabBar({ onNewTab }: TabBarProps) {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabs();

  return (
    <div className="h-10 bg-card border-b border-border flex items-center overflow-x-auto">
      <div className="flex items-center flex-1 min-w-0 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={cn(
              "group flex items-center gap-2 px-3 h-10 border-r border-border cursor-pointer transition-colors min-w-[120px] max-w-[200px]",
              activeTabId === tab.id 
                ? "bg-background text-foreground" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <Globe className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <span className="text-xs truncate flex-1">{tab.title || 'New Tab'}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-destructive/20 rounded p-0.5 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-10 px-3 rounded-none border-l border-border"
        onClick={onNewTab}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
