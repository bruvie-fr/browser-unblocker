// JavaScript code to inject into proxied pages for navigation interception
export const getProxyInjectionScript = (baseUrl: string): string => `
(function() {
  const PROXY_BASE = '${baseUrl}';
  
  // Intercept link clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#')) {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({ type: 'proxy-navigate', url: link.href }, '*');
    }
  }, true);

  // Intercept form submissions
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
      
      window.parent.postMessage({ 
        type: 'proxy-navigate', 
        url: url,
        method: form.method,
        body: form.method.toLowerCase() === 'post' ? params.toString() : null
      }, '*');
    }
  }, true);

  // Override window.open
  const originalOpen = window.open;
  window.open = function(url, target, features) {
    if (url && !url.startsWith('javascript:')) {
      window.parent.postMessage({ type: 'proxy-navigate', url: url, newTab: true }, '*');
      return null;
    }
    return originalOpen.call(this, url, target, features);
  };

  // Override location assignments
  const locationProxy = new Proxy(window.location, {
    set: function(target, prop, value) {
      if (prop === 'href' || prop === 'pathname') {
        window.parent.postMessage({ type: 'proxy-navigate', url: value }, '*');
        return true;
      }
      return Reflect.set(target, prop, value);
    }
  });

  console.log('[Etown Proxy] Navigation interception active');
})();
`;
