// Captura dados de atribuição de marketing (UTMs + cookies do Facebook)
// para que cada venda possa ser corretamente associada à campanha que a originou
// no Gerenciador de Anúncios.

const UTM_KEYS = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term', 'src', 'sck'] as const;

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

function readUtmsFromUrlAndStorage(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  let params: URLSearchParams | null = null;
  try { params = new URLSearchParams(window.location.search); } catch { params = null; }

  for (const key of UTM_KEYS) {
    let value: string | null = null;
    if (params) value = params.get(key);
    if (value) {
      try { sessionStorage.setItem(`utm_${key}`, value); } catch {}
      try { localStorage.setItem(`utm_${key}`, value); } catch {}
    } else {
      try { value = sessionStorage.getItem(`utm_${key}`); } catch {}
      if (!value) {
        try { value = localStorage.getItem(`utm_${key}`); } catch {}
      }
    }
    out[key] = value;
  }
  return out;
}

function buildFbcFromFbclid(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get('fbclid');
    if (!fbclid) return null;
    // Formato oficial recomendado pelo Facebook: fb.<subdomain>.<timestamp>.<fbclid>
    const ts = Math.floor(Date.now() / 1000);
    return `fb.1.${ts}.${fbclid}`;
  } catch {
    return null;
  }
}

export interface AttributionPayload {
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
  src: string | null;
  sck: string | null;
  fbp: string | null;
  fbc: string | null;
  fbclid: string | null;
  client_user_agent: string | null;
  source_url: string | null;
  referrer: string | null;
}

export function getAttribution(): AttributionPayload {
  const utms = readUtmsFromUrlAndStorage();
  let fbclid: string | null = null;
  try { fbclid = new URLSearchParams(window.location.search).get('fbclid'); } catch {}

  const fbcCookie = getCookie('_fbc');
  const fbcDerived = !fbcCookie ? buildFbcFromFbclid() : null;

  return {
    utm_source: utms.utm_source ?? null,
    utm_campaign: utms.utm_campaign ?? null,
    utm_medium: utms.utm_medium ?? null,
    utm_content: utms.utm_content ?? null,
    utm_term: utms.utm_term ?? null,
    src: utms.src ?? null,
    sck: utms.sck ?? null,
    fbp: getCookie('_fbp'),
    fbc: fbcCookie || fbcDerived,
    fbclid,
    client_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    source_url: typeof window !== 'undefined' ? window.location.href : null,
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
  };
}

/** Helper para o formato esperado pelo Utmify (trackingParameters). */
export function getTrackingParameters(): Record<string, string | null> {
  const a = getAttribution();
  return {
    src: a.src,
    sck: a.sck,
    utm_source: a.utm_source,
    utm_campaign: a.utm_campaign,
    utm_medium: a.utm_medium,
    utm_content: a.utm_content,
    utm_term: a.utm_term,
  };
}
