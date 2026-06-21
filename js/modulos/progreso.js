/**
 * ARCHIVO: modulos/progreso.js
 * PROPÓSITO: Manejo de la visualización del progreso individual y global de la Tuna.
 *            Títulos en mayúsculas, refresco inmediato al cambiar estado.
 */

const instrumentosMaestros = ['guitarra', 'bandurria', 'laúd', 'pandereta', 'capa', 'zampoña', 'quena', 'cuatro', 'guitarrón', 'bongós', 'huevos', 'acordeón'];

// =================================================================
//  VISTA: MI PROGRESO (Individual)
// =================================================================
window.renderizarMiProgreso = function() {
    const cont = document.getElementById('seccion-mi-progreso'); 
    if(!cont) return;

    cont.innerHTML = `
        <header class="cabecera-seccion">
            <h2 class="titulo-seccion">Mi Progreso Musical</h2>
        </header>
        
        <div class="contenedor-buscador">
            <i class="fa-solid fa-magnifying-glass icono-buscador"></i>
            <input type="text" placeholder="Buscar canción por título..." class="entrada-formulario input-buscador" onkeyup="window.buscarMiProgreso(this.value)">
        </div>
        
        <nav id="contenedor-filtros-mi-progreso" class="barra-filtros-scroll"></nav>
        
        <div id="contenedor-tabla-mi-progreso" class="contenedor-tabla-responsiva"></div>
    `;
    
    window.renderizarMiProgresoConFiltro('guitarra'); 
};

window.buscarMiProgreso = function(valor) {
    const filas = document.querySelectorAll('#contenedor-tabla-mi-progreso tbody tr');
    const busqueda = valor.toLowerCase();
    
    filas.forEach(fila => {
        const titulo = fila.querySelector('.celda-titulo-cancion').textContent.toLowerCase();
        fila.style.display = titulo.includes(busqueda) ? '' : 'none';
    });
};

window.renderizarMiProgresoConFiltro = function(instrumento) {
    const contFiltro = document.getElementById('contenedor-filtros-mi-progreso');
    const contTabla = document.getElementById('contenedor-tabla-mi-progreso');
    if(!contFiltro || !contTabla) return;

    contFiltro.innerHTML = `
        <div class="barra-filtros">
            ${instrumentosMaestros.map(inst => `
                <button class="btn-filtro ${inst === instrumento ? 'activo' : ''}" onclick="window.renderizarMiProgresoConFiltro('${inst}')">
                    ${inst.toUpperCase()}
                </button>
            `).join('')}
        </div>
    `;

    let filas = window.canciones.map(c => {
        const prog = window.progresos ? (window.progresos[`${window.usuarioActual.uid}_${c.id}`] || {}) : {};
        const estado = prog[instrumento] || 'sin_iniciar';
        
        return `
        <tr class="fila-tabla-progreso">
            <td class="celda-titulo-cancion"><strong>${c.titulo.toUpperCase()}</strong></td>
            <td class="celda-acciones-progreso">
                <div class="selector-estado-progreso">
                    <button class="btn-estado sin-iniciar ${estado === 'sin_iniciar' ? 'activo' : ''}" onclick="window.cambiarProgreso('${c.id}', '${instrumento}', 'sin_iniciar'); window.refrescarMiProgreso()">Sin iniciar</button>
                    <button class="btn-estado en-progreso ${estado === 'en_progreso' ? 'activo' : ''}" onclick="window.cambiarProgreso('${c.id}', '${instrumento}', 'en_progreso'); window.refrescarMiProgreso()">En progreso</button>
                    <button class="btn-estado completado ${estado === 'completado' ? 'activo' : ''}" onclick="window.cambiarProgreso('${c.id}', '${instrumento}', 'completado'); window.refrescarMiProgreso()">Completado</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    contTabla.innerHTML = `
        <table class="tabla-datos">
            <thead class="cabecera-tabla">
                <tr>
                    <th class="columna-principal">Canción</th>
                    <th class="columna-secundaria">Estado (${instrumento.toUpperCase()})</th>
                </tr>
            </thead>
            <tbody class="cuerpo-tabla">
                ${filas}
            </tbody>
        </table>
    `;
};

// =================================================================
//  VISTA: PROGRESO DE MIEMBROS (Global)
// =================================================================
window.renderizarProgresoMiembros = function() { 
    const cont = document.getElementById('seccion-progreso-miembros');
    if(!cont) return;

    cont.innerHTML = `
        <header class="cabecera-seccion">
            <h2 class="titulo-seccion">Progreso Global de la Tuna</h2>
        </header>
        
        <div class="contenedor-buscador">
            <i class="fa-solid fa-magnifying-glass icono-buscador"></i>
            <input type="text" placeholder="Buscar canción en el repertorio global..." class="entrada-formulario input-buscador" onkeyup="window.buscarProgresoMiembros(this.value)">
        </div>
        
        <nav id="contenedor-filtros-progreso-global" class="barra-filtros-scroll"></nav>
        
        <div id="contenedor-tabla-progreso-global" class="contenedor-tabla-responsiva"></div>
    `; 
    
    window.renderizarProgresoMiembrosConFiltro('guitarra'); 
};

window.buscarProgresoMiembros = function(valor) {
    const filas = document.querySelectorAll('#contenedor-tabla-progreso-global tbody tr');
    const busqueda = valor.toLowerCase();
    
    filas.forEach(fila => {
        const titulo = fila.querySelector('.celda-titulo-cancion').textContent.toLowerCase();
        fila.style.display = titulo.includes(busqueda) ? '' : 'none';
    });
};

window.renderizarProgresoMiembrosConFiltro = function(instrumento) {
    const contFiltro = document.getElementById('contenedor-filtros-progreso-global');
    const contTabla = document.getElementById('contenedor-tabla-progreso-global');
    if(!contFiltro || !contTabla) return;

    contFiltro.innerHTML = `
        <div class="barra-filtros">
            ${instrumentosMaestros.map(inst => `
                <button class="btn-filtro ${inst === instrumento ? 'activo' : ''}" onclick="window.renderizarProgresoMiembrosConFiltro('${inst}')">
                    ${inst.toUpperCase()}
                </button>
            `).join('')}
        </div>
    `;

    let cabeceraHtml = `<th class="columna-principal-fija">Repertorio</th>`;
    window.miembros.forEach(m => {
        cabeceraHtml += `
            <th class="columna-miembro">
                <img src="${m.foto || 'https://placehold.co/50'}" class="avatar-miniatura-tabla" alt="Foto">
                <br>
                <span class="nombre-miembro-tabla">${m.apodo || m.nombre.split(' ')[0]}</span>
            </th>
        `;
    });

    let cuerpoHtml = '';
    window.canciones.forEach(c => {
        cuerpoHtml += `<tr class="fila-tabla-progreso"><td class="celda-titulo-cancion"><strong>${c.titulo.toUpperCase()}</strong></td>`;
        
        window.miembros.forEach(m => {
            const prog = window.progresos ? (window.progresos[`${m.uid}_${c.id}`] || {}) : {};
            const est = prog[instrumento] || 'sin_iniciar';
            
            let iconoHTML = '';
            if (est === 'completado') {
                iconoHTML = '<i class="fa-solid fa-circle-check icono-estado-exito" title="Completado"></i>';
            } else if (est === 'en_progreso') {
                iconoHTML = '<i class="fa-solid fa-spinner fa-spin-pulse icono-estado-progreso" title="En Progreso"></i>';
            } else {
                iconoHTML = '<i class="fa-solid fa-circle-minus icono-estado-pendiente" title="Sin Iniciar"></i>';
            }
            
            cuerpoHtml += `<td class="celda-estado-miembro">${iconoHTML}</td>`;
        }); 
        
        cuerpoHtml += '</tr>';
    });

    contTabla.innerHTML = `
        <table class="tabla-datos tabla-matriz">
            <thead class="cabecera-tabla">
                <tr>${cabeceraHtml}</tr>
            </thead>
            <tbody class="cuerpo-tabla">
                ${cuerpoHtml}
            </tbody>
        </table>
    `;
};

// =================================================================
// REFRESCO INMEDIATO
// =================================================================
window.refrescarMiProgreso = function() {
    const cont = document.getElementById('seccion-mi-progreso');
    if (!cont || cont.style.display === 'none') return;
    const filtroActivo = cont.querySelector('.btn-filtro.activo');
    const instrumento = filtroActivo ? filtroActivo.textContent.trim().toLowerCase() : 'guitarra';
    window.renderizarMiProgresoConFiltro(instrumento);
};

window.refrescarProgresoGlobal = function() {
    const cont = document.getElementById('seccion-progreso-miembros');
    if (!cont || cont.style.display === 'none') return;
    const filtroActivo = cont.querySelector('.btn-filtro.activo');
    const instrumento = filtroActivo ? filtroActivo.textContent.trim().toLowerCase() : 'guitarra';
    window.renderizarProgresoMiembrosConFiltro(instrumento);
};