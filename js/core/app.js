/**
 * ARCHIVO: core/app.js
 * PROPÓSITO: Manejar toda la UI global (Navegación, Modales, Toasts, Sidebar) y Enrutamiento.
 */

// Navegación entre paneles principales (Página Pública)
window.mostrarPanel = function(idPanel) {
    document.querySelectorAll('.seccion-panel').forEach(p => p.classList.remove('panel-activo'));
    const panel = document.getElementById('panel-' + idPanel); 
    if (panel) panel.classList.add('panel-activo');
    
    document.querySelectorAll('.enlace-navegacion').forEach(e => e.classList.remove('nav-activo'));
    const nav = document.getElementById('nav-' + idPanel); 
    if (nav) nav.classList.add('nav-activo');
};

// Toggle del Menú Lateral (Dashboard)
window.toggleSidebar = function() {
    const sidebar = document.getElementById('dashboard-sidebar');
    const icon = document.getElementById('icono-sidebar');
    
    if (window.innerWidth <= 1024) {
        sidebar.classList.toggle('abierto');
        if(icon) icon.className = sidebar.classList.contains('abierto') ? 'fa-solid fa-chevron-left' : 'fa-solid fa-chevron-right';
    } else {
        sidebar.classList.toggle('oculto');
        if(icon) icon.className = sidebar.classList.contains('oculto') ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left';
    }
};

// ==========================================
// ENRUTADOR DEL DASHBOARD PRIVADO
// ==========================================
window.cambiarSeccionDashboard = function(seccionId) {
    // 1. Marcar botón del sidebar como activo
    document.querySelectorAll('.item-menu-dashboard').forEach(el => el.classList.remove('activo'));
    const btn = document.querySelector(`.item-menu-dashboard[data-seccion="${seccionId}"]`);
    if (btn) btn.classList.add('activo');

    // 2. Ocultar sidebar en móvil al hacer clic en una opción
    if (window.innerWidth <= 1024) {
        document.getElementById('dashboard-sidebar').classList.remove('abierto');
    }

    // 3. Ocultar todas las secciones
    const dashboard = document.getElementById('dashboard-contenido');
    dashboard.querySelectorAll('.dashboard-seccion, .contenedor-overlays').forEach(el => el.style.display = 'none');

    // ✅ Limpiar overlay de tareas al salir de la sección
    const tareasOverlay = document.getElementById('tareas-overlays');
    if (tareasOverlay) tareasOverlay.innerHTML = '';

    // 4. Mostrar la sección correspondiente
    const idsEsperados = {
        'repertorio-dash': 'contenido-repertorio-lista',
        'generador': 'seccion-generador',
        'tareas': 'contenido-tareas-lista',
        'mi-progreso': 'seccion-mi-progreso',
        'progreso-miembros': 'seccion-progreso-miembros',
        'ensayos': 'seccion-ensayos',
        'presentaciones-dash': 'seccion-presentaciones-dash',
        'perfil': 'seccion-perfil',
        'admin': 'seccion-admin'
    };

    const idDestino = idsEsperados[seccionId];
    const seccionDiv = document.getElementById(idDestino);
    if (seccionDiv) {
        seccionDiv.style.display = 'block';
    }

    // 5. Llamar a la función de renderizado SOLO la primera vez, o refrescar si ya existe
    if (!window.seccionesRenderizadas) window.seccionesRenderizadas = {};

    if (!window.seccionesRenderizadas[seccionId]) {
        // Primera renderización
        switch(seccionId) {
            case 'repertorio-dash':
                if(window.renderizarRepertorio) window.renderizarRepertorio();
                break;
            case 'generador':
                if(window.renderizarGenerador) window.renderizarGenerador();
                break;
            case 'tareas':
                if(window.renderizarTareas) window.renderizarTareas();
                break;
            case 'mi-progreso':
                if(window.renderizarMiProgreso) window.renderizarMiProgreso();
                break;
            case 'progreso-miembros':
                if(window.renderizarProgresoMiembros) window.renderizarProgresoMiembros();
                break;
            case 'ensayos':
                if(window.renderizarEnsayos) window.renderizarEnsayos();
                break;
            case 'presentaciones-dash':
                if(window.renderizarPresentacionesInternas) window.renderizarPresentacionesInternas();
                break;
            case 'perfil':
                if(window.renderizarPerfil) window.renderizarPerfil();
                break;
            case 'admin':
                if(window.renderizarPanelAdmin) window.renderizarPanelAdmin();
                break;
        }
        window.seccionesRenderizadas[seccionId] = true;
    } else {
        // ✅ REFRESCAR VISTAS QUE NECESITAN ACTUALIZARSE AL VOLVER A MOSTRARSE
        switch(seccionId) {
            case 'mi-progreso':
                if (window.refrescarMiProgreso) window.refrescarMiProgreso();
                break;
            case 'progreso-miembros':
                if (window.refrescarProgresoGlobal) window.refrescarProgresoGlobal();
                break;
            case 'tareas':
                if (window.refrescarTareas) window.refrescarTareas();
                break;
            // El resto de secciones no necesitan refresco especial
        }
    }
};

// Escuchador automático para los clics en el Sidebar
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.item-menu-dashboard[data-seccion]').forEach(item => {
        item.addEventListener('click', function() {
            window.cambiarSeccionDashboard(this.getAttribute('data-seccion'));
        });
    });
});

// ==========================================
// MODALES GLOBALES
// ==========================================
window.accederAreaMiembros = function() {
    if (window.usuarioActual && window.usuarioActual.uid) {
        window.mostrarPanel('miembros');
        // Lanzamos la vista por defecto (Repertorio) al abrir el panel
        if(window.cambiarSeccionDashboard) window.cambiarSeccionDashboard('repertorio-dash');
    } else {
        const modal = document.getElementById('modal-login');
        if(modal) modal.classList.add('modal-activo');
    }
};

window.cerrarModalMiembros = function() {
    const modal = document.getElementById('modal-login');
    if(modal) modal.classList.remove('modal-activo');
    
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    if(emailInput) emailInput.value = '';
    if(passInput) passInput.value = '';
};

window.toggleVerPassword = function() {
    const p = document.getElementById('login-password'); 
    const i = document.getElementById('toggle-password');
    if(p.type === "password"){ p.type = "text"; i.classList.replace('fa-eye-slash', 'fa-eye'); } 
    else { p.type = "password"; i.classList.replace('fa-eye', 'fa-eye-slash'); }
};

window.abrirTVModal = function(playlistId) {
    const iframe = document.getElementById('tv-iframe');
    iframe.src = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`; 
    document.getElementById('modal-tv-youtube').classList.add('modal-activo');
};

window.mostrarToast = function(texto, tipo = 'success') {
    const container = document.getElementById('contenedor-global-toasts');
    if(!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-notificacion toast-${tipo}`;
    
    const icono = tipo === 'error' ? '<i class="fa-solid fa-circle-exclamation"></i>' : '<i class="fa-solid fa-circle-check"></i>';
    toast.innerHTML = `${icono} <span class="toast-texto">${texto}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
};

window.mostrarConfirmacion = function(texto, callbackAceptar) {
    document.getElementById('texto-mensaje-sistema').textContent = texto;
    document.getElementById('contenedor-botones-sistema').innerHTML = `
        <button class="btn-primario" id="btn-sistema-aceptar">Aceptar</button>
        <button class="btn-secundario" onclick="window.cerrarModalSistema()">Cancelar</button>
    `;
    document.getElementById('modal-sistema').classList.add('modal-activo');
    
    document.getElementById('btn-sistema-aceptar').onclick = () => { 
        window.cerrarModalSistema(); 
        if (callbackAceptar) callbackAceptar(); 
    };
};

window.cerrarModalSistema = function() {
    document.getElementById('modal-sistema').classList.remove('modal-activo');
};

document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        document.querySelectorAll('.modal-superpuesto').forEach(m => m.classList.remove('modal-activo'));
        const iframe = document.getElementById('tv-iframe'); 
        if (iframe) iframe.src = '';
    }
});
// ==========================================
// FUNCIONES DE WHATSAPP Y FORMATEO (añadidas para admin.js)
// ==========================================

window.format12Hour = function(timeStr) {
    if (!timeStr) return '--:--';
    let [hours, minutes] = timeStr.split(':');
    hours = parseInt(hours, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
};

window.getActivityStatus = function(dateStr, timeStr) {
    if (!dateStr) return 'futura';
    const [y, m, d] = dateStr.split('-');
    const [hr, min] = (timeStr || '00:00').split(':');
    const actDate = new Date(y, m - 1, d, hr, min);
    const now = new Date();
    return actDate > now ? 'futura' : 'pasada';
};

window.generarTextoWhatsAppEnsayo = function(act) {
    const [y, m, d] = act.date ? act.date.split('-') : ['', '', ''];
    let dateStr = act.date;
    if (y && m && d) {
        const dateObj = new Date(y, m - 1, d);
        dateStr = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    const ensayoLnk = act.ensayo_link ? `\n🗺️ ${act.ensayo_link}` : '';
    const encuentroLnk = act.encuentro_link ? `\n🗺️ ${act.encuentro_link}` : '';
    return `🎸 *Motivo:* ${act.title || ''}
📅 *Fecha:* ${dateStr}

🕒 *Hora del ensayo:* De ${window.format12Hour(act.inicio)} a ${window.format12Hour(act.fin)}
📍 *Ubicación del ensayo:* ${act.ensayo_desc || 'Por definir'}${ensayoLnk}

🕒 *Hora del encuentro:* ${window.format12Hour(act.encuentro)}
📍 *Ubicación del encuentro:* ${act.encuentro_desc || 'Por definir'}${encuentroLnk}

🎶 *Repertorio / Notas:*
${act.repertorio || 'Ninguna nota adicional'}

📞 *Contacto:* ${act.contacto_nombre || 'Por definir'} / ${act.contacto_celular || 'Por definir'}
💬 *Link del grupo:* ${act.whatsapp || 'Por definir'}`;
};

window.generarTextoWhatsAppPresentacion = function(act) {
    const [y, m, d] = act.date ? act.date.split('-') : ['', '', ''];
    let dateStr = act.date;
    if (y && m && d) {
        const dateObj = new Date(y, m - 1, d);
        dateStr = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    const tocadaLnk = act.ubicacion_link ? `\n🗺️ ${act.ubicacion_link}` : '';
    const encuentroLnk = act.encuentro_link ? `\n🗺️ ${act.encuentro_link}` : '';
    return `🎸 *Motivo:* ${act.title || ''}
📅 *Fecha:* ${dateStr}

🕒 *Hora de la tocada:* ${window.format12Hour(act.tocada)}
📍 *Ubicación de la tocada:* ${act.ubicacion_desc || 'Por definir'}${tocadaLnk}

🕒 *Hora del encuentro:* ${window.format12Hour(act.encuentro)}
📍 *Ubicación del encuentro:* ${act.encuentro_desc || 'Por definir'}${encuentroLnk}

📞 *Contacto:* ${act.contacto_nombre || 'Por definir'} / ${act.contacto_celular || 'Por definir'}
💬 *Link del grupo:* ${act.whatsapp || 'Por definir'}`;
};

window.abrirWhatsAppModal = function(texto) {
    const textarea = document.getElementById('texto-crudo-wa');
    if (textarea) textarea.value = texto;
    
    const preview = document.getElementById('contenedor-vista-previa-wa');
    if (preview) {
        let html = texto.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
        html = html.replace(/\n/g, '<br>');
        preview.innerHTML = `<div class="wa-bubble">${html}</div>`;
    }
    
    const modal = document.getElementById('modal-whatsapp');
    if (modal) modal.classList.add('modal-activo');
};

window.cerrarWhatsAppModal = function() {
    const modal = document.getElementById('modal-whatsapp');
    if (modal) modal.classList.remove('modal-activo');
};

window.copiarTextoWhatsApp = function() {
    const textarea = document.getElementById('texto-crudo-wa');
    if (!textarea) return;
    
    const text = textarea.value;
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
        window.mostrarToast('Texto copiado al portapapeles');
        window.cerrarWhatsAppModal();
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        window.mostrarToast('Texto copiado');
        window.cerrarWhatsAppModal();
    });
};

// Inicializa todos los contenedores del dashboard una sola vez
window.inicializarDashboard = function() {
  const dashboard = document.getElementById('dashboard-contenido');
  if (!dashboard || dashboard.children.length > 0) return; // ya inicializado

  dashboard.innerHTML = `
    <div id="contenido-repertorio-lista" class="dashboard-seccion" style="display:none;"></div>
    <div id="repertorio-overlays" class="contenedor-overlays" style="display:none;"></div>
    <div id="seccion-generador" class="dashboard-seccion" style="display:none;"></div>
    <div id="contenido-tareas-lista" class="dashboard-seccion" style="display:none;"></div>
    <div id="tareas-overlays" class="contenedor-overlays" style="display:none;"></div>
    <div id="seccion-mi-progreso" class="dashboard-seccion" style="display:none;"></div>
    <div id="seccion-progreso-miembros" class="dashboard-seccion" style="display:none;"></div>
    <div id="seccion-ensayos" class="dashboard-seccion" style="display:none;"></div>
    <div id="seccion-presentaciones-dash" class="dashboard-seccion" style="display:none;"></div>
    <div id="seccion-perfil" class="dashboard-seccion" style="display:none;"></div>
    <div id="seccion-admin" class="dashboard-seccion" style="display:none;">
      <div id="contenido-admin-main"></div>
      <div id="admin-overlays" class="contenedor-overlays"></div>
    </div>
  `;
};
// Hamburguesa para el menú principal en móviles
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.menu-hamburguesa');
    const nav = document.querySelector('.navegacion-principal');
    if (hamburger && nav) {
        hamburger.addEventListener('click', () => {
            nav.classList.toggle('nav-abierto');
        });
        // Cerrar el menú al hacer clic en cualquier enlace
        nav.querySelectorAll('.enlace-navegacion').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('nav-abierto');
            });
        });
    }
    // En el DOMContentLoaded, después de agregar los listeners a los enlaces:
const btnMiembrosNav = document.querySelector('.boton-miembros-nav');
if (btnMiembrosNav) {
    btnMiembrosNav.addEventListener('click', () => {
        nav.classList.remove('nav-abierto');
    });
}
});