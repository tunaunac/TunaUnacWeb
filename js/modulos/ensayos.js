/**
 * ARCHIVO: modulos/ensayos.js
 * PROPÓSITO: Vista de solo lectura del cronograma de ensayos para los miembros.
 *            Ahora con toda la información detallada, enlaces y WhatsApp.
 */

window.ensayoState = {
    tab: 'lista',           // Lista por defecto
    mes: new Date().getMonth(),
    anio: new Date().getFullYear(),
    pagina: 1,
    itemsPorPagina: 5,
    filtroEstado: 'todas'   // 'todas', 'futura', 'pasada'
};

// Utilidad local para limpiar números de teléfono
function limpiarTelefono(phone) {
    return (phone || '').replace(/[^0-9]/g, '');
}

// =================================================================
//  1. RENDERIZADO PRINCIPAL
// =================================================================
window.renderizarEnsayos = function() {
    const cont = document.getElementById('seccion-ensayos');
    if (!cont) return;

    cont.innerHTML = `
        <header class="cabecera-seccion">
            <h2 class="titulo-seccion"><i class="fa-solid fa-music"></i> Calendario de Ensayos</h2>
        </header>

        <div class="tarjeta-panel">
            <div class="barra-pestanias">
                <button class="btn-pestania ${window.ensayoState.tab === 'lista' ? 'activo' : ''}" onclick="window.cambiarTabEnsayo('lista')">
                    <i class="fa-solid fa-list-ul"></i> Lista de Ensayos
                </button>
                <button class="btn-pestania ${window.ensayoState.tab === 'calendario' ? 'activo' : ''}" onclick="window.cambiarTabEnsayo('calendario')">
                    <i class="fa-regular fa-calendar-days"></i> Calendario
                </button>
            </div>
            
            <div id="contenedor-ensayos-dinamico" class="margen-superior-md"></div>
        </div>
    `;

    window.cambiarTabEnsayo(window.ensayoState.tab);
};

window.cambiarTabEnsayo = function(tab) {
    window.ensayoState.tab = tab;
    document.querySelectorAll('#seccion-ensayos .btn-pestania').forEach(b => b.classList.remove('activo'));
    const btnActivo = document.querySelector(`#seccion-ensayos .btn-pestania[onclick="window.cambiarTabEnsayo('${tab}')"]`);
    if (btnActivo) btnActivo.classList.add('activo');

    const cont = document.getElementById('contenedor-ensayos-dinamico');
    if (tab === 'calendario') window.renderCalendarioEnsayos(cont);
    else window.renderListaEnsayos(cont);
};

// =================================================================
//  2. VISTA: CALENDARIO
// =================================================================
window.renderCalendarioEnsayos = function(cont) {
    const items = window.ensayos || [];
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const mes = window.ensayoState.mes;
    const anio = window.ensayoState.anio;
    const firstDay = new Date(anio, mes, 1).getDay();
    const daysInMonth = new Date(anio, mes + 1, 0).getDate();
    const todayDate = new Date();

    let html = `
        <div class="calendario-controles">
            <button class="btn-secundario-pequeno" onclick="window.cambiarMesEnsayo(-1)"><i class="fa-solid fa-chevron-left"></i></button>
            <h3 class="calendario-mes-titulo">${monthNames[mes]} ${anio}</h3>
            <button class="btn-secundario-pequeno" onclick="window.cambiarMesEnsayo(1)"><i class="fa-solid fa-chevron-right"></i></button>
        </div>

        <!-- Leyenda de colores -->
        <div class="calendario-leyenda">
            <span><span class="punto-leyenda punto-futuro"></span> Futuras</span>
            <span><span class="punto-leyenda punto-pasado"></span> Pasadas</span>
        </div>

        <div class="calendario-dias-semana">
            <div class="calendario-dia-etiqueta">Dom</div>
            <div class="calendario-dia-etiqueta">Lun</div>
            <div class="calendario-dia-etiqueta">Mar</div>
            <div class="calendario-dia-etiqueta">Mié</div>
            <div class="calendario-dia-etiqueta">Jue</div>
            <div class="calendario-dia-etiqueta">Vie</div>
            <div class="calendario-dia-etiqueta">Sáb</div>
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
        
        const tieneEnsayo = dayItems.length > 0;
        const claseHoy = isToday ? 'calendario-dia-hoy' : '';
        const claseInteractivo = tieneEnsayo ? 'calendario-dia-interactivo' : '';

        let puntosHtml = '';
        if (tieneEnsayo) {
            puntosHtml = '<div class="calendario-dia-puntos">';
            dayItems.forEach(act => {
                const status = window.getActivityStatus ? window.getActivityStatus(act.date, act.inicio) : 'futura';
                puntosHtml += `<span class="punto-actividad ${status === 'futura' ? 'punto-futuro' : 'punto-pasado'}"></span>`;
            });
            puntosHtml += '</div>';
        }

        html += `
            <div class="calendario-dia-celda ${claseHoy} ${claseInteractivo}" ${tieneEnsayo ? `onclick="window.mostrarDetalleDiaEnsayo('${dateStr}')"` : ''}>
                <span class="calendario-dia-numero">${day}</span>
                ${puntosHtml}
            </div>
        `;
    }
    
    html += `
        </div>
        <div id="detalle-dia-ensayo" class="calendario-detalle-dia">
            <div class="mensaje-estado-vacio"><p>Selecciona un día en el calendario para ver los detalles.</p></div>
        </div>
    `;
    cont.innerHTML = html;
};

window.cambiarMesEnsayo = function(dir) {
    window.ensayoState.mes += dir;
    if (window.ensayoState.mes < 0) { window.ensayoState.mes = 11; window.ensayoState.anio--; }
    if (window.ensayoState.mes > 11) { window.ensayoState.mes = 0; window.ensayoState.anio++; }
    window.renderCalendarioEnsayos(document.getElementById('contenedor-ensayos-dinamico'));
};

window.mostrarDetalleDiaEnsayo = function(dateStr) {
    const dayItems = (window.ensayos || []).filter(a => a.date === dateStr);
    const cont = document.getElementById('detalle-dia-ensayo');
    if (!cont) return;
    
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(y, m - 1, d);
    const fechaFormat = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    if (dayItems.length === 0) {
        cont.innerHTML = `<div class="detalle-dia-vacio"><p>No hay ensayos este día.</p></div>`;
        return;
    }

    let html = `<h4 class="subtitulo-bloque" style="margin-bottom:1rem;">Ensayos del ${fechaFormat}</h4>`;
    
    html += dayItems.map(act => {
        const isPasado = window.getActivityStatus ? window.getActivityStatus(act.date, act.inicio) === 'pasada' : false;
        const cleanPhone = limpiarTelefono(act.contacto_celular);
        return `
            <div class="tarjeta-actividad-admin">
                <div class="cabecera-actividad-admin">
                    <h4>${act.title || 'Ensayo'}</h4>
                    <span class="fecha-actividad"><i class="fa-regular fa-calendar"></i> ${act.date}</span>
                </div>
                <div class="cuerpo-actividad-admin">
                   <p><i class="fa-regular fa-clock"></i> Ensayo: ${window.format12Hour(act.inicio)} - ${window.format12Hour(act.fin)} | Encuentro: ${window.format12Hour(act.encuentro)}</p>
                    <p><i class="fa-solid fa-location-dot"></i> <strong>Ensayo:</strong> ${act.ensayo_desc || 'Por definir'} ${act.ensayo_link ? `<a href="${act.ensayo_link}" target="_blank" class="enlace-mapa">Mapa</a>` : ''}</p>
                    <p><i class="fa-solid fa-map-pin"></i> <strong>Encuentro:</strong> ${act.encuentro_desc || 'Por definir'} ${act.encuentro_link ? `<a href="${act.encuentro_link}" target="_blank" class="enlace-mapa">Mapa</a>` : ''}</p>
                    <p><i class="fa-solid fa-book-open"></i> <strong>Repertorio:</strong> ${act.repertorio || 'Ninguna'}</p>
                    <p>
                        <i class="fa-solid fa-phone"></i> <strong>Contacto:</strong> ${act.contacto_nombre || 'Tuno'} / ${act.contacto_celular || ''}
                        ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}" target="_blank" class="enlace-whatsapp" title="Abrir WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                    </p>
                    ${act.whatsapp ? `<p><i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> <strong>WhatsApp:</strong> <a href="${act.whatsapp}" target="_blank" class="enlace-mapa">Enlace</a></p>` : ''}
                </div>
                <div class="acciones-actividad-admin">
                    <button class="btn-whatsapp-style" onclick="window.generarWhatsAppEnsayo('${act.id}')">
                        <i class="fa-brands fa-whatsapp"></i> Texto WhatsApp
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    cont.innerHTML = html;
};

// =================================================================
//  3. VISTA: LISTA PAGINADA (con filtros, badges y toda la info)
// =================================================================
window.renderListaEnsayos = function(cont) {
    const items = window.ensayos || [];
    const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Aplicar filtro de estado (futura/pasada)
    const filtro = window.ensayoState.filtroEstado || 'todas';
    let filtered = sorted;
    if (filtro !== 'todas') {
        filtered = sorted.filter(act => {
            const status = window.getActivityStatus ? window.getActivityStatus(act.date, act.inicio) : 'futura';
            return status === filtro;
        });
    }

    const limit = window.ensayoState.itemsPorPagina;
    const totalPages = Math.ceil(filtered.length / limit) || 1;
    let page = window.ensayoState.pagina;
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * limit;
    const current = filtered.slice(start, start + limit);

    let html = `
        <div class="barra-filtros margen-inferior-md">
            <button class="btn-filtro ${filtro === 'todas' ? 'activo' : ''}" onclick="window.filtrarEnsayos('todas', this)">Todas</button>
            <button class="btn-filtro ${filtro === 'futura' ? 'activo' : ''}" onclick="window.filtrarEnsayos('futura', this)">Futuras</button>
            <button class="btn-filtro ${filtro === 'pasada' ? 'activo' : ''}" onclick="window.filtrarEnsayos('pasada', this)">Pasadas</button>
        </div>
    `;

    if (current.length === 0) {
        html += '<div class="mensaje-estado-vacio"><p>No hay ensayos programados.</p></div>';
    } else {
        html += current.map(act => {
            const [y, m, d] = act.date.split('-');
            const dateObj = new Date(y, m - 1, d);
            const fechaFormat = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const isFutura = window.getActivityStatus ? window.getActivityStatus(act.date, act.inicio) === 'futura' : true;
            const cleanPhone = limpiarTelefono(act.contacto_celular);

            return `
            <div class="tarjeta-actividad-admin">
                <div class="cabecera-actividad-admin">
                    <h4>${act.title || 'Ensayo'}</h4>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <span class="badge-estado ${isFutura ? 'badge-futura' : 'badge-pasada'}">${isFutura ? 'Próximo' : 'Pasado'}</span>
                        <span class="fecha-actividad"><i class="fa-regular fa-calendar"></i> ${fechaFormat}</span>
                    </div>
                </div>
                <div class="cuerpo-actividad-admin">
                    <p><i class="fa-regular fa-clock"></i> Ensayo: ${window.format12Hour ? window.format12Hour(act.inicio) : act.inicio} - ${window.format12Hour ? window.format12Hour(act.fin) : act.fin}</p>
                    <p><i class="fa-solid fa-location-dot"></i> <strong>Ensayo:</strong> ${act.ensayo_desc || 'Por definir'} ${act.ensayo_link ? `<a href="${act.ensayo_link}" target="_blank" class="enlace-mapa">Mapa</a>` : ''}</p>
                    <p><i class="fa-solid fa-map-pin"></i> <strong>Encuentro:</strong> ${act.encuentro_desc || 'Por definir'} ${act.encuentro_link ? `<a href="${act.encuentro_link}" target="_blank" class="enlace-mapa">Mapa</a>` : ''}</p>
                    <p><i class="fa-solid fa-book-open"></i> <strong>Repertorio:</strong> ${act.repertorio || 'Ninguna'}</p>
                    <p>
                        <i class="fa-solid fa-phone"></i> <strong>Contacto:</strong> ${act.contacto_nombre || 'Tuno'} / ${act.contacto_celular || ''}
                        ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}" target="_blank" class="enlace-whatsapp" title="Abrir WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                    </p>
                    ${act.whatsapp ? `<p><i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> <strong>WhatsApp:</strong> <a href="${act.whatsapp}" target="_blank" class="enlace-mapa">Enlace</a></p>` : ''}
                </div>
                <div class="acciones-actividad-admin">
                    <button class="btn-whatsapp-style" onclick="window.generarWhatsAppEnsayo('${act.id}')">
                        <i class="fa-brands fa-whatsapp"></i> Texto WhatsApp
                    </button>
                </div>
            </div>`;
        }).join('');

        if (totalPages > 1) {
            html += `
                <div class="controles-paginacion">
                    <button class="btn-icono-accion" onclick="window.cambiarPaginaEnsayo(-1)" ${page === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>
                    <span class="texto-paginacion">Página ${page} de ${totalPages}</span>
                    <button class="btn-icono-accion" onclick="window.cambiarPaginaEnsayo(1)" ${page === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            `;
        }
    }
    cont.innerHTML = html;
};

window.cambiarPaginaEnsayo = function(dir) {
    window.ensayoState.pagina += dir;
    window.renderListaEnsayos(document.getElementById('contenedor-ensayos-dinamico'));
};

window.filtrarEnsayos = function(estado, btnElement) {
    document.querySelectorAll('#contenedor-ensayos-dinamico .btn-filtro').forEach(b => b.classList.remove('activo'));
    if (btnElement) btnElement.classList.add('activo');
    window.ensayoState.filtroEstado = estado;
    window.renderListaEnsayos(document.getElementById('contenedor-ensayos-dinamico'));
};

// =================================================================
//  4. GENERADOR WHATSAPP (se mantiene igual)
// =================================================================
window.generarWhatsAppEnsayo = function(id) {
    const act = window.ensayos.find(a => a.id === id);
    if (!act) return;

    if (window.generarTextoWhatsAppEnsayo) {
        const texto = window.generarTextoWhatsAppEnsayo(act);
        if (window.abrirWhatsAppModal) {
            window.abrirWhatsAppModal(texto);
        } else {
            console.log(texto);
            window.mostrarToast('Se requiere la función modal de WhatsApp', 'error');
        }
        return;
    }

    // Fallback manual (sin dependencias)
    const [y, m, d] = act.date ? act.date.split('-') : ['', '', ''];
    let dateStr = act.date;
    if (y && m && d) {
        dateStr = new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    let texto = `🎸 *Motivo:* ${act.title || 'Ensayo'}\n📅 *Fecha:* ${dateStr}\n\n`;
    texto += `🕒 *Hora del ensayo:* De ${window.format12Hour ? window.format12Hour(act.inicio) : act.inicio} a ${window.format12Hour ? window.format12Hour(act.fin) : act.fin}\n`;
    texto += `📍 *Ubicación del ensayo:* ${act.ensayo_desc || 'Por definir'}${act.ensayo_link ? `\n🗺️ ${act.ensayo_link}` : ''}\n\n`;
    texto += `🕒 *Hora del encuentro:* ${window.format12Hour ? window.format12Hour(act.encuentro) : act.encuentro}\n`;
    texto += `📍 *Ubicación del encuentro:* ${act.encuentro_desc || 'Por definir'}${act.encuentro_link ? `\n🗺️ ${act.encuentro_link}` : ''}\n\n`;
    texto += `🎶 *Repertorio / Notas:*\n${act.repertorio || 'Ninguna'}\n\n`;
    texto += `📞 *Contacto:* ${act.contacto_nombre || ''} / ${act.contacto_celular || ''}\n`;
    if (act.whatsapp) texto += `💬 *Link del grupo:* ${act.whatsapp}`;

    if (window.abrirWhatsAppModal) {
        window.abrirWhatsAppModal(texto);
    } else {
        console.log(texto);
        window.mostrarToast('Se requiere la función modal de WhatsApp', 'error');
    }
};