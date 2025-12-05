import { useState } from 'react';
import { Header } from '@/components/Header';
import { ProxyForm } from '@/components/ProxyForm';
import { ProxyViewer } from '@/components/ProxyViewer';
import { useHistory } from '@/hooks/useHistory';
import { useTabs } from '@/contexts/TabContext';
import { Shield, Zap, Lock } from 'lucide-react';
import etownLogo from '@/assets/etown-logo.png';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showHome, setShowHome] = useState(true);
  const { addToHistory } = useHistory();
  const { tabs, activeTabId, addTab } = useTabs();

  const handleProxySuccess = (url: string, title: string, content: string) => {
    addToHistory(url, title);
    addTab(url, title, content);
    setShowHome(false);
  };

  const handleReturnHome = () => {
    setShowHome(true);
  };

  const handleReturnToTabs = () => {
    if (tabs.length > 0) {
      setShowHome(false);
    }
  };

  // Show ProxyViewer if there are tabs and not explicitly on home
  const showViewer = tabs.length > 0 && activeTabId && !showHome;

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center">
          {/* Logo and Title */}
          <div className="mb-8 animate-fade-in">
            <img 
              src={etownLogo} 
              alt="Etown Unblocker" 
              className="h-24 w-24 mx-auto mb-6 drop-shadow-lg"
            />
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-3">
              Etown Unblocker
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Access blocked websites securely in your browser. No download or setup required.
            </p>
          </div>

          {/* Proxy Form */}
          <div className="w-full max-w-2xl mb-16">
            <ProxyForm 
              onSuccess={handleProxySuccess}
              onLoading={setIsLoading}
            />
            {tabs.length > 0 && (
              <button
                onClick={handleReturnToTabs}
                className="mt-4 text-sm text-primary hover:underline"
              >
                ← Return to open tabs ({tabs.length})
              </button>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="Bypass Restrictions"
              description="Access websites blocked by your network or region"
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="Instant Access"
              description="No downloads, installations, or account needed"
            />
            <FeatureCard
              icon={<Lock className="h-8 w-8" />}
              title="Private Browsing"
              description="Your history stays local on your device"
            />
          </div>
        </div>
      </main>

      {/* Proxy Viewer Overlay */}
      {showViewer && (
        <ProxyViewer onNewTab={handleReturnHome} />
      )}
    </div>
  );
};

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
      <div className="text-primary mb-3">{icon}</div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default Index;
