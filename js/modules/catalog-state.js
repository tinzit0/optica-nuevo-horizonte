(function (global) {
    const root = global.OpticaModules = global.OpticaModules || {};
    const MULTI_KEYS = Object.freeze(['brand', 'gender', 'color', 'material', 'shape', 'category', 'feature']);
    const MANAGED_KEYS = Object.freeze(['q', 'sort', ...MULTI_KEYS, 'min', 'max']);
    const DEFAULT_SORT = 'featured';
    const SORTS = new Set(['featured', 'price-asc', 'price-desc', 'name', 'newest']);

    function cleanList(values) {
        const source = Array.isArray(values) ? values : [values];
        return [...new Set(source
            .flatMap(value => String(value ?? '').split(','))
            .map(value => value.trim())
            .filter(Boolean))];
    }

    function readNumber(value) {
        if (value === null || value === undefined || String(value).trim() === '') return null;
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? number : null;
    }

    function getURL(value) {
        if (value instanceof URL) return new URL(value.href);
        if (value && typeof value === 'object' && typeof value.search === 'string') {
            return new URL(value.href || `${value.pathname || '/'}${value.search}${value.hash || ''}`, 'https://optica.local');
        }
        return new URL(String(value || global.location?.href || '/'), 'https://optica.local');
    }

    function read(value) {
        const params = getURL(value).searchParams;
        const state = {
            q: String(params.get('q') || '').trim(),
            sort: SORTS.has(params.get('sort')) ? params.get('sort') : DEFAULT_SORT,
            brand: [],
            gender: [],
            color: [],
            material: [],
            shape: [],
            category: [],
            feature: [],
            min: readNumber(params.get('min')),
            max: readNumber(params.get('max'))
        };
        MULTI_KEYS.forEach(key => { state[key] = cleanList(params.getAll(key)); });
        // Compatibilidad con los enlaces existentes de la tienda.
        if (!state.category.length && params.get('cat')) state.category = cleanList(params.get('cat'));
        if (!state.gender.length && params.get('gen')) state.gender = cleanList(params.get('gen'));
        if (!state.brand.length && params.get('marca')) state.brand = cleanList(params.get('marca'));
        if (!state.feature.length && params.get('oferta')) state.feature = ['oferta'];
        return state;
    }

    function write(value, options = {}) {
        const current = getURL(global.location?.href || '/');
        const state = { ...read(current), ...(value || {}) };
        const next = new URL(current.href);
        MANAGED_KEYS.forEach(key => next.searchParams.delete(key));
        // Los parámetros antiguos se eliminan solo cuando se escribe un estado nuevo.
        ['cat', 'gen', 'marca', 'oferta'].forEach(key => next.searchParams.delete(key));
        if (String(state.q || '').trim()) next.searchParams.set('q', String(state.q).trim());
        if (state.sort && state.sort !== DEFAULT_SORT && SORTS.has(state.sort)) next.searchParams.set('sort', state.sort);
        MULTI_KEYS.forEach(key => cleanList(state[key]).forEach(valueItem => next.searchParams.append(key, valueItem)));
        const min = readNumber(state.min);
        const max = readNumber(state.max);
        if (min !== null) next.searchParams.set('min', String(min));
        if (max !== null) next.searchParams.set('max', String(max));
        const relative = `${next.pathname}${next.search}${next.hash}`;
        const currentRelative = `${current.pathname}${current.search}${current.hash}`;
        if (relative !== currentRelative && global.history?.replaceState) {
            const method = options.replace === false ? 'pushState' : 'replaceState';
            global.history[method]({}, '', relative);
        }
        return relative;
    }

    function onPopState(listener) {
        if (!global.addEventListener) return () => {};
        const handler = () => listener(read());
        global.addEventListener('popstate', handler);
        return () => global.removeEventListener('popstate', handler);
    }

    root.catalogState = Object.freeze({
        DEFAULT_SORT,
        MULTI_KEYS,
        read,
        write,
        onPopState,
        cleanList,
        readNumber
    });
})(window);
