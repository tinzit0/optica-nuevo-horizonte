(function (global) {
    const root = global.OpticaModules = global.OpticaModules || {};

    function initMobileNavigation() {
        const rawPage = (global.location.pathname.split('/').pop() || 'index').toLowerCase();
        const page = rawPage.endsWith('.html') ? rawPage : `${rawPage}.html`;
        if (page === 'index.html' || global.document.querySelector('.mobile-bottom-nav')) return;

        const links = [
            ['index.html', 'Inicio', '⌂'],
            ['catalogo.html', 'Catálogo', '◫'],
            ['agenda.html', 'Agenda', '◯'],
            ['carrito.html', 'Bolsa', '▣']
        ];
        const nav = global.document.createElement('nav');
        nav.className = 'mobile-bottom-nav';
        nav.setAttribute('aria-label', 'Navegación móvil');
        nav.innerHTML = links.map(([href, label, icon]) => {
            const active = page === href || (page === 'producto.html' && href === 'catalogo.html') || (page === 'checkout.html' && href === 'carrito.html');
            return `<a href="${href}"${active ? ' aria-current="page"' : ''}><span aria-hidden="true">${icon}</span><small>${label}</small></a>`;
        }).join('');
        global.document.body.appendChild(nav);

        const style = global.document.createElement('style');
        style.textContent = `.mobile-bottom-nav{display:none}@media(max-width:760px){body{padding-bottom:76px}button,a,input,select{touch-action:manipulation}button,.btn-gold,.detail-btn,.btn-add,.btn-buy-now,.btn-checkout,.btn-pay-now{min-height:44px}.mobile-bottom-nav{position:fixed;z-index:1000;right:10px;bottom:8px;left:10px;display:grid;grid-template-columns:repeat(4,1fr);padding:7px;background:rgba(16,23,19,.96);border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 12px 35px rgba(0,0,0,.28);backdrop-filter:blur(14px)}.mobile-bottom-nav a{display:flex;min-width:0;min-height:50px;align-items:center;justify-content:center;flex-direction:column;gap:2px;border-radius:11px;color:rgba(255,255,255,.7);text-decoration:none}.mobile-bottom-nav a[aria-current="page"]{background:#b99350;color:#fff}.mobile-bottom-nav a>span{font-size:1.15rem;line-height:1}.mobile-bottom-nav small{font:600 .61rem 'DM Sans',sans-serif}}`;
        global.document.head.appendChild(style);
    }

    root.navigation = Object.freeze({ initMobileNavigation });
})(window);
