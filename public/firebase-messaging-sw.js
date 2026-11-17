importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAzo57FlzJSzSDDjTW7w8ODlXtXcS1LvY4",
  authDomain: "envia-notificaciones.firebaseapp.com",
  projectId: "envia-notificaciones",
  storageBucket: "envia-notificaciones.firebasestorage.app",
  messagingSenderId: "887034908416",
  appId: "1:887034908416:web:2981b1705ef93c42bd6de5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    const titulo = "¡Nueva Carrera Pendiente! 🚗";
    const opciones = {
        body: "Tienes una solicitud de servicio disponible en EN-VIA.",
        icon: "../favicon.ico",
        tag: "alerta-carrera",
        requireInteraction: true,
        vibrate: [500, 250, 500, 250, 500] // Fuerza la vibración persistente
    };

    self.registration.showNotification(titulo, opciones);
});
