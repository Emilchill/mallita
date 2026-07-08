// firebase-config.js
// Inicialización centralizada de Firebase para toda la app.
// Todas las páginas importan auth/db desde aquí para mantener una sola instancia.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDYUFGIjFkEAYACGD2l8Rzoo1x4Qcd5KhE",
  authDomain: "malla-curricular-38175.firebaseapp.com",
  projectId: "malla-curricular-38175",
  storageBucket: "malla-curricular-38175.firebasestorage.app",
  messagingSenderId: "1010936934232",
  appId: "1:1010936934232:web:5a6f313b80f9c879e47f2d"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
