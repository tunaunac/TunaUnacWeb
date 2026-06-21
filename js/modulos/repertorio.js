/**
 * ARCHIVO: modulos/repertorio.js
 * PROPÓSITO: Lógica de la biblioteca musical, filtros, overlays de instrumentos y recursos.
 */
import { db } from '../core/firebase.js';
import { collection, doc, addDoc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Helpers locales para Firestore
const getBasePath = (col) => collection(db, col);
const getDocPath = (col, docId) => doc(db, col, docId);

// Constantes Musicales
const instrumentosMaestros = ['guitarra', 'bandurria', 'laúd', 'pandereta', 'capa', 'zampoña', 'quena', 'cuatro', 'guitarrón', 'bongós', 'huevos', 'acordeón'];
const imagenesInstrumentos = {
    guitarra: 'https://images.unsplash.com/photo-1514643282214-410cebc8c5cc?auto=format&fit=crop&q=80&w=600',
    bandurria: 'https://images.unsplash.com/photo-1620922830843-dfabec4bb0ba?auto=format&fit=crop&q=80&w=600',
    'laúd': 'https://images.unsplash.com/photo-1555447190-7613521e102d?auto=format&fit=crop&q=80&w=600',
    pandereta: 'https://images.unsplash.com/photo-1522008342704-6b265b543c46?auto=format&fit=crop&q=80&w=600',
    capa: 'https://images.unsplash.com/photo-1574883492576-92f758ba3ef0?auto=format&fit=crop&q=80&w=600',
    'zampoña': 'https://images.unsplash.com/photo-1554620025-a6e5b4b73bda?auto=format&fit=crop&q=80&w=600',
    quena: 'https://images.unsplash.com/photo-1531862539062-8e1003ba7f82?auto=format&fit=crop&q=80&w=600',
    cuatro: 'https://images.unsplash.com/photo-1545892557-55098ce14979?auto=format&fit=crop&q=80&w=600',
    'guitarrón': 'https://images.unsplash.com/photo-1510915361894-faa8b36259ce?auto=format&fit=crop&q=80&w=600',
    'bongós': 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&q=80&w=600',
    huevos: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&q=80&w=600',
    'acordeón': 'https://images.unsplash.com/photo-1525926476840-4229b01538fc?auto=format&fit=crop&q=80&w=600'
};

// =================================================================
//  ESTRUCTURA PRINCIPAL Y CATEGORÍAS
// =================================================================
window.renderizarRepertorio = function() {
    const cont = document.getElementById('contenido-repertorio-lista'); 
    if(!cont) return;

    cont.innerHTML = `
        <header class="repertorio-cabecera" id="repertorio-cabecera">
            <h2 class="repertorio-titulo" id="repertorio-titulo">Repertorio Musical</h2>
            ${window.rolActual === 'admin' ? '<button class="btn-secundario" id="btn-crear-categoria" onclick="window.agregarCategoria()"><i class="fa-solid fa-plus"></i> Nueva Categoría</button>' : ''}
        </header>
        
        <div class="repertorio-buscador" id="repertorio-buscador">
            <div class="input-icono-wrapper">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="input-buscar-cancion" class="entrada-formulario" placeholder="Buscar canción por título..." onkeyup="window.buscarRepertorio(this.value)">
            </div>
        </div>
        
        <nav class="repertorio-filtros" id="barra-categorias"></nav>
        
        ${window.rolActual === 'admin' ? '<div class="repertorio-acciones-globales"><button class="btn-primario" id="btn-crear-cancion" onclick="window.agregarCancion()"><i class="fa-solid fa-plus"></i> Añadir Canción</button></div>' : ''}
        
        <section class="repertorio-grid" id="lista-canciones"></section>
    `;

    window.renderizarCategorias(); 
    window.renderizarCanciones();
};

window.renderizarCategorias = function() {
    const barra = document.getElementById('barra-categorias');
    if(!barra || !window.categorias) return;

    barra.innerHTML = window.categorias.map(cat => `
        <div class="categoria-item" id="cat-${cat.id}">
            <button type="button" class="btn-categoria ${cat.nombre === 'TODO' ? 'activo' : ''}" data-cat="${cat.id}" onclick="window.filtrarPorCategoria('${cat.id}')">
                ${cat.nombre}
            </button>
            ${cat.nombre !== 'TODO' && window.rolActual === 'admin' ? `
            <div class="categoria-acciones-admin">
                <button class="btn-icono-accion" onclick="window.editarCategoria('${cat.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icono-accion btn-peligro-texto" onclick="window.eliminarCategoria('${cat.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>` : ''}
        </div>
    `).join('');
};

window.filtrarPorCategoria = function(catId) { 
    document.querySelectorAll('.btn-categoria').forEach(b => b.classList.remove('activo')); 
    const botonActivo = document.querySelector(`.btn-categoria[data-cat="${catId}"]`);
    if(botonActivo) botonActivo.classList.add('activo'); 
    window.renderizarCanciones(catId); 
};

window.buscarRepertorio = function(valor) { 
    window.filtroBusquedaRepertorio = valor.toLowerCase(); 
    window.renderizarCanciones(); 
};

// =================================================================
//  CANCIONES Y TARJETAS
// =================================================================
window.renderizarCanciones = function(filtroCat = null) {
    const lista = document.getElementById('lista-canciones');
    if(!lista || !window.canciones) return;

    let filtradas = window.canciones; 
    if (filtroCat && filtroCat !== 'cat1') filtradas = window.canciones.filter(c => c.categoriaId === filtroCat);
    
    if (window.filtroBusquedaRepertorio) {
        filtradas = filtradas.filter(c => c.titulo.toLowerCase().includes(window.filtroBusquedaRepertorio));
    }
    
    filtradas.sort((a, b) => a.titulo.localeCompare(b.titulo));
    
    lista.innerHTML = filtradas.length > 0 ? filtradas.map(c => `
        <article class="cancion-tarjeta" id="cancion-${c.id}" onclick="window.abrirOverlayInstrumentos('${c.id}')">
            <header class="cancion-cabecera">
                <h3 class="cancion-titulo">${c.titulo}</h3>
            </header>
            
            ${window.rolActual === 'admin' ? `
            <footer class="cancion-acciones-admin" onclick="event.stopPropagation();">
                <button class="btn-icono-accion" onclick="window.editarCancion('${c.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icono-accion btn-peligro-texto" onclick="window.eliminarCancion('${c.id}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </footer>` : ''}
        </article>
    `).join('') : '<div class="mensaje-estado-vacio"><p>No se encontraron canciones.</p></div>';
};

// =================================================================
//  OVERLAYS DE INSTRUMENTOS Y RECURSOS
// =================================================================
window.abrirOverlayInstrumentos = function(canId) {
    const cancion = window.canciones.find(c => c.id === canId); 
    if (!cancion) return;
    window.cancionActual = cancion;
    
    const contenedor = document.getElementById('repertorio-overlays'); 
    if (!contenedor) return;
    
    contenedor.innerHTML = '';
    contenedor.style.display = 'block';
    
    const overlay = document.createElement('div'); 
    overlay.className = 'overlay-contenedor';
    
    const prog = window.progresos ? (window.progresos[`${window.usuarioActual.uid}_${cancion.id}`] || {}) : {};
    const instParaMostrar = cancion.instrumentosHabilitados || ['guitarra', 'bandurria'];

    let html = `
        <button class="btn-volver-overlay" onclick="document.getElementById('repertorio-overlays').innerHTML=''; document.getElementById('repertorio-overlays').style.display='none'; window.cancionActual=null;">
            <i class="fa-solid fa-arrow-left"></i> Volver al Repertorio
        </button>
        <h2 class="overlay-titulo-principal">${cancion.titulo}</h2>
        <div class="overlay-grid-instrumentos">
            ${instParaMostrar.map(inst => {
                const estado = prog[inst] || 'sin_iniciar';
                return `
                    <div class="tarjeta-instrumento" onclick="window.abrirPanelRecursos('${cancion.id}', '${inst}', 'repertorio')">
                        <img src="${imagenesInstrumentos[inst] || imagenesInstrumentos['guitarra']}" class="tarjeta-instrumento-img" alt="${inst}">
                        <div class="tarjeta-instrumento-info">
                            <h3 class="tarjeta-instrumento-nombre">${inst}</h3>
                            <div class="selector-estado-progreso">
                                <button class="btn-estado sin-iniciar ${estado === 'sin_iniciar' ? 'activo' : ''}" onclick="event.stopPropagation(); window.cambiarProgreso('${cancion.id}', '${inst}', 'sin_iniciar'); window.refrescarOverlayInstrumentos()">Sin iniciar</button>
                                <button class="btn-estado en-progreso ${estado === 'en_progreso' ? 'activo' : ''}" onclick="event.stopPropagation(); window.cambiarProgreso('${cancion.id}', '${inst}', 'en_progreso'); window.refrescarOverlayInstrumentos()">En progreso</button>
                                <button class="btn-estado completado ${estado === 'completado' ? 'activo' : ''}" onclick="event.stopPropagation(); window.cambiarProgreso('${cancion.id}', '${inst}', 'completado'); window.refrescarOverlayInstrumentos()">Completado</button>
                            </div>
                        </div>
                    </div>`;
            }).join('')}
    `;
    
    if (window.rolActual === 'admin') {
        const disponibles = instrumentosMaestros.filter(i => !instParaMostrar.includes(i));
        if (disponibles.length > 0) {
            html += `
                <div class="tarjeta-instrumento-admin">
                    <h4 class="tarjeta-admin-titulo"><i class="fa-solid fa-gear"></i> Administrar Tutoriales</h4>
                    <select id="add-inst-${cancion.id}" class="entrada-formulario">
                        <option value="">Selecciona un instrumento...</option>
                        ${disponibles.map(i => `<option value="${i}">${i.toUpperCase()}</option>`).join('')}
                    </select>
                    <button class="btn-primario" onclick="window.habilitarInstrumentoEnCancion('${cancion.id}')"><i class="fa-solid fa-plus"></i> Habilitar Instrumento</button>
                </div>`;
        }
    }
    
    overlay.innerHTML = html; 
    contenedor.appendChild(overlay);
};

window.abrirPanelRecursos = function(cancionId, instrumento, origen) {
    const cancion = window.canciones.find(c => c.id === cancionId); 
    if (!cancion) return;
    
    if (origen === 'tareas') {
        const rs = window.recursosPorCancion[cancionId]?.[instrumento];
        if (!rs || ((!rs.videos || rs.videos.length === 0) && (!rs.archivos || rs.archivos.length === 0))) {
            window.mostrarToast('El administrador aún no ha subido recursos para esta tarea.', 'info');
            return;
        }
    }
    
    window.cancionActual = cancion;
    const contenedor = origen === 'repertorio' ? document.getElementById('repertorio-overlays') : document.getElementById('tareas-overlays');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';
    contenedor.style.display = 'block';
    
    const existing = document.getElementById('overlay-recursos'); 
    if (existing) existing.remove();
    
    const overlay = document.createElement('div'); 
    overlay.className = 'overlay-contenedor'; 
    overlay.id = 'overlay-recursos';
    
    const rawRecursos = window.recursosPorCancion[cancionId]?.[instrumento] || {};
    const recursos = { videos: rawRecursos.videos || [], archivos: rawRecursos.archivos || [] };
    const prog = window.progresos ? (window.progresos[`${window.usuarioActual.uid}_${cancionId}`] || {}) : {};
    const estado = prog[instrumento] || 'sin_iniciar';
    
    const disponiblesInst = cancion.instrumentosHabilitados || ['guitarra'];
    const idx = disponiblesInst.indexOf(instrumento);
    const prevInst = disponiblesInst[(idx - 1 + disponiblesInst.length) % disponiblesInst.length];
    const nextInst = disponiblesInst[(idx + 1) % disponiblesInst.length];

    overlay.innerHTML = `
        <button class="btn-volver-overlay" onclick="window.abrirOverlayInstrumentos('${cancion.id}'); if('${origen}' === 'tareas') window.cancionActual=null;">
            <i class="fa-solid fa-arrow-left"></i> Volver
        </button>
        
        <header class="recursos-cabecera">
            <button class="btn-navegacion-recurso" onclick="window.abrirPanelRecursos('${cancionId}', '${prevInst}', '${origen}')"><i class="fa-solid fa-chevron-left"></i></button>
            <div class="recursos-titulos">
                <h2 class="recursos-cancion">${cancion.titulo}</h2>
                <h3 class="recursos-instrumento">${instrumento.toUpperCase()}</h3>
            </div>
            <button class="btn-navegacion-recurso" onclick="window.abrirPanelRecursos('${cancionId}', '${nextInst}', '${origen}')"><i class="fa-solid fa-chevron-right"></i></button>
        </header>
        
        <div class="recursos-barra-progreso">
            <span class="recursos-progreso-etiqueta">Mi Progreso:</span>
            <div class="selector-estado-progreso">
                <button class="btn-estado sin-iniciar ${estado === 'sin_iniciar' ? 'activo' : ''}" onclick="window.cambiarProgreso('${cancionId}', '${instrumento}', 'sin_iniciar')">Sin iniciar</button>
                <button class="btn-estado en-progreso ${estado === 'en_progreso' ? 'activo' : ''}" onclick="window.cambiarProgreso('${cancionId}', '${instrumento}', 'en_progreso')">En progreso</button>
                <button class="btn-estado completado ${estado === 'completado' ? 'activo' : ''}" onclick="window.cambiarProgreso('${cancionId}', '${instrumento}', 'completado')">Completado</button>
            </div>
        </div>
        
        <div class="recursos-cuerpo-grid">
            <section class="recursos-seccion-videos">
                <h4 class="recursos-seccion-titulo"><i class="fa-brands fa-youtube"></i> Tutoriales en Video</h4>
                ${recursos.videos.length > 0 ? `
                    <div class="reproductor-youtube-wrapper">
                        <iframe id="video-iframe" src="${window.getYouTubeEmbedUrl(recursos.videos[0].url)}" frameborder="0" allowfullscreen></iframe>
                        <div class="reproductor-controles">
                            <button onclick="window.cambiarVideo(-1, ${recursos.videos.length})" ${recursos.videos.length <= 1 ? 'disabled' : ''} class="btn-icono-accion"><i class="fa-solid fa-chevron-left"></i></button>
                            <span id="video-indice" class="indicador-paginacion">1 de ${recursos.videos.length}</span>
                            <button onclick="window.cambiarVideo(1, ${recursos.videos.length})" ${recursos.videos.length <= 1 ? 'disabled' : ''} class="btn-icono-accion"><i class="fa-solid fa-chevron-right"></i></button>
                        </div>
                    </div>
                ` : `<div class="mensaje-estado-vacio"><i class="fa-solid fa-video-slash icono-vacio"></i><p>Aún no hay videos para este instrumento.</p></div>`}
            </section>
            
            <section class="recursos-seccion-archivos">
                <h4 class="recursos-seccion-titulo"><i class="fa-solid fa-folder-open"></i> Archivos y Partituras</h4>
                <div class="lista-archivos-recursos">
                    ${recursos.archivos.length > 0 ? recursos.archivos.map(a => `
                        <a href="${a.url}" target="_blank" class="enlace-archivo-descarga">
                            <i class="fa-solid fa-${a.tipo === 'pdf' ? 'file-pdf' : 'file-audio'} icono-archivo-${a.tipo}"></i>
                            <span class="nombre-archivo">${a.nombre}</span>
                        </a>
                    `).join('') : `<div class="mensaje-estado-vacio"><p>No hay archivos adjuntos.</p></div>`}
                </div>
            </section>
        </div>
        
        ${window.rolActual === 'admin' ? `
        <footer class="recursos-pie-admin">
            <button class="btn-primario" onclick="window.editarRecursos('${cancionId}', '${instrumento}', '${origen}')"><i class="fa-solid fa-pen"></i> Editar Recursos Tutoriales</button>
        </footer>` : ''}
    `;
    contenedor.appendChild(overlay);
    
    window.videosActuales = recursos.videos; 
    window.videoActualIdx = 0;
};

// =================================================================
//  EDICIÓN DE RECURSOS (FUNCIONES FALTANTES)
// =================================================================
window.editarRecursos = function(cancionId, instrumento, origen = 'repertorio') {
    const rawRecursos = window.recursosPorCancion[cancionId]?.[instrumento] || {};
    const recursos = { videos: rawRecursos.videos || [], archivos: rawRecursos.archivos || [] };
    const overlay = document.getElementById('overlay-recursos');
    if (!overlay) return;

    overlay.innerHTML = `
        <button class="btn-volver-overlay" onclick="window.abrirPanelRecursos('${cancionId}', '${instrumento}', '${origen}')">
            <i class="fa-solid fa-arrow-left"></i> Volver
        </button>
        <h2 class="overlay-titulo-principal">Editando ${instrumento}</h2>
        
        <div class="edicion-recursos-seccion">
            <h4 class="recursos-seccion-titulo"><i class="fa-brands fa-youtube"></i> Videos</h4>
            <div id="inputs-videos-overlay" class="edicion-inputs-contenedor">
                ${recursos.videos.map(v => `<input class="entrada-formulario input-video" value="${v.url}" placeholder="URL YouTube">`).join('')}
            </div>
            <button class="btn-secundario" id="btn-agregar-video" onclick="window.agregarInputVideoOverlay()"><i class="fa-solid fa-plus"></i> Añadir video</button>
        </div>
        
        <div class="edicion-recursos-seccion">
            <div class="edicion-archivos-cabecera">
                <h4 class="recursos-seccion-titulo">Archivos Adicionales</h4>
                <div class="edicion-archivos-controles">
                    <button class="btn-icono-accion" onclick="window.agregarInputArchivoOverlay('pdf')"><i class="fa-solid fa-file-pdf"></i></button>
                    <button class="btn-icono-accion" onclick="window.agregarInputArchivoOverlay('audio')"><i class="fa-solid fa-file-audio"></i></button>
                </div>
            </div>
            <div id="inputs-archivos-overlay" class="edicion-inputs-contenedor">
                ${recursos.archivos.map(a => `
                <div class="archivo-input-item" data-tipo="${a.tipo}">
                    <i class="fa-solid fa-${a.tipo === 'pdf' ? 'file-pdf' : 'file-audio'} archivo-input-icono icono-${a.tipo}"></i>
                    <input class="entrada-formulario input-archivo-nombre" value="${a.nombre}" placeholder="Nombre">
                    <input class="entrada-formulario input-archivo-url" value="${a.url}" placeholder="Enlace al archivo">
                </div>`).join('')}
            </div>
        </div>
        
        <div class="edicion-recursos-guardar">
            <button class="btn-primario" onclick="window.guardarRecursos('${cancionId}', '${instrumento}', '${origen}')"><i class="fa-solid fa-floppy-disk"></i> Guardar Cambios</button>
        </div>
    `;
};

window.guardarRecursos = async function(cancionId, instrumento, origen = 'repertorio') {
    const videos = Array.from(document.querySelectorAll('#inputs-videos-overlay input')).map(inp => ({ url: inp.value })).filter(v => v.url);
    const archivos = Array.from(document.querySelectorAll('#inputs-archivos-overlay > div')).map(div => {
        const inputs = div.querySelectorAll('input'); 
        return { nombre: inputs[0].value.trim(), url: inputs[1].value.trim(), tipo: div.getAttribute('data-tipo') || (inputs[1].value.trim().toLowerCase().includes('.pdf') ? 'pdf' : 'audio') };
    }).filter(a => a.nombre && a.url);
    
    let currentRecursos = window.recursosPorCancion[cancionId] || {};
    currentRecursos[instrumento] = { videos, archivos };
    await updateDoc(getDocPath('canciones', cancionId), { recursos: currentRecursos });
    window.abrirPanelRecursos(cancionId, instrumento, origen);
    window.mostrarToast('Recursos actualizados.');
};

window.agregarInputVideoOverlay = function() {
    const inp = document.createElement('input'); 
    inp.className = 'entrada-formulario input-video'; 
    inp.placeholder = 'URL YouTube';
    document.getElementById('inputs-videos-overlay').appendChild(inp);
};

window.agregarInputArchivoOverlay = function(tipo) {
    const div = document.createElement('div'); 
    div.className = 'archivo-input-item'; 
    div.setAttribute('data-tipo', tipo);
    div.innerHTML = `<i class="fa-solid fa-${tipo==='pdf'?'file-pdf':'file-audio'} archivo-input-icono icono-${tipo}"></i>
                     <input class="entrada-formulario input-archivo-nombre" placeholder="Nombre descriptivo">
                     <input class="entrada-formulario input-archivo-url" placeholder="Enlace al archivo">`;
    document.getElementById('inputs-archivos-overlay').appendChild(div);
};

// =================================================================
//  FUNCIONES DE APOYO RECURSOS (YOUTUBE / ACTUALIZAR PROGRESO)
// =================================================================
window.getYouTubeEmbedUrl = function(url) { 
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/); 
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url; 
};

window.cambiarVideo = function(dir, total) { 
    if (!window.videosActuales || total === 0) return; 
    window.videoActualIdx = (window.videoActualIdx + dir + total) % total; 
    const iframe = document.getElementById('video-iframe');
    if (iframe) iframe.src = window.getYouTubeEmbedUrl(window.videosActuales[window.videoActualIdx].url); 
    const indicador = document.getElementById('video-indice');
    if (indicador) indicador.textContent = `${window.videoActualIdx+1} de ${total}`; 
};

window.cambiarProgreso = async function(cancionId, instrumento, valor) {
    const docId = `${window.usuarioActual.uid}_${cancionId}`;
    if (!window.progresos) window.progresos = {};
    if (!window.progresos[docId]) window.progresos[docId] = {};
    window.progresos[docId][instrumento] = valor;
    
    await setDoc(doc(db, 'progresos', docId), { [instrumento]: valor }, { merge: true });
};

// =================================================================
//  FUNCIONES CRUD DE ADMINISTRADOR (Canciones y Categorías)
// =================================================================

// Canciones
window.agregarCancion = function() {
    const lista = document.getElementById('lista-canciones');
    const divTemp = document.createElement('article'); 
    divTemp.className = 'cancion-tarjeta cancion-modo-edicion'; 
    divTemp.id = 'temp-nueva-cancion';
    
    divTemp.innerHTML = `
        <div class="edicion-campos-cancion">
            <input class="entrada-formulario" id="input-titulo-nueva" placeholder="Título de la canción...">
            <select class="entrada-formulario" id="select-categoria-nueva">
                ${window.categorias.filter(cat => cat.id !== 'cat1').map(cat => `<option value="${cat.id}">${cat.nombre}</option>`).join('')}
            </select>
        </div>
        <div class="edicion-acciones-cancion">
            <button class="btn-primario" onclick="window.guardarNuevaCancion()"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>
            <button class="btn-secundario" onclick="document.getElementById('temp-nueva-cancion').remove()"><i class="fa-solid fa-xmark"></i> Cancelar</button>
        </div>
    `;
    lista.prepend(divTemp);
};

window.guardarNuevaCancion = async function() {
    const titulo = document.getElementById('input-titulo-nueva').value.trim(); 
    const categoriaId = document.getElementById('select-categoria-nueva').value;
    if (!titulo) return window.mostrarToast('Ingrese un título.', 'error');
    
    let recursosIniciales = { guitarra: { videos:[], archivos:[] }, bandurria: { videos:[], archivos:[] } };
    await addDoc(getBasePath('canciones'), { titulo, categoriaId, recursos: recursosIniciales, instrumentosHabilitados: ['guitarra', 'bandurria'] });
    
    document.getElementById('temp-nueva-cancion').remove();
    window.mostrarToast('Canción agregada con éxito.');
};

window.eliminarCancion = function(canId) { 
    window.mostrarConfirmacion('¿Eliminar esta canción permanentemente del repertorio?', async () => { 
        await deleteDoc(getDocPath('canciones', canId)); 
        window.mostrarToast('Canción eliminada.'); 
    }); 
};

window.editarCancion = function(canId) {
    const cancion = window.canciones.find(c => c.id === canId); 
    if (!cancion) return;
    
    const contenedor = document.getElementById(`cancion-${canId}`);
    contenedor.classList.add('cancion-modo-edicion');
    contenedor.onclick = null;
    
    contenedor.innerHTML = `
        <div class="edicion-campos-cancion">
            <input class="entrada-formulario" id="edit-titulo-${canId}" value="${cancion.titulo}">
            <select class="entrada-formulario" id="edit-categoria-${canId}">
                ${window.categorias.filter(cat => cat.id !== 'cat1').map(cat => `<option value="${cat.id}" ${cat.id === cancion.categoriaId ? 'selected' : ''}>${cat.nombre}</option>`).join('')}
            </select>
        </div>
        <div class="edicion-acciones-cancion">
            <button class="btn-primario" onclick="window.guardarEdicionCancion('${canId}')"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>
            <button class="btn-secundario" onclick="window.renderizarCanciones()"><i class="fa-solid fa-xmark"></i> Cancelar</button>
        </div>
    `;
};

window.guardarEdicionCancion = async function(canId) {
    const titulo = document.getElementById(`edit-titulo-${canId}`).value.trim(); 
    const categoriaId = document.getElementById(`edit-categoria-${canId}`).value;
    if (!titulo) return window.mostrarToast('El título no puede estar vacío', 'error');
    
    await updateDoc(getDocPath('canciones', canId), { titulo, categoriaId });
    window.mostrarToast('Cambios de canción guardados.');
    
    if (document.getElementById('lista-canciones')) {
        window.renderizarCanciones();
    }
};

window.habilitarInstrumentoEnCancion = async function(cancionId) {
    const select = document.getElementById(`add-inst-${cancionId}`); 
    if(!select || !select.value) return; 
    
    const nuevoInst = select.value;
    const cancion = window.canciones.find(c => c.id === cancionId); 
    if(!cancion) return;
    
    let listaActual = cancion.instrumentosHabilitados || [];
    if(!listaActual.includes(nuevoInst)) {
        listaActual.push(nuevoInst);
        let recursosActuales = window.recursosPorCancion[cancionId] || {};
        if(!recursosActuales[nuevoInst]) recursosActuales[nuevoInst] = { videos:[], archivos:[] };
        
        await updateDoc(getDocPath('canciones', cancionId), { instrumentosHabilitados: listaActual, recursos: recursosActuales });
        window.mostrarToast(`${nuevoInst.toUpperCase()} habilitado.`);
    }
};

// Categorías
window.agregarCategoria = function() {
    const barra = document.getElementById('barra-categorias');
    const tempDiv = document.createElement('div');
    tempDiv.className = 'categoria-item modo-edicion'; 
    tempDiv.id = 'temp-nueva-categoria';
    tempDiv.innerHTML = `
        <input class="entrada-formulario" value="Nueva Cat" id="input-nueva-cat">
        <button class="btn-icono-accion" onclick="window.guardarNuevaCategoria()"><i class="fa-solid fa-check"></i></button>
        <button class="btn-icono-accion btn-peligro-texto" onclick="document.getElementById('temp-nueva-categoria').remove()"><i class="fa-solid fa-xmark"></i></button>
    `;
    barra.appendChild(tempDiv);
};

window.guardarNuevaCategoria = async function() {
    const nombre = document.getElementById('input-nueva-cat').value.trim();
    if (!nombre) return window.mostrarToast('Ingrese un nombre para la categoría.', 'error');
    
    await addDoc(getBasePath('categorias'), { nombre });
    document.getElementById('temp-nueva-categoria').remove();
    window.mostrarToast('Categoría creada exitosamente.');
};

window.editarCategoria = function(catId) {
    const cat = window.categorias.find(c => c.id === catId); 
    if (!cat) return;
    
    document.getElementById(`cat-${catId}`).innerHTML = `
        <input class="entrada-formulario" value="${cat.nombre}" id="edit-cat-${catId}">
        <button class="btn-icono-accion" onclick="window.guardarCategoria('${catId}')"><i class="fa-solid fa-check"></i></button>
        <button class="btn-icono-accion btn-peligro-texto" onclick="window.renderizarCategorias()"><i class="fa-solid fa-xmark"></i></button>
    `;
};

window.guardarCategoria = async function(catId) { 
    const nombre = document.getElementById(`edit-cat-${catId}`).value.trim(); 
    if (nombre) {
        await updateDoc(getDocPath('categorias', catId), { nombre }); 
        window.mostrarToast('Categoría actualizada.'); 
        if (document.getElementById('barra-categorias')) {
            window.renderizarCategorias();
        }
    }
};

window.eliminarCategoria = function(catId) {
    window.mostrarConfirmacion('¿Eliminar categoría? Las canciones asociadas pasarán a TODO.', async () => {
        await deleteDoc(getDocPath('categorias', catId));
        window.canciones.forEach(async c => { 
            if (c.categoriaId === catId) await updateDoc(getDocPath('canciones', c.id), { categoriaId: 'cat1' }); 
        });
        window.mostrarToast('Categoría eliminada.');
    });
};

// =================================================================
// REFRESCAR OVERLAY DE INSTRUMENTOS (UNA SOLA DEFINICIÓN)
// =================================================================
window.refrescarOverlayInstrumentos = function() {
    if (!window.cancionActual) return;
    const cancion = window.cancionActual;
    const prog = window.progresos ? (window.progresos[`${window.usuarioActual.uid}_${cancion.id}`] || {}) : {};
    
    document.querySelectorAll('#repertorio-overlays .tarjeta-instrumento').forEach(tarjeta => {
        const inst = tarjeta.querySelector('.tarjeta-instrumento-nombre')?.textContent.trim().toLowerCase();
        if (!inst) return;
        const estado = prog[inst] || 'sin_iniciar';
        tarjeta.querySelectorAll('.btn-estado').forEach(btn => {
            btn.classList.remove('activo');
            if (btn.classList.contains(estado.replace('_', '-'))) btn.classList.add('activo');
        });
    });

    const instRecursos = document.querySelector('.recursos-instrumento');
    if (instRecursos) {
        const inst = instRecursos.textContent.trim().toLowerCase();
        const estado = prog[inst] || 'sin_iniciar';
        document.querySelectorAll('#overlay-recursos .btn-estado').forEach(btn => {
            btn.classList.remove('activo');
            if (btn.classList.contains(estado.replace('_', '-'))) btn.classList.add('activo');
        });
    }
};