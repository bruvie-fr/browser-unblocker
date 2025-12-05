import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Trash2, Play, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConsoleEntry {
  id: string;
  type: 'command' | 'result' | 'error' | 'log';
  content: string;
  timestamp: Date;
}

interface DevConsoleProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  isOpen: boolean;
  onToggle: () => void;
}

export function DevConsole({ iframeRef, isOpen, onToggle }: DevConsoleProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ConsoleEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const addEntry = (type: ConsoleEntry['type'], content: string) => {
    setHistory(prev => [...prev, {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: new Date()
    }]);
  };

  const executeCode = () => {
    if (!input.trim()) return;

    addEntry('command', input);
    setCommandHistory(prev => [...prev, input]);
    setHistoryIndex(-1);

    try {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        // Use Function constructor to execute in iframe context
        const win = iframe.contentWindow as Window & typeof globalThis;
        const result = (win as any).eval(input);
        if (result !== undefined) {
          addEntry('result', String(result));
        }
      } else {
        addEntry('error', 'No iframe content available');
      }
    } catch (error: any) {
      addEntry('error', error.message || 'Unknown error');
    }

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      executeCode();
    } else if (e.key === 'ArrowUp' && commandHistory.length > 0) {
      e.preventDefault();
      const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(newIndex);
      setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
      setHistoryIndex(newIndex);
      setInput(newIndex === -1 ? '' : commandHistory[commandHistory.length - 1 - newIndex] || '');
    }
  };

  const clearConsole = () => {
    setHistory([]);
  };

  const getEntryColor = (type: ConsoleEntry['type']) => {
    switch (type) {
      case 'command': return 'text-primary';
      case 'result': return 'text-green-500';
      case 'error': return 'text-destructive';
      case 'log': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  const getEntryPrefix = (type: ConsoleEntry['type']) => {
    switch (type) {
      case 'command': return '>';
      case 'result': return '←';
      case 'error': return '✕';
      case 'log': return '•';
      default: return '';
    }
  };

  return (
    <div className={cn(
      "border-t border-border bg-card transition-all duration-200",
      isOpen ? "h-64" : "h-8"
    )}>
      {/* Header */}
      <div 
        className="h-8 px-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Terminal className="h-4 w-4" />
          <span>Console</span>
        </div>
        <div className="flex items-center gap-1">
          {isOpen && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={(e) => {
                e.stopPropagation();
                clearConsole();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </div>

      {/* Console Content */}
      {isOpen && (
        <div className="h-[calc(100%-32px)] flex flex-col">
          {/* Output */}
          <div 
            ref={outputRef}
            className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1"
          >
            {history.length === 0 ? (
              <div className="text-muted-foreground italic">
                Execute JavaScript in the proxied page. Press Ctrl+Enter to run.
              </div>
            ) : (
              history.map(entry => (
                <div key={entry.id} className={cn("flex gap-2", getEntryColor(entry.type))}>
                  <span className="flex-shrink-0 w-3">{getEntryPrefix(entry.type)}</span>
                  <pre className="whitespace-pre-wrap break-all">{entry.content}</pre>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-2 flex gap-2">
            <span className="text-primary font-mono text-sm mt-1.5">{'>'}</span>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter JavaScript code..."
              className="flex-1 bg-transparent resize-none outline-none font-mono text-sm min-h-[24px] max-h-[80px]"
              rows={1}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={executeCode}
            >
              <Play className="h-3 w-3 mr-1" />
              Run
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
