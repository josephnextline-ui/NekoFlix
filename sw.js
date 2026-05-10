const CACHE_NAME = 'nekoflix-v1';

// === AD BLOCKER: Domain blocklist ===
const AD_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
  'adservice.google.com', 'pagead2.googlesyndication.com',
  'adnxs.com', 'adsrvr.org', 'adcolony.com', 'admob.com',
  'facebook.com/tr', 'connect.facebook.net/en_US/fbevents',
  'amazon-adsystem.com', 'aax.amazon-adsystem.com',
  'popads.net', 'popcash.net', 'popunder.net', 'popmyads.com',
  'propellerads.com', 'propellerclick.com', 'onclickmax.com',
  'onclicksuper.com', 'onclickperformance.com', 'onclickmega.com',
  'clickadu.com', 'clickadilla.com', 'clickaine.com',
  'juicyads.com', 'exoclick.com', 'exosrv.com', 'exoticads.com',
  'trafficjunky.com', 'trafficfactory.biz', 'tsyndicate.com',
  'revcontent.com', 'mgid.com', 'outbrain.com', 'taboola.com',
  'zergnet.com', 'zemanta.com',
  'betrad.com', 'bluekai.com', 'krxd.net', 'moatads.com',
  'scorecardresearch.com', 'quantserve.com', 'adsafeprotected.com',
  'serving-sys.com', 'eyereturn.com', 'flashtalking.com',
  'smaato.net', 'inmobi.com', 'unity3d.com/ads', 'unityads.unity3d.com',
  'pubmatic.com', 'openx.net', 'rubiconproject.com', 'casalemedia.com',
  'indexexchange.com', 'spotxchange.com', 'sharethrough.com',
  'ad.doubleclick.net', 'stats.wp.com',
  'wpadmngr.com', 'revenuehits.com', 'bidvertiser.com',
  'hilltopads.net', 'hilltopads.com',
  'ad-maven.com', 'ad-delivery.net', 'adsterra.com',
  'adsterratech.com', 'adskeeper.co.uk', 'adskeeper.com',
  'monetag.com', 'surfe.pro', 'richads.com',
  'vooservers.com', 'streamads.net',
  'betteradsolutions.com', 'betterpopup.com',
  'syndication.realsrv.com', 'realsrv.com',
  'mopub.com', 'startappservice.com', 'aerserv.com',
  'disqusads.com', 'viglink.com', 'skimresources.com',
  'cdn.popcash.net', 'cdn.popads.net',
  'go.onclasrv.com', 'onclasrv.com', 'onclkds.com',
  'vemtoutcede.com', 'dolohen.com', 'aralfrede.com',
  'actiede.com', 'ede.com', 'couptighrecede.com',
  'notifpushing.com', 'push-notification.com', 'pushwoosh.com',
  'onesignal.com', 'pushengage.com', 'gravitec.net',
  'cdn.runative-syndicate.com', 'runative-syndicate.com',
  'gaming-adult.com', 'tsyndicate.com',
  'a-ads.com', 'bitmedia.io', 'coinzilla.com',
  'ad.mail.ru', 'marketgid.com',
  'vidoomy.com', 'teads.tv', 'smartadserver.com',
  'adform.net', 'adroll.com', 'criteo.com', 'criteo.net',
  'mediavine.com', 'gumgum.com',
  'lockerdome.com', 'connatix.com',
  'imasdk.googleapis.com', 'innovid.com', 'springserve.com',
  'aniview.com', 'primis.tech',
  'vdo.ai', 'vidazoo.com', 'anyclip.com',
  'acscdn.com', 'acsbapp.com', 'accessibilitywidget.io'
];

// Patterns that indicate ad/tracking requests
const AD_PATH_PATTERNS = [
  /\/ads\//i, /\/ad\//i, /\/advert/i, /\/banner/i,
  /\/popunder/i, /\/popup/i, /\/pop\./i,
  /\/sponsor/i, /\/track(er|ing)?/i,
  /\/pixel/i, /\/beacon/i, /\/analytics/i,
  /\/click\?/i, /\/redirect\?/i,
  /vastxml/i, /vpaid/i, /\/vast\//i, /\/vmap\//i,
  /\.gif\?.*click/i, /\/imp\?/i, /\/impression/i
];

function isAdRequest(url) {
  const hostname = new URL(url).hostname;
  // Check domain blocklist
  for (const domain of AD_DOMAINS) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      return true;
    }
  }
  // Check path patterns
  for (const pattern of AD_PATH_PATTERNS) {
    if (pattern.test(url)) {
      return true;
    }
  }
  return false;
}

const IMG_CACHE = 'nekoflix-img-v1';
const API_CACHE = 'nekoflix-api-v1';
const IMG_CACHE_MAX = 300;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/index.html', '/styles.css', '/app.js', '/manifest.json', '/icon-192.png', '/icon-512.png']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Clean up old caches
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== IMG_CACHE && k !== API_CACHE)
            .map(k => caches.delete(k))
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // Block ad requests with an empty response
  if (isAdRequest(url)) {
    e.respondWith(new Response('', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    }));
    return;
  }

  // SPA navigation fallback: serve index.html for same-origin navigation requests
  if (e.request.mode === 'navigate') {
    const requestUrl = new URL(e.request.url);
    const path = requestUrl.pathname;
    if (!path.includes('.') || path === '/') {
      e.respondWith(
        fetch('/index.html').then((response) => {
          if (response.ok) return response;
          return caches.match('/index.html');
        }).catch(() => caches.match('/index.html'))
      );
      return;
    }
  }

  // Cache-first for TMDB images (they never change)
  if (url.includes('image.tmdb.org')) {
    e.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const response = await fetch(e.request);
        if (response.ok) {
          // Evict old entries if cache is large
          const keys = await cache.keys();
          if (keys.length > IMG_CACHE_MAX) {
            await Promise.all(keys.slice(0, 50).map(k => cache.delete(k)));
          }
          cache.put(e.request, response.clone());
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Stale-while-revalidate for API responses
  if (url.includes('api.themoviedb.org')) {
    e.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        const fetchPromise = fetch(e.request).then((response) => {
          if (response.ok) cache.put(e.request, response.clone());
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Network-first strategy for everything else
  e.respondWith(
    fetch(e.request).then((response) => {
      if (response.ok && e.request.method === 'GET') {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseClone);
        });
      }
      return response;
    }).catch(() => caches.match(e.request))
  );
});
