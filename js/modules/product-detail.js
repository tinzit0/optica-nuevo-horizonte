(function (global) {
    const root = global.OpticaModules = global.OpticaModules || {};

    function normalizeList(value) {
        const values = Array.isArray(value) ? value : [value];
        return [...new Set(values
            .flatMap(item => String(item ?? '').split(','))
            .map(item => item.trim())
            .filter(Boolean))];
    }

    function getProductSku(product) {
        return String(product?.sku || product?.SKU || product?.id || '').trim();
    }

    function getProductAvailability(product) {
        if (product?.published === false) return { known: true, available: false, label: 'No disponible' };
        const rawStock = product?.stock ?? product?.inventory ?? product?.quantity_available;
        if (rawStock === null || rawStock === undefined || String(rawStock).trim() === '') {
            return { known: false, available: true, label: 'Consultar disponibilidad' };
        }
        const stock = Number(rawStock);
        if (!Number.isFinite(stock)) return { known: false, available: true, label: 'Consultar disponibilidad' };
        if (stock <= 0) return { known: true, available: false, label: 'Agotado', stock: 0 };
        return { known: true, available: true, label: 'Disponible', stock };
    }

    function getProductFeatures(product) {
        return normalizeList(Array.isArray(product?.features)
            ? product.features
            : String(product?.features || '').split(','));
    }

    function getProductGallery(product) {
        const images = [];
        if (product?.image) images.push(product.image);
        ['images', 'gallery', 'image_urls'].forEach(key => {
            const value = product?.[key];
            if (Array.isArray(value)) images.push(...value);
            else if (typeof value === 'string') images.push(...value.split(','));
        });
        return [...new Set(images.map(value => String(value ?? '').trim()).filter(Boolean))];
    }

    function getVariantLabel(product) {
        if (root.products?.getVariantLabel) return root.products.getVariantLabel(product);
        const color = String(product?.color || '').trim();
        if (color) return color.toLowerCase() === 'principal' ? 'Principal' : color.toUpperCase();
        const match = String(product?.id || '').match(/-(principal|c-[a-z0-9]+)$/i);
        return match ? (match[1].toLowerCase() === 'principal' ? 'Principal' : match[1].toUpperCase()) : 'Disponible';
    }

    function getModelTitle(product) {
        if (root.products?.getModelTitle) return root.products.getModelTitle(product);
        return String(product?.title || '').replace(/\s+(?:principal|c-[a-z0-9]+)$/i, '').trim();
    }

    function getSafeURL(value) {
        return root.ui?.safeURL ? root.ui.safeURL(value) : String(value || '');
    }

    function getGroups(products) {
        return root.products?.groupVariants ? root.products.groupVariants(products) : [];
    }

    function findGroup(products, item) {
        return getGroups(products).find(group => group.variants.some(variant => String(variant.id) === String(item?.id))) || null;
    }

    function createImage(src, alt, className = '', doc = document) {
        const image = doc.createElement('img');
        image.src = getSafeURL(src);
        image.alt = alt || '';
        if (className) image.className = className;
        image.loading = 'lazy';
        image.decoding = 'async';
        return image;
    }

    function init(options = {}) {
        const doc = options.document || document;
        const supabase = options.supabase || null;
        let products = [...(Array.isArray(options.localProducts) ? options.localProducts : []), ...(Array.isArray(options.fallbackProducts) ? options.fallbackProducts : [])]
            .filter(Boolean)
            .filter((product, index, list) => list.findIndex(item => String(item.id) === String(product.id)) === index);
        const requestedId = new URLSearchParams(global.location.search).get('id');
        let selectedProduct = products.find(product => String(product.id) === String(requestedId)) || products[0] || null;
        let galleryImages = [];
        let galleryIndex = 0;
        let galleryReady = false;

        const stage = doc.querySelector('.gallery-stage');
        const mainImage = doc.querySelector('.main-img');
        const thumbnails = doc.querySelector('.gallery-thumbs');
        const previous = doc.querySelector('[data-gallery-prev]');
        const next = doc.querySelector('[data-gallery-next]');
        const galleryCount = doc.querySelector('[data-gallery-count]');
        const galleryEmpty = doc.querySelector('[data-gallery-empty]');
        const zoomNote = doc.querySelector('.zoom-note');

        function selectGalleryImage(index) {
            if (!galleryImages.length || !mainImage) return;
            galleryIndex = (index + galleryImages.length) % galleryImages.length;
            const image = galleryImages[galleryIndex];
            mainImage.src = getSafeURL(image);
            mainImage.hidden = false;
            mainImage.alt = selectedProduct ? `${selectedProduct.brand || ''} ${getModelTitle(selectedProduct)}`.trim() : '';
            stage?.classList.remove('is-zoomed');
            if (galleryCount) galleryCount.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
            thumbnails?.querySelectorAll('[data-gallery-index]').forEach(button => {
                const active = Number(button.dataset.galleryIndex) === galleryIndex;
                button.classList.toggle('selected', active);
                button.setAttribute('aria-selected', String(active));
            });
            if (previous) previous.hidden = galleryImages.length < 2;
            if (next) next.hidden = galleryImages.length < 2;
        }

        function renderGallery(product) {
            galleryImages = getProductGallery(product);
            galleryIndex = 0;
            if (thumbnails) thumbnails.replaceChildren();
            if (!galleryImages.length) {
                if (mainImage) { mainImage.hidden = true; mainImage.removeAttribute('src'); }
                if (galleryEmpty) galleryEmpty.hidden = false;
                if (galleryCount) galleryCount.hidden = true;
                if (zoomNote) zoomNote.hidden = true;
                if (previous) previous.hidden = true;
                if (next) next.hidden = true;
                stage?.classList.remove('is-zoomed');
                return;
            }
            if (galleryEmpty) galleryEmpty.hidden = true;
            if (galleryCount) galleryCount.hidden = false;
            if (zoomNote) zoomNote.hidden = false;
            galleryImages.forEach((image, index) => {
                if (!thumbnails) return;
                const button = doc.createElement('button');
                button.type = 'button';
                button.className = 'gallery-thumb';
                button.dataset.galleryIndex = String(index);
                button.setAttribute('role', 'tab');
                button.setAttribute('aria-label', `Ver imagen ${index + 1}`);
                button.setAttribute('aria-selected', String(index === 0));
                button.appendChild(createImage(image, '', 'gallery-thumb-image', doc));
                button.addEventListener('click', () => selectGalleryImage(index));
                thumbnails.appendChild(button);
            });
            selectGalleryImage(0);
        }

        function initGalleryEvents() {
            if (galleryReady) return;
            galleryReady = true;
            previous?.addEventListener('click', () => selectGalleryImage(galleryIndex - 1));
            next?.addEventListener('click', () => selectGalleryImage(galleryIndex + 1));
            mainImage?.addEventListener('click', () => {
                if (galleryImages.length) stage?.classList.toggle('is-zoomed');
            });
            stage?.addEventListener('keydown', event => {
                if (event.key === 'ArrowLeft') selectGalleryImage(galleryIndex - 1);
                if (event.key === 'ArrowRight') selectGalleryImage(galleryIndex + 1);
                if (event.key === 'Escape') stage.classList.remove('is-zoomed');
            });
        }

        function renderFeatures(product) {
            const list = doc.querySelector('#product-features');
            if (!list) return;
            list.replaceChildren();
            getProductFeatures(product).forEach(feature => {
                const item = doc.createElement('li');
                item.textContent = feature;
                list.appendChild(item);
            });
            list.closest('.product-features')?.toggleAttribute('hidden', !list.children.length);
        }

        function renderVariants(product) {
            const picker = doc.querySelector('#product-variants');
            const optionsContainer = picker?.querySelector('.product-variants');
            if (!picker || !optionsContainer) return;
            const group = findGroup(products, product);
            const variants = group?.variants || [product];
            optionsContainer.replaceChildren();
            if (variants.length < 2) {
                picker.hidden = true;
                return;
            }
            picker.hidden = false;
            variants.forEach(variant => {
                const button = doc.createElement('button');
                const variantId = String(variant.id || '');
                const active = variantId === String(product.id);
                button.type = 'button';
                button.className = `color-swatch${active ? ' selected' : ''}`;
                button.dataset.detailVariantId = variantId;
                button.setAttribute('aria-label', `Color ${getVariantLabel(variant)}`);
                button.setAttribute('aria-pressed', String(active));
                const variantImage = getProductGallery(variant)[0];
                if (variantImage) button.appendChild(createImage(variantImage, '', 'variant-thumb', doc));
                else {
                    const placeholder = doc.createElement('span');
                    placeholder.className = 'variant-thumb variant-thumb-empty';
                    placeholder.setAttribute('aria-hidden', 'true');
                    button.appendChild(placeholder);
                }
                const label = doc.createElement('span');
                label.textContent = getVariantLabel(variant);
                button.appendChild(label);
                button.addEventListener('click', () => {
                    const selected = variants.find(item => String(item.id) === variantId);
                    if (!selected) return;
                    const url = new URL(global.location.href);
                    url.searchParams.set('id', variantId);
                    global.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
                    selectedProduct = selected;
                    renderProduct(selected);
                });
                optionsContainer.appendChild(button);
            });
        }

        function renderProduct(product) {
            if (!product) return;
            selectedProduct = product;
            const modelTitle = findGroup(products, product)?.title || getModelTitle(product) || String(product.title || 'Armazón');
            const availability = getProductAvailability(product);
            const price = Number(product.price) || 0;
            const sku = getProductSku(product);
            const brand = doc.querySelector('.info .brand');
            const title = doc.querySelector('.info .title');
            const code = doc.querySelector('.product-code');
            const skuValue = doc.querySelector('[data-product-sku]');
            const colorValue = doc.querySelector('[data-product-color]');
            const materialValue = doc.querySelector('[data-product-material], .spec-material');
            const priceValue = doc.querySelector('.price-box span');
            const description = doc.querySelector('.product-copy');
            const availabilityValue = doc.querySelector('[data-product-availability]');
            const installments = doc.querySelector('.installments');
            if (brand) brand.textContent = product.brand || '';
            if (title) title.textContent = modelTitle;
            if (code) code.textContent = 'ARMAZÓN ÓPTICO · DISPONIBLE EN TIENDA Y ONLINE';
            if (skuValue) skuValue.textContent = sku || 'Consultar código';
            if (colorValue) colorValue.textContent = getVariantLabel(product);
            const materialLabel = product.material ? String(product.material).replace(/^./, character => character.toUpperCase()) : 'Consultar material';
            if (materialValue) materialValue.textContent = materialLabel;
            doc.querySelectorAll('[data-product-material], .spec-material').forEach(element => {
                element.textContent = materialLabel;
            });
            if (priceValue) priceValue.textContent = price > 0 ? `$${price.toLocaleString('es-CL')}` : 'Consultar precio';
            if (description) description.textContent = product.description || 'Armazón óptico de diseño contemporáneo para uso diario.';
            if (availabilityValue) {
                availabilityValue.textContent = availability.label;
                availabilityValue.dataset.available = String(availability.available);
                availabilityValue.classList.toggle('is-unavailable', !availability.available);
            }
            if (installments) installments.textContent = price > 0 ? `Hasta 12 cuotas de $${Math.ceil(price / 12).toLocaleString('es-CL')}` : '';
            const primaryImage = getProductGallery(product)[0] || '';
            doc.querySelectorAll('.config-image').forEach(element => {
                if (primaryImage) element.src = getSafeURL(primaryImage);
                else element.removeAttribute('src');
                element.alt = `${product.brand || ''} ${modelTitle}`.trim();
            });
            const configName = doc.querySelector('.config-product strong');
            if (configName) configName.textContent = `${product.brand || ''} · ${modelTitle} · ${getVariantLabel(product)}`;
            doc.title = `${modelTitle} | Óptica Nuevo Horizonte`;
            const addButton = doc.querySelector('.btn-add');
            const buyButton = doc.querySelector('.btn-buy-now');
            const configureButton = doc.querySelector('.btn-configure');
            const mobileButton = doc.querySelector('[data-mobile-add]');
            const canBuy = price > 0 && availability.available;
            const add = () => options.addToCart?.(String(product.id), product.title || modelTitle, product.brand || '', price, primaryImage, sku);
            const buy = () => options.buyNow?.(String(product.id), product.title || modelTitle, product.brand || '', price, primaryImage, sku);
            [addButton, buyButton, mobileButton].forEach(button => {
                if (!button) return;
                button.disabled = !canBuy;
                button.onclick = button === buyButton ? buy : add;
                if (button === mobileButton) button.textContent = canBuy ? 'AÑADIR A LA BOLSA' : availability.label.toUpperCase();
            });
            if (configureButton) {
                configureButton.disabled = !availability.available;
                configureButton.setAttribute('aria-disabled', String(!availability.available));
            }
            if (mobileButton) {
                const mobilePrice = doc.querySelector('[data-mobile-price]');
                if (mobilePrice) mobilePrice.textContent = price > 0 ? `$${price.toLocaleString('es-CL')}` : 'Consultar precio';
            }
            renderGallery(product);
            renderVariants(product);
            renderFeatures(product);
            options.onConfigure?.(product);
        }

        initGalleryEvents();
        renderProduct(selectedProduct);

        return (async () => {
            if (!supabase) return selectedProduct;
            try {
                const { data, error } = await supabase.from('optica_productos').select('*');
                if (error || !Array.isArray(data) || !data.length) return selectedProduct;
                products = data.filter(Boolean);
                const remoteProduct = products.find(product => String(product.id) === String(requestedId)) || products.find(product => String(product.id) === String(selectedProduct?.id));
                if (remoteProduct) renderProduct(remoteProduct);
            } catch (error) {
                // La ficha local sigue disponible si Supabase no responde.
            }
            return selectedProduct;
        })();
    }

    root.productDetail = Object.freeze({
        init,
        getProductSku,
        getProductAvailability,
        getProductFeatures,
        getProductGallery
    });
})(window);
