// Configuración de Supabase para EN-VIA
const SUPABASE_URL = 'https://sgpwdejwfbqsswoibohu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_891ubyEIooQ7Ik7vdEACZQ_vfXcW37g';

// Inicializar el cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
