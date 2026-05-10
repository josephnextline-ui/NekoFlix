const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const puppeteer = require('puppeteer-core');

const PORT = process.env.PORT || 3000;
const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/chromium-browser';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const STATIC_DIR = __dirname;

// MIME types for static files
const MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.webp': 'image/webp',
};

// Server embed URL builders
const SERVER_URLS = {
    vidnest: (id, type, s, e) => type === 'movie' ? `https://vidnest.fun/movie/${id}` : `https://vidnest.fun/tv/${id}/${s}/${e}`,
    vidzee: (id, type, s, e) => type === 'movie' ? `https://player.vidzee.wtf/embed/movie/${id}` : `https://player.vidzee.wtf/embed/tv/${id}/${s}/${e}`,
    vidlink: (id, type, s, e) => type === 'movie' ? `https://vidlink.pro/movie/${id}` : `https://vidlink.pro/tv/${id}/${s}/${e}`,
    vidfast: (id, type, s, e) => type === 'movie' ? `https://vidfast.pro/movie/${id}` : `https://vidfast.pro/tv/${id}/${s}/${e}`,
    videasy: (id, type, s, e) => type === 'movie' ? `https://player.videasy.net/movie/${id}` : `https://player.videasy.net/tv/${id}/${s}/${e}`,
    vidking: (id, type, s, e) => type === 'movie' ? `https://www.vidking.net/embed/movie/${id}` : `https://www.vidking.net/embed/tv/${id}/${s}/${e}`,
};

// --- Browser pool for extraction ---
let browser = null;

async function getBrowser() {
    if (!browser || !browser.isConnected()) {
        browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--single-process',
            ]
        });
    }
    return browser;
}

// --- Extract stream by loading embed page and intercepting network ---
async function extractFromServer(serverId, id, type, season, episode) {
    const urlBuilder = SERVER_URLS[serverId];
    if (!urlBuilder) return null;

    const embedUrl = urlBuilder(id, type, season, episode);
    const b = await getBrowser();
    const page = await b.newPage();

    const streams = [];
    const subtitles = [];

    try {
        await page.setUserAgent(USER_AGENT);
        await page.setViewport({ width: 1280, height: 720 });

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const rtype = req.resourceType();
            const rurl = req.url();
            if (['image', 'font'].includes(rtype)) { req.abort(); return; }
            if (rurl.includes('.m3u8')) { if (!streams.includes(rurl)) streams.push(rurl); }
            if (rurl.includes('.vtt') || rurl.includes('.srt') || rurl.match(/subtitle|caption/i)) {
                if (!subtitles.includes(rurl)) subtitles.push(rurl);
            }
            req.continue();
        });

        page.on('response', async (response) => {
            try {
                const ct = response.headers()['content-type'] || '';
                const rurl = response.url();
                if (ct.includes('mpegurl') || rurl.includes('.m3u8')) {
                    if (!streams.includes(rurl)) streams.push(rurl);
                }
                if (ct.includes('vtt') || ct.includes('subtitle')) {
                    if (!subtitles.includes(rurl)) subtitles.push(rurl);
                }
            } catch (e) {}
        });

        await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});

        // Click play buttons to trigger stream loading
        await page.evaluate(() => {
            ['button', '.play', '[class*=play]', '.btn', '[class*=start]', '.vjs-big-play-button'].forEach(sel => {
                document.querySelectorAll(sel).forEach(el => { try { el.click(); } catch(e) {} });
            });
        }).catch(() => {});

        await waitForStream(streams, 10000);

        // Fallback: check page HTML for m3u8 URLs
        if (streams.length === 0) {
            const content = await page.content();
            const matches = content.match(/https?:\/\/[^\s"'<>\]]+\.m3u8[^\s"'<>\]]*/gi);
            if (matches) matches.forEach(m => { if (!streams.includes(m)) streams.push(m); });
        }

        // Check for subtitle tracks in DOM
        if (subtitles.length === 0) {
            const trackSrcs = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('track[src]')).map(t => ({ src: t.src, lang: t.label || t.srclang || 'Unknown' }));
            }).catch(() => []);
            trackSrcs.forEach(t => { if (t.src) subtitles.push(t.src); });
        }

    } catch (e) {
        console.error(`Extract error for ${serverId}:`, e.message);
    } finally {
        await page.close().catch(() => {});
    }

    if (streams.length === 0) return null;

    const uniqueStreams = [...new Set(streams)];
    const master = uniqueStreams.find(s => s.includes('master')) || uniqueStreams[0];

    return {
        success: true,
        server: serverId,
        stream: '/proxy?url=' + encodeURIComponent(master),
        allStreams: uniqueStreams.map(s => '/proxy?url=' + encodeURIComponent(s)),
        subtitles: [...new Set(subtitles)].map((s, i) => ({
            lang: `Track ${i + 1}`,
            url: '/proxy?url=' + encodeURIComponent(s)
        }))
    };
}

function waitForStream(streams, timeout) {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = setInterval(() => {
            if (streams.length > 0 || Date.now() - start > timeout) { clearInterval(check); resolve(); }
        }, 300);
    });
}

// --- HLS Proxy ---
const REFERER_MAP = {
    '1shows.app': 'https://player.vidzee.wtf/',
    'vdrk.site': 'https://player.vidzee.wtf/',
    'vidnest.fun': 'https://vidnest.fun/',
    'vidlink.pro': 'https://vidlink.pro/',
    'vidfast.pro': 'https://vidfast.pro/',
    'videasy.net': 'https://player.videasy.net/',
    'vidking.net': 'https://www.vidking.net/',
};

function getRefererForUrl(hostname) {
    for (const [domain, referer] of Object.entries(REFERER_MAP)) {
        if (hostname.includes(domain)) return referer;
    }
    return null;
}

function fetchRemote(targetUrl) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const customReferer = getRefererForUrl(parsed.hostname);
        const headers = {
            'User-Agent': USER_AGENT,
            'Referer': customReferer || parsed.origin + '/',
            'Origin': customReferer ? new URL(customReferer).origin : parsed.origin,
        };
        const proto = parsed.protocol === 'https:' ? https : http;
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: headers
        };
        const req = proto.request(options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const redirectUrl = res.headers.location.startsWith('http')
                    ? res.headers.location : new URL(res.headers.location, targetUrl).href;
                fetchRemote(redirectUrl).then(resolve).catch(reject);
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

function rewriteM3u8(content, baseUrl) {
    return content.split('\n').map(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) {
            if (line.includes('URI="')) {
                return line.replace(/URI="([^"]+)"/g, (m, uri) => {
                    const absolute = uri.startsWith('http') ? uri : new URL(uri, baseUrl).href;
                    return `URI="/proxy?url=${encodeURIComponent(absolute)}"`;
                });
            }
            return line;
        }
        const absolute = line.startsWith('http') ? line : new URL(line, baseUrl).href;
        return '/proxy?url=' + encodeURIComponent(absolute);
    }).join('\n');
}

// --- Unified HTTP Server (static + extract + proxy) ---
const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // --- API Routes ---

    if (parsed.pathname === '/health') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    if (parsed.pathname === '/extract') {
        const { id, type, season, episode, servers } = parsed.query;
        if (!id || !type) {
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, error: 'Missing id or type param' }));
            return;
        }
        const serverList = servers ? servers.split(',') : Object.keys(SERVER_URLS);
        const tried = [];
        for (const serverId of serverList) {
            const sid = serverId.trim();
            if (!SERVER_URLS[sid]) continue;
            tried.push(sid);
            try {
                const result = await extractFromServer(sid, id, type, season || '1', episode || '1');
                if (result) {
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(200);
                    res.end(JSON.stringify(result));
                    return;
                }
            } catch (e) {
                console.error(`Extraction error for ${sid}:`, e.message);
            }
        }
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: false, error: 'Could not extract stream', tried }));
        return;
    }

    if (parsed.pathname === '/proxy') {
        const targetUrl = parsed.query.url;
        if (!targetUrl) { res.writeHead(400); res.end('Missing url parameter'); return; }
        try {
            const remote = await fetchRemote(targetUrl);
            const contentType = remote.headers['content-type'] || '';
            const isM3u8 = targetUrl.includes('.m3u8') || contentType.includes('mpegurl');
            if (isM3u8 && remote.statusCode === 200) {
                const rewritten = rewriteM3u8(remote.body.toString('utf-8'), targetUrl);
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                res.writeHead(200);
                res.end(rewritten);
            } else {
                if (contentType) res.setHeader('Content-Type', contentType);
                if (remote.headers['content-length']) res.setHeader('Content-Length', remote.headers['content-length']);
                res.writeHead(remote.statusCode);
                res.end(remote.body);
            }
        } catch (err) {
            res.writeHead(502);
            res.end('Proxy error: ' + err.message);
        }
        return;
    }

    // --- Static File Serving + SPA Fallback ---
    let filePath = parsed.pathname === '/' ? '/index.html' : parsed.pathname;

    // If path has no extension, serve index.html (SPA fallback)
    if (!path.extname(filePath)) {
        filePath = '/index.html';
    }

    const fullPath = path.join(STATIC_DIR, filePath);
    // Security: prevent directory traversal
    if (!fullPath.startsWith(STATIC_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }

    fs.readFile(fullPath, (err, data) => {
        if (err) {
            // SPA fallback for missing files
            fs.readFile(path.join(STATIC_DIR, 'index.html'), (err2, indexData) => {
                if (err2) { res.writeHead(404); res.end('Not found'); return; }
                res.setHeader('Content-Type', 'text/html');
                res.writeHead(200);
                res.end(indexData);
            });
            return;
        }
        const ext = path.extname(fullPath);
        res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
        res.writeHead(200);
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`NekoFlix server running on http://localhost:${PORT}`);
    console.log(`Chrome: ${CHROME_PATH}`);
});

process.on('SIGINT', async () => { if (browser) await browser.close(); process.exit(); });
process.on('SIGTERM', async () => { if (browser) await browser.close(); process.exit(); });
