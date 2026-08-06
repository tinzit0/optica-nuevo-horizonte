const SUPABASE_URL = "https://kxldsjodgfonrrlwjbws.supabase.co";
const SUPABASE_KEY = "sb_publishable_J5s_2YqtASIYSqu2k00SGA_copdr39x";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

document.addEventListener('DOMContentLoaded', async () => {
    await initBarraAdmin();
    leerParametrosURLYMarcarCheckbox();
    initCatalogoInteractivo();
    cargarProductosConFiltros();
    initCarrito();
    if (window.location.pathname.includes('producto.html')) cargarDetalleProducto();
    if (window.location.pathname.includes('carrito.html')) renderizarVistaCarrito();
    if (window.location.pathname.includes('checkout.html')) renderizarVistaCheckout();
});

function leerParametrosURLYMarcarCheckbox() {
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('cat');
    const gen = urlParams.get('gen');
    const marca = urlParams.get('marca');
    const oferta = urlParams.get('oferta');

    if (cat) document.querySelectorAll(`.filter-cat[value="${cat}"]`).forEach(cb => cb.checked = true);
    if (gen) document.querySelectorAll(`.filter-gen[value="${gen}"]`).forEach(cb => cb.checked = true);
    if (marca) document.querySelectorAll(`.filter-brand[value="${marca}"]`).forEach(cb => cb.checked = true);
    if (oferta) document.querySelectorAll('.filter-feature[value="oferta"]').forEach(cb => cb.checked = true);
}

async function initBarraAdmin() {
    const { data: { session } } = await _supabase.auth.getSession();

    const adminBar = document.createElement('div');
    adminBar.style.cssText = 'background:#080E21; color:#C5A059; padding:8px 5%; font-size:12px; display:flex; justify-content:space-between; align-items:center; z-index:9999; position:sticky; top:0; border-bottom:1px solid #C5A059;';

    if (session) {
        adminBar.innerHTML = `
            <span>🛠️ <strong>PANEL DE CONTROL ACTIVO</strong></span>
            <div style="display:flex; gap:10px;">
                <a href="admin/admin.html" style="background:#C5A059; color:#FFF; padding:4px 10px; border-radius:4px; font-weight:700;">IR AL PANEL ADMIN</a>
                <button onclick="cerrarSesionAdmin()" style="background:#E53E3E; color:#fff; border:none; padding:4px 10px; border-radius:4px; font-weight:700; cursor:pointer;">CERRAR SESIÓN</button>
            </div>
        `;
        document.body.prepend(adminBar);
    }
}

window.cerrarSesionAdmin = async function() {
    await _supabase.auth.signOut();
    location.reload();
};

async function cargarProductosConFiltros() {
    const grid = document.querySelector('#catalog-grid, .products-grid');
    if (!grid) return;

    const { data: { session } } = await _supabase.auth.getSession();
    const esAdmin = !!session;

    let productos = [];
    try {
        const { data, error } = await _supabase.from('optica_productos').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) productos = data;
        else productos = PRODUCTOS_BASE;
    } catch (e) {
        productos = PRODUCTOS_BASE;
    }

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

    let filtrados = productos.filter(p => {
        const matchCat = catsChecked.length === 0 || catsChecked.includes(p.category);
        const matchGen = gensChecked.length === 0 || gensChecked.includes(p.gender);
        const matchMarca = marcasChecked.length === 0 || marcasChecked.some(m => String(p.brand || '').toLowerCase().includes(m.toLowerCase()));
        const matchShape = shapesChecked.length === 0 || shapesChecked.includes(p.shape || '');
        const matchColor = colorsChecked.length === 0 || colorsChecked.includes(p.color || '');
        const matchMaterial = materialsChecked.length === 0 || materialsChecked.includes(p.material || '');
        const productFeatures = Array.isArray(p.features) ? p.features : String(p.features || '').split(',').map(v => v.trim());
        const matchFeatures = featuresChecked.every(feature => productFeatures.includes(feature));
        const searchable = `${p.brand || ''} ${p.title || ''} ${p.color || ''} ${p.shape || ''} ${p.material || ''}`.toLocaleLowerCase('es');
        const price = Number(p.price) || 0;
        return matchCat && matchGen && matchMarca && matchShape && matchColor && matchMaterial && matchFeatures && (!search || searchable.includes(search)) && price >= minPrice && price <= maxPrice;
    });

    const sort = document.querySelector('#catalog-sort')?.value;
    if (sort === 'price-asc') filtrados.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === 'price-desc') filtrados.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === 'name') filtrados.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    if (sort === 'newest') filtrados.sort((a, b) => Number(b.id) - Number(a.id));

    const countText = document.querySelector('#catalog-count-text');
    if (countText) countText.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'armazón encontrado' : 'armazones encontrados'}`;
    actualizarResumenFiltros();

    if (filtrados.length === 0) {
        grid.innerHTML = `<div class="empty-state"><h2>No encontramos coincidencias</h2><p>Prueba quitando algún filtro o usando otra búsqueda.</p><button class="btn-gold" onclick="limpiarFiltrosCatalogo()" style="padding:12px 20px">LIMPIAR FILTROS</button></div>`;
        return;
    }

    const esCatalogo = !!document.querySelector('#catalog-grid');
    const favoritos = obtenerFavoritos();
    const visibles = esCatalogo ? filtrados : filtrados.slice(0, 6);
    grid.innerHTML = visibles.map(p => {
        const features = Array.isArray(p.features) ? p.features : [];
        const badge = features.includes('oferta') ? 'Oferta' : features.includes('nuevo') ? 'Nuevo' : '';
        const meta = [p.shape, p.color, p.material].filter(Boolean).join(' · ');
        return `<article class="product-card"><div class="product-media">${badge ? `<span class="product-badge">${badge}</span>` : ''}<img src="${p.image}" alt="${p.brand} ${p.title}" loading="lazy">${esCatalogo ? `<button class="favorite-btn ${favoritos.includes(String(p.id)) ? 'active' : ''}" onclick="toggleFavorito('${p.id}',this)" aria-label="Guardar ${p.title} en favoritos" aria-pressed="${favoritos.includes(String(p.id))}"><svg class="icon" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg></button>` : ''}</div><div class="product-info"><div class="brand">${p.brand}</div><div class="p-name">${p.title}</div>${meta ? `<div class="product-meta">${meta}</div>` : ''}<div class="price">$${parseInt(p.price).toLocaleString('es-CL')}</div><div class="product-actions"><button onclick="agregarAlCarritoDirecto('${p.id}', '${p.title}', '${p.brand}', ${p.price}, '${p.image}')" class="btn-gold">AÑADIR A LA BOLSA</button>${esCatalogo ? `<a class="detail-btn" href="producto.html?id=${encodeURIComponent(p.id)}" aria-label="Ver detalle de ${p.title}">→</a>` : ''}</div>${esAdmin ? `<button onclick="eliminarProducto('${p.id}')" style="margin-top:8px;background:#a43d3d;color:#fff;border:0;padding:7px;cursor:pointer">ELIMINAR</button>` : ''}</div></article>`;
    }).join('');
}

function initCatalogoInteractivo() {
    const search = document.querySelector('#catalog-search');
    if (!search) return;
    let timer;
    search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(cargarProductosConFiltros, 180); });
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
    if (chips) chips.innerHTML = active.map(input => `<button class="filter-chip" onclick="quitarFiltro('${input.className}','${input.value}')">${input.parentElement.textContent.trim()} ×</button>`).join('');
}

window.quitarFiltro = function(className, value) {
    document.querySelectorAll(`.${className}[value="${value}"]`).forEach(input => input.checked = false);
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
    let producto = PRODUCTOS_BASE.find(p => String(p.id) === String(id));
    try {
        const { data } = await _supabase.from('optica_productos').select('*').eq('id', id).maybeSingle();
        if (data) producto = { ...producto, ...data };
    } catch (error) { /* La ficha base mantiene disponible la página sin conexión. */ }
    if (!producto) producto = PRODUCTOS_BASE[0];

    const image = document.querySelector('.main-img');
    const brand = document.querySelector('.info .brand');
    const title = document.querySelector('.info .title');
    const price = document.querySelector('.price-box span');
    if (image) { image.src = producto.image; image.alt = `${producto.brand} ${producto.title}`; }
    if (brand) brand.textContent = producto.brand;
    if (title) title.textContent = producto.title;
    if (price) price.textContent = `$${Number(producto.price).toLocaleString('es-CL')}`;
    document.title = `${producto.title} | Óptica Nuevo Horizonte`;

    const addButton = document.querySelector('.btn-add');
    if (addButton) addButton.onclick = () => agregarAlCarritoDirecto(String(producto.id), producto.title, producto.brand, producto.price, producto.image);
}

window.toggleDrawer = function(open) {
    const drawer = document.querySelector('#drawer-filter');
    if (drawer) {
        if (open) drawer.classList.add('active');
        else drawer.classList.remove('active');
        document.body.classList.toggle('drawer-open', open);
    }
};

function obtenerCarrito() { return JSON.parse(localStorage.getItem('cart_optica')) || []; }
function guardarCarrito(c) { localStorage.setItem('cart_optica', JSON.stringify(c)); actualizarContadorHeader(); }

function actualizarContadorHeader() {
    const totalItems = obtenerCarrito().reduce((acc, item) => acc + item.cantidad, 0);
    document.querySelectorAll('.badge-count').forEach(b => b.textContent = totalItems);
}

function initCarrito() { actualizarContadorHeader(); }

window.agregarAlCarritoDirecto = function(id, nombre, marca, precio, imagen) {
    let carrito = obtenerCarrito();
    const index = carrito.findIndex(item => item.id === id);
    if (index !== -1) carrito[index].cantidad += 1;
    else carrito.push({ id, nombre, marca, precio: parseInt(precio), imagen, cantidad: 1 });
    guardarCarrito(carrito);
    alert('¡Armazón añadido a tu bolsa de compras!');
};

function renderizarVistaCarrito() {
    const contenedor = document.querySelector('.cart-items');
    const totalEl = document.querySelector('.summary-row.total span:last-child');
    const subtotalEl = document.querySelector('.summary-row span:last-child');
    const carrito = obtenerCarrito();

    if (!contenedor) return;

    if (carrito.length === 0) {
        contenedor.innerHTML = `<div style="padding: 40px; text-align: center; color: #64748b;">Tu bolsa de compras está vacía.</div>`;
        if (totalEl) totalEl.textContent = '$0';
        if (subtotalEl) subtotalEl.textContent = '$0';
        return;
    }

    let subtotal = 0;
    contenedor.innerHTML = carrito.map((item, index) => {
        const totalItem = item.precio * item.cantidad;
        subtotal += totalItem;
        return `
            <div class="cart-item">
                <img class="item-img" src="${item.imagen}" alt="${item.nombre}">
                <div class="item-details">
                    <span class="item-brand">${item.marca}</span>
                    <h3 class="item-title">${item.nombre}</h3>
                    <div class="quantity-control">
                        <button class="qty-btn" onclick="cambiarCantidad(${index}, -1)">-</button>
                        <span class="qty-val">${item.cantidad}</span>
                        <button class="qty-btn" onclick="cambiarCantidad(${index}, 1)">+</button>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700; font-size:15px;">$${totalItem.toLocaleString('es-CL')}</div>
                    <button onclick="eliminarDelCarrito(${index})" style="background:none; border:none; color:#E53E3E; font-size:11px; cursor:pointer; margin-top:8px;">Eliminar</button>
                </div>
            </div>
        `;
    }).join('');

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString('es-CL')}`;
    if (totalEl) totalEl.textContent = `$${subtotal.toLocaleString('es-CL')}`;
}

window.cambiarCantidad = function(index, cambio) {
    let carrito = obtenerCarrito();
    carrito[index].cantidad += cambio;
    if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
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
