(function (global) {
    const root = global.OpticaModules = global.OpticaModules || {};

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[character]));
    }

    function safeURL(value, fallback = '') {
        const raw = String(value ?? '').trim();
        if (!raw) return fallback;

        // Se permiten únicamente URLs web, data:image y rutas relativas del
        // propio sitio. Todo valor termina escapado antes de entrar en HTML.
        const isRelative = /^(?:\.?\.?\/|\/|[a-z0-9_-]+\/)/i.test(raw);
        const isDataImage = /^data:image\/(?:png|jpe?g|webp|gif);/i.test(raw);
        if (isDataImage) return escapeHTML(raw);

        try {
            const parsed = new URL(raw, global.location.href);
            if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || isRelative) {
                return escapeHTML(raw);
            }
        } catch (error) {
            return fallback;
        }
        return fallback;
    }

    root.ui = Object.freeze({ escapeHTML, safeURL });
})(window);
