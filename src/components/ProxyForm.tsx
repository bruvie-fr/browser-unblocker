import { useState } from 'react';
import { Search, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProxyFormProps {
  onSuccess: (url: string, title: string, content: string) => void;
  onLoading: (loading: boolean) => void;
}

export function ProxyForm({ onSuccess, onLoading }: ProxyFormProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const normalizeUrl = (input: string): string => {
    let normalized = input.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: 'URL Required',
        description: 'Please enter a website URL to unblock.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedUrl = normalizeUrl(url);
    setIsLoading(true);
    onLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('proxy', {
        body: { url: normalizedUrl },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      onSuccess(data.url, data.title || normalizedUrl, data.content);
      toast({
        title: 'Success',
        description: 'Website loaded successfully.',
      });
    } catch (error: any) {
      console.error('Proxy error:', error);
      toast({
        title: 'Failed to load website',
        description: error.message || 'The website could not be loaded. It may be blocking proxy requests.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      onLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter website URL (e.g., wikipedia.org)"
            className="pl-10 h-12 text-base bg-card border-border"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          size="lg" 
          disabled={isLoading}
          className="h-12 px-6 gradient-primary text-primary-foreground"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ExternalLink className="h-5 w-5 mr-2" />
              Unblock
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
