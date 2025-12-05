import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Proxying request to: ${targetUrl.href}`);

    const response = await fetch(targetUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;
      
      // Remove security headers via meta tags
      const securityOverride = `
        <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;">
        <meta http-equiv="X-Frame-Options" content="ALLOWALL">
      `;
      
      // Injection script for navigation interception
      const injectionScript = `
        <script>
        (function() {
          document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#') && link.href !== '') {
              e.preventDefault();
              e.stopPropagation();
              window.parent.postMessage({ type: 'proxy-navigate', url: link.href }, '*');
            }
          }, true);

          document.addEventListener('submit', function(e) {
            const form = e.target;
            if (form && form.action) {
              e.preventDefault();
              e.stopPropagation();
              const formData = new FormData(form);
              const params = new URLSearchParams();
              formData.forEach((value, key) => params.append(key, value));
              let url = form.action;
              if (form.method.toLowerCase() === 'get') {
                url = form.action + (form.action.includes('?') ? '&' : '?') + params.toString();
              }
              window.parent.postMessage({ type: 'proxy-navigate', url: url }, '*');
            }
          }, true);

          const originalOpen = window.open;
          window.open = function(url) {
            if (url && !url.startsWith('javascript:')) {
              window.parent.postMessage({ type: 'proxy-navigate', url: url, newTab: true }, '*');
              return null;
            }
            return originalOpen.apply(this, arguments);
          };
        })();
        </script>
      `;
      
      // Rewrite URLs - comprehensive patterns
      // Standard href/src attributes
      html = html.replace(/href="\/([^"]*)"/g, `href="${baseUrl}/$1"`);
      html = html.replace(/src="\/([^"]*)"/g, `src="${baseUrl}/$1"`);
      html = html.replace(/href='\/([^']*)'/g, `href='${baseUrl}/$1'`);
      html = html.replace(/src='\/([^']*)'/g, `src='${baseUrl}/$1'`);
      
      // Protocol-relative URLs
      html = html.replace(/href="\/\/([^"]*)"/g, `href="https://$1"`);
      html = html.replace(/src="\/\/([^"]*)"/g, `src="https://$1"`);
      
      // srcset attributes
      html = html.replace(/srcset="([^"]*)"/g, (match, srcset) => {
        const rewritten = srcset.replace(/\/([^\s,]+)/g, `${baseUrl}/$1`);
        return `srcset="${rewritten}"`;
      });
      
      // CSS url() in style attributes
      html = html.replace(/url\((['"]?)\/([^)'"]+)\1\)/g, `url($1${baseUrl}/$2$1)`);
      
      // Form actions
      html = html.replace(/action="\/([^"]*)"/g, `action="${baseUrl}/$1"`);
      html = html.replace(/action='\/([^']*)'/g, `action='${baseUrl}/$1'`);
      
      // Add base tag and inject script
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>\n${securityOverride}\n<base href="${baseUrl}/">\n${injectionScript}`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>\n${securityOverride}\n<base href="${baseUrl}/">\n${injectionScript}`);
      } else {
        html = `${securityOverride}\n<base href="${baseUrl}/">\n${injectionScript}\n${html}`;
      }

      return new Response(
        JSON.stringify({ 
          content: html, 
          contentType: 'text/html',
          url: targetUrl.href,
          title: extractTitle(html)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = await response.text();
    return new Response(
      JSON.stringify({ content, contentType, url: targetUrl.href }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch the requested URL';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}
