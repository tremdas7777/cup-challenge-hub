import fs from 'fs';
import path from 'path';
import https from 'https';

const BASE_URL = 'https://wwwesncomqedu.arktrix.com';
const OUTPUT_DIR = './full_store';

async function fetchUrl(url) {
    const fullUrl = url.startsWith('http') ? url : BASE_URL + url;
    console.log(`Fetching: ${fullUrl}`);
    return new Promise((resolve, reject) => {
        const req = https.get(fullUrl, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchUrl(res.headers.location));
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Status ${res.statusCode}`));
            }
            let data = [];
            res.on('data', (chunk) => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
            res.on('error', (err) => reject(err));
        });
        req.on('error', (err) => reject(err));
        req.end();
    });
}

async function saveFile(filePath, content) {
    const fullPath = path.join(OUTPUT_DIR, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

    let urls = [
        '/',
        '/collections/all',
        '/cart',
        '/pages/ueber-uns'
    ];

    // Load products from JSON if available
    try {
        const productsJson = JSON.parse(fs.readFileSync('./site_download/all_products.json', 'utf8'));
        const productHandles = productsJson.products.map(p => `/products/${p.handle}`);
        urls = [...urls, ...productHandles];
        console.log(`Added ${productHandles.length} products to crawl.`);
    } catch (e) {
        console.error('Could not load all_products.json, using basic list.');
    }

    // Load URLs from urls.txt if available
    try {
        const urlsTxt = fs.readFileSync('./site_download/urls.txt', 'utf8');
        const extraUrls = urlsTxt.split('\n').filter(u => u.startsWith('/') && !u.includes('.'));
        urls = [...new Set([...urls, ...extraUrls])];
    } catch (e) {
        console.error('Could not load urls.txt');
    }

    console.log(`Starting crawl of ${urls.length} pages...`);

    const assetUrls = new Set();

    for (const url of urls) {
        try {
            const data = await fetchUrl(url);
            const html = data.toString();
            const fileName = url === '/' ? 'index.html' : url.replace(/^\//, '').replace(/\//g, '_').split('?')[0] + '.html';
            await saveFile(fileName, data);

            // Extract assets
            const cssRegex = /href="([^"]+\.css(\?[^"]*)?)"/g;
            const jsRegex = /src="([^"]+\.js(\?[^"]*)?)"/g;
            const imgRegex = /src="([^"]+\.(png|jpg|jpeg|svg|webp)(\?[^"]*)?)"/g;
            
            let match;
            [cssRegex, jsRegex, imgRegex].forEach(regex => {
                while ((match = regex.exec(html)) !== null) {
                    let assetUrl = match[1];
                    if (assetUrl.startsWith('//')) assetUrl = 'https:' + assetUrl;
                    if (assetUrl.startsWith('/')) assetUrl = BASE_URL + assetUrl;
                    assetUrls.add(assetUrl);
                }
            });

        } catch (e) {
            console.error(`Failed to fetch ${url}: ${e.message}`);
        }
    }

    console.log(`Downloading ${assetUrls.size} assets...`);
    let count = 0;
    for (const assetUrl of assetUrls) {
        if (!assetUrl.includes('cdn.shopify.com') && !assetUrl.includes('arktrix.com')) continue;
        if (count > 500) break; // Limit to 500 assets to avoid massive downloads
        try {
            const assetData = await fetchUrl(assetUrl);
            const urlPath = new URL(assetUrl).pathname;
            const assetName = path.join('assets', path.basename(urlPath));
            await saveFile(assetName, assetData);
            count++;
        } catch (e) {
            // console.error(`Failed to download asset: ${assetUrl}`);
        }
    }

    console.log('Done!');
}

main();
