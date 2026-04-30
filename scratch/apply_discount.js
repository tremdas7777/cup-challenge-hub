import fs from 'fs';

['./full_store/index.html', './full_store/collections_all.html', './full_store/collections_bestseller.html'].forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    const bannerHtml = `
    <div style="background: #ff0000; color: #fff; text-align: center; padding: 25px; font-size: 28px; font-weight: 900; width: 100%; position: relative; z-index: 9999; box-shadow: 0 4px 10px rgba(0,0,0,0.3); text-transform: uppercase; letter-spacing: 2px;">
        🚀 BLACK FRIDAY ANTECIPADO: 40% OFF EM TODA A COLEÇÃO! 🚀
    </div>
    <style>
        .discount-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ff0000;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            z-index: 10;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .product-card, .main-navigation__bestseller-item, .collection-product {
            position: relative;
        }
    </style>
    <script>
        window.addEventListener('load', () => {
            // Update Prices
            const prices = document.querySelectorAll('.price, .money, .product-card__price, .price__regular');
            prices.forEach(p => {
                const text = p.innerText;
                const match = text.match(/([0-9]+,[0-9]{2})/);
                if (match && !p.dataset.discounted) {
                    const oldPrice = parseFloat(match[1].replace(',', '.'));
                    const newPrice = (oldPrice * 0.6).toFixed(2).replace('.', ',');
                    p.innerHTML = '<span style="text-decoration: line-through; opacity: 0.5; font-size: 0.8em; margin-right: 8px;">' + text + '</span> <span style="color: #ff0000; font-weight: 800;">€' + newPrice + '</span>';
                    p.dataset.discounted = "true";
                }
            });

            // Add Badges
            const cards = document.querySelectorAll('.product-card, [data-track], .main-navigation__bestseller-item');
            cards.forEach(card => {
                if (!card.querySelector('.discount-badge')) {
                    const badge = document.createElement('div');
                    badge.className = 'discount-badge';
                    badge.innerText = '-40% OFF';
                    card.style.position = 'relative';
                    card.appendChild(badge);
                }
            });

            // Update Headers
            const headers = document.querySelectorAll('h1, .collection-header__title');
            headers.forEach(h => {
                if (h.innerText.includes('Bestseller') || h.innerText.includes('Coleção')) {
                    h.innerHTML += ' <span style="color: #ff0000;">(40% OFF)</span>';
                }
            });
        });
    </script>
    `;

    content = content.replace('<body>', '<body>' + bannerHtml);
    fs.writeFileSync(filePath, content);
    console.log('Applied enhanced discount to ' + filePath);
});
