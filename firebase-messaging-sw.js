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

// Manejo opcional de notificaciones en segundo plano si la app está cerrada
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano: ', payload);
    
    const notificationTitle = payload.notification.title || 'Nueva notificación de EN-VIA';
    const notificationOptions = {
        body: payload.notification.body || 'Tienes una nueva actualización en la plataforma.',
        icon: '/favicon.ico'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});