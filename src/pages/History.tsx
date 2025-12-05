import { Header } from '@/components/Header';
import { useHistory } from '@/hooks/useHistory';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const History = () => {
  const { history, clearHistory, removeFromHistory } = useHistory();

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Browsing History</h1>
            <p className="text-sm text-muted-foreground">Your recently visited sites</p>
          </div>
          {history.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearHistory}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-1">No history yet</h2>
            <p className="text-sm text-muted-foreground">
              Sites you visit through Etown Unblocker will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.url + item.visitedAt}
                className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">{item.url}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(item.visitedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={`/?url=${encodeURIComponent(item.url)}`}
                    className="text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromHistory(item.url)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
