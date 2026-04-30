import fs from 'fs';
import path from 'path';

const DIR = './full_store';

const freshScript = `
<script>
    (function() {
        console.log('Fallback script active');
        function fixPath(p) {
            if (!p) return null;
            // Clean up the path
            let clean = p.split('?')[0].split('#')[0];
            if (clean.startsWith('http')) {
                try { clean = new URL(clean).pathname; } catch(e) { return null; }
            }
            if (clean.startsWith('//')) {
                clean = clean.substring(clean.indexOf('/', 2));
            }
            
            if (clean.startsWith('/') && !clean.endsWith('.html') && !clean.includes('.')) {
                const parts = clean.split('/').filter(Boolean);
                if (parts.length >= 2) {
                    return '/' + parts[0] + '_' + parts.slice(1).join('_') + '.html';
                }
            }
            return null;
        }

        document.addEventListener('click', function(e) {
            const el = e.target.closest('a, [href], [data-href]');
            if (!el) return;
            const href = el.getAttribute('href') || el.getAttribute('data-href');
            const fixed = fixPath(href);
            if (fixed) {
                console.log('Redirecting to:', fixed);
                window.location.href = fixed;
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    })();
</script>
`;

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html'));
files.forEach(f => {
    const filePath = path.join(DIR, f);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Aggressively remove ANY previous fallback scripts
    content = content.replace(/<script>\s*\(function\(\)\s*{[\s\S]*?<\/script>/g, '');
    
    // Inject fresh one
    content = content.replace('</body>', freshScript + '</body>');
    
    fs.writeFileSync(filePath, content);
});
console.log(`Cleaned and re-injected fallback into ${files.length} files.`);
