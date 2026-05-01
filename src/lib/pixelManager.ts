// Pixel management - supports multiple pixels per platform

export interface FacebookPixelEntry {
  id: string;
  pixelId: string;
  accessToken: string;
}

export interface TikTokPixelEntry {
  id: string;
  pixelId: string;
  accessToken: string;
}

export interface GoogleAdsEntry {
  id: string;
  adsId: string;
  adsLabel: string;
}

export interface PixelConfig {
  // Legacy single-pixel fields (kept for backward compat on load)
  facebookPixelId?: string;
  facebookAccessToken?: string;
  tiktokPixelId?: string;
  tiktokAccessToken?: string;
  googleAdsId?: string;
  googleAdsLabel?: string;
  // New multi-pixel arrays
  facebookPixels: FacebookPixelEntry[];
  tiktokPixels: TikTokPixelEntry[];
  googleAdsPixels: GoogleAdsEntry[];
  utmifyHtml?: string;
  // Conversion mode: true = fire only on paid, false = fire on pending + paid
  onlyPaid?: boolean;
}

const STORAGE_KEY = 'pixel_config';

function migrateConfig(raw: any): PixelConfig {
  const cfg: PixelConfig = {
    facebookPixels: raw.facebookPixels || [],
    tiktokPixels: raw.tiktokPixels || [],
    googleAdsPixels: raw.googleAdsPixels || [],
    utmifyHtml: raw.utmifyHtml || '',
    onlyPaid: raw.onlyPaid ?? false,
  };

  // Migrate legacy single fields into arrays if arrays are empty
  if (cfg.facebookPixels.length === 0 && raw.facebookPixelId) {
    cfg.facebookPixels.push({ id: crypto.randomUUID(), pixelId: raw.facebookPixelId, accessToken: raw.facebookAccessToken || '' });
  }
  if (cfg.tiktokPixels.length === 0 && raw.tiktokPixelId) {
    cfg.tiktokPixels.push({ id: crypto.randomUUID(), pixelId: raw.tiktokPixelId, accessToken: raw.tiktokAccessToken || '' });
  }
  if (cfg.googleAdsPixels.length === 0 && raw.googleAdsId) {
    cfg.googleAdsPixels.push({ id: crypto.randomUUID(), adsId: raw.googleAdsId, adsLabel: raw.googleAdsLabel || '' });
  }

  return cfg;
}

const DEFAULT_CONFIG: PixelConfig = {
  facebookPixels: [
    {
      id: 'default-fb-1',
      pixelId: '1499521114852387',
      accessToken: 'EAAT9vRp5JWABRZAtEXPUfTSyKRPz0oJbrNFa1WfFKt2DxgZB0GHDLnwT2JicjIat8IJRJjbPgLZBkcbAtUD5hMbmTItF6F4X7kHLBo7DUf2EZBQinPCVm5dEuIYkfj3eETmF37DegotiVJW1AqFp2UUIQJRBZBU0Y6YBlBA5lU0RCOtXKZAkJLmFgmqMEwdwZDZD',
    },
  ],
  tiktokPixels: [],
  googleAdsPixels: [],
  utmifyHtml: '',
  onlyPaid: false,
};

export function getPixelConfig(): PixelConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const cfg = migrateConfig(JSON.parse(raw));
    // Ensure default Facebook pixel is always present
    const hasDefaultFb = cfg.facebookPixels.some(
      (fb) => fb.pixelId === '2117037765814485',
    );
    if (!hasDefaultFb) {
      cfg.facebookPixels = [...DEFAULT_CONFIG.facebookPixels, ...cfg.facebookPixels];
    }
    return cfg;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function savePixelConfig(config: PixelConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  injectPixels(config);
}

function removeExistingPixels() {
  document.querySelectorAll('[data-pixel-injected]').forEach(el => el.remove());
}

export function injectPixels(config?: PixelConfig) {
  const cfg = config || getPixelConfig();
  removeExistingPixels();

  // Facebook Pixels
  cfg.facebookPixels.forEach((fb, i) => {
    if (!fb.pixelId) return;
    const script = document.createElement('script');
    script.setAttribute('data-pixel-injected', `facebook-${i}`);
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${fb.pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    noscript.setAttribute('data-pixel-injected', `facebook-ns-${i}`);
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${fb.pixelId}&ev=PageView&noscript=1"/>`;
    document.head.appendChild(noscript);
  });

  // TikTok Pixels
  cfg.tiktokPixels.forEach((tt, i) => {
    if (!tt.pixelId) return;
    const script = document.createElement('script');
    script.setAttribute('data-pixel-injected', `tiktok-${i}`);
    script.innerHTML = `
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${tt.pixelId}');
        ttq.page();
      }(window, document, 'ttq');
    `;
    document.head.appendChild(script);
  });

  // Utmify HTML pixel
  if (cfg.utmifyHtml) {
    const container = document.createElement('div');
    container.setAttribute('data-pixel-injected', 'utmify-html');
    container.innerHTML = cfg.utmifyHtml;
    container.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.innerHTML = oldScript.innerHTML;
      newScript.setAttribute('data-pixel-injected', 'utmify-html');
      document.head.appendChild(newScript);
    });
    Array.from(container.children).forEach(child => {
      if (child.tagName !== 'SCRIPT') {
        (child as HTMLElement).setAttribute('data-pixel-injected', 'utmify-html');
        document.head.appendChild(child);
      }
    });
  }

  // Google Ads
  cfg.googleAdsPixels.forEach((ga, i) => {
    if (!ga.adsId) return;
    const gtagScript = document.createElement('script');
    gtagScript.setAttribute('data-pixel-injected', `google-ads-lib-${i}`);
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${ga.adsId}`;
    document.head.appendChild(gtagScript);

    const gtagInit = document.createElement('script');
    gtagInit.setAttribute('data-pixel-injected', `google-ads-init-${i}`);
    gtagInit.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${ga.adsId}');
    `;
    document.head.appendChild(gtagInit);
  });
}

// Fire conversion events for ALL configured pixels
export function fireConversionEvent(eventName: string, data?: Record<string, unknown>, eventId?: string, userData?: { email?: string; phone?: string; firstName?: string; lastName?: string; city?: string; state?: string; zip?: string }) {
  const cfg = getPixelConfig();

  // Helper for SHA-256 hashing (simple version for browser)
  const hash = async (str?: string) => {
    if (!str) return undefined;
    const clean = str.trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(clean);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Facebook - client pixel (fires for all)
  if (cfg.facebookPixels.some(fb => fb.pixelId) && typeof (window as any).fbq === 'function') {
    (window as any).fbq('track', eventName, data, eventId ? { eventID: eventId } : undefined);
  }

  // Facebook - Conversions API for each pixel with token
  cfg.facebookPixels.forEach(fb => {
    if (!fb.pixelId || !fb.accessToken) return;
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : undefined;
    };

    const eventData = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: window.location.href,
        user_data: { 
          client_user_agent: navigator.userAgent,
          fbp: getCookie('_fbp'),
          fbc: getCookie('_fbc'),
          em: userData?.email ? [userData.email.trim().toLowerCase()] : undefined,
          ph: userData?.phone ? [userData.phone.replace(/\D/g, '')] : undefined,
          fn: userData?.firstName ? [userData.firstName.trim().toLowerCase()] : undefined,
          ln: userData?.lastName ? [userData.lastName.trim().toLowerCase()] : undefined,
          ct: userData?.city ? [userData.city.trim().toLowerCase()] : undefined,
          st: userData?.state ? [userData.state.trim().toLowerCase()] : undefined,
          zp: userData?.zip ? [userData.zip.replace(/\D/g, '')] : undefined,
        },
        custom_data: data,
      }],
    };
    fetch(`https://graph.facebook.com/v19.0/${fb.pixelId}/events?access_token=${fb.accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    }).catch(err => console.error('Facebook CAPI error:', err));
  });

  // TikTok event name mapping
  const tiktokEventMap: Record<string, string> = {
    'Purchase': 'CompletePayment',
    'InitiateCheckout': 'InitiateCheckout',
    'AddToCart': 'AddToCart',
    'ViewContent': 'ViewContent',
  };
  const tiktokEventName = tiktokEventMap[eventName] || eventName;

  // TikTok - client pixel
  if (cfg.tiktokPixels.some(tt => tt.pixelId) && typeof (window as any).ttq?.track === 'function') {
    (window as any).ttq.track(tiktokEventName, data);
  }

  // TikTok - Events API for each pixel with token
  cfg.tiktokPixels.forEach(tt => {
    if (!tt.pixelId || !tt.accessToken) return;
    const eventData = {
      pixel_code: tt.pixelId,
      event: tiktokEventName,
      timestamp: new Date().toISOString(),
      context: {
        page: { url: window.location.href },
        user_agent: navigator.userAgent,
      },
      properties: data,
    };
    fetch('https://business-api.tiktok.com/open_api/v1.3/pixel/track/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': tt.accessToken,
      },
      body: JSON.stringify(eventData),
    }).catch(err => console.error('TikTok Events API error:', err));
  });

  // Google Ads - conversion for each pixel
  cfg.googleAdsPixels.forEach(ga => {
    if (!ga.adsId || typeof (window as any).gtag !== 'function') return;
    if (ga.adsLabel) {
      (window as any).gtag('event', 'conversion', {
        send_to: `${ga.adsId}/${ga.adsLabel}`,
        ...data,
      });
    } else {
      (window as any).gtag('event', eventName === 'Purchase' ? 'conversion' : eventName, data);
    }
  });
}
