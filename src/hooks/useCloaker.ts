import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Advanced cloaker with multi-layer detection:
 * 1. Client-side browser fingerprinting (headless, webdriver, automation)
 * 2. Behavioral analysis (interaction patterns)
 * 3. Server-side UA/IP verification
 * 4. Canvas/WebGL fingerprinting anomalies
 */

// Client-side bot detection checks
const detectClientSideBot = (): { isBot: boolean; signals: string[] } => {
  const signals: string[] = [];

  // 1. Navigator.webdriver (set by Selenium, Puppeteer, Playwright)
  if ((navigator as any).webdriver) {
    signals.push('webdriver');
  }

  // 2. Headless Chrome indicators
  if (/HeadlessChrome/i.test(navigator.userAgent)) {
    signals.push('headless_chrome_ua');
  }

  // 3. Missing plugins (headless browsers have 0 plugins)
  if (navigator.plugins && navigator.plugins.length === 0) {
    signals.push('no_plugins');
  }

  // 4. Missing languages
  if (!navigator.languages || navigator.languages.length === 0) {
    signals.push('no_languages');
  }

  // 5. Chrome without chrome object (headless)
  const isChrome = /Chrome/.test(navigator.userAgent);
  if (isChrome && !(window as any).chrome) {
    signals.push('chrome_without_chrome_obj');
  }

  // 6. Permissions API anomaly (headless returns "denied" for notifications instantly)
  // We'll check this async separately

  // 7. Connection API check (bots often don't have it)
  if (isChrome && !(navigator as any).connection) {
    signals.push('no_connection_api');
  }

  // 8. Screen dimensions anomaly
  if (window.screen.width === 0 || window.screen.height === 0) {
    signals.push('zero_screen');
  }
  if (window.outerWidth === 0 && window.outerHeight === 0) {
    signals.push('zero_outer_dimensions');
  }

  // 9. Check for automation-related window properties
  const automationProps = [
    '__nightmare', '__selenium_unwrapped', '__webdriver_evaluate',
    '__driver_evaluate', '__webdriver_script_function',
    '__webdriver_script_func', '__webdriver_script_fn',
    '_Selenium_IDE_Recorder', '_selenium', 'callSelenium',
    '__phantomas', 'Buffer', 'emit', 'spawn',
    'domAutomation', 'domAutomationController',
    '__lastWatirAlert', '__lastWatirConfirm', '__lastWatirPrompt',
    '_WEBDRIVER_ELEM_CACHE', 'ChromeDriverw',
    '__webdriverFuncgoog_$evalByXPath', 'cdc_adoQpoasnfa76pfcZLmcfl_Array',
    'cdc_adoQpoasnfa76pfcZLmcfl_Promise',
    'cdc_adoQpoasnfa76pfcZLmcfl_Symbol',
  ];

  for (const prop of automationProps) {
    if (prop in window || prop in document) {
      signals.push(`automation_prop:${prop}`);
      break; // One is enough
    }
  }

  // 10. Check document properties set by automation
  const docProps = ['__webdriver_script_fn', 'webdriver', 'driver-evaluate', 'selenium'];
  for (const prop of docProps) {
    if ((document as any)[prop] || document.documentElement.getAttribute(prop)) {
      signals.push(`doc_prop:${prop}`);
      break;
    }
  }

  // 11. Canvas fingerprint test (headless browsers produce uniform results)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Cwm fjordbank', 2, 15);
      const dataUrl = canvas.toDataURL();
      // Empty or very short data URL = likely headless
      if (dataUrl.length < 100) {
        signals.push('canvas_anomaly');
      }
    }
  } catch {
    // Canvas blocked = suspicious
    signals.push('canvas_blocked');
  }

  // 12. WebGL renderer check
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (/SwiftShader|llvmpipe|Mesa/i.test(renderer)) {
          signals.push('software_renderer');
        }
      }
    } else {
      signals.push('no_webgl');
    }
  } catch {
    signals.push('webgl_error');
  }

  // 13. Touch support check vs mobile UA
  const isMobileUA = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isMobileUA && !hasTouch) {
    signals.push('mobile_ua_no_touch');
  }

  // 14. Devtools detection via toString trap
  // (some automated tools trigger devtools-like behavior)

  // 15. Check for inconsistent platform
  const platform = navigator.platform || '';
  if (/Win/.test(navigator.userAgent) && /Linux|Mac/.test(platform)) {
    signals.push('platform_mismatch');
  }

  // Scoring: some signals are strong, some are weak
  const strongSignals = ['webdriver', 'headless_chrome_ua', 'automation_prop', 'doc_prop', 'software_renderer'];
  const strongCount = signals.filter(s => strongSignals.some(ss => s.startsWith(ss))).length;
  const weakCount = signals.length - strongCount;

  // Bot if any strong signal OR 3+ weak signals
  const isBot = strongCount > 0 || weakCount >= 3;

  return { isBot, signals };
};

// Async permission check
const checkPermissionsAnomaly = async (): Promise<boolean> => {
  try {
    if (!navigator.permissions) return false;
    const start = performance.now();
    const result = await navigator.permissions.query({ name: 'notifications' });
    const elapsed = performance.now() - start;
    // Headless browsers resolve permissions instantly and usually as "denied"
    if (result.state === 'denied' && elapsed < 1) {
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
};

export const useCloaker = () => {
  const [isBot, setIsBot] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCloaker = async () => {
      try {
        // 1. Check if cloaker is enabled
        const { data: config } = await supabase
          .from('cloaker_config')
          .select('enabled')
          .limit(1)
          .single();

        if (!config?.enabled) {
          setIsBot(false);
          setLoading(false);
          return;
        }

        // 2. Client-side fingerprinting (runs instantly, no network)
        const clientCheck = detectClientSideBot();
        const permAnomaly = await checkPermissionsAnomaly();
        if (permAnomaly) {
          clientCheck.signals.push('permissions_anomaly');
        }

        if (clientCheck.isBot || permAnomaly) {
          console.log('[Cloaker] Client-side bot detected:', clientCheck.signals);
          setIsBot(true);
          setLoading(false);
          return;
        }

        // 3. Server-side check (UA + IP)
        const { data, error } = await supabase.functions.invoke('cloaker-check', {
          body: {
            // Send client fingerprint data to server for cross-validation
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            colorDepth: window.screen.colorDepth,
            pixelRatio: window.devicePixelRatio,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            languages: navigator.languages?.slice(0, 3),
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            pluginCount: navigator.plugins?.length ?? 0,
          },
        });

        if (error) {
          console.warn('[Cloaker] Server check failed, showing real page:', error);
          setIsBot(false);
        } else {
          setIsBot(data?.isBot ?? false);
          if (data?.isBot) {
            console.log('[Cloaker] Server-side bot detected:', data.reason);
          }
        }
      } catch (err) {
        console.warn('[Cloaker] Error, defaulting to real page:', err);
        setIsBot(false);
      } finally {
        setLoading(false);
      }
    };

    checkCloaker();
  }, []);

  return { isBot, loading };
};
