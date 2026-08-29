/*
 * Cliente público de Supabase.
 *
 * Este archivo sólo contiene la publishable/anon key, que está diseñada para
 * ejecutarse en el navegador. Nunca colocar aquí service_role ni secretos.
 */
(function (global) {
    const SUPABASE_URL = 'https://kxldsjodgfonrrlwjbws.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_J5s_2YqtASIYSqu2k00SGA_copdr39x';
    const createClient = global.supabase?.createClient;

    global.opticaSupabaseConfig = Object.freeze({
        url: SUPABASE_URL,
        publishableKey: SUPABASE_PUBLISHABLE_KEY
    });

    global.opticaSupabase = typeof createClient === 'function'
        ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
        : null;

    global.opticaSupabaseReady = Promise.resolve(global.opticaSupabase);
})(window);
