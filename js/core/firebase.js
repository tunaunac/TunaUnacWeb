import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// ✅ Exportamos la configuración para que admin.js pueda usarla
export const firebaseConfig = {
    apiKey: "AIzaSyDaigMZ_Y-aryB2JvkEojkeiRfRGwoeos0",
    authDomain: "tunaunacweb.firebaseapp.com",
    projectId: "tunaunacweb",
    storageBucket: "tunaunacweb.firebasestorage.app",
    messagingSenderId: "803401150401",
    appId: "1:803401150401:web:f5aec3c94791b82588c940",
    measurementId: "G-6TNCQEV3CW"
};

// Inicializamos los servicios
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Exportamos para que otros módulos puedan usarlos
export { app, db, auth, storage };