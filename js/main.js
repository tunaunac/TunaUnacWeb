/**
 * ARCHIVO: main.js
 * PROPÓSITO: Punto de entrada de la aplicación. Importa y arranca todo.
 * Como este archivo se carga con type="module" en el HTML, asegura el orden.
 */

// 1. Inicializar Core
import './core/firebase.js';
import './core/app.js';

import './core/sync.js';

// 2. Inicializar Módulos Base
import './modulos/auth.js';

// 3. (A futuro importaremos el resto de módulos aquí)
import './modulos/repertorio.js';
import './modulos/generador.js';
import './modulos/tareas.js';
import './modulos/progreso.js';

import './modulos/ensayos.js';
import './modulos/presentaciones.js';
import './modulos/perfil.js';
import './modulos/admin.js';

console.log("🚀 TUNA UNAC Web App Inicializada Correctamente");