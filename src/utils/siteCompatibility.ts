// Sites known to block iframe embedding or require complex JS
export const blockedDomains = [
  'google.com', 'google.', // All Google domains
  'youtube.com', 'youtu.be',
  'netflix.com',
  'facebook.com', 'fb.com',
  'instagram.com',
  'twitter.com', 'x.com',
  'tiktok.com',
  'linkedin.com',
  'amazon.com',
  'reddit.com',
  'discord.com',
  'twitch.tv',
  'spotify.com',
  'github.com',
  'outlook.com', 'live.com',
  'paypal.com',
  'banking', 'bank'
];

// Sites that work reasonably well
export const compatibleExamples = [
  { name: 'Wikipedia', url: 'https://en.wikipedia.org' },
  { name: 'BBC News', url: 'https://www.bbc.com/news' },
  { name: 'NPR', url: 'https://www.npr.org' },
  { name: 'The Verge', url: 'https://www.theverge.com' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com' },
];

export type CompatibilityLevel = 'blocked' | 'limited' | 'compatible';

export function checkCompatibility(url: string): CompatibilityLevel {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    for (const blocked of blockedDomains) {
      if (hostname.includes(blocked)) {
        return 'blocked';
      }
    }
    
    // JavaScript-heavy frameworks often have limited compatibility
    return 'compatible';
  } catch {
    return 'compatible';
  }
}

export function getCompatibilityMessage(level: CompatibilityLevel, url: string): string | null {
  if (level === 'blocked') {
    const hostname = new URL(url).hostname;
    return `${hostname} has strict security that prevents proxying. You'll likely see a blank page or error. Try simpler sites like Wikipedia instead.`;
  }
  return null;
}
