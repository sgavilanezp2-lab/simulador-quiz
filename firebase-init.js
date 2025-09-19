const firebaseConfig = {
    apiKey: "AIzaSyBU1oaDdq6qD4fTiLN41SAeQg6Kp06gDXk",
    authDomain: "simulador-tics.firebaseapp.com",
    projectId: "simulador-tics",
    storageBucket: "simulador-tics.firebasestorage.app",
    messagingSenderId: "501091859008",
    appId: "1:501091859008:web:80e4596d2adcb5adbf7da5",
    measurementId: "G-5LFLE4MBPH"
  };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
