// Importa los scripts necesarios de Firebase para el manejo en segundo plano
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Inicializa Firebase en el Service Worker con tu configuración
firebase.initializeApp({
    apiKey: "AIzaSyAzo57FlzJSzSDDjTW7w8ODlXtXcS1LvY4",
    authDomain: "envia-notificaciones.firebaseapp.com",
    projectId: "envia-notificaciones",
    storageBucket: "envia-notificaciones.firebasestorage.app",
    messagingSenderId: "887034908416",
    appId: "1:887034908416:web:2981b1705ef93c42bd6de5"
});

const messaging = firebase.messaging();

// Intercepta las notificaciones push cuando la app está en segundo plano o cerrada
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Notificación recibida en segundo plano:', payload);

    // Extrae los datos enviados por la notificación o usa valores por defecto
    const notificationTitle = payload.notification?.title || payload.data?.title || '🚨 ¡Nueva Carrera Disponible!';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Tienes una nueva solicitud de viaje en EN-VIA.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'envia-carrera-alerta',
        renotify: true,
        // Configuración clave para forzar banner superior y sonido nativo en móviles
        requireInteraction: true,
        data: {
            url: payload.data?.url || '/conductor/'
        }
    };

    // Muestra la notificación nativa flotante arriba (Banner + Sonido del sistema)
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Maneja el evento de clic sobre la notificación flotante para abrir la app del conductor
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/conductor/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes('/conductor/') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
