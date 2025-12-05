import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Validate URL
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

    // Fetch the target URL
    const response = await fetch(targetUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    
    // If it's HTML, rewrite URLs
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;
      
      // Rewrite relative URLs to absolute
      html = html.replace(/href="\/([^"]*)"/g, `href="${baseUrl}/$1"`);
      html = html.replace(/src="\/([^"]*)"/g, `src="${baseUrl}/$1"`);
      html = html.replace(/href='\/([^']*)'/g, `href='${baseUrl}/$1'`);
      html = html.replace(/src='\/([^']*)'/g, `src='${baseUrl}/$1'`);
      
      // Add base tag for relative resources
      if (!html.includes('<base')) {
        html = html.replace('<head>', `<head><base href="${baseUrl}/">`);
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

    // For other content types, return as-is
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
