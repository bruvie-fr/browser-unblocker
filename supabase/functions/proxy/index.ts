import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chunked base64 encoding that handles large files without stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

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
      
      // For images, convert to base64 using chunked encoding
      if (contentType.startsWith('image/')) {
        const buffer = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        console.log(`Converted image to base64, size: ${buffer.byteLength} bytes`);
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
      
      // Injection script for navigation and PROACTIVE resource loading
      const injectionScript = `
        <script>
        (function() {
          const ORIGINAL_BASE_URL = '${baseUrl}';
          const pendingResources = new Map();
          
          // Request resource through parent
          function requestResourceThroughProxy(url, callback) {
            const elementId = Math.random().toString(36).substr(2, 9);
            pendingResources.set(elementId, callback);
            
            // Resolve relative URLs
            let fullUrl = url;
            if (url.startsWith('//')) {
              fullUrl = 'https:' + url;
            } else if (url.startsWith('/')) {
              fullUrl = ORIGINAL_BASE_URL + url;
            } else if (!url.startsWith('http')) {
              fullUrl = ORIGINAL_BASE_URL + '/' + url;
            }
            
            console.log('[Proxy] Requesting resource:', fullUrl);
            window.parent.postMessage({ 
              type: 'proxy-resource', 
              url: fullUrl,
              elementId: elementId
            }, '*');
          }
          
          // Listen for proxied resources
          window.addEventListener('message', function(e) {
            if (e.data?.type === 'proxy-resource-response') {
              const callback = pendingResources.get(e.data.elementId);
              if (callback) {
                callback(e.data.content, e.data.error);
                pendingResources.delete(e.data.elementId);
              }
            }
          });
          
          // PROACTIVE: Load all images through proxy immediately
          function proxyAllImages() {
            const images = document.querySelectorAll('img');
            console.log('[Proxy] Found ' + images.length + ' images to proxy');
            
            images.forEach(function(img) {
              const src = img.src || img.dataset.src || img.getAttribute('data-src');
              if (!src || src.startsWith('data:') || img.dataset.proxyLoaded) return;
              
              // Mark as being processed
              img.dataset.proxyLoaded = 'pending';
              
              // Store original src and clear it to prevent direct loading
              const originalSrc = src;
              img.removeAttribute('src');
              
              // Show loading state
              img.style.opacity = '0.5';
              img.style.minHeight = '50px';
              img.style.minWidth = '50px';
              img.style.backgroundColor = 'rgba(128,128,128,0.2)';
              
              requestResourceThroughProxy(originalSrc, function(content, error) {
                if (content && !error) {
                  img.src = content;
                  img.dataset.proxyLoaded = 'true';
                } else {
                  // Fallback to original
                  img.src = originalSrc;
                  img.dataset.proxyLoaded = 'failed';
                }
                img.style.opacity = '';
                img.style.minHeight = '';
                img.style.minWidth = '';
                img.style.backgroundColor = '';
              });
            });
          }
          
          // Proxy background images in CSS
          function proxyBackgroundImages() {
            const elements = document.querySelectorAll('[style*="background"]');
            elements.forEach(function(el) {
              const style = el.getAttribute('style');
              if (!style) return;
              
              const urlMatch = style.match(/url\\(['"]?([^'"\\)]+)['"]?\\)/);
              if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('data:')) {
                const originalUrl = urlMatch[1];
                requestResourceThroughProxy(originalUrl, function(content, error) {
                  if (content && !error) {
                    const newStyle = style.replace(urlMatch[0], 'url(' + content + ')');
                    el.setAttribute('style', newStyle);
                  }
                });
              }
            });
          }
          
          // Handle dynamically added images
          const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
              mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                  if (node.tagName === 'IMG') {
                    proxyImage(node);
                  }
                  const imgs = node.querySelectorAll ? node.querySelectorAll('img') : [];
                  imgs.forEach(proxyImage);
                }
              });
            });
          });
          
          function proxyImage(img) {
            const src = img.src || img.dataset.src;
            if (!src || src.startsWith('data:') || img.dataset.proxyLoaded) return;
            
            img.dataset.proxyLoaded = 'pending';
            const originalSrc = src;
            img.removeAttribute('src');
            
            requestResourceThroughProxy(originalSrc, function(content, error) {
              if (content && !error) {
                img.src = content;
                img.dataset.proxyLoaded = 'true';
              } else {
                img.src = originalSrc;
                img.dataset.proxyLoaded = 'failed';
              }
            });
          }
          
          // Start observing for dynamic content
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true
          });
          
          // Run proactive loading when DOM is ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
              proxyAllImages();
              proxyBackgroundImages();
            });
          } else {
            proxyAllImages();
            proxyBackgroundImages();
          }
          
          // Also run after a short delay for lazy-loaded content
          setTimeout(function() {
            proxyAllImages();
          }, 1000);
          
          setTimeout(function() {
            proxyAllImages();
          }, 3000);
          
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
