(function (global) {
    const root = global.OpticaModules = global.OpticaModules || {};

    function resolveProducts(remote, backup, fallback) {
        if (Array.isArray(remote) && remote.length) return remote.filter(Boolean);
        if (Array.isArray(backup) && backup.length) return backup.filter(Boolean);
        return Array.isArray(fallback) ? fallback : [];
    }

    function findById(remote, backup, fallback, id) {
        const products = resolveProducts(remote, backup, fallback);
        return products.find(product => String(product?.id) === String(id)) || null;
    }

    // Los IDs contienen guiones legítimos (por ejemplo foose-dsfo-048-c-2).
    // Solo se elimina el sufijo final que representa la variante de color.
    function getVariantGroupKey(product) {
        if (product?.variant_group || product?.group_id || product?.base_product_id) {
            return String(product.variant_group || product.group_id || product.base_product_id);
        }
        const id = String(product?.id || '').trim();
        return id.replace(/-(?:principal|c-[a-z0-9]+)$/i, '') || id;
    }

    function getVariantLabel(product) {
        const color = String(product?.color || '').trim();
        if (color) return color.toLowerCase() === 'principal' ? 'Principal' : color.toUpperCase();
        const idMatch = String(product?.id || '').match(/-(principal|c-[a-z0-9]+)$/i);
        if (idMatch) return idMatch[1].toLowerCase() === 'principal' ? 'Principal' : idMatch[1].toUpperCase();
        return 'Disponible';
    }

    function getModelTitle(product) {
        const title = String(product?.title || '').trim();
        return title.replace(/\s+(?:principal|c-[a-z0-9]+)$/i, '').trim() || title;
    }

    function variantPriority(product, groupKey) {
        const id = String(product?.id || '');
        const color = String(product?.color || '').toLowerCase();
        if (color === 'principal' || /-principal$/i.test(id)) return 0;
        if (id === String(groupKey)) return 1;
        return 2;
    }

    function groupVariants(products) {
        const groups = new Map();
        (Array.isArray(products) ? products : []).filter(Boolean).forEach(product => {
            const key = getVariantGroupKey(product);
            if (!groups.has(key)) groups.set(key, []);
            const variants = groups.get(key);
            if (!variants.some(item => String(item?.id) === String(product?.id))) variants.push(product);
        });

        return [...groups.entries()].map(([groupKey, variants]) => {
            variants.sort((a, b) => variantPriority(a, groupKey) - variantPriority(b, groupKey));
            const product = variants[0] || {};
            return Object.freeze({
                groupKey,
                product,
                variants: Object.freeze(variants.slice()),
                title: getModelTitle(product)
            });
        });
    }

    function filterProducts(products, criteria = {}) {
        const {
            categories = [],
            genders = [],
            brands = [],
            shapes = [],
            colors = [],
            materials = [],
            features = [],
            search = '',
            minPrice = 0,
            maxPrice = Infinity
        } = criteria;
        const normalizedSearch = String(search).trim().toLocaleLowerCase('es');

        return (Array.isArray(products) ? products : []).filter(product => {
            const matchCategory = !categories.length || categories.includes(product.category);
            const matchGender = !genders.length || genders.includes(product.gender);
            const matchBrand = !brands.length || brands.some(brand => String(product.brand || '').toLowerCase().includes(String(brand).toLowerCase()));
            const matchShape = !shapes.length || shapes.includes(product.shape || '');
            const matchColor = !colors.length || colors.includes(product.color || '');
            const matchMaterial = !materials.length || materials.includes(product.material || '');
            const productFeatures = Array.isArray(product.features)
                ? product.features
                : String(product.features || '').split(',').map(value => value.trim()).filter(Boolean);
            const matchFeatures = features.every(feature => productFeatures.includes(feature));
            const searchable = `${product.brand || ''} ${product.title || ''} ${product.color || ''} ${product.shape || ''} ${product.material || ''}`.toLocaleLowerCase('es');
            const price = Number(product.price) || 0;
            return matchCategory && matchGender && matchBrand && matchShape && matchColor && matchMaterial && matchFeatures
                && (!normalizedSearch || searchable.includes(normalizedSearch))
                && price >= minPrice && price <= maxPrice;
        });
    }

    root.products = Object.freeze({
        resolveProducts,
        findById,
        filterProducts,
        getVariantGroupKey,
        getVariantLabel,
        getModelTitle,
        groupVariants
    });
})(window);
