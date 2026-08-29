// El cliente se crea en js/supabase-client.js. Mantener este guard permite que
// la tienda siga renderizando el respaldo local si el CDN no está disponible.
let _supabase = window.opticaSupabase || null;
let _ui = window.OpticaModules?.ui || {};
let _products = window.OpticaModules?.products || {};
let _cart = window.OpticaModules?.cart || {};
let _checkout = window.OpticaModules?.checkout || {};
let _navigation = window.OpticaModules?.navigation || {};
let escapeHTML = _ui.escapeHTML || (value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])));
let safeURL = _ui.safeURL || (value => escapeHTML(value));
const safe = value => escapeHTML(value);

const FRONTEND_DEPENDENCIES = [
    ['ui', 'js/modules/ui.js'],
    ['products', 'js/modules/products.js'],
    ['cart', 'js/modules/cart.js'],
    ['checkout', 'js/modules/checkout.js'],
    ['navigation', 'js/modules/navigation.js']
];

function cargarScriptFrontend(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
        document.head.appendChild(script);
    });
}

async function cargarDependenciasFrontend() {
    if (!window.opticaSupabase && window.supabase?.createClient) {
        await cargarScriptFrontend('js/supabase-client.js');
    }
    for (const [name, src] of FRONTEND_DEPENDENCIES) {
        if (!window.OpticaModules?.[name]) await cargarScriptFrontend(src);
    }
    _supabase = window.opticaSupabase || _supabase;
    _ui = window.OpticaModules?.ui || _ui;
    _products = window.OpticaModules?.products || _products;
    _cart = window.OpticaModules?.cart || _cart;
    _checkout = window.OpticaModules?.checkout || _checkout;
    _navigation = window.OpticaModules?.navigation || _navigation;
    escapeHTML = _ui.escapeHTML || escapeHTML;
    safeURL = _ui.safeURL || safeURL;
};

function filtrarProductosCompat(products, criteria) {
    const { categories = [], genders = [], brands = [], shapes = [], colors = [], materials = [], features = [], search = '', minPrice = 0, maxPrice = Infinity } = criteria;
    const normalizedSearch = String(search).trim().toLocaleLowerCase('es');
    return (Array.isArray(products) ? products : []).filter(product => {
        const productFeatures = Array.isArray(product.features) ? product.features : String(product.features || '').split(',').map(value => value.trim()).filter(Boolean);
        const searchable = `${product.brand || ''} ${product.title || ''} ${product.color || ''} ${product.shape || ''} ${product.material || ''}`.toLocaleLowerCase('es');
        const price = Number(product.price) || 0;
        return (!categories.length || categories.includes(product.category))
            && (!genders.length || genders.includes(product.gender))
            && (!brands.length || brands.some(brand => String(product.brand || '').toLowerCase().includes(String(brand).toLowerCase())))
            && (!shapes.length || shapes.includes(product.shape || ''))
            && (!colors.length || colors.includes(product.color || ''))
            && (!materials.length || materials.includes(product.material || ''))
            && features.every(feature => productFeatures.includes(feature))
            && (!normalizedSearch || searchable.includes(normalizedSearch))
            && price >= minPrice && price <= maxPrice;
    });
}

const PRODUCTOS_BASE = [
    { id:'1', title:'Wayfarer Classic', brand:'Ray-Ban', price:119900, category:'optico', gender:'unisex', shape:'rectangular', color:'negro', material:'acetato', features:['nuevo'], image:'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=700&auto=format&fit=crop' },
    { id:'2', title:'Holbrook Dark', brand:'Oakley', price:129900, category:'sol', gender:'hombre', shape:'rectangular', color:'negro', material:'inyectado', features:['polarizado','liviano'], image:'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=700&auto=format&fit=crop' },
    { id:'3', title:'Minimal Transparent', brand:'Prada', price:159900, category:'optico', gender:'mujer', shape:'cat-eye', color:'transparente', material:'acetato', features:['nuevo','liviano'], image:'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?q=80&w=700&auto=format&fit=crop' },
    { id:'4', title:'Gold Hexagon', brand:'Vogue', price:89900, category:'optico', gender:'mujer', shape:'geométrico', color:'dorado', material:'metal', features:['oferta','liviano'], image:'https://images.unsplash.com/photo-1508296695146-257a814070b4?q=80&w=700&auto=format&fit=crop' },
    { id:'5', title:'Medusa Glam', brand:'Versace', price:179900, category:'sol', gender:'mujer', shape:'cat-eye', color:'negro', material:'acetato', features:['nuevo'], image:'https://images.unsplash.com/photo-1577803645773-f96470509666?q=80&w=700&auto=format&fit=crop' },
    { id:'6', title:'Executive Titanium', brand:'Armani', price:149900, category:'optico', gender:'hombre', shape:'rectangular', color:'negro', material:'titanio', features:['liviano'], image:'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?q=80&w=700&auto=format&fit=crop' },
    { id:'7', title:'Aviator Heritage', brand:'Ray-Ban', price:139900, category:'sol', gender:'unisex', shape:'aviador', color:'dorado', material:'metal', features:['polarizado'], image:'https://images.unsplash.com/photo-1508296695146-257a814070b4?q=80&w=700&auto=format&fit=crop' },
    { id:'8', title:'Linea Rossa Sport', brand:'Prada', price:169900, category:'sol', gender:'hombre', shape:'rectangular', color:'negro', material:'inyectado', features:['polarizado','liviano'], image:'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=700&auto=format&fit=crop' },
    { id:'9', title:'Round Metal', brand:'Vogue', price:74900, category:'optico', gender:'unisex', shape:'redondo', color:'dorado', material:'metal', features:['oferta'], image:'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?q=80&w=700&auto=format&fit=crop' },
    { id:'10', title:'Junior Active', brand:'Oakley', price:69900, category:'optico', gender:'infantil', shape:'rectangular', color:'azul', material:'inyectado', features:['liviano'], image:'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=700&auto=format&fit=crop' },
    { id:'11', title:'Havana Signature', brand:'Armani', price:134900, category:'optico', gender:'unisex', shape:'redondo', color:'habano', material:'acetato', features:['nuevo'], image:'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?q=80&w=700&auto=format&fit=crop' },
    { id:'12', title:'Palazzo Edition', brand:'Versace', price:189900, category:'sol', gender:'mujer', shape:'geométrico', color:'habano', material:'acetato', features:['polarizado'], image:'https://images.unsplash.com/photo-1577803645773-f96470509666?q=80&w=700&auto=format&fit=crop' }
];
let PRODUCTOS_LOCALES = [];
let PRODUCTOS_ACTIVOS = [];
let catalogVisibleCount = 48;
const catalogRandomSeed = Math.floor(Math.random() * 2147483647);

async function cargarCatalogoLocal() {
    try {
        const respuesta = await fetch('data/productos.json', { cache: 'default' });
        if (!respuesta.ok) throw new Error(`Catálogo local: ${respuesta.status}`);
        const datos = await respuesta.json();
        PRODUCTOS_LOCALES = Array.isArray(datos) ? datos : [];
        renderizarFiltroMarcas();
    } catch (error) {
        console.warn('No fue posible cargar el catálogo FOOSE:', error);
        PRODUCTOS_LOCALES = [];
    }
}

function renderizarFiltroMarcas() {
    const container = document.querySelector('#brand-filter-options');
    if (!container) return;
    const marcas = [...new Set(PRODUCTOS_LOCALES.map(p => String(p.brand || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es'));
    container.innerHTML = marcas.map(marca => {
        const escapedMarca = safe(marca);
        return `<label><input type="checkbox" class="filter-brand" value="${escapedMarca}"> ${escapedMarca}</label>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    try { await cargarDependenciasFrontend(); }
    catch (error) { console.warn('Módulos frontend no disponibles; se utilizará el modo compatible:', error); }
    await cargarCatalogoLocal();
    initIdentidadMarca();
    _navigation.initMobileNavigation?.();
    renderizarVitrinaMarcas();
    leerParametrosURLYMarcarCheckbox();
    initCatalogoInteractivo();
    cargarProductosConFiltros();
    initNotificaciones();
    initCarrito();
    // Cloudflare Pages puede servir rutas limpias (/carrito, /checkout, /producto).
    // Detectar la vista por su contenido evita depender del nombre físico del archivo.
    if (document.querySelector('.product-detail')) cargarDetalleProducto();
    if (document.querySelector('.cart-items')) renderizarVistaCarrito();
    if (document.querySelector('#checkout-form')) renderizarVistaCheckout();
    try { await initBarraAdmin(); } catch (error) { console.warn('Panel administrativo no disponible:', error); }
});

function initIdentidadMarca() {
    document.querySelectorAll('a.logo, .logo-text').forEach(logo => {
        if (logo.querySelector('.logo-mark') || logo.querySelector('.site-logo-stack')) return;
        logo.innerHTML = '<span class="site-logo-stack"><span>Óptica</span><strong>Nuevo Horizonte</strong><small>Concepción</small></span>';
    });
    document.querySelectorAll('.logo-name').forEach(nombre => {
        if (nombre.querySelector('.logo-prefix')) return;
        nombre.innerHTML = '<span class="logo-prefix">Óptica</span>Nuevo Horizonte<small class="logo-location">Concepción</small>';
    });
    const style = document.createElement('style');
    style.textContent = `.site-logo-stack{display:flex;align-items:center;flex-direction:column;font-family:'Playfair Display',serif;line-height:1;text-align:center}.site-logo-stack>span{margin-bottom:3px;font-size:.72em;font-weight:500;letter-spacing:.08em}.site-logo-stack>strong{font:inherit;font-weight:500;white-space:nowrap}.site-logo-stack>small{margin-top:5px;color:#b99350;font:700 .43rem 'DM Sans',sans-serif;letter-spacing:.2em;text-transform:uppercase}.logo-prefix{display:block!important;order:-1;margin:0 0 3px!important;color:inherit!important;font:500 .68em 'Playfair Display',serif!important;letter-spacing:.08em!important;line-height:1!important;text-align:center;text-transform:none!important}.logo-location{margin-top:5px!important;text-align:center}`;
    document.head.appendChild(style);
}

function leerParametrosURLYMarcarCheckbox() {
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('cat');
    const gen = urlParams.get('gen');
    const marca = urlParams.get('marca');
    const oferta = urlParams.get('oferta');

    if (cat) document.querySelectorAll('.filter-cat').forEach(cb => { if (cb.value === cat) cb.checked = true; });
    if (gen) document.querySelectorAll('.filter-gen').forEach(cb => { if (cb.value === gen) cb.checked = true; });
    if (marca) document.querySelectorAll('.filter-brand').forEach(cb => { if (cb.value === marca) cb.checked = true; });
    if (oferta) document.querySelectorAll('.filter-feature[value="oferta"]').forEach(cb => cb.checked = true);
}

let _adminStatusPromise = null;
async function obtenerEstadoAdmin() {
    if (!_supabase) return false;
    if (_adminStatusPromise) return _adminStatusPromise;
    _adminStatusPromise = (async () => {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return false;
        const { data, error } = await _supabase.rpc('is_optica_admin');
        return !error && data === true;
    })().catch(() => false);
    return _adminStatusPromise;
}

async function initBarraAdmin() {
    if (!(await obtenerEstadoAdmin())) return;

    const adminBar = document.createElement('div');
    adminBar.style.cssText = 'background:#080E21; color:#C5A059; padding:8px 5%; font-size:12px; display:flex; justify-content:space-between; align-items:center; z-index:9999; position:sticky; top:0; border-bottom:1px solid #C5A059;';

    if (document.body) {
        adminBar.innerHTML = `
            <span>🛠️ <strong>PANEL DE CONTROL ACTIVO</strong></span>
            <div style="display:flex; gap:10px;">
                <a href="admin/admin.html" style="background:#C5A059; color:#FFF; padding:4px 10px; border-radius:4px; font-weight:700;">IR AL PANEL ADMIN</a>
                <button type="button" data-admin-logout style="background:#E53E3E; color:#fff; border:none; padding:4px 10px; border-radius:4px; font-weight:700; cursor:pointer;">CERRAR SESIÓN</button>
            </div>
        `;
        document.body.prepend(adminBar);
        adminBar.querySelector('[data-admin-logout]')?.addEventListener('click', window.cerrarSesionAdmin);
    }
}

window.cerrarSesionAdmin = async function() {
    await _supabase.auth.signOut();
    location.reload();
};

async function cargarProductosConFiltros() {
    const grid = document.querySelector('#catalog-grid, .products-grid');
    if (!grid) return;

    const esAdmin = await obtenerEstadoAdmin();

    let productos = [];
    try {
        if (!_supabase) throw new Error('Supabase no disponible');
        const { data, error } = await _supabase.from('optica_productos').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) productos = _products.resolveProducts?.(data, PRODUCTOS_LOCALES, PRODUCTOS_BASE) || data;
        else productos = _products.resolveProducts?.([], PRODUCTOS_LOCALES, PRODUCTOS_BASE) || PRODUCTOS_LOCALES;
    } catch (e) {
        productos = _products.resolveProducts?.([], PRODUCTOS_LOCALES, PRODUCTOS_BASE) || PRODUCTOS_LOCALES;
    }
    PRODUCTOS_ACTIVOS = productos;
    renderizarVitrinaMarcas(productos);

    const valores = selector => Array.from(document.querySelectorAll(`${selector}:checked`)).map(cb => cb.value);
    const catsChecked = valores('.filter-cat');
    const gensChecked = valores('.filter-gen');
    const marcasChecked = valores('.filter-brand');
    const shapesChecked = valores('.filter-shape');
    const colorsChecked = valores('.filter-color');
    const materialsChecked = valores('.filter-material');
    const featuresChecked = valores('.filter-feature');
    const search = (document.querySelector('#catalog-search')?.value || '').trim().toLocaleLowerCase('es');
    const minPrice = Number(document.querySelector('#price-min')?.value || 0);
    const maxPrice = Number(document.querySelector('#price-max')?.value || Infinity);

    let filtrados = (_products.filterProducts || filtrarProductosCompat)(productos, {
        categories: catsChecked,
        genders: gensChecked,
        brands: marcasChecked,
        shapes: shapesChecked,
        colors: colorsChecked,
        materials: materialsChecked,
        features: featuresChecked,
        search,
        minPrice,
        maxPrice
    }) || productos;

    const sort = document.querySelector('#catalog-sort')?.value;
    if (sort === 'price-asc') filtrados.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === 'price-desc') filtrados.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === 'name') filtrados.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    if (sort === 'newest') filtrados.sort((a, b) => {
        const dateA = Date.parse(a.created_at || '') || 0;
        const dateB = Date.parse(b.created_at || '') || 0;
        return dateB - dateA;
    });
    if (!sort || sort === 'featured') filtrados = seleccionarDestacadosMultimarca(filtrados, filtrados.length);

    const countText = document.querySelector('#catalog-count-text');
    if (countText) countText.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'armazón encontrado' : 'armazones encontrados'}`;
    actualizarResumenFiltros();

    if (filtrados.length === 0) {
        grid.innerHTML = `<div class="empty-state"><h2>No encontramos coincidencias</h2><p>Prueba quitando algún filtro o usando otra búsqueda.</p><button class="btn-gold" type="button" data-clear-filters style="padding:12px 20px">LIMPIAR FILTROS</button></div>`;
        grid.querySelector('[data-clear-filters]')?.addEventListener('click', window.limpiarFiltrosCatalogo);
        return;
    }

    const esCatalogo = !!document.querySelector('#catalog-grid');
    const favoritos = obtenerFavoritos();
    const visibles = esCatalogo ? filtrados.slice(0, catalogVisibleCount) : seleccionarDestacadosMultimarca(filtrados, 6);
    grid.innerHTML = visibles.map(p => {
        const features = Array.isArray(p.features) ? p.features : [];
        const badge = features.includes('nuevo') ? 'Nuevo' : '';
        const meta = [p.shape, p.color, p.material].filter(Boolean).join(' · ');
        const tienePrecio = Number(p.price) > 0;
        const precio = tienePrecio ? `$${Number(p.price).toLocaleString('es-CL')}` : 'Consultar precio';
        const id = String(p.id ?? '');
        const title = safe(p.title);
        const brand = safe(p.brand);
        const encodedId = encodeURIComponent(id);
        const descripcion = p.description ? `<p class="product-description">${safe(p.description)}</p>` : '';
        const accion = tienePrecio ? `<a class="btn-gold product-option-btn" href="producto.html?id=${encodedId}"><span><small>Personaliza tu armazón</small>Seleccionar opciones</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5"/></svg></a>` : `<a class="btn-gold availability-link" href="producto.html?id=${encodedId}">CONSULTAR EN TIENDA</a>`;
        return `<article class="product-card"><div class="product-media">${badge ? `<span class="product-badge">${badge}</span>` : ''}<img src="${safeURL(p.image)}" alt="${brand} ${title}" loading="lazy" decoding="async">${esCatalogo ? `<button class="favorite-btn ${favoritos.includes(id) ? 'active' : ''}" type="button" data-favorite-id="${safe(id)}" aria-label="Guardar ${brand} ${title} en favoritos" aria-pressed="${favoritos.includes(id)}"><svg class="icon" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg></button>` : ''}</div><div class="product-info"><div class="brand">${brand}</div><div class="p-name">${title}</div>${meta ? `<div class="product-meta">${safe(meta)}</div>` : ''}${descripcion}<div class="price">${precio}</div><div class="product-actions">${accion}${esCatalogo ? `<a class="detail-btn" href="producto.html?id=${encodedId}" aria-label="Ver detalle de ${title}">→</a>` : ''}</div>${esAdmin ? `<button type="button" data-delete-product="${safe(id)}" style="margin-top:8px;background:#a43d3d;color:#fff;border:0;padding:7px;cursor:pointer">ELIMINAR</button>` : ''}</div></article>`;
    }).join('');
    grid.querySelectorAll('[data-favorite-id]').forEach(button => button.addEventListener('click', () => window.toggleFavorito(button.dataset.favoriteId, button)));
    grid.querySelectorAll('[data-delete-product]').forEach(button => button.addEventListener('click', () => window.eliminarProducto(button.dataset.deleteProduct)));
    const loadMore = document.querySelector('#catalog-load-more');
    if (loadMore) {
        loadMore.hidden = visibles.length >= filtrados.length;
        loadMore.textContent = `Ver más armazones (${filtrados.length - visibles.length} restantes)`;
    }
}

function seleccionarDestacadosMultimarca(productos, cantidad) {
    const grupos = new Map();
    productos.forEach(producto => {
        const marca = String(producto.brand || 'Otros');
        if (!grupos.has(marca)) grupos.set(marca, []);
        grupos.get(marca).push(producto);
    });
    const puntajeAleatorio = valor => {
        let hash = catalogRandomSeed;
        for (const caracter of String(valor)) hash = Math.imul(hash ^ caracter.charCodeAt(0), 16777619);
        return hash >>> 0;
    };
    grupos.forEach(lista => lista.sort((a, b) => puntajeAleatorio(a.id) - puntajeAleatorio(b.id)));
    const marcas = [...grupos.keys()].sort((a, b) => puntajeAleatorio(a) - puntajeAleatorio(b));
    const seleccion = [];
    let vuelta = 0;
    while (seleccion.length < cantidad && marcas.some(marca => grupos.get(marca)[vuelta])) {
        marcas.forEach(marca => {
            const producto = grupos.get(marca)[vuelta];
            if (producto && seleccion.length < cantidad) seleccion.push(producto);
        });
        vuelta++;
    }
    return seleccion;
}

function renderizarVitrinaMarcas(productosDisponibles = PRODUCTOS_ACTIVOS.length ? PRODUCTOS_ACTIVOS : PRODUCTOS_LOCALES) {
    const track = document.querySelector('#eyewear-marquee-track');
    if (!track || !productosDisponibles.length) return;
    const seleccion = seleccionarDestacadosMultimarca(productosDisponibles, 14);
    const tarjeta = producto => `<a class="marquee-product" href="producto.html?id=${encodeURIComponent(String(producto.id))}"><span class="marquee-image"><img src="${safeURL(producto.image)}" alt="${safe(producto.brand)} ${safe(producto.title)}" loading="lazy" decoding="async"></span><span class="marquee-brand">${safe(producto.brand)}</span><strong>${safe(producto.title)}</strong></a>`;
    track.innerHTML = [...seleccion, ...seleccion].map(tarjeta).join('');
}

window.cargarMasCatalogo = function() {
    catalogVisibleCount += 48;
    cargarProductosConFiltros();
};

function initCatalogoInteractivo() {
    const search = document.querySelector('#catalog-search');
    if (!search) return;
    let timer;
    search.addEventListener('input', () => { clearTimeout(timer); catalogVisibleCount = 48; timer = setTimeout(cargarProductosConFiltros, 180); });
    document.querySelector('#catalog-sort')?.addEventListener('change', cargarProductosConFiltros);
    document.querySelectorAll('#drawer-filter input').forEach(input => input.addEventListener('change', cargarProductosConFiltros));
    document.querySelector('#clear-filters')?.addEventListener('click', limpiarFiltrosCatalogo);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') toggleDrawer(false); });
}

function actualizarResumenFiltros() {
    const active = Array.from(document.querySelectorAll('#drawer-filter input[type="checkbox"]:checked'));
    const count = active.length + ['#price-min', '#price-max'].filter(selector => document.querySelector(selector)?.value).length;
    const badge = document.querySelector('#filter-count');
    if (badge) { badge.textContent = count; badge.classList.toggle('visible', count > 0); }
    const chips = document.querySelector('#active-filters');
    if (chips) {
        chips.innerHTML = active.map(input => `<button class="filter-chip" type="button" data-filter-class="${safe(input.className)}" data-filter-value="${safe(input.value)}">${safe(input.parentElement.textContent.trim())} ×</button>`).join('');
        chips.querySelectorAll('.filter-chip').forEach(button => button.addEventListener('click', () => {
            window.quitarFiltro(button.dataset.filterClass, button.dataset.filterValue);
        }));
    }
}

window.quitarFiltro = function(className, value) {
    document.querySelectorAll(`.${className}`).forEach(input => { if (input.value === value) input.checked = false; });
    cargarProductosConFiltros();
};

window.limpiarFiltrosCatalogo = function() {
    document.querySelectorAll('#drawer-filter input').forEach(input => { input.checked = false; if (input.type === 'number') input.value = ''; });
    const search = document.querySelector('#catalog-search'); if (search) search.value = '';
    const sort = document.querySelector('#catalog-sort'); if (sort) sort.value = 'featured';
    history.replaceState({}, '', location.pathname);
    cargarProductosConFiltros();
};

function obtenerFavoritos() { return JSON.parse(localStorage.getItem('favoritos_optica') || '[]').map(String); }
window.toggleFavorito = function(id, button) {
    const favoritos = obtenerFavoritos();
    const index = favoritos.indexOf(String(id));
    if (index >= 0) favoritos.splice(index, 1); else favoritos.push(String(id));
    localStorage.setItem('favoritos_optica', JSON.stringify(favoritos));
    button.classList.toggle('active', index < 0);
    button.setAttribute('aria-pressed', String(index < 0));
};

async function cargarDetalleProducto() {
    const id = new URLSearchParams(location.search).get('id') || '1';
    let producto = [...PRODUCTOS_LOCALES, ...PRODUCTOS_BASE].find(p => String(p.id) === String(id));
    if (!producto) producto = PRODUCTOS_BASE[0];

    const aplicarProducto = item => {
        const image = document.querySelector('.main-img');
        const brand = document.querySelector('.info .brand');
        const title = document.querySelector('.info .title');
        const price = document.querySelector('.price-box span');
        const description = document.querySelector('.product-copy');
        if (image) { image.src = safeURL(item.image); image.alt = `${item.brand} ${item.title}`; }
        if (brand) brand.textContent = item.brand;
        if (title) title.textContent = item.title;
        if (price) price.textContent = Number(item.price) > 0 ? `$${Number(item.price).toLocaleString('es-CL')}` : 'Consultar precio';
        if (description && item.description) description.textContent = item.description;
        const material = document.querySelector('.spec-material');
        if (material) material.textContent = item.material ? String(item.material).replace(/^./, c => c.toUpperCase()) : 'Material seleccionado';
        const installments = document.querySelector('.installments');
        if (installments && Number(item.price) > 0) installments.textContent = `Hasta 12 cuotas de $${Math.ceil(Number(item.price) / 12).toLocaleString('es-CL')}`;
        document.querySelectorAll('.config-image').forEach(el => { el.src = safeURL(item.image); el.alt = `${item.brand} ${item.title}`; });
        const configName = document.querySelector('.config-product strong');
        if (configName) configName.textContent = `${item.brand} · ${item.title}`;
        document.title = `${item.title} | Óptica Nuevo Horizonte`;
        const addButton = document.querySelector('.btn-add');
        const buyButton = document.querySelector('.btn-buy-now');
        if (addButton) {
            addButton.disabled = !(Number(item.price) > 0);
            addButton.textContent = Number(item.price) > 0 ? 'AÑADIR A MI BOLSA DE COMPRAS' : 'PRECIO POR CONFIRMAR';
            addButton.onclick = () => agregarAlCarritoDirecto(String(item.id), item.title, item.brand, item.price, item.image);
        }
        if (buyButton) {
            buyButton.disabled = !(Number(item.price) > 0);
            buyButton.onclick = () => comprarAhora(String(item.id), item.title, item.brand, item.price, item.image);
        }
        initConfiguradorCristales(item);
    };
    aplicarProducto(producto);

    try {
        const { data } = await _supabase.from('optica_productos').select('*').eq('id', id).maybeSingle();
        if (data) { producto = { ...producto, ...data }; aplicarProducto(producto); }
    } catch (error) { /* La ficha base mantiene disponible la página sin conexión. */ }
}

function initConfiguradorCristales(producto) {
    const modal = document.querySelector('#lens-configurator');
    const openButton = document.querySelector('.btn-configure');
    if (!modal || !openButton) return;
    const steps = [
        {
            kicker: 'Paso 1 de 3', title: '¿Cómo quieres usar tus anteojos?', intro: 'Elige la opción que mejor representa lo que necesitas.',
            options: [
                { id:'receta', name:'Cristales con receta', desc:'Para visión de lejos, cerca, lectura o uso permanente.', price:0, image:'assets/configurador/cristales-receta.png' },
                { id:'descanso', name:'Cristales de descanso', desc:'Comodidad visual para pantallas, sin corrección óptica.', price:0, image:'assets/configurador/cristales-descanso.png' },
                { id:'armazon', name:'Solo armazón', desc:'Recibe tu armazón con cristales de muestra, sin tratamiento.', price:0, image:'assets/configurador/solo-armazon.png' }
            ]
        },
        {
            kicker:'Paso 2 de 3', title:'Elige el tipo de tus cristales', intro:'Piensa en tu estilo de vida y selecciona el tratamiento que más te convenga.',
            options:[
                { id:'transparente', name:'Transparente', desc:'Cristales tradicionales, nítidos y cómodos para el uso diario.', price:0, image:'assets/configurador/cristales-receta.png' },
                { id:'azul', name:'Protección luz azul-violeta', desc:'Ayuda a reducir la exposición a la luz azul de dispositivos digitales.', price:0, image:'assets/configurador/cristales-descanso.png' },
                { id:'foto', name:'Fotosensible', desc:'Se oscurece en exteriores y vuelve a aclararse en interiores.', price:0, image:'assets/configurador/cristales-fotosensibles.png' }
            ]
        },
        {
            kicker:'Paso 3 de 3', title:'Elige el material de tus cristales', intro:'Un cristal más delgado resulta más liviano y estético. Si tienes una receta alta, te orientaremos antes de fabricar.',
            options:[]
        }
    ];
    let step = 0;
    let selected = {};
    const body = modal.querySelector('.step-body');
    const next = modal.querySelector('.next-step');
    const back = modal.querySelector('.config-back');
    const subtotal = modal.querySelector('.subtotal strong');
    const progress = modal.querySelector('.progress-fill');
    const money = value => `$${Number(value).toLocaleString('es-CL')}`;
    const total = () => Number(producto.price || 0) + Object.values(selected).reduce((sum, option) => sum + Number(option.price || 0), 0);
    const updateSummary = () => {
        subtotal.textContent = money(total());
        const lines = modal.querySelector('#selection-lines');
        if (lines) lines.innerHTML = `<div class="summary-line"><span>Armazón</span><b>${money(producto.price)}</b></div>` + Object.values(selected).map(option => `<div class="summary-line"><span>${option.name}</span><b>${option.price ? money(option.price) : 'Incluido'}</b></div>`).join('');
    };
    const render = () => {
        const data = steps[step];
        if (step === 2) {
            const materialImages = {
                organico:'assets/configurador/material-organico-ar.png',
                soft:'assets/configurador/material-soft-air.png',
                perfect:'assets/configurador/material-perfect-view.png',
                plus:'assets/configurador/material-perfect-view-plus.png'
            };
            if (selected[1]?.id === 'azul') data.options = [
                { id:'soft-azul', name:'Soft Air', desc:'Policarbonato resistente a impactos, adecuado para recetas leves a moderadas.', price:109990, image:materialImages.soft },
                { id:'perfect-azul', name:'Perfect View', desc:'Alto índice 1.67, recomendado para recetas altas y con excelente definición.', price:209990, image:materialImages.perfect },
                { id:'plus-azul', name:'Perfect View+', desc:'Ultrafino 1.74, liviano y con protección antirreflejos.', price:259990, image:materialImages.plus }
            ];
            else if (selected[1]?.id === 'foto') data.options = [
                { id:'soft-foto', name:'Soft Air Fotosensible', desc:'Policarbonato fotosensible que se oscurece en exteriores y aclara en interiores.', price:199990, image:materialImages.soft },
                { id:'perfect-foto', name:'Perfect View Fotosensible', desc:'Material 1.67 fotosensible, más delgado y recomendado para recetas moderadas a altas.', price:249990, image:materialImages.perfect }
            ];
            else data.options = [
                { id:'organico', name:'Orgánico AR', desc:'Visión clara y sin reflejos. Ligero, cómodo y durable para uso diario.', price:39990, image:materialImages.organico },
                { id:'soft', name:'Soft Air', desc:'Policarbonato resistente a impactos, adecuado para recetas leves a moderadas.', price:69990, image:materialImages.soft },
                { id:'perfect', name:'Perfect View', desc:'Alto índice 1.67, recomendado para recetas altas y con excelente definición.', price:149990, image:materialImages.perfect },
                { id:'plus', name:'Perfect View+', desc:'Ultrafino 1.74, liviano y con protección antirreflejos.', price:229990, image:materialImages.plus }
            ];
            if (selected[2] && !data.options.some(option => option.id === selected[2].id)) delete selected[2];
        }
        progress.style.width = `${((step + 1) / steps.length) * 100}%`;
        back.style.visibility = step ? 'visible' : 'hidden';
        body.innerHTML = `<span class="step-kicker">${data.kicker}</span><h2>${data.title}</h2><p class="step-intro">${data.intro}</p><div class="option-list">${data.options.map(option => `<button class="option-card ${selected[step]?.id === option.id ? 'selected' : ''}" type="button" data-option="${option.id}"><span class="option-visual ${option.image ? 'option-photo' : ''} ${option.className || ''}">${option.image ? `<img src="${option.image}" alt="" loading="eager">` : option.visual}</span><span><strong class="option-name">${option.name}</strong><span class="option-desc">${option.desc}</span></span><span class="option-price">${option.price ? `+ ${money(option.price)}` : 'Incluido'}</span></button>`).join('')}</div>`;
        body.querySelectorAll('.option-card').forEach(card => card.addEventListener('click', () => {
            selected[step] = data.options.find(option => option.id === card.dataset.option);
            if (step === 0 && selected[0].id === 'armazon') { delete selected[1]; delete selected[2]; }
            render();
        }));
        next.disabled = !selected[step];
        next.textContent = step === steps.length - 1 || selected[0]?.id === 'armazon' ? 'Añadir a mi bolsa' : 'Continuar';
        updateSummary();
    };
    const close = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; };
    const addConfigured = () => {
        const details = Object.values(selected).map(o => o.name);
        const suffix = details.map(o => o.toLowerCase().replace(/[^a-z0-9]+/g,'-')).join('-');
        const crystalConfig = Object.fromEntries(Object.entries(selected).map(([stepId, option]) => [stepId, {
            id: option.id,
            name: option.name,
            price: Number(option.price || 0)
        }]));
        const sku = `${producto.id}-${suffix || 'armazon'}`;
        agregarAlCarritoConfigurado(String(producto.id), sku, producto.title, producto.brand, total(), producto.image, details, crystalConfig);
        close();
    };
    openButton.onclick = () => { step = 0; selected = {}; modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; render(); };
    modal.querySelector('.config-close').onclick = close;
    modal.querySelector('.selection-toggle').onclick = () => modal.querySelector('.selection-summary').classList.toggle('open');
    back.onclick = () => { if (step) { step--; render(); } };
    next.onclick = () => {
        if (!selected[step]) return;
        if (selected[0]?.id === 'armazon' || step === steps.length - 1) return addConfigured();
        step++; render();
    };
    modal.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
}

window.toggleDrawer = function(open) {
    const drawer = document.querySelector('#drawer-filter');
    if (drawer) {
        if (open) drawer.classList.add('active');
        else drawer.classList.remove('active');
        document.body.classList.toggle('drawer-open', open);
    }
};

function normalizarItemCarrito(item) {
    return _cart.normalizeItem ? _cart.normalizeItem(item) : item;
}

function obtenerCarrito() {
    return _cart.getCart ? _cart.getCart() : [];
}
function guardarCarrito(c) {
    if (_cart.saveCart) return _cart.saveCart(c);
    const limpio = Array.isArray(c) ? c.filter(item => item?.product_id && item?.sku) : [];
    localStorage.setItem('cart_optica', JSON.stringify(limpio));
    sessionStorage.setItem('cart_checkout_optica', JSON.stringify(limpio));
    actualizarContadorHeader();
}

function actualizarContadorHeader() {
    const totalItems = obtenerCarrito().reduce((acc, item) => acc + item.quantity, 0);
    document.querySelectorAll('.badge-count').forEach(b => b.textContent = totalItems);
}

function initCarrito() { actualizarContadorHeader(); }

function initNotificaciones() {
    if (document.querySelector('#toast-optica-styles')) return;
    const styles = document.createElement('style');
    styles.id = 'toast-optica-styles';
    styles.textContent = `
        html,body{max-width:100%;overflow-x:hidden;overscroll-behavior-x:none}.product-card,.product-info,.product-actions,.config-panel,.step-body,.option-card{min-width:0}img{max-width:100%}
        .toast-region{position:fixed;right:24px;top:24px;z-index:10000;display:grid;gap:12px;width:min(390px,calc(100vw - 28px));pointer-events:none}
        .luxury-toast{position:relative;overflow:hidden;display:grid;grid-template-columns:48px 1fr auto;gap:14px;align-items:start;background:#101713;color:#fff;border:1px solid rgba(185,147,80,.45);padding:20px;box-shadow:0 24px 70px rgba(10,18,13,.3);pointer-events:auto;opacity:0;transform:translateY(-14px) scale(.98);transition:opacity .32s ease,transform .32s ease}
        .luxury-toast.visible{opacity:1;transform:none}.luxury-toast.leaving{opacity:0;transform:translateY(-8px) scale(.98)}
        .toast-icon{display:grid;place-items:center;width:48px;height:48px;border:1px solid rgba(185,147,80,.5);border-radius:50%;color:#d9bd82}.toast-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
        .toast-kicker{display:block;margin-bottom:3px;color:#d9bd82;font:700 9px 'DM Sans',sans-serif;letter-spacing:.17em;text-transform:uppercase}.toast-title{display:block;color:#fff;font:500 17px 'Playfair Display',serif;line-height:1.25}.toast-detail{display:block;margin-top:4px;color:rgba(255,255,255,.62);font:400 11px 'DM Sans',sans-serif}
        .toast-actions{grid-column:2/-1;display:flex;align-items:center;gap:18px;margin-top:3px}.toast-cart-link{color:#d9bd82;border-bottom:1px solid currentColor;padding-bottom:2px;font:700 9px 'DM Sans',sans-serif;letter-spacing:.12em;text-transform:uppercase}.toast-continue{border:0;background:none;color:rgba(255,255,255,.55);padding:0;cursor:pointer;font:600 9px 'DM Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase}
        .toast-close{border:0;background:none;color:rgba(255,255,255,.55);font-size:19px;line-height:1;cursor:pointer}.toast-progress{position:absolute;right:0;bottom:0;left:0;height:2px;background:rgba(255,255,255,.1)}.toast-progress:after{content:'';display:block;width:100%;height:100%;background:#b99350;transform-origin:left;animation:toast-countdown 5s linear forwards}@keyframes toast-countdown{to{transform:scaleX(0)}}
        .product-option-btn{position:relative!important;display:flex!important;min-height:52px!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;overflow:hidden!important;border:1px solid #17352a!important;background:#17352a!important;padding:8px 13px!important;color:#fff!important;letter-spacing:.08em!important;text-align:left!important;transition:background .25s ease,border-color .25s ease,transform .25s ease,box-shadow .25s ease!important}.product-option-btn:before{content:'';position:absolute;top:0;right:0;left:0;height:2px;background:#b99350}.product-option-btn span{display:flex;flex-direction:column;line-height:1.2}.product-option-btn small{margin-bottom:3px;color:#d9bd82;font-size:.48rem;font-weight:600;letter-spacing:.08em;text-transform:none}.product-option-btn svg{width:19px;height:19px;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;transition:transform .25s}.product-option-btn:hover{border-color:#101713!important;background:#101713!important;box-shadow:0 10px 24px rgba(16,23,19,.18)!important;transform:translateY(-2px)}.product-option-btn:hover svg{transform:translateX(3px)}.product-option-btn:focus-visible{outline:3px solid rgba(185,147,80,.35);outline-offset:3px}
        @media(max-width:600px){.toast-region{top:auto;right:14px;bottom:14px;left:14px;width:auto}.luxury-toast{grid-template-columns:40px 1fr auto;padding:17px}.toast-icon{width:40px;height:40px}}
        @media(prefers-reduced-motion:reduce){.luxury-toast{transition:none}.toast-progress:after{animation:none}}
    `;
    document.head.appendChild(styles);
    const region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);
}

function mostrarProductoAgregado(nombre, marca) {
    let region = document.querySelector('.toast-region');
    if (!region) { initNotificaciones(); region = document.querySelector('.toast-region'); }
    region.querySelectorAll('.luxury-toast').forEach(toast => toast.remove());
    const toast = document.createElement('div');
    toast.className = 'luxury-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
        <div class="toast-icon"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></div>
        <div><span class="toast-kicker">Añadido correctamente</span><strong class="toast-title"></strong><span class="toast-detail"></span></div>
        <button class="toast-close" type="button" aria-label="Cerrar notificación">×</button>
        <div class="toast-actions"><a class="toast-cart-link" href="carrito.html">Ver mi bolsa →</a><button class="toast-continue" type="button">Seguir explorando</button></div>
        <div class="toast-progress"></div>`;
    toast.querySelector('.toast-title').textContent = nombre;
    toast.querySelector('.toast-detail').textContent = `${marca} · Tu selección se guardó en la bolsa`;
    region.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    let timeout;
    const cerrar = () => { clearTimeout(timeout); toast.classList.add('leaving'); setTimeout(() => toast.remove(), 320); };
    toast.querySelector('.toast-close').addEventListener('click', cerrar);
    toast.querySelector('.toast-continue').addEventListener('click', cerrar);
    timeout = setTimeout(cerrar, 5000);
}

window.agregarAlCarritoDirecto = function(id, nombre, marca, precio, imagen) {
    let carrito = obtenerCarrito();
    const productId = String(id);
    const index = carrito.findIndex(item => String(item.sku) === productId);
    if (index !== -1) carrito[index].quantity += 1;
    else carrito.push({ id: productId, product_id: productId, sku: productId, nombre, marca, precio: parseInt(precio), imagen, quantity: 1, cantidad: 1, crystal_config: {}, configuracion: [] });
    guardarCarrito(carrito);
    mostrarProductoAgregado(nombre, marca);
};

window.agregarAlCarritoConfigurado = function(productId, sku, nombre, marca, precio, imagen, configuracion, crystalConfig) {
    let carrito = obtenerCarrito();
    const index = carrito.findIndex(item => String(item.sku) === String(sku));
    if (index !== -1) carrito[index].quantity += 1;
    else carrito.push({ id: String(sku), product_id: String(productId), sku: String(sku), nombre, marca, precio: Number(precio), imagen, quantity: 1, cantidad: 1, configuracion: Array.isArray(configuracion) ? configuracion : [], crystal_config: crystalConfig && typeof crystalConfig === 'object' ? crystalConfig : {} });
    guardarCarrito(carrito);
    mostrarProductoAgregado(nombre, marca);
};

window.comprarAhora = function(id, nombre, marca, precio, imagen) {
    let carrito = obtenerCarrito();
    const productId = String(id);
    const index = carrito.findIndex(item => String(item.sku) === productId);
    if (index !== -1) carrito[index].quantity += 1;
    else carrito.push({ id: productId, product_id: productId, sku: productId, nombre, marca, precio: Number(precio), imagen, quantity: 1, cantidad: 1, crystal_config: {}, configuracion: [] });
    guardarCarrito(carrito);
    window.location.href = 'checkout.html';
};

function renderizarVistaCarrito() {
    const contenedor = document.querySelector('.cart-items');
    const totalEl = document.querySelector('.summary-row.total span:last-child');
    const subtotalEl = document.querySelector('.summary-row span:last-child');
    const carrito = obtenerCarrito();

    if (!contenedor) return;

    if (carrito.length === 0) {
        contenedor.innerHTML = `<div class="empty-cart"><h2>Tu bolsa está vacía</h2><p>Descubre nuestra selección de anteojos ópticos y de sol.</p><a href="catalogo.html">Explorar colección</a></div>`;
        if (totalEl) totalEl.textContent = '$0';
        if (subtotalEl) subtotalEl.textContent = '$0';
        const checkout = document.querySelector('.btn-checkout');
        if (checkout) { checkout.style.pointerEvents = 'none'; checkout.style.opacity = '.45'; checkout.setAttribute('aria-disabled', 'true'); }
        return;
    }

    let subtotal = 0;
    contenedor.innerHTML = carrito.map((item, index) => {
        const totalItem = item.precio * item.quantity;
        subtotal += totalItem;
        const itemName = safe(item.nombre);
        const itemBrand = safe(item.marca);
        const configuration = Array.isArray(item.configuracion) ? item.configuracion.map(safe).join(' · ') : '';
        return `
            <div class="cart-item">
                <img class="item-img" src="${safeURL(item.imagen)}" alt="${itemName}" loading="lazy" decoding="async">
                <div class="item-details">
                    <span class="item-brand">${itemBrand}</span>
                    <h3 class="item-title">${itemName}</h3>
                    ${configuration ? `<div class="item-configuration">${configuration}</div>` : ''}
                    <div class="quantity-control">
                        <button class="qty-btn" type="button" data-cart-index="${index}" data-cart-change="-1" aria-label="Disminuir cantidad">-</button>
                        <span class="qty-val">${item.quantity}</span>
                        <button class="qty-btn" type="button" data-cart-index="${index}" data-cart-change="1" aria-label="Aumentar cantidad">+</button>
                    </div>
                </div>
                <div class="item-total">
                    <div>$${totalItem.toLocaleString('es-CL')}</div>
                    <button class="remove-btn" type="button" data-remove-cart-index="${index}">Eliminar</button>
                </div>
            </div>
        `;
    }).join('');

    contenedor.querySelectorAll('[data-cart-index]').forEach(button => button.addEventListener('click', () => {
        window.cambiarCantidad(Number(button.dataset.cartIndex), Number(button.dataset.cartChange));
    }));
    contenedor.querySelectorAll('[data-remove-cart-index]').forEach(button => button.addEventListener('click', () => {
        window.eliminarDelCarrito(Number(button.dataset.removeCartIndex));
    }));

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString('es-CL')}`;
    if (totalEl) totalEl.textContent = `$${subtotal.toLocaleString('es-CL')}`;
}

window.cambiarCantidad = function(index, cambio) {
    let carrito = obtenerCarrito();
    carrito[index].quantity += cambio;
    carrito[index].cantidad = carrito[index].quantity;
    if (carrito[index].quantity <= 0) carrito.splice(index, 1);
    guardarCarrito(carrito);
    renderizarVistaCarrito();
};

window.eliminarDelCarrito = function(index) {
    let carrito = obtenerCarrito();
    carrito.splice(index, 1);
    guardarCarrito(carrito);
    renderizarVistaCarrito();
};

window.eliminarProducto = async function(id) {
    if (!confirm('¿Eliminar este producto del catálogo?')) return;

    const { error } = await _supabase.from('optica_productos').delete().eq('id', id);
    if (error) {
        alert('No fue posible eliminar el producto. Inténtalo nuevamente.');
        return;
    }

    await cargarProductosConFiltros();
};

function renderizarVistaCheckout() {
    const itemsEl = document.querySelector('#checkout-cart-items');
    const form = document.querySelector('#checkout-form');
    if (!itemsEl || !form) return;
    const carrito = obtenerCarrito();
    const subtotal = _checkout.estimateSubtotal?.(carrito) || carrito.reduce((total, item) => total + Number(item.precio) * Number(item.quantity), 0);
    let shipping = 4500;
    initUbicacionesChile();

    itemsEl.innerHTML = carrito.length ? carrito.map(item => {
        const configuration = Array.isArray(item.configuracion) ? item.configuracion.map(safe).join(' · ') : '';
        return `
        <div class="sidebar-item"><img src="${safeURL(item.imagen)}" alt="${safe(item.nombre)}" loading="lazy" decoding="async"><div><div class="sidebar-item-title">${safe(item.nombre)}</div><div class="sidebar-item-subtitle">${safe(item.marca)} · Cantidad ${item.quantity}${configuration ? `<br>${configuration}` : ''}</div><div class="sidebar-item-price">$${(item.precio * item.quantity).toLocaleString('es-CL')}</div></div></div>
    `;
    }).join('') : '<div class="checkout-empty">No hay productos en tu bolsa.</div>';

    const actualizarTotales = () => {
        document.querySelector('#summary-subtotal').textContent = `$${subtotal.toLocaleString('es-CL')}`;
        document.querySelector('#summary-shipping').textContent = shipping ? `$${shipping.toLocaleString('es-CL')}` : 'Gratis';
        document.querySelector('#summary-total').textContent = `$${(subtotal + shipping).toLocaleString('es-CL')}`;
    };
    actualizarTotales();

    const payButton = document.querySelector('.btn-pay-now');
    if (!carrito.length) { payButton.disabled = true; payButton.textContent = 'Tu bolsa está vacía'; }

    document.querySelectorAll('.shipping-card').forEach(card => card.addEventListener('click', () => {
        document.querySelectorAll('.shipping-card').forEach(option => option.classList.remove('selected'));
        card.classList.add('selected');
        card.querySelector('input').checked = true;
        shipping = Number(card.dataset.shippingCost);
        const retiro = card.querySelector('input').value === 'retiro';
        const addressFields = document.querySelector('#address-fields');
        addressFields.style.display = retiro ? 'none' : 'grid';
        addressFields.querySelectorAll('[name="direccion"], [name="region"], [name="comuna"]').forEach(field => field.required = !retiro);
        actualizarTotales();
    }));

    document.querySelector('#prescription-file')?.addEventListener('change', event => {
        const file = event.target.files[0];
        const label = document.querySelector('#prescription-label');
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { event.target.value = ''; label.textContent = 'El archivo supera los 10 MB'; return; }
        const tiposPermitidos = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!tiposPermitidos.includes(file.type)) { event.target.value = ''; label.textContent = 'Formato no permitido'; return; }
        label.textContent = `Archivo seleccionado: ${file.name}`;
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const status = document.querySelector('#checkout-status');
        if (!form.checkValidity()) { form.reportValidity(); return; }
        if (!carrito.length) return;
        payButton.disabled = true;
        payButton.textContent = 'Preparando pedido…';
        status.className = 'status-message';

        const fields = new FormData(form);
        const retiro = fields.get('shipping') === 'retiro';
        const payload = _checkout.buildOrderPayload?.({ fields, cart: carrito, shipping, retiro }) || {
            p_nombre: fields.get('nombre'), p_rut: fields.get('rut'), p_telefono: fields.get('telefono'),
            p_email: fields.get('email'), p_direccion_entrega: retiro ? 'Retiro en Caupolicán #314, Concepción' : `${fields.get('direccion')}, ${fields.get('comuna')}, ${fields.get('region')}`,
            p_indicaciones_entrega: fields.get('indicaciones') || '', p_metodo_envio: retiro ? 'Retiro en tienda' : 'Despacho a domicilio',
            p_subtotal: subtotal, p_costo_envio: shipping, p_total: subtotal + shipping,
            p_items: carrito.map(item => ({ product_id: String(item.product_id), sku: String(item.sku), quantity: Number(item.quantity), crystal_config: item.crystal_config || {} })), p_receta_path: null
        };
        try {
            const receta = document.querySelector('#prescription-file')?.files[0];
            if (receta) {
                const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' }[receta.type];
                if (!extension) throw new Error('Formato de receta no permitido');
                const ruta = `incoming/${crypto.randomUUID()}.${extension}`;
                const { error: uploadError } = await _supabase.storage.from('prescriptions').upload(ruta, receta, { cacheControl: '0', contentType: receta.type, upsert: false });
                if (uploadError) throw uploadError;
                payload.p_receta_path = ruta;
            }
            const { data: pedidoId, error } = await _supabase.rpc('create_optica_order', payload);
            if (error) throw error;
            localStorage.setItem('ultimo_pedido_optica', JSON.stringify({ id: pedidoId, creado: new Date().toISOString() }));
            status.textContent = 'Pedido registrado. La tienda te enviará el cobro protegido de Mercado Pago al correo o WhatsApp indicado.';
            status.classList.add('visible');
            localStorage.removeItem('cart_optica');
            sessionStorage.removeItem('cart_checkout_optica');
            actualizarContadorHeader();
            payButton.textContent = 'Pedido registrado';
        } catch (error) {
            status.textContent = 'No pudimos registrar el pedido. Revisa tu conexión e inténtalo nuevamente.';
            status.classList.add('visible');
            payButton.disabled = false;
            payButton.textContent = 'Solicitar pago con Mercado Pago';
        }
    });
}

const UBICACIONES_CHILE = {
    'Región de Arica y Parinacota': ['Arica','Camarones','General Lagos','Putre'],
    'Región de Tarapacá': ['Alto Hospicio','Camiña','Colchane','Huara','Iquique','Pica','Pozo Almonte'],
    'Región de Antofagasta': ['Antofagasta','Calama','María Elena','Mejillones','Ollagüe','San Pedro de Atacama','Sierra Gorda','Taltal','Tocopilla'],
    'Región de Atacama': ['Alto del Carmen','Caldera','Chañaral','Copiapó','Diego de Almagro','Freirina','Huasco','Tierra Amarilla','Vallenar'],
    'Región de Coquimbo': ['Andacollo','Canela','Combarbalá','Coquimbo','Illapel','La Higuera','La Serena','Los Vilos','Monte Patria','Ovalle','Paiguano','Punitaqui','Río Hurtado','Salamanca','Vicuña'],
    'Región de Valparaíso': ['Algarrobo','Cabildo','Calle Larga','Cartagena','Casablanca','Catemu','Concón','El Quisco','El Tabo','Hijuelas','Isla de Pascua','Juan Fernández','La Calera','La Cruz','La Ligua','Limache','Llay-Llay','Los Andes','Nogales','Olmué','Panquehue','Papudo','Petorca','Puchuncaví','Putaendo','Quillota','Quilpué','Quintero','Rinconada','San Antonio','San Esteban','San Felipe','Santa María','Santo Domingo','Valparaíso','Villa Alemana','Viña del Mar','Zapallar'],
    'Región Metropolitana de Santiago': ['Alhué','Buin','Calera de Tango','Cerrillos','Cerro Navia','Colina','Conchalí','Curacaví','El Bosque','El Monte','Estación Central','Huechuraba','Independencia','Isla de Maipo','La Cisterna','La Florida','La Granja','La Pintana','La Reina','Lampa','Las Condes','Lo Barnechea','Lo Espejo','Lo Prado','Macul','Maipú','María Pinto','Melipilla','Ñuñoa','Padre Hurtado','Paine','Pedro Aguirre Cerda','Peñaflor','Peñalolén','Pirque','Providencia','Pudahuel','Puente Alto','Quilicura','Quinta Normal','Recoleta','Renca','San Bernardo','San Joaquín','San José de Maipo','San Miguel','San Pedro','San Ramón','Santiago','Talagante','Tiltil','Vitacura'],
    "Región del Libertador General Bernardo O’Higgins": ['Chépica','Chimbarongo','Codegua','Coinco','Coltauco','Doñihue','Graneros','La Estrella','Las Cabras','Litueche','Lolol','Machalí','Malloa','Marchigüe','Mostazal','Nancagua','Navidad','Olivar','Palmilla','Paredones','Peralillo','Peumo','Pichidegua','Pichilemu','Placilla','Pumanque','Quinta de Tilcoco','Rancagua','Rengo','Requínoa','San Fernando','San Vicente','Santa Cruz'],
    'Región del Maule': ['Cauquenes','Chanco','Colbún','Constitución','Curepto','Curicó','Empedrado','Hualañé','Licantén','Linares','Longaví','Maule','Molina','Parral','Pelarco','Pelluhue','Pencahue','Rauco','Retiro','Río Claro','Romeral','Sagrada Familia','San Clemente','San Javier','San Rafael','Talca','Teno','Vichuquén','Villa Alegre','Yerbas Buenas'],
    'Región de Ñuble': ['Bulnes','Chillán','Chillán Viejo','Cobquecura','Coelemu','Coihueco','El Carmen','Ninhue','Ñiquén','Pemuco','Pinto','Portezuelo','Quillón','Quirihue','Ránquil','San Carlos','San Fabián','San Ignacio','San Nicolás','Trehuaco','Yungay'],
    'Región del Biobío': ['Alto Biobío','Antuco','Arauco','Cabrero','Cañete','Chiguayante','Concepción','Contulmo','Coronel','Curanilahue','Florida','Hualpén','Hualqui','Laja','Lebu','Los Álamos','Los Ángeles','Lota','Mulchén','Nacimiento','Negrete','Penco','Quilaco','Quilleco','San Pedro de la Paz','San Rosendo','Santa Bárbara','Santa Juana','Talcahuano','Tirúa','Tomé','Tucapel','Yumbel'],
    'Región de La Araucanía': ['Angol','Carahue','Cholchol','Collipulli','Cunco','Curacautín','Curarrehue','Ercilla','Freire','Galvarino','Gorbea','Lautaro','Loncoche','Lonquimay','Los Sauces','Lumaco','Melipeuco','Nueva Imperial','Padre Las Casas','Perquenco','Pitrufquén','Pucón','Purén','Renaico','Saavedra','Temuco','Teodoro Schmidt','Toltén','Traiguén','Victoria','Vilcún','Villarrica'],
    'Región de Los Ríos': ['Corral','Futrono','La Unión','Lago Ranco','Lanco','Los Lagos','Máfil','Mariquina','Paillaco','Panguipulli','Río Bueno','Valdivia'],
    'Región de Los Lagos': ['Ancud','Calbuco','Castro','Chaitén','Chonchi','Cochamó','Curaco de Vélez','Dalcahue','Fresia','Frutillar','Futaleufú','Hualaihué','Llanquihue','Los Muermos','Maullín','Osorno','Palena','Puerto Montt','Puerto Octay','Puerto Varas','Puqueldón','Purranque','Puyehue','Queilén','Quellón','Quemchi','Quinchao','Río Negro','San Juan de la Costa','San Pablo'],
    'Región de Aysén del General Carlos Ibáñez del Campo': ['Aysén','Chile Chico','Cisnes','Cochrane','Coyhaique','Guaitecas','Lago Verde','O’Higgins','Río Ibáñez','Tortel'],
    'Región de Magallanes y de la Antártica Chilena': ['Antártica','Cabo de Hornos','Laguna Blanca','Natales','Porvenir','Primavera','Punta Arenas','Río Verde','San Gregorio','Timaukel','Torres del Paine']
};

function initUbicacionesChile() {
    const region = document.querySelector('#buyer-region');
    const inputComuna = document.querySelector('#buyer-city');
    if (!region || !inputComuna) return;
    const comuna = document.createElement('select');
    comuna.id = inputComuna.id;
    comuna.name = inputComuna.name;
    comuna.required = true;
    comuna.disabled = true;
    comuna.autocomplete = 'address-level2';
    comuna.innerHTML = '<option value="">Primero selecciona una región</option>';
    inputComuna.replaceWith(comuna);
    region.autocomplete = 'address-level1';
    region.innerHTML = '<option value="">Selecciona una región</option>' + Object.keys(UBICACIONES_CHILE).map(nombre => `<option value="${nombre}">${nombre}</option>`).join('');
    region.addEventListener('change', () => {
        const comunas = UBICACIONES_CHILE[region.value] || [];
        comuna.disabled = !comunas.length;
        comuna.innerHTML = comunas.length ? '<option value="">Selecciona una comuna</option>' + comunas.map(nombre => `<option value="${nombre}">${nombre}</option>`).join('') : '<option value="">Primero selecciona una región</option>';
    });
}
