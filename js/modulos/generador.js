/**
 * ARCHIVO: modulos/generador.js
 * PROPÓSITO: Generador de Acordes y Escalas (100% Vanilla JS).
 * Independiente de Firebase. Renderiza un diapasón interactivo.
 */

// =================================================================
//  LÓGICA DEL GENERADOR DE ACORDES (Variables Globales)
// =================================================================
window.chordNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
window.instrumentTunings = { guitar: [4, 11, 7, 2, 9, 4], bandurria: [9, 4, 11, 6, 1, 8] };
window.chordFormulas = { 
    'major': [0, 4, 7], 'minor': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 
    'm7': [0, 3, 7, 10], 'dim': [0, 3, 6], 'aug': [0, 4, 8], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7] 
};
window.scaleFormulas = { 
    'major': [0, 2, 4, 5, 7, 9, 11], 'natural-minor': [0, 2, 3, 5, 7, 8, 10], 
    'harmonic-minor': [0, 2, 3, 5, 7, 8, 11], 'melodic-minor': [0, 2, 3, 5, 7, 9, 11], 
    'dorian': [0, 2, 3, 5, 7, 9, 10], 'phrygian': [0, 1, 3, 5, 7, 8, 10], 
    'lydian': [0, 2, 4, 6, 7, 9, 11], 'mixolydian': [0, 2, 4, 5, 7, 9, 10], 
    'locrian': [0, 1, 3, 5, 6, 8, 10], 'pentatonic-major': [0, 2, 4, 7, 9], 
    'pentatonic-minor': [0, 3, 5, 7, 10], 'blues': [0, 3, 5, 6, 7, 10] 
};

window.chordState = { 
    tuning: [...window.instrumentTunings.guitar], 
    key: 0, chordType: 'major', scaleType: 'major', 
    fretCount: 12, currentNotes: [], isChord: true 
};
window.chordInitialized = false;

// =================================================================
//  1. RENDERIZADO DE LA UI PRINCIPAL
// =================================================================
window.renderizarGenerador = function() { 
    const cont = document.getElementById('seccion-generador');
    if(!cont) return;
    
    // Inyectamos HTML limpio usando clases semánticas globales
    cont.innerHTML = `
        <div id="generador-contenedor-principal" class="contenedor-generador">
            <header class="cabecera-seccion">
                <h2 class="titulo-seccion">🎸 Generador de Acordes y Escalas</h2>
                <p class="texto-descripcion">Explora los acordes y escalas usados por la Tuna en el diapasón interactivo.</p>
            </header>
            
            <section class="grid-paneles-generador">
                <!-- Panel: Afinación -->
                <article class="tarjeta-panel">
                    <h3 class="subtitulo-panel">Afinación</h3>
                    <div id="chord-tuning-controls" class="contenedor-afinacion"></div>
                    <div class="acciones-cuerda">
                        <button id="chord-add-string" class="btn-secundario">+ Cuerda</button>
                        <button id="chord-remove-string" class="btn-secundario">- Cuerda</button>
                    </div>
                    <div class="grupo-formulario">
                        <label for="chord-instrument" class="etiqueta-formulario">Instrumento predefinido:</label>
                        <select id="chord-instrument" class="entrada-formulario">
                            <option value="guitar">Guitarra</option>
                            <option value="bandurria">Bandurria</option>
                        </select>
                    </div>
                </article>

                <!-- Panel: Tonalidad y Fórmula -->
                <article class="tarjeta-panel">
                    <h3 class="subtitulo-panel">Tonalidad y Tipo</h3>
                    
                    <div class="grupo-formulario">
                        <label for="chord-key" class="etiqueta-formulario">Tonalidad Fundamental:</label>
                        <select id="chord-key" class="entrada-formulario">
                            <option value="0">C</option><option value="1">C#/Db</option><option value="2">D</option><option value="3">D#/Eb</option>
                            <option value="4">E</option><option value="5">F</option><option value="6">F#/Gb</option><option value="7">G</option>
                            <option value="8">G#/Ab</option><option value="9">A</option><option value="10">A#/Bb</option><option value="11">B</option>
                        </select>
                    </div>

                    <div class="grupo-formulario">
                        <label for="chord-type" class="etiqueta-formulario">Tipo de Acorde:</label>
                        <select id="chord-type" class="entrada-formulario">
                            <option value="major" data-formula="1 3 5">Mayor</option><option value="minor" data-formula="1 b3 5">Menor</option>
                            <option value="7" data-formula="1 3 5 b7">Séptima</option><option value="maj7" data-formula="1 3 5 7">Séptima Mayor</option>
                            <option value="m7" data-formula="1 b3 5 b7">Menor Séptima</option><option value="dim" data-formula="1 b3 b5">Disminuido</option>
                            <option value="aug" data-formula="1 3 #5">Aumentado</option><option value="sus2" data-formula="1 2 5">Sus2</option>
                            <option value="sus4" data-formula="1 4 5">Sus4</option>
                        </select>
                        <div id="chord-formula" class="generador-formula-texto">Fórmula: 1 3 5</div>
                    </div>

                    <div class="grupo-formulario">
                        <label for="chord-scale-type" class="etiqueta-formulario">Tipo de Escala:</label>
                        <select id="chord-scale-type" class="entrada-formulario">
                            <option value="major" data-formula="1 2 3 4 5 6 7">Mayor (Jónica)</option>
                            <option value="natural-minor" data-formula="1 2 b3 4 5 b6 b7">Menor Natural (Eólica)</option>
                            <option value="harmonic-minor" data-formula="1 2 b3 4 5 b6 7">Menor Armónica</option>
                            <option value="melodic-minor" data-formula="1 2 b3 4 5 6 7">Menor Melódica</option>
                            <option value="dorian" data-formula="1 2 b3 4 5 6 b7">Dórico</option>
                            <option value="phrygian" data-formula="1 b2 b3 4 5 b6 b7">Frigio</option>
                            <option value="lydian" data-formula="1 2 3 #4 5 6 7">Lidio</option>
                            <option value="mixolydian" data-formula="1 2 3 4 5 6 b7">Mixolidio</option>
                            <option value="locrian" data-formula="1 b2 b3 4 b5 b6 b7">Locrio</option>
                            <option value="pentatonic-major" data-formula="1 2 3 5 6">Pentatónica Mayor</option>
                            <option value="pentatonic-minor" data-formula="1 b3 4 5 b7">Pentatónica Menor</option>
                            <option value="blues" data-formula="1 b3 4 b5 5 b7">Blues</option>
                        </select>
                        <div id="chord-scale-formula" class="generador-formula-texto">Fórmula: 1 2 3 4 5 6 7</div>
                    </div>

                    <div class="acciones-formulario" style="margin-top: 1rem;">
                        <button id="chord-generate-chord" class="btn-primario">Generar Acorde</button>
                        <button id="chord-generate-scale" class="btn-secundario">Generar Escala</button>
                    </div>
                </article>
            </section>

            <footer class="pie-generador">
                <div class="grupo-formulario-horizontal">
                    <label for="chord-fret-count" class="etiqueta-formulario">Trastes Visibles:</label>
                    <input type="number" id="chord-fret-count" min="0" max="30" value="12" class="entrada-formulario input-pequeno">
                </div>
                <button id="chord-reset" class="btn-icono-accion"><i class="fa-solid fa-rotate-right"></i> Resetear Diapasón</button>
            </footer>

            <div class="chord-fretboard-container">
                <div id="chord-fretboard" class="chord-fretboard"></div>
            </div>
        </div>
    `;
    
    // FORZAR la inicialización de eventos cada vez que se renderiza el HTML
    setTimeout(() => {
        window.initializeChordEventListeners();
        window.resetChord(); // Inicia mostrando C Major por defecto
    }, 50);
};

// =================================================================
//  2. CONTROLES DE AFINACIÓN DINÁMICOS
// =================================================================
window.initializeChordTuningControls = function() {
    const tuningControls = document.getElementById('chord-tuning-controls');
    if(!tuningControls) return;
    tuningControls.innerHTML = '';
    
    for (let i = 0; i < window.chordState.tuning.length; i++) {
        const stringRow = document.createElement('div'); 
        stringRow.className = 'fila-cuerda';
        
        const stringLabel = document.createElement('div'); 
        stringLabel.className = 'etiqueta-cuerda'; 
        stringLabel.textContent = `${i + 1}`;
        
        const select = document.createElement('select'); 
        select.className = 'entrada-formulario select-afinacion chord-string-tuning'; 
        select.dataset.stringIndex = i;
        
        window.chordNotes.forEach((note, index) => {
            const option = document.createElement('option'); 
            option.value = index; 
            option.textContent = note;
            option.selected = index === window.chordState.tuning[i]; 
            select.appendChild(option);
        });
        
        const tuningAdjust = document.createElement('div'); 
        tuningAdjust.className = 'controles-afinacion-ajuste';
        
        const downBtn = document.createElement('button'); 
        downBtn.className = 'btn-secundario btn-ajuste-tono btn-tuning'; 
        downBtn.textContent = '-'; 
        downBtn.dataset.stringIndex = i; 
        downBtn.dataset.direction = 'down';
        
        const upBtn = document.createElement('button'); 
        upBtn.className = 'btn-secundario btn-ajuste-tono btn-tuning'; 
        upBtn.textContent = '+'; 
        upBtn.dataset.stringIndex = i; 
        upBtn.dataset.direction = 'up';
        
        tuningAdjust.appendChild(downBtn); 
        tuningAdjust.appendChild(upBtn);
        stringRow.appendChild(stringLabel); 
        stringRow.appendChild(select); 
        stringRow.appendChild(tuningAdjust);
        tuningControls.appendChild(stringRow);
    }
};

// =================================================================
//  3. EVENT LISTENERS
// =================================================================
window.initializeChordEventListeners = function() {
    const addStrBtn = document.getElementById('chord-add-string');
    if(addStrBtn) addStrBtn.addEventListener('click', () => { if(window.chordState.tuning.length < 12) { window.chordState.tuning.push(4); window.initializeChordTuningControls(); window.renderChordFretboard(); } });
    
    const remStrBtn = document.getElementById('chord-remove-string');
    if(remStrBtn) remStrBtn.addEventListener('click', () => { if(window.chordState.tuning.length > 4) { window.chordState.tuning.pop(); window.initializeChordTuningControls(); window.renderChordFretboard(); } });
    
    const tuningCtrl = document.getElementById('chord-tuning-controls');
    if(tuningCtrl) {
        tuningCtrl.addEventListener('change', function(e) { if(e.target.classList.contains('chord-string-tuning')) { window.chordState.tuning[parseInt(e.target.dataset.stringIndex)] = parseInt(e.target.value); window.renderChordFretboard(); } });
        tuningCtrl.addEventListener('click', function(e) {
            if(e.target.classList.contains('btn-tuning') && (e.target.dataset.direction === 'up' || e.target.dataset.direction === 'down')) {
                const idx = parseInt(e.target.dataset.stringIndex);
                if(e.target.dataset.direction === 'up') window.chordState.tuning[idx] = (window.chordState.tuning[idx] + 1) % 12;
                else window.chordState.tuning[idx] = (window.chordState.tuning[idx] - 1 + 12) % 12;
                document.querySelector(`.chord-string-tuning[data-string-index="${idx}"]`).value = window.chordState.tuning[idx];
                window.renderChordFretboard();
            }
        });
    }

    const instSel = document.getElementById('chord-instrument');
    if(instSel) instSel.addEventListener('change', function() { window.chordState.tuning = [...window.instrumentTunings[this.value]]; window.initializeChordTuningControls(); window.renderChordFretboard(); });
    
    const keySel = document.getElementById('chord-key');
    if(keySel) keySel.addEventListener('change', function() { window.chordState.key = parseInt(this.value); });
    
    const typeSel = document.getElementById('chord-type');
    if(typeSel) typeSel.addEventListener('change', function() { window.chordState.chordType = this.value; window.updateChordFormulas(); });
    
    const scaleSel = document.getElementById('chord-scale-type');
    if(scaleSel) scaleSel.addEventListener('change', function() { window.chordState.scaleType = this.value; window.updateChordFormulas(); });
    
    const genChordBtn = document.getElementById('chord-generate-chord');
    if(genChordBtn) genChordBtn.addEventListener('click', function() { window.chordState.isChord = true; window.generateChord(); });
    
    const genScaleBtn = document.getElementById('chord-generate-scale');
    if(genScaleBtn) genScaleBtn.addEventListener('click', function() { window.chordState.isChord = false; window.generateScale(); });
    
    const fretCount = document.getElementById('chord-fret-count');
    if(fretCount) fretCount.addEventListener('change', function() { window.chordState.fretCount = parseInt(this.value); window.renderChordFretboard(); });
    
    const resetBtn = document.getElementById('chord-reset');
    if(resetBtn) resetBtn.addEventListener('click', window.resetChord);
};

// =================================================================
//  4. LÓGICA Y CÁLCULOS MATEMÁTICOS
// =================================================================
window.updateChordFormulas = function() {
    const typeSel = document.getElementById('chord-type');
    const scaleSel = document.getElementById('chord-scale-type');
    if(typeSel && scaleSel) {
        const chordF = typeSel.selectedOptions[0].dataset.formula;
        const scaleF = scaleSel.selectedOptions[0].dataset.formula;
        document.getElementById('chord-formula').textContent = `Fórmula: ${chordF}`;
        document.getElementById('chord-scale-formula').textContent = `Fórmula: ${scaleF}`;
    }
};

window.generateChord = function() { const formula = window.chordFormulas[window.chordState.chordType]; window.chordState.currentNotes = formula.map(interval => (window.chordState.key + interval) % 12); window.renderChordFretboard(); };
window.generateScale = function() { const formula = window.scaleFormulas[window.chordState.scaleType]; window.chordState.currentNotes = formula.map(interval => (window.chordState.key + interval) % 12); window.renderChordFretboard(); };

window.resetChord = function() {
    window.chordState.tuning = [...window.instrumentTunings.guitar]; window.chordState.key = 0; window.chordState.chordType = 'major'; window.chordState.scaleType = 'major'; window.chordState.fretCount = 12; 
    
    const keyE = document.getElementById('chord-key'); if(keyE) keyE.value = 0; 
    const typeE = document.getElementById('chord-type'); if(typeE) typeE.value = 'major'; 
    const scaleE = document.getElementById('chord-scale-type'); if(scaleE) scaleE.value = 'major'; 
    const fretE = document.getElementById('chord-fret-count'); if(fretE) fretE.value = 12; 
    const instE = document.getElementById('chord-instrument'); if(instE) instE.value = 'guitar';
    
    window.initializeChordTuningControls(); 
    window.updateChordFormulas(); 
    window.generateChord(); // Muestra el acorde de C por defecto
};

// =================================================================
//  5. RENDERIZADO VISUAL DEL DIAPASÓN
// =================================================================
window.createChordFretMarkers = function() {
    const markers = {}; const standardMarkers = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]; const doubleMarkers = [12, 24];
    standardMarkers.forEach(fret => { if (fret <= window.chordState.fretCount) markers[fret] = { double: doubleMarkers.includes(fret) }; });
    return markers;
};

window.renderChordFretboard = function() {
    const fretboard = document.getElementById('chord-fretboard');
    if(!fretboard) return;
    fretboard.innerHTML = '';
    const fretMarkers = window.createChordFretMarkers();
    
    // Render cuerdas (strings)
    for (let i = 0; i < window.chordState.tuning.length; i++) {
        const stringElement = document.createElement('div');
        stringElement.className = 'chord-string';
        
        // Traste 0 (nota al aire / open fret)
        const openFret = document.createElement('div');
        openFret.className = 'chord-fret open-fret';
        
        const openNoteIndex = window.chordState.tuning[i];
        const isOpenNoteInCurrent = window.chordState.currentNotes.includes(openNoteIndex);
        const isOpenNoteRoot = window.chordState.currentNotes.length > 0 && openNoteIndex === window.chordState.currentNotes[0];
        
        if (isOpenNoteInCurrent) {
            const noteElement = document.createElement('div');
            noteElement.className = `chord-note ${isOpenNoteRoot ? 'chord-note-root' : ''}`;
            noteElement.textContent = window.chordNotes[openNoteIndex];
            openFret.appendChild(noteElement);
        }
        stringElement.appendChild(openFret);
        
        // Trastes 1 a N
        for (let fret = 1; fret <= window.chordState.fretCount; fret++) {
            const fretElement = document.createElement('div');
            fretElement.className = 'chord-fret';
            
            const noteIndex = (window.chordState.tuning[i] + fret) % 12;
            const isNoteInCurrent = window.chordState.currentNotes.includes(noteIndex);
            const isNoteRoot = window.chordState.currentNotes.length > 0 && noteIndex === window.chordState.currentNotes[0];
            
            if (isNoteInCurrent) {
                const noteElement = document.createElement('div');
                noteElement.className = `chord-note ${isNoteRoot ? 'chord-note-root' : ''}`;
                noteElement.textContent = window.chordNotes[noteIndex];
                fretElement.appendChild(noteElement);
            }
            stringElement.appendChild(fretElement);
        }
        fretboard.appendChild(stringElement);
    }
    
    // Fila de marcadores y números en la parte inferior del diapasón
    const fretNumberRow = document.createElement('div');
    fretNumberRow.className = 'chord-fret-number-row';
    
    const openFretNumber = document.createElement('div');
    openFretNumber.className = 'chord-fret-number open-fret-number';
    openFretNumber.textContent = '0';
    fretNumberRow.appendChild(openFretNumber);
    
    for (let fret = 1; fret <= window.chordState.fretCount; fret++) {
        const fretNumber = document.createElement('div');
        fretNumber.className = 'chord-fret-number';
        fretNumber.textContent = fret;
        
        if (fretMarkers[fret]) {
            const marker = document.createElement('div');
            marker.className = fretMarkers[fret].double ? 'chord-fret-marker-double' : 'chord-fret-marker';
            if (fretMarkers[fret].double) marker.innerHTML = '<span></span><span></span>';
            fretNumber.appendChild(marker);
        }
        
        fretNumberRow.appendChild(fretNumber);
    }
    fretboard.appendChild(fretNumberRow);
};