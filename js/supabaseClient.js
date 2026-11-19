// Configuración de Supabase para EN-VIA
var SUPABASE_URL = 'https://sgpwdejwfbqsswoibohu.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_891ubyEIooQ7Ik7vdEACZQ_vfXcW37g';

if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    var supabaseClient = window.supabaseClient;
} else {
    console.error('No se cargó la librería de Supabase antes de supabaseClient.js');
}
