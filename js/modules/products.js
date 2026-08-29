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

    function normalizeText(value) {
        return String(value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('es')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function asList(value) {
        const values = Array.isArray(value) ? value : [value];
        return values.flatMap(item => String(item ?? '').split(',')).map(normalizeText).filter(Boolean);
    }

    function getProductFeatures(product) {
        return asList(Array.isArray(product?.features)
            ? product.features
            : String(product?.features || '').split(','));
    }

    function getProductSearchText(product) {
        return normalizeText([
            product?.brand,
            product?.title,
            product?.name,
            product?.nombre,
            product?.id,
            product?.sku,
            product?.color,
            product?.material,
            product?.shape
        ].filter(Boolean).join(' '));
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
        const normalizedSearch = normalizeText(search);
        const normalizedCategories = asList(categories);
        const normalizedGenders = asList(genders);
        const normalizedBrands = asList(brands);
        const normalizedShapes = asList(shapes);
        const normalizedColors = asList(colors);
        const normalizedMaterials = asList(materials);
        const normalizedFeatures = asList(features);

        return (Array.isArray(products) ? products : []).filter(product => {
            const matchCategory = !normalizedCategories.length || normalizedCategories.includes(normalizeText(product.category));
            const matchGender = !normalizedGenders.length || normalizedGenders.includes(normalizeText(product.gender));
            const normalizedBrand = normalizeText(product.brand);
            const matchBrand = !normalizedBrands.length || normalizedBrands.some(brand => normalizedBrand === brand || normalizedBrand.includes(brand));
            const matchShape = !normalizedShapes.length || normalizedShapes.includes(normalizeText(product.shape));
            const matchColor = !normalizedColors.length || normalizedColors.includes(normalizeText(product.color));
            const matchMaterial = !normalizedMaterials.length || normalizedMaterials.includes(normalizeText(product.material));
            const productFeatures = getProductFeatures(product);
            const matchFeatures = normalizedFeatures.every(feature => productFeatures.includes(feature));
            const searchable = getProductSearchText(product);
            const price = Number(product.price) || 0;
            return matchCategory && matchGender && matchBrand && matchShape && matchColor && matchMaterial && matchFeatures
                && (!normalizedSearch || searchable.includes(normalizedSearch))
                && price >= minPrice && price <= maxPrice;
        });
    }

    root.products = Object.freeze({
        resolveProducts,
        findById,
        getVariantGroupKey,
        getVariantLabel,
        getModelTitle,
        groupVariants,
        normalizeText,
        getProductSearchText,
        filterProducts
    });
})(window);
