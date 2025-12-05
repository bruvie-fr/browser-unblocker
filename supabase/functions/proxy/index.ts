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
    const { url, mode = 'page' } = await req.json();
    
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

    console.log(`Proxying ${mode} request to: ${targetUrl.href}`);

    const response = await fetch(targetUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': mode === 'page' 
          ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          : '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': targetUrl.origin,
      },
      redirect: 'follow',
    });

    // For resource mode, return the content directly
    if (mode === 'resource') {
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      // For images, convert to base64
      if (contentType.startsWith('image/')) {
        const buffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        return new Response(
          JSON.stringify({ 
            content: `data:${contentType};base64,${base64}`,
            contentType,
            url: targetUrl.href 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // For CSS/JS/other text, return as text
      const content = await response.text();
      const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;
      
      // Rewrite URLs in CSS
      let processedContent = content;
      if (contentType.includes('text/css')) {
        processedContent = rewriteCssUrls(content, baseUrl);
      }
      
      return new Response(
        JSON.stringify({ 
          content: processedContent, 
          contentType,
          url: targetUrl.href 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Page mode - process HTML
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;
      
      // Remove security headers via meta tags
      const securityOverride = `
        <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;">
        <meta http-equiv="X-Frame-Options" content="ALLOWALL">
      `;
      
      // Injection script for navigation and resource interception
      const injectionScript = `
        <script>
        (function() {
          const PROXY_BASE_URL = window.location.origin;
          const ORIGINAL_BASE_URL = '${baseUrl}';
          
          // Resource loading queue
          const resourceQueue = [];
          let isProcessing = false;
          
          // Request resource through parent
          function requestResource(url, element, attr) {
            window.parent.postMessage({ 
              type: 'proxy-resource', 
              url: url,
              elementId: element.dataset.proxyId || Math.random().toString(36).substr(2, 9)
            }, '*');
            element.dataset.proxyId = element.dataset.proxyId || resourceQueue[resourceQueue.length - 1]?.elementId;
          }
          
          // Listen for proxied resources
          window.addEventListener('message', function(e) {
            if (e.data?.type === 'proxy-resource-response') {
              const elements = document.querySelectorAll('[data-proxy-id="' + e.data.elementId + '"]');
              elements.forEach(el => {
                if (el.tagName === 'IMG') {
                  el.src = e.data.content;
                } else if (el.tagName === 'LINK') {
                  const style = document.createElement('style');
                  style.textContent = e.data.content;
                  el.parentNode.insertBefore(style, el);
                  el.remove();
                } else if (el.tagName === 'SCRIPT' && el.dataset.proxySrc) {
                  const newScript = document.createElement('script');
                  newScript.textContent = e.data.content;
                  el.parentNode.insertBefore(newScript, el);
                  el.remove();
                }
              });
            }
          });
          
          // Intercept image errors and reload through proxy
          document.addEventListener('error', function(e) {
            const el = e.target;
            if (el.tagName === 'IMG' && !el.dataset.proxyAttempted) {
              el.dataset.proxyAttempted = 'true';
              const originalSrc = el.src || el.dataset.src;
              if (originalSrc && !originalSrc.startsWith('data:')) {
                el.dataset.proxyId = Math.random().toString(36).substr(2, 9);
                window.parent.postMessage({ 
                  type: 'proxy-resource', 
                  url: originalSrc,
                  elementId: el.dataset.proxyId
                }, '*');
              }
            }
          }, true);
          
          // Navigation interception
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
          
          // Intercept fetch/XHR for resources
          const originalFetch = window.fetch;
          window.fetch = function(input, init) {
            let url = typeof input === 'string' ? input : input.url;
            // Let the parent handle API calls that might need proxying
            return originalFetch.apply(this, arguments).catch(err => {
              console.log('Fetch failed, might need proxy:', url);
              throw err;
            });
          };
        })();
        </script>
      `;
      
      // Rewrite URLs - comprehensive patterns
      html = rewriteHtmlUrls(html, baseUrl);
      
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
          title: extractTitle(html),
          baseUrl: baseUrl
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

function rewriteHtmlUrls(html: string, baseUrl: string): string {
  // Standard href/src attributes - absolute paths
  html = html.replace(/href="\/([^"]*)"/g, `href="${baseUrl}/$1"`);
  html = html.replace(/src="\/([^"]*)"/g, `src="${baseUrl}/$1"`);
  html = html.replace(/href='\/([^']*)'/g, `href='${baseUrl}/$1'`);
  html = html.replace(/src='\/([^']*)'/g, `src='${baseUrl}/$1'`);
  
  // Protocol-relative URLs
  html = html.replace(/href="\/\/([^"]*)"/g, `href="https://$1"`);
  html = html.replace(/src="\/\/([^"]*)"/g, `src="https://$1"`);
  
  // srcset attributes
  html = html.replace(/srcset="([^"]*)"/g, (match, srcset) => {
    const rewritten = srcset.replace(/(?:^|\s)(\/[^\s,]+)/g, ` ${baseUrl}$1`);
    return `srcset="${rewritten}"`;
  });
  
  // CSS url() in style attributes
  html = html.replace(/url\((['"]?)\/([^)'"]+)\1\)/g, `url($1${baseUrl}/$2$1)`);
  
  // Form actions
  html = html.replace(/action="\/([^"]*)"/g, `action="${baseUrl}/$1"`);
  html = html.replace(/action='\/([^']*)'/g, `action='${baseUrl}/$1'`);
  
  // data-src and other data attributes
  html = html.replace(/data-src="\/([^"]*)"/g, `data-src="${baseUrl}/$1"`);
  html = html.replace(/data-src='\/([^']*)'/g, `data-src='${baseUrl}/$1'`);
  
  // poster attribute for video
  html = html.replace(/poster="\/([^"]*)"/g, `poster="${baseUrl}/$1"`);
  html = html.replace(/poster='\/([^']*)'/g, `poster='${baseUrl}/$1'`);
  
  return html;
}

function rewriteCssUrls(css: string, baseUrl: string): string {
  // Rewrite url() in CSS
  css = css.replace(/url\((['"]?)\/([^)'"]+)\1\)/g, `url($1${baseUrl}/$2$1)`);
  css = css.replace(/url\((['"]?)(?!data:|https?:|\/\/)([^)'"]+)\1\)/g, `url($1${baseUrl}/$2$1)`);
  return css;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}
