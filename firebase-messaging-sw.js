// Firebase Messaging Service Worker — handles push when app is CLOSED
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDzcAE2EoLEdhG1VrxGuC981RH-5TmWE",
    authDomain: "daily-voting-793ee.firebaseapp.com",
    projectId: "daily-voting-793ee",
    storageBucket: "daily-voting-793ee.appspot.com",
    messagingSenderId: "1065830068376",
    appId: "1:1065830068376:web:9d3858939d07056a5fa0ed"
});

const messaging = firebase.messaging();

// The Firebase SDK automatically handles displaying notifications when the app is in the background 
// if the message contains a 'notification' payload and 'fcm_options.link' is set.
