import { useState } from 'react';
import { Search, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkCompatibility, getCompatibilityMessage, compatibleExamples } from '@/utils/siteCompatibility';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProxyFormProps {
  onSuccess: (url: string, title: string, content: string) => void;
  onLoading: (loading: boolean) => void;
}

export function ProxyForm({ onSuccess, onLoading }: ProxyFormProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [warningDialog, setWarningDialog] = useState<{ open: boolean; url: string; message: string }>({
    open: false,
    url: '',
    message: ''
  });
  const { toast } = useToast();

  const normalizeUrl = (input: string): string => {
    let normalized = input.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  };

  const fetchUrl = async (targetUrl: string) => {
    setIsLoading(true);
    onLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('proxy', {
        body: { url: targetUrl },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      onSuccess(data.url, data.title || targetUrl, data.content);
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
    const compatibility = checkCompatibility(normalizedUrl);
    
    if (compatibility === 'blocked') {
      const message = getCompatibilityMessage(compatibility, normalizedUrl);
      setWarningDialog({ open: true, url: normalizedUrl, message: message || '' });
      return;
    }

    await fetchUrl(normalizedUrl);
  };

  const handleProceedAnyway = async () => {
    setWarningDialog({ open: false, url: '', message: '' });
    await fetchUrl(warningDialog.url);
  };

  const handleTrySuggested = async (suggestedUrl: string) => {
    setWarningDialog({ open: false, url: '', message: '' });
    setUrl(suggestedUrl);
    await fetchUrl(suggestedUrl);
  };

  return (
    <>
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

      <AlertDialog open={warningDialog.open} onOpenChange={(open) => setWarningDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Site May Not Work
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {warningDialog.message}
              <div className="mt-4">
                <p className="font-medium text-foreground mb-2">Try these instead:</p>
                <div className="flex flex-wrap gap-2">
                  {compatibleExamples.slice(0, 3).map((site) => (
                    <Button
                      key={site.name}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTrySuggested(site.url)}
                    >
                      {site.name}
                    </Button>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProceedAnyway} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Try Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
