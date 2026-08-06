const SUPABASE_URL = "https://kxldsjodgfonrrlwjbws.supabase.co";
const SUPABASE_KEY = "sb_publishable_J5s_2YqtASIYSqu2k00SGA_copdr39x";
// Mantener operativas la tienda y la bolsa aunque el CDN de Supabase sea
// bloqueado, reordenado o tarde en responder en el hosting.
const _supabase = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

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
    leerParametrosURLYMarcarCheckbox();
    initCatalogoInteractivo();
    cargarProductosConFiltros();
    initCarrito();
    // Cloudflare Pages puede servir rutas limpias (/carrito, /checkout, /producto).
    // Detectar la vista por su contenido evita depender del nombre físico del archivo.
    if (document.querySelector('.product-detail')) cargarDetalleProducto();
    if (document.querySelector('.cart-items')) renderizarVistaCarrito();
    if (document.querySelector('#checkout-form')) renderizarVistaCheckout();
    try { await initBarraAdmin(); } catch (error) { console.warn('Panel administrativo no disponible:', error); }
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
    if (!_supabase) return;
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

    let esAdmin = false;
    if (_supabase) {
        try {
            const { data: { session } } = await _supabase.auth.getSession();
            esAdmin = !!session;
        } catch (error) { esAdmin = false; }
    }

    let productos = [];
    try {
        if (!_supabase) throw new Error('Supabase no disponible');
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
    if (!producto) producto = PRODUCTOS_BASE[0];

    const aplicarProducto = item => {
        const image = document.querySelector('.main-img');
        const brand = document.querySelector('.info .brand');
        const title = document.querySelector('.info .title');
        const price = document.querySelector('.price-box span');
        if (image) { image.src = item.image; image.alt = `${item.brand} ${item.title}`; }
        if (brand) brand.textContent = item.brand;
        if (title) title.textContent = item.title;
        if (price) price.textContent = `$${Number(item.price).toLocaleString('es-CL')}`;
        document.title = `${item.title} | Óptica Nuevo Horizonte`;
        const addButton = document.querySelector('.btn-add');
        const buyButton = document.querySelector('.btn-buy-now');
        if (addButton) addButton.onclick = () => agregarAlCarritoDirecto(String(item.id), item.title, item.brand, item.price, item.image);
        if (buyButton) buyButton.onclick = () => comprarAhora(String(item.id), item.title, item.brand, item.price, item.image);
    };
    aplicarProducto(producto);

    try {
        const { data } = await _supabase.from('optica_productos').select('*').eq('id', id).maybeSingle();
        if (data) { producto = { ...producto, ...data }; aplicarProducto(producto); }
    } catch (error) { /* La ficha base mantiene disponible la página sin conexión. */ }
}

window.toggleDrawer = function(open) {
    const drawer = document.querySelector('#drawer-filter');
    if (drawer) {
        if (open) drawer.classList.add('active');
        else drawer.classList.remove('active');
        document.body.classList.toggle('drawer-open', open);
    }
};

function obtenerCarrito() {
    try {
        const principal = JSON.parse(localStorage.getItem('cart_optica') || '[]');
        if (Array.isArray(principal) && principal.length) return principal;
        const respaldo = JSON.parse(sessionStorage.getItem('cart_checkout_optica') || '[]');
        return Array.isArray(respaldo) ? respaldo : [];
    } catch (error) { return []; }
}
function guardarCarrito(c) {
    const limpio = Array.isArray(c) ? c : [];
    localStorage.setItem('cart_optica', JSON.stringify(limpio));
    sessionStorage.setItem('cart_checkout_optica', JSON.stringify(limpio));
    actualizarContadorHeader();
}

function actualizarContadorHeader() {
    const totalItems = obtenerCarrito().reduce((acc, item) => acc + item.cantidad, 0);
    document.querySelectorAll('.badge-count').forEach(b => b.textContent = totalItems);
}

function initCarrito() { actualizarContadorHeader(); }

window.agregarAlCarritoDirecto = function(id, nombre, marca, precio, imagen) {
    let carrito = obtenerCarrito();
    const index = carrito.findIndex(item => String(item.id) === String(id));
    if (index !== -1) carrito[index].cantidad += 1;
    else carrito.push({ id: String(id), nombre, marca, precio: parseInt(precio), imagen, cantidad: 1 });
    guardarCarrito(carrito);
    alert('¡Armazón añadido a tu bolsa de compras!');
};

window.comprarAhora = function(id, nombre, marca, precio, imagen) {
    let carrito = obtenerCarrito();
    const index = carrito.findIndex(item => String(item.id) === String(id));
    if (index !== -1) carrito[index].cantidad += 1;
    else carrito.push({ id: String(id), nombre, marca, precio: Number(precio), imagen, cantidad: 1 });
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
                <div class="item-total">
                    <div>$${totalItem.toLocaleString('es-CL')}</div>
                    <button class="remove-btn" onclick="eliminarDelCarrito(${index})">Eliminar</button>
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

function renderizarVistaCheckout() {
    const itemsEl = document.querySelector('#checkout-cart-items');
    const form = document.querySelector('#checkout-form');
    if (!itemsEl || !form) return;
    const carrito = obtenerCarrito();
    const subtotal = carrito.reduce((total, item) => total + Number(item.precio) * Number(item.cantidad), 0);
    let shipping = 4500;

    itemsEl.innerHTML = carrito.length ? carrito.map(item => `
        <div class="sidebar-item"><img src="${item.imagen}" alt="${item.nombre}"><div><div class="sidebar-item-title">${item.nombre}</div><div class="sidebar-item-subtitle">${item.marca} · Cantidad ${item.cantidad}</div><div class="sidebar-item-price">$${(item.precio * item.cantidad).toLocaleString('es-CL')}</div></div></div>
    `).join('') : '<div class="checkout-empty">No hay productos en tu bolsa.</div>';

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
        addressFields.querySelectorAll('[required]').forEach(field => field.required = !retiro);
        actualizarTotales();
    }));

    document.querySelector('#prescription-file')?.addEventListener('change', event => {
        const file = event.target.files[0];
        const label = document.querySelector('#prescription-label');
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { event.target.value = ''; label.textContent = 'El archivo supera los 10 MB'; return; }
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
        const payload = {
            nombre: fields.get('nombre'),
            telefono: fields.get('telefono'),
            total: subtotal + shipping,
            metodo_envio: fields.get('shipping') === 'retiro' ? 'Retiro en tienda' : 'Despacho a domicilio',
            receta_url: null
        };
        try {
            const receta = document.querySelector('#prescription-file')?.files[0];
            if (receta) {
                const extension = receta.name.split('.').pop().toLowerCase();
                const ruta = `recetas/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
                const { error: uploadError } = await _supabase.storage.from('optica_media').upload(ruta, receta);
                if (uploadError) throw uploadError;
                payload.receta_url = _supabase.storage.from('optica_media').getPublicUrl(ruta).data.publicUrl;
            }
            const { error } = await _supabase.from('optica_pedidos').insert([payload]);
            if (error) throw error;
            localStorage.setItem('ultimo_pedido_optica', JSON.stringify({ ...payload, email: fields.get('email'), carrito, creado: new Date().toISOString() }));
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
