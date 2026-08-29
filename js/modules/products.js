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

    root.products = Object.freeze({ resolveProducts, findById, filterProducts });
})(window);
