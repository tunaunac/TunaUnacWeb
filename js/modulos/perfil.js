/**
 * ARCHIVO: modulos/perfil.js
 * PROPÓSITO: Gestión del perfil del usuario, incluyendo foto, instrumentos,
 *            datos académicos y rango institucional.
 */

import { db, storage } from '../core/firebase.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Constantes de instrumentos
window.instrumentosMaestros = ['guitarra', 'bandurria', 'laúd', 'pandereta', 'capa', 'zampoña', 'quena', 'cuatro', 'guitarrón', 'bongós', 'huevos', 'acordeón'];

window.iconosInstrumentos = {
    guitarra: '🎸', bandurria: '🪕', 'laúd': '🎻', pandereta: '🥁', capa: '🧥',
    'zampoña': '🎋', quena: '🪈', cuatro: '🎸', 'guitarrón': '🎸',
    'bongós': '🪘', huevos: '🥚', 'acordeón': '🪗'
};

// Lista de carreras oficiales de la UNAC (estructura igual que en el antiguo main.js)
const carrerasUNAC = [
    { facultad: "Ciencias Administrativas", carrera: "Administración" },
    { facultad: "Ciencias Contables", carrera: "Contabilidad" },
    { facultad: "Ciencias Económicas", carrera: "Economía" },
    { facultad: "Ciencias Naturales y Matemáticas", carrera: "Física" },
    { facultad: "Ciencias Naturales y Matemáticas", carrera: "Matemática" },
    { facultad: "Ciencias de la Salud", carrera: "Enfermería" },
    { facultad: "Ciencias de la Educación", carrera: "Educación Física" },
    { facultad: "Ingeniería Ambiental y Recursos Naturales", carrera: "Ingeniería Ambiental y de Recursos Naturales" },
    { facultad: "Ingeniería Eléctrica y Electrónica", carrera: "Ingeniería Eléctrica" },
    { facultad: "Ingeniería Eléctrica y Electrónica", carrera: "Ingeniería Electrónica" },
    { facultad: "Ingeniería Industrial y de Sistemas", carrera: "Ingeniería Industrial" },
    { facultad: "Ingeniería Industrial y de Sistemas", carrera: "Ingeniería de Sistemas" },
    { facultad: "Ingeniería Mecánica y de Energía", carrera: "Ingeniería Mecánica" },
    { facultad: "Ingeniería Mecánica y de Energía", carrera: "Ingeniería en Energía" },
    { facultad: "Ingeniería Pesquera y de Alimentos", carrera: "Ingeniería Pesquera" },
    { facultad: "Ingeniería Pesquera y de Alimentos", carrera: "Ingeniería de Alimentos" },
    { facultad: "Ingeniería Química", carrera: "Ingeniería Química" }
];

// Estado temporal del perfil
window.estadoPerfil = {
    instrumentoPrincipal: '',
    instrumentosSecundarios: []
};

// =================================================================
//  RENDERIZADO PRINCIPAL
// =================================================================
window.renderizarPerfil = function() {
    const cont = document.getElementById('seccion-perfil');
    if (!cont) return;

    const datos = window.datosUsuario || {};
    // Sincronizar estado
    window.estadoPerfil.instrumentoPrincipal = datos.instrumento || '';
    window.estadoPerfil.instrumentosSecundarios = datos.instrumentosSecundarios || [];

    // Construir opciones de carrera agrupadas por facultad
    const facultadesUnicas = [...new Set(carrerasUNAC.map(c => c.facultad))];
    let opcionesCarrera = '<option value="">Seleccione su carrera...</option>';
    facultadesUnicas.forEach(fac => {
        opcionesCarrera += `<optgroup label="${fac}">`;
        carrerasUNAC.filter(c => c.facultad === fac).forEach(c => {
            const selected = (datos.carrera === c.carrera) ? 'selected' : '';
            opcionesCarrera += `<option value="${c.carrera}" ${selected}>${c.carrera}</option>`;
        });
        opcionesCarrera += `</optgroup>`;
    });

    cont.innerHTML = `
        <header class="cabecera-seccion">
            <h2 class="titulo-seccion">Mi Perfil</h2>
        </header>

        <!-- ENCABEZADO CON FOTO, NOMBRE, APODO, RANGO -->
        <div class="perfil-encabezado">
            <div class="perfil-encabezado-foto">
                <img src="${datos.foto || 'https://placehold.co/150'}" class="avatar-perfil-grande" id="img-perfil-preview" alt="Foto de perfil">
                <label for="input-foto-perfil" class="btn-icono btn-cambiar-foto" title="Cambiar foto">
                    <i class="fa-solid fa-camera"></i>
                </label>
                <input type="file" id="input-foto-perfil" style="display:none" accept="image/*" onchange="window.subirFotoPerfil(event)">
            </div>
            <div class="perfil-encabezado-info">
                <h3 class="perfil-nombre">${datos.nombre || 'Sin nombre'}</h3>
                <p class="perfil-apodo">${datos.apodo ? `"${datos.apodo}"` : 'Sin apodo'}</p>
                <span class="perfil-rango-badge">${datos.rango || 'Aspirante'}</span>
            </div>
        </div>

        <!-- FORMULARIO DE DATOS -->
        <div class="contenedor-perfil">
            <article class="tarjeta-panel panel-datos">
                <h3 class="subtitulo-panel">Datos Personales</h3>
                
                <div class="grupo-formulario">
                    <label class="etiqueta-formulario">Nombre Completo</label>
                    <input type="text" id="perfil-nombre" class="entrada-formulario" value="${datos.nombre || ''}" placeholder="Tu nombre completo">
                </div>
                
                <div class="grupo-formulario">
                    <label class="etiqueta-formulario">Apodo (Tuna)</label>
                    <input type="text" id="perfil-apodo" class="entrada-formulario" value="${datos.apodo || ''}" placeholder="Tu apodo en la Tuna">
                </div>

                <div class="grupo-formulario">
                    <label class="etiqueta-formulario">Edad</label>
                    <input type="number" id="perfil-edad" class="entrada-formulario" value="${datos.edad || ''}" placeholder="Tu edad" min="15" max="100">
                </div>

                <div class="grupo-formulario">
                    <label class="etiqueta-formulario">Instrumento Principal</label>
                    <div class="grid-instrumentos-selector" id="perfil-selector-principal"></div>
                </div>

                <div class="grupo-formulario">
                    <label class="etiqueta-formulario">Instrumentos Secundarios</label>
                    <div class="grid-instrumentos-selector" id="perfil-selector-secundarios"></div>
                </div>

                <div class="grupo-formulario">
                    <label class="etiqueta-formulario">Carrera Académica</label>
                    <select id="perfil-carrera" class="entrada-formulario" onchange="window.actualizarFacultadDesdeCarrera()">
                        ${opcionesCarrera}
                    </select>
                </div>

                <div class="grupo-formulario">
                    <label class="etiqueta-formulario">Facultad</label>
                    <input type="text" id="perfil-facultad" class="entrada-formulario" value="${datos.facultad || ''}" disabled 
                           style="background: var(--color-fondo); color: var(--color-gris-texto); cursor: not-allowed;">
                </div>

                <div class="grupo-formulario">
                    <label class="etiqueta-formulario">Ciclo / Estado</label>
                    <select id="perfil-ciclo" class="entrada-formulario">
                        <option value="">Selecciona tu ciclo</option>
                        <option value="1" ${datos.ciclo === '1' ? 'selected' : ''}>1er ciclo</option>
                        <option value="2" ${datos.ciclo === '2' ? 'selected' : ''}>2do ciclo</option>
                        <option value="3" ${datos.ciclo === '3' ? 'selected' : ''}>3er ciclo</option>
                        <option value="4" ${datos.ciclo === '4' ? 'selected' : ''}>4to ciclo</option>
                        <option value="5" ${datos.ciclo === '5' ? 'selected' : ''}>5to ciclo</option>
                        <option value="6" ${datos.ciclo === '6' ? 'selected' : ''}>6to ciclo</option>
                        <option value="7" ${datos.ciclo === '7' ? 'selected' : ''}>7mo ciclo</option>
                        <option value="8" ${datos.ciclo === '8' ? 'selected' : ''}>8vo ciclo</option>
                        <option value="9" ${datos.ciclo === '9' ? 'selected' : ''}>9no ciclo</option>
                        <option value="10" ${datos.ciclo === '10' ? 'selected' : ''}>10mo ciclo</option>
                        <option value="Egresado" ${datos.ciclo === 'Egresado' ? 'selected' : ''}>Egresado</option>
                    </select>
                </div>

                <button class="btn-primario margen-superior-md" onclick="window.guardarPerfil()">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar Cambios
                </button>
            </article>
        </div>
    `;

    // Rellenar selectores de instrumentos
    window.renderizarSelectoresInstrumentos('perfil');

    // Asegurar que la facultad se muestre correctamente al cargar
    window.actualizarFacultadDesdeCarrera();
};

// Función auxiliar para autocompletar facultad
window.actualizarFacultadDesdeCarrera = function() {
    const selectCarrera = document.getElementById('perfil-carrera');
    const inputFacultad = document.getElementById('perfil-facultad');
    if (!selectCarrera || !inputFacultad) return;
    
    const carreraSeleccionada = selectCarrera.value;
    const carreraObj = carrerasUNAC.find(c => c.carrera === carreraSeleccionada);
    inputFacultad.value = carreraObj ? carreraObj.facultad : (window.datosUsuario.facultad || '');
};

// =================================================================
//  SELECTORES DE INSTRUMENTOS (se mantienen igual que antes)
// =================================================================
window.renderizarSelectoresInstrumentos = function(contexto = 'perfil', usuarioData = null) {
    const state = contexto === 'perfil' ? window.estadoPerfil : (window.adminState || {});
    const principal = state.instrumentoPrincipal || (usuarioData?.instrumento || '');
    const secundarios = state.instrumentosSecundarios || (usuarioData?.instrumentosSecundarios || []);

    const contPrincipal = document.getElementById(`${contexto}-selector-principal`);
    const contSecundario = document.getElementById(`${contexto}-selector-secundarios`);

    if (contPrincipal) {
        contPrincipal.innerHTML = window.instrumentosMaestros.map(inst => `
            <div class="tarjeta-instrumento-selector ${principal === inst ? 'seleccionado' : ''}" 
                 onclick="window.seleccionarInstrumentoPrincipal('${inst}', '${contexto}')">
                <span class="icono-instrumento-sm">${window.iconosInstrumentos[inst] || '🎸'}</span>
                <span>${inst.toUpperCase()}</span>
            </div>
        `).join('');
    }

    if (contSecundario) {
        contSecundario.innerHTML = window.instrumentosMaestros.map(inst => {
            const esPrincipal = (principal === inst);
            const esSecundario = secundarios.includes(inst);
            return `
                <div class="tarjeta-instrumento-selector ${esSecundario ? 'seleccionado' : ''} ${esPrincipal ? 'bloqueado' : ''}" 
                     onclick="${esPrincipal ? '' : `window.toggleInstrumentoSecundario('${inst}', '${contexto}')`}">
                    <span class="icono-instrumento-sm">${window.iconosInstrumentos[inst] || '🎸'}</span>
                    <span>${inst.toUpperCase()}</span>
                </div>
            `;
        }).join('');
    }
};

window.seleccionarInstrumentoPrincipal = function(inst, contexto = 'perfil') {
    const state = contexto === 'perfil' ? window.estadoPerfil : window.adminState.editandoUsuario;
    if (state.instrumentoPrincipal === inst) {
        state.instrumentoPrincipal = '';
    } else {
        state.instrumentoPrincipal = inst;
        if (contexto === 'perfil') {
            state.instrumentosSecundarios = state.instrumentosSecundarios.filter(i => i !== inst);
        } else if (state.instrumentosSecundarios) {
            state.instrumentosSecundarios = state.instrumentosSecundarios.filter(i => i !== inst);
        }
    }
    window.renderizarSelectoresInstrumentos(contexto, contexto === 'admin' ? window.adminState.editandoUsuario : null);
};

window.toggleInstrumentoSecundario = function(inst, contexto = 'perfil') {
    const state = contexto === 'perfil' ? window.estadoPerfil : window.adminState.editandoUsuario;
    const lista = contexto === 'perfil' ? state.instrumentosSecundarios : (state.instrumentosSecundarios || []);
    if (lista.includes(inst)) {
        if (contexto === 'perfil') state.instrumentosSecundarios = lista.filter(i => i !== inst);
        else state.instrumentosSecundarios = lista.filter(i => i !== inst);
    } else {
        if (contexto === 'perfil') state.instrumentosSecundarios.push(inst);
        else {
            if (!state.instrumentosSecundarios) state.instrumentosSecundarios = [];
            state.instrumentosSecundarios.push(inst);
        }
    }
    window.renderizarSelectoresInstrumentos(contexto, contexto === 'admin' ? window.adminState.editandoUsuario : null);
};

// =================================================================
//  GUARDAR PERFIL (incluye nuevos campos)
// =================================================================
window.guardarPerfil = async function() {
    const nombre = document.getElementById('perfil-nombre').value.trim();
    const apodo = document.getElementById('perfil-apodo').value.trim();
    const edad = document.getElementById('perfil-edad').value.trim();
    const carrera = document.getElementById('perfil-carrera').value;
    const facultad = document.getElementById('perfil-facultad').value;
    const ciclo = document.getElementById('perfil-ciclo').value;

    if (!nombre) {
        window.mostrarToast('El nombre no puede estar vacío.', 'error');
        return;
    }

    const actualizaciones = {
        nombre,
        apodo,
        edad: edad || null,
        instrumento: window.estadoPerfil.instrumentoPrincipal,
        instrumentosSecundarios: window.estadoPerfil.instrumentosSecundarios,
        carrera,
        facultad,
        ciclo
    };

    try {
        const userRef = doc(db, 'miembros', window.usuarioActual.uid);
        await updateDoc(userRef, actualizaciones);
        Object.assign(window.datosUsuario, actualizaciones);
        
        const nombreSidebar = document.getElementById('nombre-usuario');
        if (nombreSidebar) nombreSidebar.textContent = nombre;
        
        window.mostrarToast('Perfil actualizado correctamente.');
    } catch (e) {
        console.error(e);
        window.mostrarToast('Error al guardar el perfil.', 'error');
    }
};

// =================================================================
//  SUBIR FOTO DE PERFIL (Firebase Storage)
// =================================================================
window.subirFotoPerfil = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    window.mostrarToast('Subiendo foto, por favor espera…', 'info');
    try {
        const storageRef = ref(storage, `miembros_fotos/${window.usuarioActual.uid}_${Date.now()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        const userRef = doc(db, 'miembros', window.usuarioActual.uid);
        await updateDoc(userRef, { foto: url });
        window.datosUsuario.foto = url;
        document.getElementById('img-perfil-preview').src = url;
        const avatarSidebar = document.querySelector('#perfil-usuario-sidebar #avatar-usuario');
        if (avatarSidebar) avatarSidebar.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        window.mostrarToast('Foto actualizada exitosamente.');
    } catch (e) {
        console.error(e);
        window.mostrarToast('Error al subir la foto.', 'error');
    }
};