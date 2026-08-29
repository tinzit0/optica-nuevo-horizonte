(function (global) {
    const root = global.OpticaModules = global.OpticaModules || {};

    function normalizeItem(item) {
        const original = item && typeof item === 'object' ? item : {};
        const productId = original.product_id ?? original.id ?? '';
        const sku = original.sku ?? original.id ?? productId;
        const quantity = Math.max(1, Math.floor(Number(original.quantity ?? original.cantidad ?? 1) || 1));
        const crystalConfig = original.crystal_config && typeof original.crystal_config === 'object'
            ? original.crystal_config
            : (Array.isArray(original.configuracion) ? { legacy: original.configuracion } : {});

        return {
            ...original,
            id: String(sku ?? ''),
            product_id: String(productId ?? ''),
            sku: String(sku ?? ''),
            quantity,
            cantidad: quantity,
            crystal_config: crystalConfig,
            configuracion: Array.isArray(original.configuracion)
                ? original.configuracion
                : Object.values(crystalConfig).map(value => value?.name).filter(Boolean)
        };
    }

    function getCart() {
        try {
            const principal = JSON.parse(global.localStorage.getItem('cart_optica') || '[]');
            if (Array.isArray(principal) && principal.length) return principal.map(normalizeItem);
            const respaldo = JSON.parse(global.sessionStorage.getItem('cart_checkout_optica') || '[]');
            return Array.isArray(respaldo) ? respaldo.map(normalizeItem) : [];
        } catch (error) {
            return [];
        }
    }

    function saveCart(cart) {
        const clean = Array.isArray(cart)
            ? cart.map(normalizeItem).filter(item => item.product_id && item.sku)
            : [];
        global.localStorage.setItem('cart_optica', JSON.stringify(clean));
        global.sessionStorage.setItem('cart_checkout_optica', JSON.stringify(clean));
        global.document.querySelectorAll('.badge-count').forEach(badge => {
            badge.textContent = clean.reduce((total, item) => total + item.quantity, 0);
        });
    }

    root.cart = Object.freeze({ normalizeItem, getCart, saveCart });
})(window);
