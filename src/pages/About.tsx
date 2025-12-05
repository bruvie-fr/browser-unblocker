import { Header } from '@/components/Header';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import etownLogo from '@/assets/etown-logo.png';

const About = () => {
  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <img src={etownLogo} alt="Etown Unblocker" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">About Etown Unblocker</h1>
          <p className="text-muted-foreground mt-2">
            A simple web proxy to access blocked websites
          </p>
        </div>

        <div className="space-y-6">
          {/* How it works */}
          <section className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">How It Works</h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Etown Unblocker acts as an intermediary between you and the website you want to visit. 
              When you enter a URL, our server fetches the content and displays it to you, bypassing 
              network restrictions that might be blocking direct access.
            </p>
          </section>

          {/* Works best for */}
          <section className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold text-foreground">Works Best For</h2>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                News websites and articles
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Wikipedia and educational content
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Blogs and static web pages
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Documentation sites
              </li>
            </ul>
          </section>

          {/* Limitations */}
          <section className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-foreground">Limitations</h2>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">!</span>
                JavaScript-heavy sites (Gmail, social media) may not work properly
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">!</span>
                Sites with strict security measures may block proxy access
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">!</span>
                Login sessions and cookies won't persist
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">!</span>
                Video streaming sites typically don't work
              </li>
            </ul>
          </section>

          {/* Privacy */}
          <section className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Privacy</h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your browsing history is stored locally in your browser and is never sent to our servers. 
              You can clear your history at any time from the History page. No account is required to use 
              this service.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default About;
