// firebase-config.js
// Inicialización centralizada de Firebase para toda la app.
// Todas las páginas importan auth/db desde aquí para mantener una sola instancia.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Fetch config from our local Express backend server dynamically
const res = await fetch("/api/firebase-config");
const firebaseConfig = await res.json();

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
