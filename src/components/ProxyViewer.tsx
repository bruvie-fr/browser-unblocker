import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProxyViewerProps {
  content: string;
  url: string;
  onClose: () => void;
}

export function ProxyViewer({ content, url, onClose }: ProxyViewerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-muted-foreground truncate">{url}</span>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" />
          Close
        </Button>
      </div>
      <iframe
        srcDoc={content}
        className="w-full h-[calc(100vh-48px)]"
        sandbox="allow-same-origin allow-scripts allow-forms"
        title="Proxied content"
      />
    </div>
  );
}
