import fs from 'fs';
import path from 'path';

const DIR = './full_store';

const fallbackScript = `
<script>
    (function() {
        const fixUrl = (url) => {
            if (!url) return null;
            let path = url;
            if (url.startsWith('http')) {
                try {
                    const parsed = new URL(url);
                    if (parsed.hostname !== 'localhost' && parsed.hostname !== 'wwwesncomqedu.arktrix.com') return null;
                    path = parsed.pathname;
                } catch(e) { return null; }
            }
            if (path.startsWith('/') && !path.endsWith('.html') && !path.includes('.')) {
                const parts = path.split('/').filter(Boolean);
                if (parts.length >= 2) {
                    return '/' + parts[0] + '_' + parts.slice(1).join('_') + '.html';
                }
            }
            return null;
        };

        document.addEventListener('click', (e) => {
            const target = e.target.closest('a, [href], [data-href], [data-url]');
            if (target) {
                const url = target.getAttribute('href') || target.getAttribute('data-href') || target.getAttribute('data-url');
                const fixed = fixUrl(url);
                if (fixed) {
                    window.location.href = fixed;
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }, true);
    })();
</script>
`;

function patchFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/<script>\s*\(function\(\)\s*{\s*const fixUrl = \(url\) => {[\s\S]*?<\/script>/g, '');
    if (content.includes('</body>')) {
        content = content.replace('</body>', fallbackScript + '</body>');
    } else {
        content += fallbackScript;
    }
    fs.writeFileSync(filePath, content);
}

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html'));
files.forEach(f => patchFile(path.join(DIR, f)));
console.log(`Fixed fallback script in ${files.length} files.`);
