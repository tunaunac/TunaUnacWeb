/**
 * ARCHIVO: core/sync.js
 * PROPÓSITO: Listeners en tiempo real (onSnapshot) para todas las colecciones del dashboard.
 *            Actualiza las variables globales y refresca las vistas visibles automáticamente.
 */
import { db } from './firebase.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let unsubscribeFuncs = [];

export function iniciarSync() {
  detenerSync(); // por si acaso

  // --- Categorías ---
  const unsubCat = onSnapshot(collection(db, 'categorias'), (snap) => {
    window.categorias = [
      { id: 'cat1', nombre: 'TODO' },
      ...snap.docs.map(d => ({ id: d.id, ...d.data() }))
    ];
    const contRep = document.getElementById('contenido-repertorio-lista');
    if (contRep && contRep.style.display !== 'none' && window.renderizarRepertorio) {
      window.renderizarRepertorio();
    }
  });

  // --- Canciones ---
  const unsubCan = onSnapshot(collection(db, 'canciones'), (snap) => {
    window.canciones = snap.docs.map(d => ({
      id: d.id,
      titulo: d.data().titulo,
      categoriaId: d.data().categoriaId,
      instrumentosHabilitados: d.data().instrumentosHabilitados || ['guitarra', 'bandurria']
    }));
    window.recursosPorCancion = {};
    snap.docs.forEach(d => {
      window.recursosPorCancion[d.id] = d.data().recursos || {};
      const habilitados = d.data().instrumentosHabilitados || ['guitarra', 'bandurria'];
      habilitados.forEach(inst => {
        if (!window.recursosPorCancion[d.id][inst]) {
          window.recursosPorCancion[d.id][inst] = { videos: [], archivos: [] };
        }
      });
    });

    if (window.cancionActual && document.getElementById('repertorio-overlays')?.children.length > 0) {
      window.abrirOverlayInstrumentos(window.cancionActual.id);
    }
    const listaCanciones = document.getElementById('lista-canciones');
    if (listaCanciones && listaCanciones.style.display !== 'none' && window.renderizarCanciones) {
      window.renderizarCanciones();
    }
  });

  // --- Progresos ---
  const unsubPro = onSnapshot(collection(db, 'progresos'), (snap) => {
    window.progresos = {};
    snap.docs.forEach(d => { window.progresos[d.id] = d.data(); });

    const miProgreso = document.getElementById('seccion-mi-progreso');
    if (miProgreso && miProgreso.style.display !== 'none' && window.refrescarMiProgreso) {
      window.refrescarMiProgreso();
    }

    const progresoGlobal = document.getElementById('seccion-progreso-miembros');
    if (progresoGlobal && progresoGlobal.style.display !== 'none' && window.refrescarProgresoGlobal) {
      window.refrescarProgresoGlobal();
    }

    const tareas = document.getElementById('contenido-tareas-lista');
    if (tareas && tareas.style.display !== 'none' && window.refrescarTareas) {
      window.refrescarTareas();
    }

    // ✅ NUEVO: Refrescar tareas admin
    if (window.refrescarTareasAdmin) {
      window.refrescarTareasAdmin();
    }

    // ✅ NUEVO: Refrescar overlay de instrumentos
    const overlayInst = document.getElementById('repertorio-overlays');
    if (overlayInst && overlayInst.style.display !== 'none' && window.refrescarOverlayInstrumentos) {
      window.refrescarOverlayInstrumentos();
    }

    if (window.cancionActual && document.getElementById('overlay-recursos')) {
      const prog = window.progresos[`${window.usuarioActual.uid}_${window.cancionActual.id}`] || {};
      document.querySelectorAll('#overlay-recursos .selector-estado-progreso .btn-estado').forEach(btn => {
        const estado = btn.classList.contains('sin-iniciar') ? 'sin_iniciar' :
                       btn.classList.contains('en-progreso') ? 'en_progreso' : 'completado';
        const inst = document.querySelector('.recursos-instrumento')?.textContent.toLowerCase();
        if (inst) {
          btn.classList.toggle('activo', estado === (prog[inst] || 'sin_iniciar'));
        }
      });
    }
  });

  // --- Miembros ---
  const unsubMie = onSnapshot(collection(db, 'miembros'), (snap) => {
    window.miembros = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    const admin = document.getElementById('seccion-admin');
    if (admin && admin.style.display !== 'none' && window.seccionesRenderizadas?.admin && window.renderizarPanelAdmin) {
      window.renderizarPanelAdmin();
    }
    const progGlobal = document.getElementById('seccion-progreso-miembros');
    if (progGlobal && progGlobal.style.display !== 'none' && window.refrescarProgresoGlobal) {
      window.refrescarProgresoGlobal();
    }
  });

  // --- Asignaciones (tareas) ---
  const unsubAsi = onSnapshot(collection(db, 'asignaciones'), (snap) => {
    window.asignaciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const tareas = document.getElementById('contenido-tareas-lista');
    if (tareas && tareas.style.display !== 'none' && window.refrescarTareas) {
      window.refrescarTareas();
    }

    // ✅ NUEVO: Refrescar tareas admin
    if (window.refrescarTareasAdmin) {
      window.refrescarTareasAdmin();
    }
  });

  // --- Ensayos ---
  const unsubEns = onSnapshot(collection(db, 'ensayos'), (snap) => {
    window.ensayos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const ensayos = document.getElementById('seccion-ensayos');
    if (ensayos && ensayos.style.display !== 'none' && window.renderizarEnsayos) {
      window.renderizarEnsayos();
    }
  });

  // --- Presentaciones ---
  const unsubPres = onSnapshot(collection(db, 'presentaciones'), (snap) => {
    window.presentaciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const presentaciones = document.getElementById('seccion-presentaciones-dash');
    if (presentaciones && presentaciones.style.display !== 'none' && window.renderizarPresentacionesInternas) {
      window.renderizarPresentacionesInternas();
    }
  });

  unsubscribeFuncs = [unsubCat, unsubCan, unsubPro, unsubMie, unsubAsi, unsubEns, unsubPres];
}

export function detenerSync() {
  unsubscribeFuncs.forEach(unsub => unsub());
  unsubscribeFuncs = [];
}