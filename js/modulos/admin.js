/**
 * ARCHIVO: modulos/admin.js
 * PROPÓSITO: Panel administrativo MAESTRO.
 * Contiene la lógica completa de Usuarios (Rangos/Emojis), Tareas, Ensayos y Presentaciones.
 * Ahora con Calendario, filtros, badges, enlaces y botón WhatsApp en lista y calendario.
 */

import { db } from '../core/firebase.js';
import { firebaseConfig } from '../core/firebase.js';
import { collection, doc, addDoc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

// Verificación defensiva de dependencias globales
if (!window.iconosInstrumentos) {
    window.iconosInstrumentos = {
        guitarra: '🎸', bandurria: '🪕', 'laúd': '🎻', pandereta: '🥁', capa: '🧥',
        'zampoña': '🎋', quena: '🪈', cuatro: '🎸', 'guitarrón': '🎸',
        'bongós': '🪘', huevos: '🥚', 'acordeón': '🪗'
    };
}
if (!window.instrumentosMaestros) {
    window.instrumentosMaestros = ['guitarra', 'bandurria', 'laúd', 'pandereta', 'capa', 'zampoña', 'quena', 'cuatro', 'guitarrón', 'bongós', 'huevos', 'acordeón'];
}
if (!window.renderizarSelectoresInstrumentos) {
    window.renderizarSelectoresInstrumentos = function() { console.warn('renderizarSelectoresInstrumentos no está disponible'); };
}

// Función auxiliar para limpiar números de teléfono (para enlace WhatsApp)
window.formatWhatsAppPhone = function(phone) {
    return (phone || '').replace(/[^0-9]/g, '');
};

// Estado global del panel admin
window.adminState = {
    seccionActual: 'gestionar-miembros',
    filtroUsuarios: { rol: 'Todos', busqueda: '' },
    editandoUsuario: null,
    tareaSeleccion: { cancionId: null, usuarioId: null, searchCancion: '', searchUsuario: '' },
    cronograma: {
        tipo: 'ensayo',
        tab: 'form',
        editandoId: null,
        paginaActual: 1,
        itemsPorPagina: 5,
        calendarioMes: new Date().getMonth(),
        calendarioAnio: new Date().getFullYear(),
        filtroEstado: 'todas'
    }
};

// =================================================================
//  PANTALLA PRINCIPAL DEL ADMIN
// =================================================================
window.renderizarPanelAdmin = function() {
    const cont = document.getElementById('seccion-admin');
    if (!cont) return;

    cont.innerHTML = `
        <header class="cabecera-seccion">
            <h2 class="titulo-seccion">Centro de Mando Administrativo</h2>
        </header>

        <div class="grid-paneles-admin">
            <button class="tarjeta-panel-accion" onclick="window.renderizarAdminSeccion('gestionar-miembros')">
                <i class="fa-solid fa-users"></i><br>Gestión Usuarios
            </button>
            <button class="tarjeta-panel-accion" onclick="window.renderizarAdminSeccion('tareas-asignacion')">
                <i class="fa-solid fa-plus-circle"></i><br>Asignar Tareas
            </button>
            <button class="tarjeta-panel-accion" onclick="window.renderizarAdminSeccion('tareas-lista')">
                <i class="fa-solid fa-list-check"></i><br>Tareas Asignadas
            </button>
            <button class="tarjeta-panel-accion" onclick="window.renderizarAdminSeccion('programar-ensayo')">
                <i class="fa-solid fa-calendar-days"></i><br>Ensayos
            </button>
            <button class="tarjeta-panel-accion" onclick="window.renderizarAdminSeccion('programar-presentacion')">
                <i class="fa-solid fa-microphone-lines"></i><br>Presentaciones
            </button>
        </div>

        <div id="contenedor-admin-dinamico" class="contenedor-panel-activo">
            <div class="mensaje-estado-vacio"><p>Selecciona un módulo en la parte superior para comenzar.</p></div>
        </div>
    `;
     // ✅ NUEVO: Restaurar la última sección activa si existe
    if (window.adminState.seccionActual) {
        window.renderizarAdminSeccion(window.adminState.seccionActual);
    }
};

window.renderizarAdminSeccion = function(seccion) {
    window.adminState.seccionActual = seccion;
    const cont = document.getElementById('contenedor-admin-dinamico');
    if (!cont) return;

    // Si la sección es tareas-lista y ya hay un overlay activo, refrescar
 
    if (seccion === 'gestionar-miembros') window.renderAdminUsuarios(cont);
    else if (seccion === 'tareas-asignacion') window.renderAdminAsignarTareas(cont);
   else if (seccion === 'tareas-lista') {
    // Si el overlay ya está visible, solo refrescar; si no, crearlo
    const overlay = document.getElementById('admin-overlays');
    if (overlay && overlay.innerHTML !== '' && overlay.style.display !== 'none') {
        if (window.refrescarTareasAdmin) window.refrescarTareasAdmin();
    } else {
        window.renderAdminTareasLista(cont);
    }
    return;
}
    else if (seccion.startsWith('programar')) {
        window.adminState.cronograma.tipo = seccion.split('-')[1];
        window.adminState.cronograma.tab = 'form';
        window.adminState.cronograma.editandoId = null;
        window.renderAdminCronograma(cont);
    }
};
window.refrescarTareasAdmin = function() {
    const overlay = document.getElementById('admin-overlays');
    if (!overlay || overlay.style.display === 'none') return;
    const filtros = document.getElementById('filtros-tareas-admin');
    if (!filtros) return;
    const filtroActivo = filtros.querySelector('.btn-filtro.activo');
    const estado = filtroActivo 
        ? filtroActivo.textContent.trim().toLowerCase().replace(' ', '_') 
        : 'todas';
    window.filtrarTareasAdmin(estado);
};
// =================================================================
//  MÓDULO: GESTIÓN DE USUARIOS Y PERFILES
// =================================================================
window.renderAdminUsuarios = function(cont) {
    cont.innerHTML = `
        <div class="tarjeta-panel">
            <h3 class="subtitulo-panel">Añadir Nuevo Aspirante</h3>
            <div class="formulario-en-linea">
                <input type="email" id="nuevo-aspirante-email" class="entrada-formulario" placeholder="correo@universidad.pe">
                <button class="btn-primario" onclick="window.crearAspirante()"><i class="fa-solid fa-user-plus"></i> Registrar</button>
            </div>
        </div>

        <div class="tarjeta-panel margen-superior-md">
            <h3 class="subtitulo-panel">Directorio de Miembros</h3>
            <div class="barra-filtros">
                <button class="btn-filtro activo" onclick="window.filtrarUsuariosAdmin('Todos', this)">Todos</button>
                <button class="btn-filtro" onclick="window.filtrarUsuariosAdmin('Aspirante', this)">Aspirantes</button>
                <button class="btn-filtro" onclick="window.filtrarUsuariosAdmin('Pardillo', this)">Pardillos</button>
                <button class="btn-filtro" onclick="window.filtrarUsuariosAdmin('Tuno', this)">Tunos</button>
            </div>
            <div class="contenedor-buscador margen-superior-sm margen-inferior-md">
                <i class="fa-solid fa-search icono-buscador"></i>
                <input type="text" class="entrada-formulario input-buscador" placeholder="Buscar por nombre, apodo o correo..." onkeyup="window.adminState.filtroUsuarios.busqueda=this.value.toLowerCase(); window.renderListaUsuariosAdmin();">
            </div>
            <div id="lista-usuarios-admin-overlay" class="grid-usuarios-admin"></div>
        </div>
    `;
    window.renderListaUsuariosAdmin();
};

window.filtrarUsuariosAdmin = function(rol, btnElement) {
    document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('activo'));
    if (btnElement) btnElement.classList.add('activo');
    window.adminState.filtroUsuarios.rol = rol;
    window.renderListaUsuariosAdmin();
};

window.renderListaUsuariosAdmin = function() {
    const div = document.getElementById('lista-usuarios-admin-overlay');
    if (!div || !window.miembros) return;

    const fRol = window.adminState.filtroUsuarios.rol;
    const fText = window.adminState.filtroUsuarios.busqueda;

    let filtrados = window.miembros.filter(m => {
        const matchRol = fRol === 'Todos' || m.rango === fRol;
        const matchTexto = (m.nombre && m.nombre.toLowerCase().includes(fText)) ||
            (m.apodo && m.apodo.toLowerCase().includes(fText)) ||
            (m.email && m.email.toLowerCase().includes(fText));
        return matchRol && matchTexto;
    });

    div.innerHTML = filtrados.length > 0 ? filtrados.map(usr => {
        const iconoPrin = usr.instrumento ? (window.iconosInstrumentos[usr.instrumento] || '🎸') : '';
        const iconosSec = (usr.instrumentosSecundarios || []).map(i => window.iconosInstrumentos[i] || '').join(' ');

        return `
        <div class="tarjeta-usuario-admin">
            <div class="info-usuario-admin" onclick="window.abrirModalDetalleMiembroAdmin('${usr.uid}')">
                <img src="${usr.foto || 'https://placehold.co/50'}" class="avatar-miniatura">
                <div class="textos-usuario-admin">
                    <span class="nombre-principal">${usr.nombre || 'Sin Nombre'} ${usr.apodo ? `<span class="apodo-destacado">"${usr.apodo}"</span>` : ''}</span>
                    <span class="instrumento-etiqueta">${iconoPrin} ${iconosSec}</span>
                </div>
            </div>
            <div class="badges-usuario-admin">
                <span class="badge-estado">${usr.rango}</span>
                ${usr.rol === 'admin' ? '<span class="badge-estado completado"><i class="fa-solid fa-shield"></i> ADMIN</span>' : ''}
            </div>
        </div>`
    }).join('') : '<div class="mensaje-estado-vacio"><p>No se encontraron usuarios.</p></div>';
};

window.abrirModalDetalleMiembroAdmin = function(uid) {
    const usr = window.miembros.find(m => m.uid === uid);
    if (!usr) return;

    window.adminState.editandoUsuario = { ...usr };
    if (!window.adminState.editandoUsuario.instrumentosSecundarios) {
        window.adminState.editandoUsuario.instrumentosSecundarios = [];
    }
    window.renderizarFormularioEdicionMiembro();
};

window.renderizarFormularioEdicionMiembro = function() {
    const usr = window.adminState.editandoUsuario;
    const cont = document.getElementById('contenedor-admin-dinamico');

    // Construir emojis de instrumentos para vista de solo lectura
    const iconoPrin = usr.instrumento ? (window.iconosInstrumentos[usr.instrumento] || '🎸') : '';
    const iconosSec = (usr.instrumentosSecundarios || [])
        .map(i => window.iconosInstrumentos[i] || '').join(' ');

    const adminToggleClass = usr.rol === 'admin' ? 'panel-admin-activo' : 'panel-admin-inactivo';
    const adminToggleBtn = usr.rol === 'admin' ?
        `<button class="btn-secundario btn-peligro-texto" onclick="window.togglePrivilegioAdmin()"><i class="fa-solid fa-xmark"></i> Quitar Privilegios</button>` :
        `<button class="btn-primario" onclick="window.togglePrivilegioAdmin()"><i class="fa-solid fa-shield-check"></i> Hacer Administrador</button>`;

    cont.innerHTML = `
        <div class="tarjeta-panel">
            <button class="btn-volver-ligero margen-inferior-md" onclick="window.renderAdminUsuarios(document.getElementById('contenedor-admin-dinamico'))">
                <i class="fa-solid fa-arrow-left"></i> Volver a Lista
            </button>

            <!-- Encabezado del Usuario -->
            <div class="perfil-cabecera-destacada">
                <img src="${usr.foto || 'https://placehold.co/100'}" class="avatar-perfil-grande" alt="Foto">
                <div class="perfil-textos-destacados">
                    <h2 class="perfil-nombre-grande">${usr.nombre || 'Aspirante Nuevo'}</h2>
                    <h3 class="perfil-apodo-dorado">${usr.apodo ? `"${usr.apodo}"` : 'Sin apodo'}</h3>
                    <span class="badge-rango-grande">${usr.rango}</span>
                </div>
            </div>

            <!-- Selector de Rango (EDITABLE) -->
            <div class="grupo-formulario margen-superior-lg">
                <label class="etiqueta-formulario">Rango en la Tuna (Jerarquía)</label>
                <div class="selector-botones-segmentados">
                    <button class="btn-segmento ${usr.rango === 'Aspirante' ? 'activo' : ''}" onclick="window.cambiarRangoLocal('Aspirante')">Aspirante</button>
                    <button class="btn-segmento ${usr.rango === 'Pardillo' ? 'activo' : ''}" onclick="window.cambiarRangoLocal('Pardillo')">Pardillo</button>
                    <button class="btn-segmento ${usr.rango === 'Tuno' ? 'activo' : ''}" onclick="window.cambiarRangoLocal('Tuno')">Tuno</button>
                </div>
            </div>

            <!-- Privilegios de Admin (EDITABLE) -->
            <div class="panel-privilegios-admin ${adminToggleClass} margen-superior-md">
                <div class="privilegios-info">
                    <i class="fa-solid fa-user-shield icono-escudo"></i>
                    <div>
                        <h4 class="privilegios-titulo">Privilegios de Sistema</h4>
                        <p class="privilegios-desc">Controla si el usuario puede acceder a este panel, asignar tareas y modificar eventos.</p>
                    </div>
                </div>
                <div class="privilegios-accion">${adminToggleBtn}</div>
            </div>

            <!-- CAMPOS DE SOLO LECTURA -->
            <div class="detalle-miembro-grid margen-superior-lg">
                <div class="detalle-miembro-dato">
                    <strong>Email</strong>
                    <span>${usr.email || 'No disponible'}</span>
                </div>
                <div class="detalle-miembro-dato">
                    <strong>Instrumento Principal</strong>
                    <span>${iconoPrin} ${usr.instrumento ? usr.instrumento.toUpperCase() : 'No definido'}</span>
                </div>
                <div class="detalle-miembro-dato">
                    <strong>Instrumentos Secundarios</strong>
                    <span>${iconosSec || 'Ninguno'}</span>
                </div>
                <div class="detalle-miembro-dato">
                    <strong>Carrera</strong>
                    <span>${usr.carrera || 'No especificada'}</span>
                </div>
                <div class="detalle-miembro-dato">
                    <strong>Facultad</strong>
                    <span>${usr.facultad || 'No especificada'}</span>
                </div>
                <div class="detalle-miembro-dato">
                    <strong>Ciclo</strong>
                    <span>${usr.ciclo || 'No especificado'}</span>
                </div>
            </div>

            <div class="divisor-decorativo margen-superior-lg"></div>
            <button class="btn-primario btn-ancho-completo margen-superior-md" onclick="window.guardarEdicionMiembroAdmin('${usr.uid}')">
                <i class="fa-solid fa-floppy-disk"></i> Guardar Cambios
            </button>
        </div>
    `;
};

window.cambiarRangoLocal = function(rango) {
    window.adminState.editandoUsuario.rango = rango;
    window.renderizarFormularioEdicionMiembro();
};

window.togglePrivilegioAdmin = function() {
    const actual = window.adminState.editandoUsuario.rol;
    window.adminState.editandoUsuario.rol = actual === 'admin' ? 'lector' : 'admin';
    window.renderizarFormularioEdicionMiembro();
};

window.guardarEdicionMiembroAdmin = async function(uid) {
    const usr = window.adminState.editandoUsuario;
    try {
        await updateDoc(doc(db, 'miembros', uid), {
            rango: usr.rango,
            rol: usr.rol,
            instrumento: usr.instrumentoPrincipal || usr.instrumento,
            instrumentosSecundarios: usr.instrumentosSecundarios
        });
        window.mostrarToast('Perfil del integrante actualizado.');
        window.renderAdminUsuarios(document.getElementById('contenedor-admin-dinamico'));
    } catch (e) {
        window.mostrarToast('Error al actualizar base de datos.', 'error');
    }
};

window.crearAspirante = async function() {
    const email = document.getElementById('nuevo-aspirante-email').value.trim();
    if (!email) return window.mostrarToast('Ingrese un correo electrónico.', 'error');

    const tempPass = "tunaunac2026";
    try {
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryAppForCreation");
        const secondaryAuth = getAuth(secondaryApp);
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, tempPass);
        const newUid = userCred.user.uid;
        await signOut(secondaryAuth);

        await setDoc(doc(db, 'miembros', newUid), {
            uid: newUid, email: email, nombre: '', apodo: '', rango: 'Aspirante',
            instrumento: 'guitarra', rol: 'lector', instrumentosSecundarios: [],
            foto: '', edad: '', carrera: '', facultad: '', ciclo: ''
        });

        document.getElementById('nuevo-aspirante-email').value = '';
        window.mostrarConfirmacion(`Cuenta creada exitosamente para ${email}.\nContraseña temporal: ${tempPass}`, null);
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') window.mostrarToast('Ese correo ya está registrado.', 'error');
        else window.mostrarToast('Error al crear usuario.', 'error');
    }
};

// =================================================================
//  MÓDULO: ASIGNACIÓN DE TAREAS
// =================================================================
window.renderAdminAsignarTareas = function(cont) {
    cont.innerHTML = `
        <div class="tarjeta-panel">
            <h3 class="subtitulo-panel">Asistente de Asignación de Tareas</h3>
            <div class="grid-3-columnas">
                <div class="columna-asignacion">
                    <h4 class="titulo-columna">1. Seleccionar Canción</h4>
                    <div class="contenedor-buscador">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" class="entrada-formulario input-buscador" placeholder="Buscar canción..." onkeyup="window.adminState.tareaSeleccion.searchCancion=this.value.toLowerCase(); window.renderColsTarea()">
                    </div>
                    <div id="col-tarea-canciones" class="lista-seleccion-admin"></div>
                </div>
                <div class="columna-asignacion">
                    <h4 class="titulo-columna">2. Seleccionar Miembro</h4>
                    <div class="contenedor-buscador">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" class="entrada-formulario input-buscador" placeholder="Buscar miembro..." onkeyup="window.adminState.tareaSeleccion.searchUsuario=this.value.toLowerCase(); window.renderColsTarea()">
                    </div>
                    <div id="col-tarea-usuarios" class="lista-seleccion-admin"></div>
                </div>
                <div class="columna-asignacion">
                    <h4 class="titulo-columna">3. Asignar Instrumento</h4>
                    <div id="col-tarea-instrumentos" class="panel-resultado-asignacion"></div>
                </div>
            </div>
        </div>
    `;
    window.renderColsTarea();
};

window.renderColsTarea = function() {
    const colC = document.getElementById('col-tarea-canciones');
    const colU = document.getElementById('col-tarea-usuarios');
    const colI = document.getElementById('col-tarea-instrumentos');
    if (!colC || !colU || !colI) return;

    let htmlC = '';
    (window.canciones || []).filter(c => c.titulo.toLowerCase().includes(window.adminState.tareaSeleccion.searchCancion)).forEach(c => {
        const activo = window.adminState.tareaSeleccion.cancionId === c.id ? 'activo' : '';
        htmlC += `<div class="item-seleccionable ${activo}" onclick="window.adminState.tareaSeleccion.cancionId='${c.id}'; window.renderColsTarea()">${c.titulo.toUpperCase()}</div>`;
    });
    colC.innerHTML = htmlC || '<p class="texto-placeholder">Sin resultados</p>';

    let htmlU = '';
(window.miembros || [])
    .filter(m => {
        const texto = window.adminState.tareaSeleccion.searchUsuario;
        if (!texto) return true; // sin búsqueda, mostrar todos
        const nombre = (m.nombre || '').toLowerCase();
        const apodo = (m.apodo || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        return nombre.includes(texto) || apodo.includes(texto) || email.includes(texto);
    })
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    .forEach(m => {
        const activo = window.adminState.tareaSeleccion.usuarioId === m.uid ? 'activo' : '';
        const iconoPrin = m.instrumento ? (window.iconosInstrumentos[m.instrumento] || '🎸') : '';
        const iconosSec = (m.instrumentosSecundarios || []).map(i => window.iconosInstrumentos[i] || '').join(' ');
        const apodo = m.apodo ? `"${m.apodo}"` : '';

        htmlU += `
            <div class="item-seleccionable ${activo}" onclick="window.adminState.tareaSeleccion.usuarioId='${m.uid}'; window.renderColsTarea()">
                <img src="${m.foto || 'https://placehold.co/30'}" class="avatar-muy-pequeno">
                <div class="textos-usuario-lista">
                    <span>${m.nombre || 'Sin nombre'} ${apodo}</span>
                    <span class="emojis-pequenos">${iconoPrin} ${iconosSec}</span>
                </div>
            </div>`;
    });
colU.innerHTML = htmlU || '<p class="texto-placeholder">Sin resultados</p>';

    if (window.adminState.tareaSeleccion.cancionId && window.adminState.tareaSeleccion.usuarioId) {
        const cancion = window.canciones.find(c => c.id === window.adminState.tareaSeleccion.cancionId);
        const miembro = window.miembros.find(m => m.uid === window.adminState.tareaSeleccion.usuarioId);
        const todosLosInstrumentos = window.instrumentosMaestros;

        let htmlI = `
            <div class="resumen-asignacion">
                <p><strong>Destinatario:</strong> ${miembro.nombre}</p>
                <p><strong>Repertorio:</strong> ${cancion.titulo.toUpperCase()}</p>
            </div>
            <div class="botones-asignacion-vertical">
        `;

        todosLosInstrumentos.forEach(inst => {
            const asigExistente = (window.asignaciones || []).find(a => a.usuarioId === miembro.uid && a.cancionId === cancion.id && a.instrumento === inst);
            const emoji = window.iconosInstrumentos[inst] || '🎸';

            if (asigExistente) {
                htmlI += `
                    <div class="alerta-asignado">
                        <i class="fa-solid fa-check-circle"></i> ${emoji} ${inst.toUpperCase()} (Asignado)
                        <button class="btn-icono-accion btn-peligro-texto" onclick="window.eliminarAsignacion('${asigExistente.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>`;
            } else {
                htmlI += `<button class="btn-secundario w-completo" onclick="window.preConfirmarAsignacion('${miembro.uid}', '${cancion.id}', '${inst}')"><i class="fa-solid fa-plus"></i> Asignar ${emoji} ${inst.toUpperCase()}</button>`;
            }
        });
        htmlI += `</div>`;
        colI.innerHTML = htmlI;
    } else {
        colI.innerHTML = `<div class="mensaje-estado-vacio"><i class="fa-solid fa-hand-pointer"></i><p>Selecciona canción y miembro.</p></div>`;
    }
};

window.preConfirmarAsignacion = function(uid, cancionId, inst) {
    window.mostrarConfirmacion(`¿Confirmar asignación de ${inst.toUpperCase()}?`, async () => {
        await addDoc(collection(db, 'asignaciones'), { usuarioId: uid, cancionId, instrumento: inst, fechaCreacion: new Date().toISOString() });
        window.mostrarToast('Tarea asignada correctamente.');
        window.renderColsTarea();
    });
};

window.eliminarAsignacion = async function(asigId) {
    await deleteDoc(doc(db, 'asignaciones', asigId));
    window.mostrarToast('Asignación eliminada.');
    if (window.adminState.seccionActual === 'tareas-asignacion') window.renderColsTarea();
    if (window.adminState.seccionActual === 'tareas-lista') window.renderAdminTareasLista(document.getElementById('contenedor-admin-dinamico'));
};

// =================================================================
//  MÓDULO: TAREAS ASIGNADAS (MONITOREO GLOBAL)
// =================================================================
window.renderAdminTareasLista = function(cont) {
    cont.innerHTML = `
        <div class="tarjeta-panel">
            <h3 class="subtitulo-panel">Monitoreo Global de Tareas</h3>
            <div class="barra-filtros">
                <button class="btn-filtro activo" onclick="window.filtrarTareasAdmin('todas', this)">Todas</button>
                <button class="btn-filtro" onclick="window.filtrarTareasAdmin('sin_iniciar', this)">Sin iniciar</button>
                <button class="btn-filtro" onclick="window.filtrarTareasAdmin('en_progreso', this)">En progreso</button>
                <button class="btn-filtro" onclick="window.filtrarTareasAdmin('completado', this)">Completadas</button>
            </div>
            <div id="lista-tareas-admin-resultados" class="grid-tareas-admin margen-superior-md"></div>
        </div>
    `;
    window.filtrarTareasAdmin('todas', null);
};

window.filtrarTareasAdmin = function(estado, btnElement) {
    if (btnElement) {
        document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('activo'));
        btnElement.classList.add('activo');
    }

    let html = '';
    (window.asignaciones || []).forEach(asig => {
        const cancion = (window.canciones || []).find(c => c.id === asig.cancionId);
        const miembro = (window.miembros || []).find(m => m.uid === asig.usuarioId);
        if (!cancion || !miembro) return;

        const progUser = (window.progresos || {})[`${asig.usuarioId}_${asig.cancionId}`] || {};
        const est = progUser[asig.instrumento] || 'sin_iniciar';
        if (estado !== 'todas' && est !== estado) return;

        let claseEstado = est === 'completado' ? 'completado' : (est === 'en_progreso' ? 'en-progreso' : 'sin-iniciar');
        let textoEstado = est.replace('_', ' ').toUpperCase();
        const emoji = window.iconosInstrumentos[asig.instrumento] || '';

        html += `
            <div class="tarjeta-tarea-admin">
                <div class="info-tarea-admin">
                    <img src="${miembro.foto || 'https://placehold.co/40'}" class="avatar-pequeno">
                    <div class="textos-tarea-admin">
                        <strong class="titulo-tarea">${cancion.titulo.toUpperCase()} <span class="inst-tarea">${emoji} (${asig.instrumento})</span></strong>
                        <span class="responsable-tarea">Responsable: ${miembro.nombre || 'Sin nombre'}${miembro.apodo ? ` "${miembro.apodo}"` : ''}</span>
                    </div>
                </div>
                <div class="estado-tarea-admin">
                    <span class="badge-estado ${claseEstado}">${textoEstado}</span>
                    <button class="btn-icono-accion btn-peligro-texto" onclick="window.eliminarAsignacion('${asig.id}')" title="Eliminar Tarea"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
    });
    document.getElementById('lista-tareas-admin-resultados').innerHTML = html || '<div class="mensaje-estado-vacio"><p>No hay tareas asignadas en esta categoría.</p></div>';
};

// =================================================================
//  MÓDULO: CRONOGRAMAS (ENSAYOS Y PRESENTACIONES)
//  AHORA CON CALENDARIO, FILTROS, ENLACES Y BOTÓN WHATSAPP
// =================================================================
window.renderAdminCronograma = function(cont) {
    const tipo = window.adminState.cronograma.tipo;
    const titulo = tipo === 'ensayo' ? 'Programación de Ensayos' : 'Programación de Presentaciones';

    cont.innerHTML = `
        <div class="tarjeta-panel">
            <h3 class="subtitulo-panel">${titulo}</h3>

            <div class="barra-pestanias">
                <button id="tab-form-cronograma" class="btn-pestania ${window.adminState.cronograma.tab === 'form' ? 'activo' : ''}" onclick="window.cambiarTabCronograma('form')"><i class="fa-solid fa-pen-to-square"></i> <span id="texto-tab-form">Registrar</span></button>
                <button class="btn-pestania ${window.adminState.cronograma.tab === 'calendario' ? 'activo' : ''}" onclick="window.cambiarTabCronograma('calendario')"><i class="fa-solid fa-calendar"></i> Calendario</button>
                <button class="btn-pestania ${window.adminState.cronograma.tab === 'lista' ? 'activo' : ''}" onclick="window.cambiarTabCronograma('lista')"><i class="fa-solid fa-list-ul"></i> Actividades</button>
            </div>

            <div id="cronograma-contenido-dinamico" class="margen-superior-md"></div>
        </div>
    `;
    window.cambiarTabCronograma(window.adminState.cronograma.tab);
};

window.cambiarTabCronograma = function(tab) {
    window.adminState.cronograma.tab = tab;
    document.querySelectorAll('.btn-pestania').forEach(b => b.classList.remove('activo'));
    const btnActivo = document.querySelector(`.btn-pestania[onclick="window.cambiarTabCronograma('${tab}')"]`);
    if (btnActivo) btnActivo.classList.add('activo');

    const cont = document.getElementById('cronograma-contenido-dinamico');
    if (tab === 'form') {
        window.actualizarTextoFormTab();   // 🟢 Actualizar texto según editandoId
        window.renderFormularioCronograma(cont);
    } else if (tab === 'calendario') {
        window.renderCalendarioCronograma(cont);
    } else if (tab === 'lista') {
        window.renderListaCronograma(cont);
    }
};

// -------------------- FORMULARIO (REGISTRAR/EDITAR) --------------------
window.renderFormularioCronograma = function(cont) {
    const tipo = window.adminState.cronograma.tipo;
    const esEnsayo = tipo === 'ensayo';
    const items = esEnsayo ? (window.ensayos || []) : (window.presentaciones || []);
    const act = window.adminState.cronograma.editandoId ? items.find(a => a.id === window.adminState.cronograma.editandoId) : null;

    const camposEspecificos = esEnsayo ? `
        <div class="seccion-formulario-admin">
            <h4 class="titulo-seccion-form"><i class="fa-solid fa-music"></i> Datos del Ensayo</h4>
            <div class="grid-formulario-2">
                <div class="grupo-formulario"><label>Hora inicio *</label><input type="time" id="crono-inicio" class="entrada-formulario" value="${act?.inicio || ''}" required></div>
                <div class="grupo-formulario"><label>Hora fin *</label><input type="time" id="crono-fin" class="entrada-formulario" value="${act?.fin || ''}" required></div>
                <div class="grupo-formulario"><label>Lugar del Ensayo *</label><input type="text" id="crono-lugar-act" class="entrada-formulario" value="${act?.ensayo_desc || ''}" required></div>
                <div class="grupo-formulario"><label>Link Google Maps</label><input type="url" id="crono-link-act" class="entrada-formulario" value="${act?.ensayo_link || ''}"></div>
            </div>
            <div class="grupo-formulario">
                <label>Repertorio / Notas Adicionales *</label>
                <textarea id="crono-notas" rows="3" class="entrada-formulario area-texto" required>${act?.repertorio || ''}</textarea>
            </div>
        </div>
    ` : `
        <div class="seccion-formulario-admin">
            <h4 class="titulo-seccion-form"><i class="fa-solid fa-microphone-lines"></i> Datos de la Tocada</h4>
            <div class="grid-formulario-2">
                <div class="grupo-formulario"><label>Hora de la tocada *</label><input type="time" id="crono-inicio" class="entrada-formulario" value="${act?.tocada || ''}" required></div>
                <div class="grupo-formulario"><label>Lugar de la tocada *</label><input type="text" id="crono-lugar-act" class="entrada-formulario" value="${act?.ubicacion_desc || ''}" required></div>
                <div class="grupo-formulario"><label>Link Google Maps</label><input type="url" id="crono-link-act" class="entrada-formulario" value="${act?.ubicacion_link || ''}"></div>
            </div>
        </div>
    `;

    cont.innerHTML = `
        <form class="formulario-maestro-admin" onsubmit="event.preventDefault(); window.guardarActividadCronograma();">
            <div class="grid-formulario-2">
                <div class="grupo-formulario"><label>Motivo del evento *</label><input type="text" id="crono-motivo" class="entrada-formulario" value="${act?.title || ''}" required></div>
                <div class="grupo-formulario"><label>Fecha *</label><input type="date" id="crono-fecha" class="entrada-formulario" value="${act?.date || ''}" required></div>
            </div>

            ${camposEspecificos}

            <div class="seccion-formulario-admin">
                <h4 class="titulo-seccion-form"><i class="fa-solid fa-map-pin"></i> Datos del Encuentro Previo</h4>
                <div class="grid-formulario-2">
                    <div class="grupo-formulario"><label>Hora de encuentro *</label><input type="time" id="crono-encuentro" class="entrada-formulario" value="${act?.encuentro || ''}" required></div>
                    <div class="grupo-formulario"><label>Lugar de encuentro *</label><input type="text" id="crono-lugar-enc" class="entrada-formulario" value="${act?.encuentro_desc || ''}" required></div>
                    <div class="grupo-formulario"><label>Link Mapa Encuentro</label><input type="url" id="crono-link-enc" class="entrada-formulario" value="${act?.encuentro_link || ''}"></div>
                </div>
            </div>

            <div class="seccion-formulario-admin">
                <h4 class="titulo-seccion-form"><i class="fa-solid fa-address-book"></i> Contacto y Comunicación</h4>
                <div class="grid-formulario-2">
                    <div class="grupo-formulario"><label>Nombre Contacto *</label><input type="text" id="crono-contacto-nom" class="entrada-formulario" value="${act?.contacto_nombre || ''}" required></div>
                    <div class="grupo-formulario"><label>Celular *</label><input type="tel" id="crono-contacto-cel" class="entrada-formulario" value="${act?.contacto_celular || ''}" required></div>
                    <div class="grupo-formulario" style="grid-column: span 2;"><label>Link Grupo WhatsApp</label><input type="url" id="crono-whatsapp" class="entrada-formulario" value="${act?.whatsapp || ''}"></div>
                </div>
            </div>

            <div class="acciones-formulario-final">
                ${act ? `
                    <button type="button" class="btn-secundario" onclick="window.cancelarEdicionCronograma()">
                        <i class="fa-solid fa-xmark"></i> Cancelar edición
                    </button>
                ` : `
                    <button type="button" class="btn-secundario" onclick="window.adminState.cronograma.editandoId=null; window.cambiarTabCronograma('form')">
                        Limpiar Formulario
                    </button>
                `}
                <div class="grupo-botones-derecha">
                    <button type="button" class="btn-whatsapp-style" onclick="window.previsualizarWhatsApp()"><i class="fa-brands fa-whatsapp"></i> Generar WhatsApp</button>
                    <button type="submit" class="btn-primario"><i class="fa-solid fa-floppy-disk"></i> ${act ? 'Actualizar' : 'Guardar'} Actividad</button>
                </div>
            </div>
        </form>
    `;
};

window.guardarActividadCronograma = async function() {
    const tipo = window.adminState.cronograma.tipo;
    const isEdit = window.adminState.cronograma.editandoId;

    const data = {
        title: document.getElementById('crono-motivo').value,
        date: document.getElementById('crono-fecha').value,
        encuentro: document.getElementById('crono-encuentro').value,
        encuentro_desc: document.getElementById('crono-lugar-enc').value,
        encuentro_link: document.getElementById('crono-link-enc').value,
        contacto_nombre: document.getElementById('crono-contacto-nom').value,
        contacto_celular: document.getElementById('crono-contacto-cel').value,
        whatsapp: document.getElementById('crono-whatsapp').value
    };

    if (tipo === 'ensayo') {
        data.inicio = document.getElementById('crono-inicio').value;
        data.fin = document.getElementById('crono-fin').value;
        data.ensayo_desc = document.getElementById('crono-lugar-act').value;
        data.ensayo_link = document.getElementById('crono-link-act').value;
        data.repertorio = document.getElementById('crono-notas').value;
    } else {
        data.tocada = document.getElementById('crono-inicio').value;
        data.ubicacion_desc = document.getElementById('crono-lugar-act').value;
        data.ubicacion_link = document.getElementById('crono-link-act').value;
    }

    try {
        const colName = tipo === 'ensayo' ? 'ensayos' : 'presentaciones';
        if (isEdit) {
            await updateDoc(doc(db, colName, isEdit), data);
            window.mostrarToast('Actividad actualizada.');
        } else {
            await addDoc(collection(db, colName), data);
            window.mostrarToast('Actividad guardada.');
        }
        // Dentro de guardarActividadCronograma, justo antes de cambiar de pestaña:
window.adminState.cronograma.editandoId = null;
window.actualizarTextoFormTab(); // por si acaso
window.cambiarTabCronograma('lista');
    } catch (e) {
        window.mostrarToast('Error de base de datos.', 'error');
    }
};

// -------------------- CALENDARIO --------------------
window.renderCalendarioCronograma = function(cont) {
    const tipo = window.adminState.cronograma.tipo;
    const items = tipo === 'ensayo' ? (window.ensayos || []) : (window.presentaciones || []);
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const mes = window.adminState.cronograma.calendarioMes;
    const anio = window.adminState.cronograma.calendarioAnio;
    const firstDay = new Date(anio, mes, 1).getDay();
    const daysInMonth = new Date(anio, mes + 1, 0).getDate();
    const todayDate = new Date();

    let html = `
        <div class="calendario-controles">
            <button class="btn-icono-accion" onclick="window.cambiarMesCalendario(-1)"><i class="fa-solid fa-chevron-left"></i></button>
            <h3 class="calendario-mes-titulo">${monthNames[mes]} ${anio}</h3>
            <button class="btn-icono-accion" onclick="window.cambiarMesCalendario(1)"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <div class="calendario-leyenda">
            <span><span class="punto-leyenda punto-futuro"></span> Futuras</span>
            <span><span class="punto-leyenda punto-pasado"></span> Pasadas</span>
        </div>
        <div class="calendario-dias-semana">
            ${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => `<div class="calendario-dia-etiqueta">${d}</div>`).join('')}
        </div>
        <div class="calendario-cuadricula">
    `;

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendario-dia-vacio"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const monthStr = String(mes + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${anio}-${monthStr}-${dayStr}`;
        const dayItems = items.filter(a => a.date === dateStr);
        const isToday = day === todayDate.getDate() && mes === todayDate.getMonth() && anio === todayDate.getFullYear();

        let dots = '';
        dayItems.forEach(act => {
            const status = window.getActivityStatus ? window.getActivityStatus(act.date, act.inicio || act.tocada) : 'futura';
            dots += `<span class="punto-actividad ${status === 'futura' ? 'punto-futuro' : 'punto-pasado'}"></span>`;
        });

        const statusClass = isToday ? 'calendario-dia-hoy' : 'calendario-dia-normal';
        const cursorClass = dayItems.length > 0 ? 'calendario-dia-interactivo' : '';

        html += `
            <div class="calendario-dia-celda ${statusClass} ${cursorClass}" id="cal-dia-${dateStr}" ${dayItems.length > 0 ? `onclick="window.mostrarDiaCalendario('${dateStr}')"` : ''}>
                <span class="calendario-dia-numero">${day}</span>
                ${dots ? `<div class="calendario-dia-puntos">${dots}</div>` : ''}
            </div>
        `;
    }

    html += `</div><div id="admin-detalle-dia" class="calendario-detalle-dia"></div>`;
    cont.innerHTML = html;
};

window.cambiarMesCalendario = function(dir) {
    window.adminState.cronograma.calendarioMes += dir;
    if (window.adminState.cronograma.calendarioMes < 0) {
        window.adminState.cronograma.calendarioMes = 11;
        window.adminState.cronograma.calendarioAnio--;
    } else if (window.adminState.cronograma.calendarioMes > 11) {
        window.adminState.cronograma.calendarioMes = 0;
        window.adminState.cronograma.calendarioAnio++;
    }
    window.renderCalendarioCronograma(document.getElementById('cronograma-contenido-dinamico'));
};

// --- DETALLE DEL DÍA EN CALENDARIO (AHORA CON TODA LA INFORMACIÓN Y BOTONES) ---
window.mostrarDiaCalendario = function(dateStr) {
    const tipo = window.adminState.cronograma.tipo;
    const items = tipo === 'ensayo' ? (window.ensayos || []) : (window.presentaciones || []);
    const dayItems = items.filter(a => a.date === dateStr);
    const cont = document.getElementById('admin-detalle-dia');
    if (!cont) return;

    if (dayItems.length === 0) {
        cont.innerHTML = `<div class="detalle-dia-vacio"><p>No hay actividades este día.</p></div>`;
        return;
    }

    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(y, m - 1, d);
    const fechaFormat = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let html = `<h4 class="subtitulo-bloque" style="margin-bottom:1rem;">Actividades del ${fechaFormat}</h4>`;

    html += dayItems.map(act => {
        const isFutura = window.getActivityStatus(act.date, act.inicio || act.tocada) === 'futura';
        const cleanPhone = window.formatWhatsAppPhone(act.contacto_celular || '');
        const horaActividad = tipo === 'ensayo'
            ? `Ensayo: ${window.format12Hour(act.inicio)} - ${window.format12Hour(act.fin)}`
            : `Tocada: ${window.format12Hour(act.tocada)}`;
        const lugarActividad = tipo === 'ensayo' ? act.ensayo_desc : act.ubicacion_desc;
        const linkActividad = tipo === 'ensayo' ? act.ensayo_link : act.ubicacion_link;
        const repertorio = tipo === 'ensayo' ? act.repertorio : null;

        return `
        <div class="tarjeta-actividad-admin">
            <div class="cabecera-actividad-admin">
                <h4>${act.title}</h4>
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <span class="badge-estado ${isFutura ? 'badge-futura' : 'badge-pasada'}">${isFutura ? 'Próxima' : 'Pasada'}</span>
                    <span class="fecha-actividad"><i class="fa-regular fa-calendar"></i> ${act.date}</span>
                </div>
            </div>
            <div class="cuerpo-actividad-admin">
                <p><i class="fa-regular fa-clock"></i> ${horaActividad} | Encuentro: ${window.format12Hour(act.encuentro)}</p>
                <p><i class="fa-solid fa-map-pin"></i> <strong>Encuentro:</strong> ${act.encuentro_desc || 'Por definir'} ${act.encuentro_link ? `<a href="${act.encuentro_link}" target="_blank" class="enlace-mapa">Mapa</a>` : ''}</p>
                <p><i class="fa-solid fa-location-dot"></i> <strong>${tipo === 'ensayo' ? 'Ensayo' : 'Tocada'}:</strong> ${lugarActividad || 'Por definir'} ${linkActividad ? `<a href="${linkActividad}" target="_blank" class="enlace-mapa">Mapa</a>` : ''}</p>
                ${repertorio ? `<p><i class="fa-solid fa-book-open"></i> <strong>Repertorio:</strong> ${repertorio}</p>` : ''}
                <p>
                    <i class="fa-solid fa-phone"></i> <strong>Contacto:</strong> ${act.contacto_nombre || 'Tuno'} / ${act.contacto_celular || ''}
                    ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}" target="_blank" class="enlace-whatsapp" title="Abrir WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                </p>
                ${act.whatsapp ? `<p><i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> <strong>WhatsApp:</strong> <a href="${act.whatsapp}" target="_blank" class="enlace-mapa">Enlace</a></p>` : ''}
            </div>
            <div class="acciones-actividad-admin">
                <button class="btn-secundario-pequeno" onclick="window.editarActividadCronograma('${act.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="btn-peligro-pequeno" onclick="window.eliminarActividadCronograma('${act.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
                <button class="btn-whatsapp-style" onclick="window.previsualizarWhatsAppDesdeActividad('${act.id}')">
                    <i class="fa-brands fa-whatsapp"></i> Vista previa
                </button>
            </div>
        </div>`;
    }).join('');

    cont.innerHTML = html;
};

// -------------------- LISTA DE ACTIVIDADES (AHORA CON ENLACES Y BOTÓN WHATSAPP) --------------------
window.renderListaCronograma = function(cont) {
    const tipo = window.adminState.cronograma.tipo;
    const items = tipo === 'ensayo' ? (window.ensayos || []) : (window.presentaciones || []);

    const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
    const filtro = window.adminState.cronograma.filtroEstado || 'todas';
    let filtered = sorted;
    if (filtro !== 'todas') {
        filtered = sorted.filter(act => {
            const status = window.getActivityStatus(act.date, act.inicio || act.tocada);
            return status === filtro;
        });
    }

    const limit = window.adminState.cronograma.itemsPorPagina;
    const totalPages = Math.ceil(filtered.length / limit) || 1;
    let page = window.adminState.cronograma.paginaActual;
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * limit;
    const current = filtered.slice(start, start + limit);

    let html = `
        <div class="barra-filtros margen-inferior-md">
            <button class="btn-filtro ${filtro === 'todas' ? 'activo' : ''}" onclick="window.filtrarCronograma('todas', this)">Todas</button>
            <button class="btn-filtro ${filtro === 'futura' ? 'activo' : ''}" onclick="window.filtrarCronograma('futura', this)">Futuras</button>
            <button class="btn-filtro ${filtro === 'pasada' ? 'activo' : ''}" onclick="window.filtrarCronograma('pasada', this)">Pasadas</button>
        </div>
    `;

    if (current.length === 0) {
        html += '<div class="mensaje-estado-vacio"><p>No hay actividades registradas aún.</p></div>';
    } else {
        html += current.map(act => {
            const [y, m, d] = act.date.split('-');
            const dateObj = new Date(y, m - 1, d);
            const formattedDate = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const isFutura = window.getActivityStatus(act.date, act.inicio || act.tocada) === 'futura';
            const cleanPhone = window.formatWhatsAppPhone(act.contacto_celular || '');
            const horaActividad = tipo === 'ensayo'
                ? `Ensayo: ${window.format12Hour(act.inicio)} - ${window.format12Hour(act.fin)}`
                : `Tocada: ${window.format12Hour(act.tocada)}`;
            const lugarActividad = tipo === 'ensayo' ? act.ensayo_desc : act.ubicacion_desc;
            const linkActividad = tipo === 'ensayo' ? act.ensayo_link : act.ubicacion_link;
            const repertorio = tipo === 'ensayo' ? act.repertorio : null;

            return `
            <div class="tarjeta-actividad-admin">
                <div class="cabecera-actividad-admin">
                    <h4>${act.title}</h4>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <span class="badge-estado ${isFutura ? 'badge-futura' : 'badge-pasada'}">${isFutura ? 'Próxima' : 'Pasada'}</span>
                        <span class="fecha-actividad"><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
                    </div>
                </div>
                <div class="cuerpo-actividad-admin">
                    <p><i class="fa-regular fa-clock"></i> ${horaActividad} | Encuentro: ${window.format12Hour(act.encuentro)}</p>
                    <p><i class="fa-solid fa-map-pin"></i> <strong>Encuentro:</strong> ${act.encuentro_desc || 'Por definir'} ${act.encuentro_link ? `<a href="${act.encuentro_link}" target="_blank" class="enlace-mapa">Mapa</a>` : ''}</p>
                    <p><i class="fa-solid fa-location-dot"></i> <strong>${tipo === 'ensayo' ? 'Ensayo' : 'Tocada'}:</strong> ${lugarActividad || 'Por definir'} ${linkActividad ? `<a href="${linkActividad}" target="_blank" class="enlace-mapa">Mapa</a>` : ''}</p>
                    ${repertorio ? `<p><i class="fa-solid fa-book-open"></i> <strong>Repertorio:</strong> ${repertorio}</p>` : ''}
                    <p>
                        <i class="fa-solid fa-phone"></i> <strong>Contacto:</strong> ${act.contacto_nombre || 'Tuno'} / ${act.contacto_celular || ''}
                        ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}" target="_blank" class="enlace-whatsapp" title="Abrir WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                    </p>
                    ${act.whatsapp ? `<p><i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> <strong>WhatsApp:</strong> <a href="${act.whatsapp}" target="_blank" class="enlace-mapa">Enlace</a></p>` : ''}
                </div>
                <div class="acciones-actividad-admin">
                    <button class="btn-secundario-pequeno" onclick="window.editarActividadCronograma('${act.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button class="btn-peligro-pequeno" onclick="window.eliminarActividadCronograma('${act.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
                    <button class="btn-whatsapp-style" onclick="window.previsualizarWhatsAppDesdeActividad('${act.id}')">
                        <i class="fa-brands fa-whatsapp"></i> Vista previa
                    </button>
                </div>
            </div>`;
        }).join('');

        if (totalPages > 1) {
            html += `
                <div class="controles-paginacion">
                    <button class="btn-icono-accion" onclick="window.cambiarPaginaCronograma(-1)" ${page === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>
                    <span class="texto-paginacion">Página ${page} de ${totalPages}</span>
                    <button class="btn-icono-accion" onclick="window.cambiarPaginaCronograma(1)" ${page === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            `;
        }
    }
    cont.innerHTML = html;
};

window.cambiarPaginaCronograma = function(dir) {
    window.adminState.cronograma.paginaActual += dir;
    window.renderListaCronograma(document.getElementById('cronograma-contenido-dinamico'));
};

window.editarActividadCronograma = function(id) {
    window.adminState.cronograma.editandoId = id;
    window.cambiarTabCronograma('form');
};

window.eliminarActividadCronograma = async function(id) {
    window.mostrarConfirmacion('¿Seguro que deseas eliminar esta actividad?', async () => {
        const colName = window.adminState.cronograma.tipo === 'ensayo' ? 'ensayos' : 'presentaciones';
        await deleteDoc(doc(db, colName, id));
        window.mostrarToast('Actividad eliminada.');
        window.renderListaCronograma(document.getElementById('cronograma-contenido-dinamico'));
    });
};

// -------------------- WHATSAPP PREVIEW (DESDE FORMULARIO) --------------------
window.previsualizarWhatsApp = function() {
    const tipo = window.adminState.cronograma.tipo;
    const data = {
        title: document.getElementById('crono-motivo').value,
        date: document.getElementById('crono-fecha').value,
        encuentro: document.getElementById('crono-encuentro').value,
        encuentro_desc: document.getElementById('crono-lugar-enc').value,
        encuentro_link: document.getElementById('crono-link-enc').value,
        contacto_nombre: document.getElementById('crono-contacto-nom').value,
        contacto_celular: document.getElementById('crono-contacto-cel').value,
        whatsapp: document.getElementById('crono-whatsapp').value
    };

    if (tipo === 'ensayo') {
        data.inicio = document.getElementById('crono-inicio').value;
        data.fin = document.getElementById('crono-fin').value;
        data.ensayo_desc = document.getElementById('crono-lugar-act').value;
        data.ensayo_link = document.getElementById('crono-link-act').value;
        data.repertorio = document.getElementById('crono-notas').value;
    } else {
        data.tocada = document.getElementById('crono-inicio').value;
        data.ubicacion_desc = document.getElementById('crono-lugar-act').value;
        data.ubicacion_link = document.getElementById('crono-link-act').value;
    }

    const texto = tipo === 'ensayo'
        ? window.generarTextoWhatsAppEnsayo(data)
        : window.generarTextoWhatsAppPresentacion(data);
    window.abrirWhatsAppModal(texto);
};

// -------------------- WHATSAPP PREVIEW (DESDE UNA ACTIVIDAD GUARDADA) --------------------
window.previsualizarWhatsAppDesdeActividad = function(id) {
    const tipo = window.adminState.cronograma.tipo;
    const items = tipo === 'ensayo' ? (window.ensayos || []) : (window.presentaciones || []);
    const act = items.find(a => a.id === id);
    if (!act) return;

    if (tipo === 'ensayo' && window.generarTextoWhatsAppEnsayo) {
        const texto = window.generarTextoWhatsAppEnsayo(act);
        if (window.abrirWhatsAppModal) window.abrirWhatsAppModal(texto);
    } else if (tipo === 'presentacion' && window.generarTextoWhatsAppPresentacion) {
        const texto = window.generarTextoWhatsAppPresentacion(act);
        if (window.abrirWhatsAppModal) window.abrirWhatsAppModal(texto);
    } else {
        window.mostrarToast('Funciones de WhatsApp no disponibles', 'error');
    }
};

// -------------------- CANCELAR EDICIÓN --------------------
window.cancelarEdicionCronograma = function() {
    window.adminState.cronograma.editandoId = null;
    window.cambiarTabCronograma('form'); // El texto se pondrá "Registrar"
};

// -------------------- FILTRO PARA LISTA DE CRONOGRAMA --------------------
window.filtrarCronograma = function(estado, btnElement) {
    document.querySelectorAll('#cronograma-contenido-dinamico .btn-filtro').forEach(b => b.classList.remove('activo'));
    if (btnElement) btnElement.classList.add('activo');
    window.adminState.cronograma.filtroEstado = estado;
    window.renderListaCronograma(document.getElementById('cronograma-contenido-dinamico'));
};
window.actualizarTextoFormTab = function() {
    const texto = document.getElementById('texto-tab-form');
    if (texto) {
        texto.textContent = window.adminState.cronograma.editandoId ? 'Editar' : 'Registrar';
    }
};
window.refrescarTareasAdmin = function() {
    const overlay = document.getElementById('admin-overlays');
    if (!overlay || overlay.style.display === 'none') return;
    const filtros = document.getElementById('filtros-tareas-admin');
    if (!filtros) return;
    const filtroActivo = filtros.querySelector('.btn-filtro.activo');
    const estado = filtroActivo 
        ? filtroActivo.textContent.trim().toLowerCase().replace(' ', '_') 
        : 'todas';
    window.filtrarTareasAdmin(estado);
};