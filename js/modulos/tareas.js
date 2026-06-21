/**
 * ARCHIVO: modulos/tareas.js
 * PROPÓSITO: Manejo de asignaciones de instrumentos y canciones a los miembros.
 *            Refresco inmediato al cambiar progreso, títulos en mayúsculas.
 */
import { db } from '../core/firebase.js';
import { collection, doc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const getBasePath = (col) => collection(db, col);
const getDocPath = (col, docId) => doc(db, col, docId);

window.tareaSeleccion = { 
    cancionId: null, 
    usuarioId: null, 
    searchCancion: '', 
    searchUsuario: '' 
};

// =================================================================
//  VISTA DEL USUARIO: "MIS TAREAS"
// =================================================================
window.renderizarTareas = function() { 
    const cont = document.getElementById('contenido-tareas-lista');
    if(!cont) return;

    cont.innerHTML = `
        <section class="seccion-dashboard activo" id="seccion-tareas">
            <header class="cabecera-seccion">
                <h2 class="titulo-seccion">Mis Tareas Asignadas</h2>
            </header>
            
            <nav class="barra-filtros" id="filtros-tareas">
                <button class="btn-filtro activo" onclick="window.filtrarTareas('todas')">Todas</button>
                <button class="btn-filtro" onclick="window.filtrarTareas('sin_iniciar')">Sin iniciar</button>
                <button class="btn-filtro" onclick="window.filtrarTareas('en_progreso')">En progreso</button>
                <button class="btn-filtro" onclick="window.filtrarTareas('completado')">Completadas</button>
            </nav>
            
            <div id="lista-tareas-usuario" class="grid-tarjetas"></div>
        </section>
    `; 
    window.filtrarTareas('todas'); 
};

window.filtrarTareas = function(estado) {
    document.querySelectorAll('#filtros-tareas .btn-filtro').forEach(b => { 
        b.classList.remove('activo'); 
        const valorFiltro = b.textContent.trim().toLowerCase().replace(' ', '_');
        if (valorFiltro === estado || (estado === 'todas' && valorFiltro === 'todas')) {
            b.classList.add('activo'); 
        }
    });

    const misAsignaciones = window.asignaciones.filter(a => a.usuarioId === window.usuarioActual.uid);
    let html = '';

    misAsignaciones.forEach(asig => {
        const cancion = window.canciones.find(c => c.id === asig.cancionId); 
        if (!cancion) return;
        
        const est = (window.progresos[`${window.usuarioActual.uid}_${asig.cancionId}`] || {})[asig.instrumento] || 'sin_iniciar';
        if (estado !== 'todas' && est !== estado) return;
        
        const imgInst = window.imagenesInstrumentos ? window.imagenesInstrumentos[asig.instrumento] : 'https://images.unsplash.com/photo-1514643282214-410cebc8c5cc?auto=format&fit=crop&q=80&w=600';

        html += `
            <article class="tarjeta-asignacion" onclick="window.abrirPanelRecursos('${asig.cancionId}', '${asig.instrumento}', 'tareas')">
                <div class="tarjeta-asignacion-info">
                    <img src="${imgInst}" class="tarjeta-asignacion-img" alt="${asig.instrumento}">
                    <div class="tarjeta-asignacion-textos">
                        <h3 class="tarjeta-asignacion-titulo">${cancion.titulo.toUpperCase()}</h3>
                        <span class="tarjeta-asignacion-inst">${asig.instrumento.toUpperCase()}</span>
                    </div>
                </div>
                <div class="selector-estado-progreso">
                    <button class="btn-estado sin-iniciar ${est === 'sin_iniciar' ? 'activo' : ''}" onclick="event.stopPropagation(); window.cambiarProgreso('${asig.cancionId}', '${asig.instrumento}', 'sin_iniciar'); window.refrescarTareas()">Sin iniciar</button>
                    <button class="btn-estado en-progreso ${est === 'en_progreso' ? 'activo' : ''}" onclick="event.stopPropagation(); window.cambiarProgreso('${asig.cancionId}', '${asig.instrumento}', 'en_progreso'); window.refrescarTareas()">En progreso</button>
                    <button class="btn-estado completado ${est === 'completado' ? 'activo' : ''}" onclick="event.stopPropagation(); window.cambiarProgreso('${asig.cancionId}', '${asig.instrumento}', 'completado'); window.refrescarTareas()">Completado</button>
                </div>
            </article>`;
    });

    document.getElementById('lista-tareas-usuario').innerHTML = html || '<div class="mensaje-estado-vacio"><p>No hay tareas en esta categoría.</p></div>';
};

// =================================================================
//  VISTA ADMIN: ASIGNACIÓN DE TAREAS
// =================================================================
window.mostrarAsignarTarea = function() {
    const contenedor = document.getElementById('admin-overlays');
    contenedor.innerHTML = '';
    
    const overlay = document.createElement('div'); 
    overlay.className = 'overlay-contenedor';
    
    overlay.innerHTML = `
        <button class="btn-volver-overlay" onclick="document.getElementById('admin-overlays').innerHTML='';">
            <i class="fa-solid fa-arrow-left"></i> Volver al Panel Admin
        </button>
        
        <h2 class="overlay-titulo-principal">Asignar Nueva Tarea</h2>
        
        <div class="grid-asignador-tareas">
            <section class="columna-asignador">
                <h3 class="titulo-columna-asignador">1. Canción</h3>
                <div class="input-icono-wrapper">
                    <i class="fa-solid fa-search"></i>
                    <input type="text" class="entrada-formulario" placeholder="Buscar canción..." onkeyup="window.tareaSeleccion.searchCancion=this.value.toLowerCase(); window.renderColsTarea()">
                </div>
                <div id="lista-canciones-asignador" class="lista-items-asignador"></div>
            </section>
            
            <section class="columna-asignador">
                <h3 class="titulo-columna-asignador">2. Miembro</h3>
                <div class="input-icono-wrapper">
                    <i class="fa-solid fa-search"></i>
                    <input type="text" class="entrada-formulario" placeholder="Buscar tuno..." onkeyup="window.tareaSeleccion.searchUsuario=this.value.toLowerCase(); window.renderColsTarea()">
                </div>
                <div id="lista-usuarios-asignador" class="lista-items-asignador"></div>
            </section>
            
            <section class="columna-asignador panel-confirmacion-asignador" id="panel-instrumentos-asignador">
                <h3 class="titulo-columna-asignador">3. Instrumento</h3>
                <div id="contenido-instrumentos-asignador">
                    <div class="mensaje-estado-vacio">
                        <i class="fa-solid fa-hand-pointer"></i>
                        <p>Selecciona una canción y un miembro.</p>
                    </div>
                </div>
            </section>
        </div>
    `;
    contenedor.appendChild(overlay);
    contenedor.style.display = 'block';   // Forzar visibilidad del overlay
    window.renderColsTarea();
};

window.renderColsTarea = function() {
    const colC = document.getElementById('lista-canciones-asignador');
    const colU = document.getElementById('lista-usuarios-asignador');
    const colI = document.getElementById('contenido-instrumentos-asignador');
    if(!colC || !colU || !colI) return;

    let htmlC = '';
    window.canciones
        .filter(c => c.titulo.toLowerCase().includes(window.tareaSeleccion.searchCancion))
        .sort((a,b) => a.titulo.localeCompare(b.titulo))
        .forEach(c => {
            const activo = window.tareaSeleccion.cancionId === c.id ? 'item-asignador-activo' : '';
            htmlC += `<div class="item-lista-asignador ${activo}" onclick="window.tareaSeleccion.cancionId='${c.id}'; window.renderColsTarea()">${c.titulo.toUpperCase()}</div>`;
        });
    colC.innerHTML = htmlC || '<div class="mensaje-estado-vacio"><p>Sin resultados.</p></div>';

    let htmlU = '';
    window.miembros
        .filter(m => (m.nombre.toLowerCase().includes(window.tareaSeleccion.searchUsuario) || (m.apodo && m.apodo.toLowerCase().includes(window.tareaSeleccion.searchUsuario))))
        .sort((a,b) => a.nombre.localeCompare(b.nombre))
        .forEach(m => {
            const activo = window.tareaSeleccion.usuarioId === m.uid ? 'item-asignador-activo' : '';
            const nombre = m.nombre || 'Sin nombre';
            const apodo = m.apodo ? `"${m.apodo}"` : '';
            const inst = m.instrumento ? m.instrumento.charAt(0).toUpperCase() + m.instrumento.slice(1) : '';
            
            htmlU += `
                <div class="item-lista-asignador item-usuario-asignador ${activo}" onclick="window.tareaSeleccion.usuarioId='${m.uid}'; window.renderColsTarea()">
                    <img src="${m.foto || 'https://placehold.co/30'}" class="avatar-miniatura">
                    <div class="info-usuario-asignador">
                        <span class="nombre">${nombre} <small>${apodo}</small></span>
                        <span class="instrumento"><i class="fa-solid fa-guitar"></i> ${inst}</span>
                    </div>
                </div>`;
        });
    colU.innerHTML = htmlU || '<div class="mensaje-estado-vacio"><p>Sin resultados.</p></div>';

    if (window.tareaSeleccion.cancionId && window.tareaSeleccion.usuarioId) {
        const cancion = window.canciones.find(c => c.id === window.tareaSeleccion.cancionId);
        const miembro = window.miembros.find(m => m.uid === window.tareaSeleccion.usuarioId);
        const instHabilitados = cancion.instrumentosHabilitados || ['guitarra', 'bandurria'];
        
        let htmlI = `
            <div class="resumen-seleccion-asignador">
                <p>Asignando a <strong>${miembro.nombre}</strong></p>
                <p>Canción: <strong>${cancion.titulo.toUpperCase()}</strong></p>
            </div>
            <div class="lista-botones-asignacion">
        `;
        
        instHabilitados.forEach(inst => {
            const asigExistente = window.asignaciones.find(a => a.usuarioId === miembro.uid && a.cancionId === cancion.id && a.instrumento === inst);
            if (asigExistente) {
                htmlI += `
                    <div class="item-asignacion-existente">
                        <span class="texto-asignado"><i class="fa-solid fa-check-circle"></i> ${inst.toUpperCase()} Asignado</span>
                        <button class="btn-icono-pequeno btn-peligro-texto" onclick="window.eliminarAsignacion('${asigExistente.id}', true)"><i class="fa-solid fa-trash"></i></button>
                    </div>`;
            } else {
                htmlI += `<button class="btn-primario btn-ancho-completo" onclick="window.preConfirmarAsignacion('${miembro.uid}', '${cancion.id}', '${inst}')"><i class="fa-solid fa-plus"></i> Asignar ${inst.toUpperCase()}</button>`;
            }
        });
        
        htmlI += `</div>`;
        colI.innerHTML = htmlI;
    } else {
        colI.innerHTML = `<div class="mensaje-estado-vacio"><i class="fa-solid fa-hand-pointer"></i><p>Selecciona una canción y un miembro para continuar.</p></div>`;
    }
};

window.preConfirmarAsignacion = function(uid, cancionId, inst) {
    const cancion = window.canciones.find(c => c.id === cancionId);
    const miembro = window.miembros.find(m => m.uid === uid);
    
    window.mostrarConfirmacion(`¿Asignar a ${miembro.nombre}? \nCanción: ${cancion.titulo} \nInstrumento: ${inst.toUpperCase()}`, async () => {
        await addDoc(getBasePath('asignaciones'), { 
            usuarioId: uid, 
            cancionId: cancionId, 
            instrumento: inst, 
            fechaCreacion: new Date().toISOString() 
        });
        window.mostrarToast('Asignación exitosa.');
        window.renderColsTarea();
    });
};

window.eliminarAsignacion = function(asigId, silentRender = false) {
    window.mostrarConfirmacion('¿Seguro que deseas eliminar esta tarea asignada?', async () => {
        await deleteDoc(getDocPath('asignaciones', asigId));
        window.mostrarToast('Tarea eliminada.');
        if(silentRender && document.getElementById('admin-overlays').innerHTML !== '') {
            window.renderColsTarea();
        }
    });
};

// =================================================================
//  VISTA ADMIN: TABLA GENERAL DE TAREAS ASIGNADAS
// =================================================================
window.mostrarTareasAsignadas = function() {
    const contenedor = document.getElementById('admin-overlays'); 
    contenedor.innerHTML = '';
    
    const overlay = document.createElement('div'); 
    overlay.className = 'overlay-contenedor';
    
    overlay.innerHTML = `
        <button class="btn-volver-overlay" onclick="document.getElementById('admin-overlays').innerHTML='';">
            <i class="fa-solid fa-arrow-left"></i> Volver al Panel Admin
        </button>
        
        <h2 class="overlay-titulo-principal">Control Global de Tareas</h2>
        
        <nav class="barra-filtros" id="filtros-tareas-admin">
            <button class="btn-filtro activo" onclick="window.filtrarTareasAdmin('todas')">Todas</button>
            <button class="btn-filtro" onclick="window.filtrarTareasAdmin('sin_iniciar')">Sin iniciar</button>
            <button class="btn-filtro" onclick="window.filtrarTareasAdmin('en_progreso')">En progreso</button>
            <button class="btn-filtro" onclick="window.filtrarTareasAdmin('completado')">Completadas</button>
        </nav>
        
        <div id="lista-tareas-admin" class="grid-tarjetas"></div>
    `;
    contenedor.appendChild(overlay);
    contenedor.style.display = 'block';   // Forzar visibilidad del overlay
    window.filtrarTareasAdmin('todas');
};

window.filtrarTareasAdmin = function(estado) {
    document.querySelectorAll('#filtros-tareas-admin .btn-filtro').forEach(b => {
        b.classList.remove('activo');
        const valorFiltro = b.textContent.trim().toLowerCase().replace(' ', '_');
        if (valorFiltro === estado || (estado === 'todas' && valorFiltro === 'todas')) {
            b.classList.add('activo');
        }
    });

    let html = '';
    window.asignaciones.forEach(asig => {
        const cancion = window.canciones.find(c => c.id === asig.cancionId);
        const miembro = window.miembros.find(m => m.uid === asig.usuarioId);
        if (!cancion || !miembro) return;
        
        const est = (window.progresos[`${asig.usuarioId}_${asig.cancionId}`] || {})[asig.instrumento] || 'sin_iniciar';
        if (estado !== 'todas' && est !== estado) return;
        
        const claseEstado = est === 'completado' ? 'estado-verde' : (est === 'en_progreso' ? 'estado-amarillo' : 'estado-gris');
        const textoEstado = est.replace('_', ' ').toUpperCase();

        html += `
            <article class="tarjeta-asignacion-admin">
                <div class="tarjeta-admin-cabecera">
                    <img src="${miembro.foto || 'https://placehold.co/40'}" class="avatar-circular" alt="Foto">
                    <div class="info-responsable">
                        <span class="nombre-responsable">${miembro.nombre}</span>
                        <span class="cancion-asignada">${cancion.titulo.toUpperCase()} <small>(${asig.instrumento})</small></span>
                    </div>
                </div>
                <div class="tarjeta-admin-pie">
                    <span class="etiqueta-estado ${claseEstado}">${textoEstado}</span>
                    <button class="btn-icono-pequeno btn-peligro-texto" onclick="window.eliminarAsignacion('${asig.id}', true); setTimeout(()=>window.filtrarTareasAdmin('${estado}'), 500);"><i class="fa-solid fa-trash"></i></button>
                </div>
            </article>`;
    });
    
    document.getElementById('lista-tareas-admin').innerHTML = html || '<div class="mensaje-estado-vacio"><p>No hay tareas registradas en este estado.</p></div>';
};

// =================================================================
// REFRESCAR TAREAS (mantener filtro activo)
// =================================================================
window.refrescarTareas = function() {
    const seccion = document.getElementById('contenido-tareas-lista');
    if (!seccion || seccion.style.display === 'none') return;

    const filtroActivo = seccion.querySelector('#filtros-tareas .btn-filtro.activo');
    const estado = filtroActivo 
        ? filtroActivo.textContent.trim().toLowerCase().replace(' ', '_') 
        : 'todas';
    window.filtrarTareas(estado);
};