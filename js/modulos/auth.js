/**
 * ARCHIVO: modulos/auth.js
 * PROPÓSITO: Lógica de Login, Logout y carga de perfil.
 *            Ahora usa sync.js para datos en tiempo real.
 */
import { auth, db } from '../core/firebase.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { iniciarSync, detenerSync } from '../core/sync.js';

// Estado Global Inicial
window.usuarioActual = null;
window.rolActual = 'lector';
window.datosUsuario = {};

// Variables que serán llenadas por sync.js, pero inicializadas aquí
window.categorias = [];
window.canciones = [];
window.miembros = [];
window.progresos = {};
window.asignaciones = [];
window.ensayos = [];
window.presentaciones = [];
window.recursosPorCancion = {};

// =================================================================
// ESCUCHADOR DE SESIÓN
// =================================================================
onAuthStateChanged(auth, async (user) => {
    const btnPrincipal = document.querySelector('.boton-miembros');

    if (user) {
        window.usuarioActual = { uid: user.uid, email: user.email };
        if(btnPrincipal) btnPrincipal.innerHTML = '<i class="fa-solid fa-gauge-high"></i> IR AL DASHBOARD';
        
        // Cargar perfil del usuario (solo un doc, no colección)
        const docRef = doc(db, 'miembros', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            window.datosUsuario = docSnap.data();
        } else {
            window.datosUsuario = {
                uid: user.uid,
                email: user.email,
                nombre: user.email.split('@')[0],
                rol: 'lector',
                rango: 'Aspirante',
                instrumento: 'guitarra',
                foto: ''
            };
            await setDoc(docRef, window.datosUsuario);
        }
        
        window.rolActual = window.datosUsuario.rol || 'lector';
        
        // Actualizar UI del Sidebar
        const elNombre = document.getElementById('nombre-usuario');
        const elRol = document.getElementById('rol-usuario');
        if(elNombre) elNombre.textContent = window.datosUsuario.nombre || 'Sin nombre';
        if(elRol) elRol.textContent = window.rolActual === 'admin' ? 'Administrador' : window.datosUsuario.rango;
        
        const menuAdmin = document.getElementById('menu-admin-only');
        if(menuAdmin) menuAdmin.style.display = window.rolActual === 'admin' ? 'flex' : 'none';
        
        // 🔥 INICIAMOS LAS ESCUCHAS EN TIEMPO REAL
        iniciarSync();

        // ✅ Inicializar los contenedores del dashboard (solo la primera vez)
        window.inicializarDashboard();

        // Cerrar modal de login, mostrar panel de miembros y cargar repertorio por defecto
        if(window.cerrarModalMiembros) window.cerrarModalMiembros();
        window.mostrarPanel('miembros');
        if(window.cambiarSeccionDashboard) window.cambiarSeccionDashboard('repertorio-dash');
        
    } else {
        // Usuario cerró sesión
        window.usuarioActual = null;
        window.rolActual = 'lector';
        window.datosUsuario = null;
        
        // 🔥 DETENEMOS LAS ESCUCHAS
        detenerSync();

        // ✅ Limpiar el dashboard para que la próxima sesión lo reconstruya
        const dashboard = document.getElementById('dashboard-contenido');
        if (dashboard) dashboard.innerHTML = '';

        // Limpiar datos globales
        window.categorias = [];
        window.canciones = [];
        window.miembros = [];
        window.progresos = {};
        window.asignaciones = [];
        window.ensayos = [];
        window.presentaciones = [];
        window.recursosPorCancion = {};

        if(btnPrincipal) btnPrincipal.innerHTML = '<i class="fa-solid fa-user-group"></i> ÁREA MIEMBROS';
        
        const panelMiembros = document.getElementById('panel-miembros');
        if(panelMiembros && panelMiembros.classList.contains('panel-activo')) {
            window.mostrarPanel('inicio');
        }
    }
});

// Función de Login
window.ingresarAreaMiembros = async function(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim(); 
    const pass = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-ejecutar-login'); 
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> VALIDANDO...'; 
    btn.disabled = true; 
    
    try { 
        await signInWithEmailAndPassword(auth, email, pass); 
        btn.innerHTML = 'INGRESAR'; 
        btn.disabled = false; 
        
        // El onAuthStateChanged se encargará del resto (iniciar sync, mostrar panel, etc.)
        window.mostrarToast('Bienvenido al panel de la Tuna', 'success');
        
    } catch (error) { 
        btn.innerHTML = 'INGRESAR'; 
        btn.disabled = false; 
        console.error(error);
        window.mostrarToast('Credenciales incorrectas o error de red.', 'error'); 
    }
};

// Función de Logout
window.cerrarSesionDashboard = async function() {
    try { 
        await signOut(auth); 
        // El onAuthStateChanged se encargará de detener sync y limpiar
        window.mostrarPanel('inicio'); 
        window.mostrarToast('Sesión cerrada correctamente.'); 
    } catch(e) { 
        window.mostrarToast('Error al cerrar sesión.', 'error');
    }
};