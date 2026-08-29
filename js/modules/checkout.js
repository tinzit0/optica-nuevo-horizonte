(function (global) {
    const root = global.OpticaModules = global.OpticaModules || {};
    const ORDER_ITEM_KEYS = Object.freeze(['product_id', 'sku', 'quantity', 'crystal_config']);

    function buildOrderItems(cart) {
        return (Array.isArray(cart) ? cart : []).map(item => ({
            product_id: String(item.product_id || ''),
            sku: String(item.sku || ''),
            quantity: Number(item.quantity || 0),
            crystal_config: item.crystal_config && typeof item.crystal_config === 'object'
                ? item.crystal_config
                : {}
        }));
    }

    function estimateSubtotal(cart) {
        return (Array.isArray(cart) ? cart : []).reduce(
            (total, item) => total + Number(item.precio || 0) * Number(item.quantity || 0),
            0
        );
    }

    function buildOrderPayload({ fields, cart, shipping, retiro }) {
        const subtotal = estimateSubtotal(cart);
        const direccionEntrega = retiro
            ? 'Retiro en Caupolicán #314, Concepción'
            : `${fields.get('direccion')}, ${fields.get('comuna')}, ${fields.get('region')}`;

        return {
            p_nombre: fields.get('nombre'),
            p_rut: fields.get('rut'),
            p_telefono: fields.get('telefono'),
            p_email: fields.get('email'),
            p_direccion_entrega: direccionEntrega,
            p_indicaciones_entrega: fields.get('indicaciones') || '',
            p_metodo_envio: retiro ? 'Retiro en tienda' : 'Despacho a domicilio',
            p_subtotal: subtotal,
            p_costo_envio: shipping,
            p_total: subtotal + shipping,
            p_items: buildOrderItems(cart),
            p_receta_path: null
        };
    }

    root.checkout = Object.freeze({ buildOrderItems, estimateSubtotal, buildOrderPayload, ORDER_ITEM_KEYS });
})(window);
