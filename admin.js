import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {

    getFirestore, collection, addDoc, query, orderBy, onSnapshot,

    deleteDoc, doc, getDocs, limit, getDoc, writeBatch, where, setDoc

} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";



// 1. CONFIGURACIÓN FIREBASE

const firebaseConfig = {

  apiKey: "AIzaSyB38Wbf0Q9YLz61vxQXVw1oSpMNyPVGy-c",

  authDomain: "programacion-cttc.firebaseapp.com",

  projectId: "programacion-cttc",

  storageBucket: "programacion-cttc.firebasestorage.app",

  messagingSenderId: "2776502914",

  appId: "1:2776502914:web:6389898d92d7c4b5ba1a9b"

};



const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);

const colRef = collection(db, "programaciones");



let selectedDocId = null;

let modulosTemporales = [];

window.editandoProgramaActivo = null;



const CAMPOS_SUMATORIA = ["Part_Programa", "Part_Curso", "Part_Beca", "Part_Pago_Programa", "Part_Pago_Curso"];

const FERIADOS_2026 = ["2026-01-01", "2026-04-02", "2026-04-03", "2026-05-01", "2026-06-07", "2026-06-29", "2026-07-23", "2026-07-28", "2026-07-29", "2026-08-06", "2026-08-30", "2026-10-08", "2026-11-01", "2026-12-08", "2026-12-09", "2026-12-25"];

const CAMPOS_CABECERA = ["Item", "EMPRESA", "Docente", "AÑO", "PROGRAMA", "EDICIÓN", "MODALIDAD PROGRAMA"];

const CAMPOS_GESTION = ["Modulo Orden","MODULO-CURSO", "MODALIDAD MÓDULO", "MAT-CUR", "NRC Semilla", "NRC", "Horario", "Duracion", "Fecha de inicio", "Fecha de fin", "Precio Sinfo", "#Participantes Objetivo", "#Participantes Real Total", "Part_Programa", "Part_Curso", "Part_Beca", "Part_Pago_Programa", "Part_Pago_Curso","#Participantes aprobados", "# participantes desertaron", "Software-Aplicativo", "OBS"];

const CAMPOS_CHECKBOX = ["curso virtualizado", "Con nota en SINFO?", "Con certificados emitidos?", "Con atributo?_SSADETL", "Con acta de notas_SFASLST", "Con VAEE (SENATI VIRTUAL)"];

const DOCENTES = ["ANDRES CCOCA", "CARMELON GONZALES", "JONATAN BEGAZO", "JORGE CAYCHO", "LUIS QUELOPANA", "MARCO POLO", "MARIA PEREZ", "MARTA LAURA", "MARTHA MAYTA", "NANCY PACHECO", "RICARDO MORENO", "ROBERT CALDERON", "VICTOR HUAMANÍ", "VICTOR GASTAÑETA"];

const PROGRAMAS_NOMBRES = ["CURSO", "PROGRAMA DE GESTIÓN PARA LA FORMACIÓN DE PATRONISTAS DIGITALES", "ASISTENTE EN DISEÑO DE MODAS", "PROGRAMA DE GESTIÓN PARA FORMACIÓN DE AUDITORES DE CALIDAD TEXTIL Y CONFECCIÓN", "PROGRAMA DE ESPECIALIZACIÓN EN PATRONAJE DIGITAL Y ANIMACIÓN 3D", "TRAZABILIDAD Y GESTIÓN DE MERMAS EN LA INDUSTRIA TEXTIL", "GESTIÓN DE ALMACENES E INVENTARIOS PARA EMPRESAS EXPORTADORAS E IMPORTADORAS"];

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];





// 2. INICIO Y SEGURIDAD

onAuthStateChanged(auth, (user) => {

    if (!user) window.location.href = "login.html";

    else {

        document.getElementById('adminUser').textContent = user.email;

        initForm();

        loadAdminTable();

    }

});



// 3. GENERACIÓN DINÁMICA

async function initForm() {

    const grid = document.getElementById('fieldsGrid');

    if(!grid) return;

    let nextItem = 1;

    const qItem = query(colRef, orderBy("Item", "desc"), limit(1));

    const querySnapshot = await getDocs(qItem);

    if (!querySnapshot.empty) nextItem = (parseInt(querySnapshot.docs[0].data().Item) || 0) + 1;



    let html = CAMPOS_CABECERA.map(c => renderInput(c, nextItem)).join('');

    html += `<div class="field-group" id="group_CODIGO_PROGRAMA" style="display:none; grid-column: 1 / -1; background:#fefce8; padding:10px; border-radius:8px; border:1px solid #fef08a;">

                <label>CÓDIGO-PROGRAMA</label><input type="text" id="f_CODIGO_PROGRAMA" placeholder="ID de Programa...">

             </div>`;

    html += `<div id="camposGestion" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; grid-column: 1 / -1; margin-top:20px;">

                ${CAMPOS_GESTION.map(c => renderInput(c, nextItem)).join('')}

             </div>`;

    html += `<div class="checklist-container" style="grid-column: 1 / -1; margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">

                <h3 style="font-size: 13px; color: #64748b; margin-bottom: 10px;">INDICADORES DE CONTROL (SI/NO)</h3>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;">

                    ${CAMPOS_CHECKBOX.map(c => `<label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;"><input type="checkbox" id="f_${c.replace(/ /g, "_")}"> ${c}</label>`).join('')}

                </div>

            </div>`;

    html += `<div id="seccionMultiModulos" style="display:none; grid-column: 1 / -1; margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 20px;">

                <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; text-align:right;">

                    <button type="button" id="btnSubirModulo" class="btn-save" style="background: #059669;">+ AGREGAR AL PROGRAMA</button>

                </div>

                <div id="listaModulosAgregados" style="margin-top: 20px;"></div>

             </div>`;

    grid.innerHTML = html;

    configurarEventos();

}



function renderInput(campo, nextItem) {

    const id = `f_${campo.replace(/ /g, "_")}`;

    let input = '';

    if (campo === "Item") input = `<input type="number" id="${id}" value="${nextItem}" readonly style="background:#e5e7eb;">`;

    else if (campo === "AÑO") input = `<input type="number" id="${id}" value="2026">`;



    else if (campo === "Docente") {

        input = `

            <div class="multi-docente-container">

                <select id="${id}" multiple style="height: 100px; padding: 5px;">

                    ${DOCENTES.map(d => `<option value="${d}">${d}</option>`).join('')}

                </select>

                <small style="color: #64748b; font-size: 10px;">Mantenga presionado Ctrl (o Cmd) para seleccionar varios.</small>

            </div>`;

    }



    else if (campo === "PROGRAMA") {input = `

        <input type="text" id="${id}" list="list_programas" placeholder="Nombre del programa..." class="search-input">

        <datalist id="list_programas">

            ${PROGRAMAS_NOMBRES.map(p => `<option value="${p}">`).join('')}

        </datalist>`;

    }

    else if (campo.includes("MODALIDAD")) input = `<select id="${id}"><option value="Online">Online</option><option value="Presencial">Presencial</option><option value="Semipresencial">Semipresencial</option></select>`;

    else if (campo === "Horario") input = `<div id="horarioContainer" style="grid-column: 1 / -1;"></div><input type="hidden" id="${id}">`;

    else if (campo === "EDICIÓN") input = `<input type="number" id="${id}" value="1">`;

    else {

        let type = campo.includes("Fecha") ? "date" : campo.includes("#") || campo.includes("Precio") ? "number" : "text";

        input = `<input type="${type}" id="${id}" placeholder="${campo}...">`;

    }

    return `<div class="field-group" id="group_${campo.replace(/ /g, "_")}"><label>${campo}</label>${input}</div>`;

}



// 4. LÓGICA DE TIEMPOS (SIN LAGEO)

function updateHorarioUI(modalidad) {

    const container = document.getElementById('horarioContainer');

    if (!container) return;

    let b1 = modalidad === "Semipresencial" ? "ONLINE" : modalidad.toUpperCase();

    let b2 = modalidad === "Semipresencial" ? "PRESENCIAL" : modalidad.toUpperCase();

    container.innerHTML = `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">${renderBloque(b1, "f0fdf4", "22c55e")}${renderBloque(b2, "f0f9ff", "0ea5e9")}</div>`;

}



function renderBloque(tipo, bgColor, borderColor) {

    return `<div class="horario-bloque" style="padding:12px; background:#${bgColor}; border-left: 5px solid #${borderColor}; border-radius:4px; margin-bottom:10px;">

                <p style="font-weight:bold; font-size:11px; margin-bottom:8px;">BLOQUE: ${tipo}</p>

                <div style="display:flex; gap:6px; margin-bottom:10px;">

                    ${DIAS.map(d => `<button type="button" class="btn-dia" onclick="this.classList.toggle('active')">${d}</button>`).join('')}

                </div>

                <div style="font-size:12px;">De: <input type="time" class="t-ini"> A: <input type="time" class="t-fin"></div>

            </div>`;

}



function calcularFechaFin() {

    const inicio = document.getElementById('f_Fecha_de_inicio')?.value;

    const duracion = parseInt(document.getElementById('f_Duracion')?.value);

   

    // VALIDACIÓN PREVIA PARA EVITAR BUCLE INFINITO

    const diasActivos = Array.from(document.querySelectorAll('.btn-dia.active'));

    if (!inicio || isNaN(duracion) || duracion <= 0 || diasActivos.length === 0) return;



    let horasAcumuladas = 0;

    let fechaActual = new Date(inicio + "T00:00:00");

    const diasClase = {};



    document.querySelectorAll('.horario-bloque').forEach(bloque => {

        const dBloque = Array.from(bloque.querySelectorAll('.btn-dia.active')).map(b => b.textContent);

        const t1 = bloque.querySelector('.t-ini').value;

        const t2 = bloque.querySelector('.t-fin').value;

        if (dBloque.length > 0 && t1 && t2) {

            const h = (new Date(`2026-01-01T${t2}`) - new Date(`2026-01-01T${t1}`)) / 3600000;

            if (h > 0) dBloque.forEach(d => diasClase[d] = h);

        }

    });



    const mapa = { "Dom":0, "Lun":1, "Mar":2, "Mié":3, "Jue":4, "Vie":5, "Sáb":6 };

    const activos = Object.keys(diasClase).map(d => mapa[d]);

    if (activos.length === 0) return;



    let limiteSeguridad = 0;

    while (horasAcumuladas < duracion && limiteSeguridad < 2000) {

        const iso = fechaActual.toISOString().split('T')[0];

        if (activos.includes(fechaActual.getDay()) && !FERIADOS_2026.includes(iso)) {

            const nom = Object.keys(mapa).find(k => mapa[k] === fechaActual.getDay());

            horasAcumuladas += diasClase[nom];

        }

        if (horasAcumuladas < duracion) fechaActual.setDate(fechaActual.getDate() + 1);

        limiteSeguridad++;

    }

   

    const inputFin = document.getElementById('f_Fecha_de_fin');

    if (inputFin) inputFin.value = fechaActual.toISOString().split('T')[0];

}



// 5. EVENTOS

function configurarEventos() {

    const regType = document.getElementById('regType');

    if (regType) {

        regType.addEventListener('change', (e) => {

            const esProg = e.target.value === "PROGRAMA";

            document.getElementById('seccionMultiModulos').style.display = esProg ? 'block' : 'none';

            document.getElementById('group_CODIGO_PROGRAMA').style.display = (esProg || selectedDocId) ? 'block' : 'none';

        });

    }



    const modMod = document.getElementById('f_MODALIDAD_MÓDULO');

    if (modMod) {

        modMod.addEventListener('change', (e) => updateHorarioUI(e.target.value));

        updateHorarioUI(modMod.value || "Online");

    }



    document.getElementById('f_Fecha_de_inicio')?.addEventListener('change', calcularFechaFin);

    document.getElementById('f_Duracion')?.addEventListener('change', calcularFechaFin);

    document.addEventListener('click', (e) => {

        if(e.target.classList.contains('btn-dia')) setTimeout(calcularFechaFin, 100);

    });



    // --- INTERCAMBIO DE FECHAS POR NÚMERO DE MÓDULO ---

    document.getElementById('f_Modulo_Orden')?.addEventListener('change', (e) => {

        const nuevoOrden = parseInt(e.target.value);

        // Busca si el número ya existe en los módulos que estás agregando actualmente

        const existente = modulosTemporales.find(m => parseInt(m["Modulo Orden"]) === nuevoOrden);

       

        if (existente) {

            document.getElementById('f_Fecha_de_inicio').value = existente["Fecha de inicio"];

            calcularFechaFin();

            alert(`Sincronizado: Se ha tomado la fecha de inicio del Módulo ${nuevoOrden}`);

        }

    });



    // --- SUMA AUTOMÁTICA DE PARTICIPANTES ---

    const totalInput = document.getElementById('f_#Participantes_Real_Total');

    if (totalInput) totalInput.readOnly = true;



    CAMPOS_SUMATORIA.forEach(campo => {

        const input = document.getElementById(`f_${campo}`);

        input?.addEventListener('input', () => {

            let suma = 0;

            CAMPOS_SUMATORIA.forEach(c => {

                suma += parseInt(document.getElementById(`f_${c}`)?.value || 0);

            });

            if (totalInput) totalInput.value = suma;

        });

    });

   

    const btnSubirModulo = document.getElementById('btnSubirModulo');

    if (btnSubirModulo) {

        // Sugerir número de módulo automático al preparar la subida

        const inputOrden = document.getElementById('f_Modulo_Orden');

        if (inputOrden) inputOrden.value = modulosTemporales.length + 1;



        btnSubirModulo.onclick = (e) => {

            e.preventDefault();

            const data = recolectarDatosGestion();

            if(!data.NRC || !data["MODULO-CURSO"]) return alert("⚠️ Complete NRC y Nombre del Módulo");



            modulosTemporales.push(data);

            actualizarListaVisual();

            vaciarCamposModuloControlado(data["Fecha de fin"]);

           

            const item = document.getElementById('f_Item');

            if(item) item.value = parseInt(item.value) + 1;



            // Actualizar el sugerido para el siguiente módulo

            if (inputOrden) inputOrden.value = modulosTemporales.length + 1;

        };

    }

}



function recolectarDatosGestion() {

    const data = {};

    let horarioStr = "";

   

    // 1. Recolección de Horario (Bloques) - Solo recopilar bloques que tengan días activos

    document.querySelectorAll('.horario-bloque').forEach(b => {

        const dias = Array.from(b.querySelectorAll('.btn-dia.active')).map(btn => btn.textContent);

        const tipoBloque = b.querySelector('p').textContent; // Ej: "BLOQUE: ONLINE"

        const horaIni = b.querySelector('.t-ini').value;

        const horaFin = b.querySelector('.t-fin').value;

        

        // Solo agregar si hay días Y horas definidas

        if (dias.length > 0 && horaIni && horaFin) {

            horarioStr += `${tipoBloque}: ${dias.join('-')} (${horaIni} a ${horaFin}) | `;

        }

    });

    

    // Limpiar trailing " | " si existe

    horarioStr = horarioStr.replace(/ \| $/, '');



    // 2. Recolección de Campos de Gestión

    CAMPOS_GESTION.forEach(c => {

        const id = `f_${c.replace(/ /g, "_")}`;

        const el = document.getElementById(id);

        if (c === "Horario") data[c] = horarioStr;

        else if (el) data[c] = el.value;

    });



    // 3. Manejo especial de Docente (Múltiples valores)

    const elDocente = document.getElementById('f_Docente');

    if (elDocente && elDocente.multiple) {

        const seleccionados = Array.from(elDocente.selectedOptions).map(opt => opt.value).filter(v => v !== "");

        data["Docente"] = seleccionados.join(", "); // Guarda como "DOCENTE A, DOCENTE B"

    }



    // 4. Recolección de Checkboxes (SI/NO)

    CAMPOS_CHECKBOX.forEach(c => {

        const el = document.getElementById(`f_${c.replace(/ /g, "_")}`);

        if (el) data[c] = el.checked ? "SI" : "NO";

    });



    return data;

}



// 6. APOYO EDICIÓN Y LIMPIEZA

window.prepareEditPrograma = async (nombrePrograma) => {

    if(!nombrePrograma) {
        alert("Error: No se especificó el nombre del programa.");
        return;
    }

    try {

        modulosTemporales = [];

        selectedDocId = null;

        console.log(`[EDIT] Buscando programa: "${nombrePrograma}"`);

        const qCabecera = query(colRef, where("PROGRAMA", "==", nombrePrograma), limit(1));

        const snapCabecera = await getDocs(qCabecera);

        console.log(`[EDIT] Resultados cabecera: ${snapCabecera.size}`);

       

        if (!snapCabecera.empty) {

            const data = snapCabecera.docs[0].data();

            document.getElementById('regType').value = "PROGRAMA";

            document.getElementById('regType').dispatchEvent(new Event('change'));

           

            CAMPOS_CABECERA.forEach(c => {

                const el = document.getElementById(`f_${c.replace(/ /g, "_")}`);

                if (el) el.value = data[c] || "";

            });
            
            const elCod = document.getElementById('f_CODIGO_PROGRAMA');
            if (elCod) {
                elCod.value = data["CODIGO-PROGRAMA"] || data["f_CODIGO_PROGRAMA"] || "";
                document.getElementById('group_CODIGO_PROGRAMA').style.display = 'block';
            }



            // Cargar módulos

            const qModulos = query(colRef, where("PROGRAMA", "==", nombrePrograma), where("TIPO", "==", "MÓDULO"));

            const snapModulos = await getDocs(qModulos);

            console.log(`[EDIT] Módulos encontrados: ${snapModulos.size}`);

           

            let tempArray = [];

            snapModulos.forEach(docModulo => {

                tempArray.push({ id: docModulo.id, ...docModulo.data() });

            });



            modulosTemporales = tempArray.sort((a, b) => (parseInt(a["Modulo Orden"]) || 0) - (parseInt(b["Modulo Orden"]) || 0));



            // NUEVA: Sincronizar fechas de módulos que estén vacías

            sincronizarFechasModulos();



            actualizarListaVisual();

            window.editandoProgramaActivo = nombrePrograma;

            document.getElementById('btnSubmitMain').textContent = "ACTUALIZAR PROGRAMA COMPLETO";

           

            // NUEVA: Agregar evento listener a la fecha de inicio para actualizar cascada

            const inputFechaInicio = document.getElementById('f_Fecha_de_inicio');

            if (inputFechaInicio) {

                inputFechaInicio.addEventListener('change', () => {

                    recalcularFechasModulosCascada();

                });

            }

           

            console.log(`[EDIT] ✅ Programa cargado exitosamente. Módulos temporales: ${modulosTemporales.length}`);

            // Abrir la sección de configuración si está cerrada
            const configContainer = document.getElementById('configSection');
            if (configContainer) {
                const configHeader = configContainer.querySelector('.section-header-collapsible');
                const contentSection = configHeader.nextElementSibling;
                if (contentSection && contentSection.style.display === 'none') {
                    configHeader.click(); // Simular click para abrir
                }
            }

            // Scroll hacia arriba después de que el DOM esté completamente actualizado
            setTimeout(() => {
                const formElement = document.getElementById('adminForm');
                if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 100);

        } else {

            alert(`⚠️ No se encontró el programa "${nombrePrograma}". Verifica que exista.`);

            console.log(`[EDIT] Error: Programa no encontrado. Buscó: "${nombrePrograma}"`);

        }

    } catch (error) {

        console.error("Error al recuperar:", error);

        alert("Error al cargar componentes: " + error.message);

    }

};

function vaciarCamposModuloControlado(fechaFinRef) {

    const nom = document.getElementById('f_MODULO-CURSO');

    if (nom) nom.value = "";

    if (fechaFinRef) {

        let fBase = new Date(fechaFinRef + "T00:00:00");

        fBase.setDate(fBase.getDate() + 7);

        const inputIni = document.getElementById('f_Fecha_de_inicio');

        if (inputIni) { inputIni.value = fBase.toISOString().split('T')[0]; calcularFechaFin(); }

    }

    const nrc = document.getElementById('f_NRC');

    if (nrc) { nrc.value = ""; nrc.focus(); }

}



function actualizarListaVisual() {

    const container = document.getElementById('listaModulosAgregados');

    container.innerHTML = modulosTemporales.map((mod, i) => `<div style="background:#fff; padding:10px; border:1px solid #ddd; border-radius:8px; margin-bottom:5px; display:flex; justify-content:space-between;"><div><strong>${mod["MODULO-CURSO"]}</strong> (NRC: ${mod.NRC})</div><button type="button" onclick="eliminarMod(${i})" style="color:red; border:none; background:none; cursor:pointer;">🗑️</button></div>`).join('');

}

window.eliminarMod = (i) => { modulosTemporales.splice(i, 1); actualizarListaVisual(); };



// 7. GUARDADO Y EXCEL
/* ==========================================================
   OPTIMIZACIÓN INTEGRAL - ADMIN.JS
   ========================================================== */
document.getElementById('adminForm').onsubmit = async (e) => {

    e.preventDefault();

    const btnSubmit = document.getElementById('btnSubmitMain');

    const tipo = document.getElementById('regType').value;
    // 1. Bloqueo de seguridad y feedback visual
    btnSubmit.disabled = true;
    const originalText = btnSubmit.textContent;

    btnSubmit.textContent = "Procesando...";
    try {

        // --- SECCIÓN 1: LÓGICA DE REPROGRAMACIÓN EN CASCADA ---

        let diffDiasUtiles = 0;

        let programaParaCascada = null;

        let ordenActual = 0;



        if (selectedDocId && !window.editandoProgramaActivo) {

            const snapAnterior = await getDoc(doc(db, "programaciones", selectedDocId));

            if (snapAnterior.exists()) {

                const dataAnt = snapAnterior.data();

                const fechaNueva = document.getElementById('f_Fecha_de_inicio').value;

                const fechaVieja = dataAnt["Fecha de inicio"];



                if (fechaNueva !== fechaVieja && dataAnt.TIPO === "MÓDULO") {

                    const d1 = new Date(fechaVieja + "T00:00:00");

                    const d2 = new Date(fechaNueva + "T00:00:00");

                    diffDiasUtiles = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));

                    programaParaCascada = dataAnt.PROGRAMA;

                    ordenActual = parseInt(dataAnt["Modulo Orden"]) || 0;

                }

            }

        }



        // --- SECCIÓN 2: RECOLECCIÓN DE DATOS DE CABECERA ---

        const nCabecera = {};

        CAMPOS_CABECERA.forEach(c => {

            const el = document.getElementById(`f_${c.replace(/ /g, "_")}`);

            if (el) nCabecera[c] = el.value;

        });
        
        const elCod = document.getElementById('f_CODIGO_PROGRAMA');
        if (elCod) nCabecera["CODIGO-PROGRAMA"] = elCod.value;



        // Fundamental para gestionar el cambio de nombre en CLONES

        const nuevoNombrePrograma = document.getElementById('f_PROGRAMA').value.trim();

        const gestionData = recolectarDatosGestion();



        // --- SECCIÓN 3: EDICIÓN DE PROGRAMA COMPLETO (INCLUYE CLONES) ---

        if (window.editandoProgramaActivo) {

            if (modulosTemporales.length === 0) throw new Error("No hay módulos cargados para actualizar.");



            const batch = writeBatch(db);

           

            for (const m of modulosTemporales) {

                // Limpieza de ID para evitar error "No document to update"

                const { id: docId, ...datosM } = m;



                const dataFinal = {

                    ...nCabecera,

                    ...datosM,

                    PROGRAMA: nuevoNombrePrograma, // Propaga el nuevo nombre (sin COPIA)

                    timestamp: new Date()

                };



                if (docId) {

                    const docRef = doc(db, "programaciones", docId);

                    batch.set(docRef, dataFinal, { merge: true });

                } else {

                    const newRef = doc(collection(db, "programaciones"));

                    batch.set(newRef, { ...dataFinal, TIPO: "MÓDULO" });

                }

            }

           

            await batch.commit();

            alert(`✅ Programa "${nuevoNombrePrograma}" actualizado con éxito.`);

            window.editandoProgramaActivo = null;

            location.reload();

            return;

        }



        // --- SECCIÓN 4: NUEVA PUBLICACIÓN O EDICIÓN INDIVIDUAL ---

        if (tipo === "PROGRAMA") {

            if (modulosTemporales.length === 0) throw new Error("Agregue módulos primero.");

            const batch = writeBatch(db);

            modulosTemporales.forEach(m => {

                const { id: _, ...datosPuros } = m;

                const newRef = doc(collection(db, "programaciones"));

                batch.set(newRef, { ...nCabecera, ...datosPuros, TIPO: "MÓDULO", timestamp: new Date() });

            });

            await batch.commit();

            alert("✅ Programa publicado.");

        }

        else if (selectedDocId) {

            if (programaParaCascada && diffDiasUtiles !== 0) {

                await ejecutarCascadaProgramas(programaParaCascada, ordenActual, diffDiasUtiles);

            }

            await setDoc(doc(db, "programaciones", selectedDocId), {

                ...nCabecera, ...gestionData, timestamp: new Date()

            }, { merge: true });

            alert("✅ Registro actualizado.");

        }

        else {

            await addDoc(colRef, { ...nCabecera, ...gestionData, TIPO: "CURSO", timestamp: new Date() });

            alert("✅ Registro creado.");

        }



        location.reload();



    } catch (err) {

        console.error("Error detallado:", err);

        alert("❌ Error: " + err.message);

        btnSubmit.disabled = false;

        btnSubmit.textContent = originalText;

    }

};



// Nueva función para sincronizar fechas de módulos basándose en el primero

function sincronizarFechasModulos() {

    if (modulosTemporales.length === 0) return;

   

    // Ordenar módulos por "Modulo Orden" para procesar en el orden correcto

    const modulosOrdenados = [...modulosTemporales].sort((a, b) =>

        (parseInt(a["Modulo Orden"]) || 0) - (parseInt(b["Modulo Orden"]) || 0)

    );

   

    // Obtener horario y modalidad del módulo 1 para copiar a los demás

    const moduloPrimero = modulosOrdenados[0];

    const horarioPrimero = moduloPrimero ? moduloPrimero.Horario : null;

    const modalidadPrimera = moduloPrimero ? moduloPrimero["MODALIDAD MÓDULO"] : null;

   

    // Procesar cada módulo en orden

    modulosOrdenados.forEach((m, idx) => {

        // Copiar horario y modalidad del módulo 1 a todos los demás

        if (idx > 0) {

            if (horarioPrimero) m.Horario = horarioPrimero;

            if (modalidadPrimera) m["MODALIDAD MÓDULO"] = modalidadPrimera;

        }

        

        // Calcular fecha de fin para el módulo actual basándose en su fecha de inicio

        if (m["Fecha de inicio"] && m["Fecha de inicio"].trim() !== "") {

            m["Fecha de fin"] = calcularFechaFinModulo(m);

        }

       

        // Si no es el último módulo (por orden), calcular fecha de inicio del siguiente

        if (idx < modulosOrdenados.length - 1) {

            const modSiguiente = modulosOrdenados[idx + 1];

           

            // Si el siguiente módulo no tiene fecha de inicio, calcularla

            if (!modSiguiente["Fecha de inicio"] || modSiguiente["Fecha de inicio"].trim() === "") {

                if (m["Fecha de fin"]) {

                    // Comenzar 7 días después del fin del módulo actual

                    let fechaInicio = new Date(m["Fecha de fin"] + "T00:00:00");

                    fechaInicio.setDate(fechaInicio.getDate() + 7);

                   

                    // Solo saltar feriados, NO domingos

                    while (FERIADOS_2026.includes(fechaInicio.toISOString().split('T')[0])) {

                        fechaInicio.setDate(fechaInicio.getDate() + 1);

                    }

                   

                    modSiguiente["Fecha de inicio"] = fechaInicio.toISOString().split('T')[0];

                }

            }

        }

    });

   

    actualizarListaVisual();

}



// Nueva función para recalcular fechas en cascada cuando se edita el Módulo 1

function recalcularFechasModulosCascada() {

    if (modulosTemporales.length === 0) return;

   

    // Obtener la nueva fecha de inicio desde el formulario

    const nuevaFechaInicio = document.getElementById('f_Fecha_de_inicio')?.value;

   

    if (!nuevaFechaInicio || nuevaFechaInicio.trim() === "") return;

   

    // Ordenar módulos por "Modulo Orden" para procesar en el orden correcto

    const modulosOrdenados = [...modulosTemporales].sort((a, b) =>

        (parseInt(a["Modulo Orden"]) || 0) - (parseInt(b["Modulo Orden"]) || 0)

    );

   

    // Actualizar la fecha del primer módulo (Modulo Orden = 1)

    const modPrimero = modulosOrdenados[0];

    if (modPrimero) {

        modPrimero["Fecha de inicio"] = nuevaFechaInicio;

    }

   

    // Recalcular fechas de fin e inicio de todos los módulos en orden

    modulosOrdenados.forEach((m, idx) => {

        // Calcular fecha de fin para el módulo actual

        m["Fecha de fin"] = calcularFechaFinModulo(m);

       

        // Calcular fecha de inicio del siguiente módulo (según Modulo Orden)

        if (idx < modulosOrdenados.length - 1) {

            const modSiguiente = modulosOrdenados[idx + 1];

           

            // Comenzar 7 días después del fin del módulo actual

            let fechaInicio = new Date(m["Fecha de fin"] + "T00:00:00");

            fechaInicio.setDate(fechaInicio.getDate() + 7);

           

            // Solo saltar feriados

            while (FERIADOS_2026.includes(fechaInicio.toISOString().split('T')[0])) {

                fechaInicio.setDate(fechaInicio.getDate() + 1);

            }

           

            modSiguiente["Fecha de inicio"] = fechaInicio.toISOString().split('T')[0];

        }

    });

   

    actualizarListaVisual();

}



// Función para actualizar fechas de módulos desde la tabla editable

async function actualizarFechasModuloDesdeTabla(moduloId, nuevaFechaInicio, nombrePrograma) {
    try {
        // 1. Obtener el snapshot actual del módulo para tener la duración y horario
        const docRef = doc(db, "programaciones", moduloId);
        const snap = await getDoc(docRef);
        
        if (!snap.exists()) return;
        const data = snap.data();
        
        // 2. Actualizar la fecha de inicio en el objeto local para el cálculo
        data["Fecha de inicio"] = nuevaFechaInicio;
        
        // 3. RECALCULAR la fecha de fin con la lógica existente
        const nuevaFechaFin = calcularFechaFinModulo(data);

        // 4. Guardar AMBAS fechas en Firebase
        await setDoc(docRef, {
            "Fecha de inicio": nuevaFechaInicio,
            "Fecha de fin": nuevaFechaFin
        }, { merge: true });
        
        // 5. Actualizar la UI (el input de fecha fin en la tabla)
        const inputFin = document.querySelector(`input[data-modulo-id="${moduloId}"].fecha-modulo-fin`);
        if (inputFin) inputFin.value = nuevaFechaFin;

        // Lógica de cascada si aplica...
        if (window.editandoProgramaActivo === nombrePrograma) {
            // ... (tu lógica de modulosTemporales)
        }
    } catch (err) {
        console.error("Error:", err);
    }
}



// Función para recalcular fechas cuando se edita desde la tabla

async function recalcularFechasModulosCascadaDesdeTabla(nombrePrograma) {

    if (modulosTemporales.length === 0) return;

   

    // Ordenar módulos por "Modulo Orden"

    const modulosOrdenados = [...modulosTemporales].sort((a, b) =>

        (parseInt(a["Modulo Orden"]) || 0) - (parseInt(b["Modulo Orden"]) || 0)

    );

   

    // Recalcular fechas de fin e inicio de todos los módulos en orden

    for (const m of modulosOrdenados) {

        if (!m["Fecha de inicio"] || m["Fecha de inicio"].trim() === "") continue;

       

        // Calcular fecha de fin para el módulo actual

        m["Fecha de fin"] = calcularFechaFinModulo(m);

       

        // Actualizar en Firebase

        await setDoc(doc(db, "programaciones", m.id), {

            "Fecha de fin": m["Fecha de fin"]

        }, { merge: true });

       

        // Encontrar el índice del módulo siguiente

        const idx = modulosOrdenados.indexOf(m);

        if (idx !== -1 && idx < modulosOrdenados.length - 1) {

            const modSiguiente = modulosOrdenados[idx + 1];

           

            // Comenzar 7 días después del fin del módulo actual

            let fechaInicio = new Date(m["Fecha de fin"] + "T00:00:00");

            fechaInicio.setDate(fechaInicio.getDate() + 7);

           

            // Solo saltar feriados

            while (FERIADOS_2026.includes(fechaInicio.toISOString().split('T')[0])) {

                fechaInicio.setDate(fechaInicio.getDate() + 1);

            }

           

            modSiguiente["Fecha de inicio"] = fechaInicio.toISOString().split('T')[0];

           

            // Actualizar en Firebase

            await setDoc(doc(db, "programaciones", modSiguiente.id), {

                "Fecha de inicio": modSiguiente["Fecha de inicio"]

            }, { merge: true });

        }

    }

}



// Nueva función para actualizar horario y modalidad en cascada desde un módulo

window.actualizarHorarioCascada = async (moduloId, nombrePrograma) => {

    if (!confirm(`¿Actualizar horario, frecuencia (días) y modalidad en cascada desde este módulo?\n\nEsto copiará el horario completo (días, horas) y modalidad de este módulo a todos los siguientes.`)) return;

    try {

        // Obtener el módulo actual

        const snap = await getDoc(doc(db, "programaciones", moduloId));

        if (!snap.exists()) {

            alert("Error: No se encontró el módulo.");

            return;

        }

        const moduloActual = snap.data();

        const ordenActual = parseInt(moduloActual["Modulo Orden"]) || 0;

        const horarioActual = moduloActual.Horario; // Contiene bloques con días, horas y modalidad

        const modalidadActual = moduloActual["MODALIDAD MÓDULO"];

        

        if (!horarioActual || !modalidadActual) {

            alert("⚠️ El módulo debe tener horario (con días y horas) y modalidad definidos.");

            return;

        }

        

        console.log(`[HORARIO] Copiando horario y frecuencia desde módulo ${ordenActual}:`, horarioActual);

        

        // Obtener todos los módulos del programa

        const q = query(colRef, where("PROGRAMA", "==", nombrePrograma), where("TIPO", "==", "MÓDULO"));

        const snapModulos = await getDocs(q);

        const modulos = [];

        snapModulos.forEach(doc => {

            modulos.push({ id: doc.id, ...doc.data() });

        });

        

        // Ordenar por "Modulo Orden"

        const modulosOrdenados = modulos.sort((a, b) =>

            (parseInt(a["Modulo Orden"]) || 0) - (parseInt(b["Modulo Orden"]) || 0)

        );

        

        // Actualizar horario, días (frecuencia) y modalidad de módulos desde el actual en adelante

        const batch = writeBatch(db);

        

        for (let i = 0; i < modulosOrdenados.length; i++) {

            const mod = modulosOrdenados[i];

            const orden = parseInt(mod["Modulo Orden"]) || 0;

            

            // Solo procesar módulos desde el actual hacia adelante

            if (orden < ordenActual) continue;

            

            // Actualizar módulo con el horario completo (con días/frecuencia) y modalidad

            batch.set(doc(db, "programaciones", mod.id), {

                "Horario": horarioActual,

                "MODALIDAD MÓDULO": modalidadActual,

                timestamp: new Date()

            }, { merge: true });

            

            console.log(`[HORARIO] Actualizando módulo ${orden}: ${mod["MODULO-CURSO"]}`);

        }

        

        await batch.commit();

        alert("✅ Horario, frecuencia (días) y modalidad actualizados en cascada correctamente.");

        loadAdminTable();

    } catch (err) {

        console.error("Error al actualizar horario:", err);

        alert("❌ Error: " + err.message);

    }

};



// ============ FUNCIÓN AUXILIAR PARA CALCULAR FECHA DE FIN ============
function calcularFechaFinModulo(modulo) {
    const duracion = parseInt(modulo["Duracion"]) || 0;
    const diasHoras = calcularHorasPorDia(modulo); // { "Lun": 2, "Mié": 3, ... }
    const diasAbreviados = Object.keys(diasHoras); // ["Lun", "Mié", ...]

    if (!modulo["Fecha de inicio"] || !modulo["Fecha de inicio"].trim() || diasAbreviados.length === 0) {
        return modulo["Fecha de fin"] || ""; // Retornar la actual si no hay datos
    }

    let fechaFin = new Date(modulo["Fecha de inicio"] + "T00:00:00");
    let horasAcumuladas = 0;
    let safety = 0;
    const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    while (horasAcumuladas < duracion && safety < 500) {
        const iso = fechaFin.toISOString().split('T')[0];
        const diaNumero = fechaFin.getDay();
        const diaAbrev = diasSemana[diaNumero];

        // Solo sumar horas si NO es feriado Y el módulo tiene clase ese día
        if (!FERIADOS_2026.includes(iso) && diasAbreviados.includes(diaAbrev)) {
            const horasDelDia = diasHoras[diaAbrev];
            horasAcumuladas += horasDelDia;
        }

        if (horasAcumuladas < duracion) fechaFin.setDate(fechaFin.getDate() + 1);
        safety++;
    }

    return fechaFin.toISOString().split('T')[0];
}

// Función auxiliar para calcular horas por día de un módulo

// Devuelve un mapa de {día: horas} basado en el horario
// Ej: { "Lun": 2, "Mié": 3, "Vie": 3 }
function calcularHorasPorDia(modulo) {
    const horarioStr = modulo.Horario || "";
    if (!horarioStr) return {};

    const diasHoras = {}; // { "Lun": 2, "Mié": 3, ... }
    const bloques = horarioStr.split(' | ').filter(b => b.trim());

    console.log(`[CALC HORAS] Horario: "${horarioStr}"`);
    console.log(`[CALC HORAS] Bloques encontrados: ${bloques.length}`);

    bloques.forEach((bloqueTexto, idx) => {
        if (!bloqueTexto.trim()) return;
        
        // Parse: "BLOQUE: ONLINE: Lun-Mar (08:00 a 10:00)"
        const match = bloqueTexto.match(/BLOQUE: (.*?): (.*?) \((.*?) a (.*?)\)/);
        if (!match) return;

        const [_, tipo, diasStr, horaIni, horaFin] = match;
        const dias = diasStr.split('-').map(d => d.trim());
        const horas = (new Date(`2026-01-01T${horaFin}`) - new Date(`2026-01-01T${horaIni}`)) / 3600000;

        console.log(`[CALC HORAS] Bloque ${idx + 1} (${tipo}): ${diasStr} (${horaIni} a ${horaFin}) = ${horas} horas`);

        // Asignar las mismas horas a cada día
        dias.forEach(dia => {
            diasHoras[dia] = horas;
        });
    });

    console.log(`[CALC HORAS] Mapa día-horas:`, diasHoras);
    return diasHoras;

}



// Nueva función para actualizar cascada desde un módulo específico

window.actualizarCascadaDesdeModulo = async (moduloId, nombrePrograma) => {

    if (!confirm(`¿Actualizar fechas en cascada desde este módulo?\n\nEsto recalculará las fechas de este módulo y todos los siguientes, considerando:\n- La fecha de inicio que ingresaste\n- Duración y horario del módulo\n- Feriados\n- 7 días de break entre módulos`)) return;

    try {

        // 1. Obtener la fecha de inicio del campo input en la tabla
        const inputFechaInicio = document.querySelector(`input[data-modulo-id="${moduloId}"].fecha-modulo-inicio`);
        let fechaInicioEditada = inputFechaInicio ? inputFechaInicio.value : null;

        // 2. Obtener el módulo actual desde Firebase
        const snap = await getDoc(doc(db, "programaciones", moduloId));

        if (!snap.exists()) {

            alert("Error: No se encontró el módulo.");

            return;

        }

        const moduloActual = snap.data();
        const ordenActual = parseInt(moduloActual["Modulo Orden"]) || 0;

        // 3. Si se editó la fecha de inicio en el input, actualizar en Firebase primero
        if (fechaInicioEditada && fechaInicioEditada !== moduloActual["Fecha de inicio"]) {
            await setDoc(doc(db, "programaciones", moduloId), {
                "Fecha de inicio": fechaInicioEditada
            }, { merge: true });
            moduloActual["Fecha de inicio"] = fechaInicioEditada;
        }

        // 4. Validar que tenemos fecha de inicio
        const fechaInicio = moduloActual["Fecha de inicio"];
        if (!fechaInicio || fechaInicio.trim() === "") {

            alert("⚠️ El módulo debe tener una fecha de inicio definida.");

            return;

        }

        // 5. Obtener todos los módulos del programa

        const q = query(colRef, where("PROGRAMA", "==", nombrePrograma), where("TIPO", "==", "MÓDULO"));

        const snapModulos = await getDocs(q);

        const modulos = [];

        snapModulos.forEach(doc => {

            modulos.push({ id: doc.id, ...doc.data() });

        });

        

        // Ordenar por "Modulo Orden"

        const modulosOrdenados = modulos.sort((a, b) =>

            (parseInt(a["Modulo Orden"]) || 0) - (parseInt(b["Modulo Orden"]) || 0)

        );

        

        // Procesar desde el módulo actual hacia adelante

        const batch = writeBatch(db);

        let fechaActual = moduloActual["Fecha de inicio"];

        

        if (!fechaActual) {

            alert("⚠️ El módulo debe tener una fecha de inicio definida.");

            return;

        }

        

        for (let i = 0; i < modulosOrdenados.length; i++) {

            const mod = modulosOrdenados[i];

            const orden = parseInt(mod["Modulo Orden"]) || 0;

            

            // Solo procesar módulos desde el actual hacia adelante

            if (orden < ordenActual) continue;

            

            // Para el primer módulo a procesar, usar su fecha de inicio

            // Para los demás, calcular basándose en el anterior

            if (orden === ordenActual) {

                fechaActual = moduloActual["Fecha de inicio"];

            } else if (i > 0) {

                // Comenzar 7 días después del fin del módulo anterior

                const modAnterior = modulosOrdenados[i - 1];

                if (modAnterior["Fecha de fin"]) {

                    let fechaInicio = new Date(modAnterior["Fecha de fin"] + "T00:00:00");

                    fechaInicio.setDate(fechaInicio.getDate() + 7);

                    

                    // Saltar feriados

                    while (FERIADOS_2026.includes(fechaInicio.toISOString().split('T')[0])) {

                        fechaInicio.setDate(fechaInicio.getDate() + 1);

                    }

                    

                    fechaActual = fechaInicio.toISOString().split('T')[0];

                }

            }

            

            // Calcular fecha de fin basándose en duración y horario

            mod["Fecha de inicio"] = fechaActual;

            mod["Fecha de fin"] = calcularFechaFinModulo(mod);

            

            const fechaFinStr = mod["Fecha de fin"];

            

            // Actualizar módulo en Firebase

            batch.set(doc(db, "programaciones", mod.id), {

                "Fecha de inicio": fechaActual,

                "Fecha de fin": fechaFinStr,

                timestamp: new Date()

            }, { merge: true });

        }

        

        await batch.commit();

        alert("✅ Fechas actualizadas en cascada correctamente.");

        loadAdminTable();

    } catch (err) {

        console.error("Error al actualizar cascada:", err);

        alert("❌ Error: " + err.message);

    }

};



document.getElementById('btnExportExcel').onclick = async () => {

    const snap = await getDocs(colRef);

    const cols = ["TIPO", "CODIGO-PROGRAMA", ...CAMPOS_CABECERA, ...CAMPOS_GESTION, ...CAMPOS_CHECKBOX];

    const data = snap.docs.map(d => {

        const obj = {};

        cols.forEach(c => obj[c] = d.data()[c] || "");

        return obj;

    });

    const ws = XLSX.utils.json_to_sheet(data);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Data");

    XLSX.writeFile(wb, "Export_CTTC.xlsx");

};



document.getElementById('importExcel').onchange = (e) => {

    const reader = new FileReader();

    reader.onload = async (evt) => {

        const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });

        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        if (confirm(`Importar ${rows.length} registros?`)) {

            const batch = writeBatch(db);

            rows.forEach(r => batch.set(doc(collection(db, "programaciones")), { ...r, timestamp: new Date() }));

            await batch.commit();

            location.reload();

        }

    };

    reader.readAsArrayBuffer(e.target.files[0]);

};



// 8. DASHBOARD / INFORME MENSUAL
let dashboardSelectedCompanies = [];
let dashboardHasInit = false;
window.lastDashboardDocs = [];
const dashboardCardState = {}; // Estado para filtros individuales de tarjetas
let dashboardGeneralMode = 'raw'; // 'raw' (Datos Reales) | 'adjusted' (Con Filtros)
let dashboardShowHours = false; // Control de visibilidad de Horas-Alumno
let dashboardShowNRC = false; // Control de visibilidad de Cant. NRC
let dashboardShowPatrocinio = false; // Control de visibilidad de Patrocinio
let dashboardShowBeca = false; // Control de visibilidad de Beca
let dashboardShowPago = false; // Control de visibilidad de Pago
let dashboardShowIngresoPatrocinio = false; // Control de visibilidad de Ingreso Patrocinio
let dashboardShowIngresoPago = false; // Control de visibilidad de Ingreso Pago
let dashboardShowIng2021 = false; // Control de visibilidad ING PAG 2021
let dashboardShowIng2022 = false; // Control de visibilidad ING PAG 2022
let dashboardShowIng2023 = false; // Control de visibilidad ING PAG 2023
let dashboardShowIng2024 = false; // Control de visibilidad ING PAG 2024
let dashboardShowIng2025 = false; // Control de visibilidad ING PAG 2025
let dashboardShowIngPatrocinio2021 = false; // Control de visibilidad ING PATROCINIO 2021
let dashboardShowIngPatrocinio2022 = false; // Control de visibilidad ING PATROCINIO 2022
let dashboardShowIngPatrocinio2023 = false; // Control de visibilidad ING PATROCINIO 2023
let dashboardShowIngPatrocinio2024 = false; // Control de visibilidad ING PATROCINIO 2024
let dashboardShowIngPatrocinio2025 = false; // Control de visibilidad ING PATROCINIO 2025
let dashboardShowTotalHis2021 = false; // Control de visibilidad TOTAL HIS 2021
let dashboardShowTotalHis2022 = false; // Control de visibilidad TOTAL HIS 2022
let dashboardShowTotalHis2023 = false; // Control de visibilidad TOTAL HIS 2023
let dashboardShowTotalHis2024 = false; // Control de visibilidad TOTAL HIS 2024
let dashboardShowTotalHis2025 = false; // Control de visibilidad TOTAL HIS 2025
let dashboardHideGoals = false; // Control de visibilidad de Metas y %
let dashboardShowAllNRCs = false; // Estado para mostrar todos los NRCs en la tabla detallada
let dashboardSelectedYear = new Date().getFullYear().toString(); // Año seleccionado por defecto
let dashboardSelectedMonth = 'all'; // Mes seleccionado por defecto

// Variables para instancias de gráficos
let chartStudentsInstance = null;
let chartIncomeInstance = null;

const MESES = {
    "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
    "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
    "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
};
const ORDERED_MONTH_KEYS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const METAS_MENSUALES = {
    "01": { students: 150, income: 60834 },
    "02": { students: 180, income: 133837 },
    "03": { students: 250, income: 133837 },
    "04": { students: 200, income: 133837 },
    "05": { students: 220, income: 133837 },
    "06": { students: 210, income: 133837 },
    "07": { students: 280, income: 133837 },
    "08": { students: 300, income: 133837 },
    "09": { students: 240, income: 133837 },
    "10": { students: 230, income: 133837 },
    "11": { students: 200, income: 133837 },
    "12": { students: 180, income: 60834 }
};

const HISTORICO_INGRESOS = {
    "2021": { "01": 18700, "02": 16655, "03": 17280, "04": 14110, "05": 29150, "06": 16460, "07": 27210, "08": 20020, "09": 26420, "10": 23838, "11": 24020, "12": 15165 },
    "2022": { "01": 17258, "02": 11045, "03": 29107, "04": 15747, "05": 38989, "06": 6000, "07": 20400, "08": 15971, "09": 24605, "10": 5000, "11": 115622, "12": 8100 },
    "2023": { "01": 24278, "02": 29318, "03": 33900, "04": 38407, "05": 52371, "06": 25900, "07": 18071, "08": 20733, "09": 47860, "10": 17318, "11": 19960, "12": 8978 },
    "2024": { "01": 14133, "02": 9661, "03": 3149, "04": 8600, "05": 17896, "06": 12878, "07": 15492, "08": 15468, "09": 13518, "10": 12250, "11": 29618, "12": 25318 },
    "2025": { "01": 14063, "02": 9952, "03": 8712, "04": 4770, "05": 26886, "06": 14935, "07": 2601, "08": 22610, "09": 22560, "10": 42023, "11": 39325, "12": 35528 }
};

const HISTORICO_INGRESOS_PATROCINIO = {
    "2021": { "01": 0, "02": 0, "03": 0, "04": 0, "05": 0, "06": 0, "07": 0, "08": 0, "09": 0, "10": 0, "11": 0, "12": 0 },
    "2022": { "01": 0, "02": 0, "03": 0, "04": 0, "05": 0, "06": 0, "07": 0, "08": 0, "09": 0, "10": 0, "11": 0, "12": 0 },
    "2023": { "01": 0, "02": 0, "03": 0, "04": 0, "05": 14820, "06": 16050, "07": 21900, "08": 23070, "09": 27900, "10": 18600, "11": 31440, "12": 11700 },
    "2024": { "01": 30600, "02": 23070, "03": 22590, "04": 14760, "05": 20160, "06": 31290, "07": 39990, "08": 39270, "09": 54870, "10": 59130, "11": 67098, "12": 44520 },
    "2025": { "01": 60660, "02": 60421, "03": 76014, "04": 103000, "05": 124522, "06": 96336, "07": 112051, "08": 91359, "09": 106142, "10": 119376, "11": 103923, "12": 46292 }
};

function createMonthlyStructure() {
    const structure = {};
    for (const monthKey in MESES) {
        structure[monthKey] = { students: 0, income: 0, hours: 0, nrcCount: 0, beca: 0, pago: 0, patrocinio: 0, ingresoPatrocinio: 0, ingresoPago: 0 };
    }
    structure.total = { students: 0, income: 0, hours: 0, nrcCount: 0, beca: 0, pago: 0, patrocinio: 0, ingresoPatrocinio: 0, ingresoPago: 0 };
    return structure;
}

function renderDashboard(docs) {
    window.lastDashboardDocs = docs; // Guardar referencia para filtrado
    const dashboardContainer = document.getElementById('dashboardContainer');
    const controlsContainer = document.getElementById('dashboardControls');
    
    if (!dashboardContainer) return;

    // 1. Obtener lista de empresas únicas presentes en la data
    const allCompanies = [...new Set(docs.map(d => d.EMPRESA || "Sin Empresa").filter(Boolean))].sort();

    // 1b. Obtener lista de años únicos presentes en la data
    const allYears = [...new Set(docs.map(d => {
        if (!d['Fecha de inicio']) return null;
        return d['Fecha de inicio'].split('-')[0];
    }).filter(Boolean))].sort().reverse();

    // Asegurar que el año seleccionado sea válido o por defecto el más reciente
    if (allYears.length > 0 && !allYears.includes(dashboardSelectedYear)) {
        if (!dashboardHasInit) dashboardSelectedYear = allYears[0];
    }

    // 2. Inicializar selección (todas marcadas por defecto al inicio)
    if (!dashboardHasInit) {
        dashboardSelectedCompanies = [...allCompanies];
        dashboardHasInit = true;
    }

    // 3. Renderizar Controles (Checkboxes + Selector de Año)
    if (controlsContainer) {
        const checkboxesHTML = allCompanies.map(c => {
            const checked = dashboardSelectedCompanies.includes(c) ? 'checked' : '';
            return `
                <label style="display:inline-flex; align-items:center; gap:6px; font-size:0.8rem; background:white; padding:5px 10px; border:1px solid #cbd5e1; border-radius:15px; cursor:pointer; user-select:none;">
                    <input type="checkbox" value="${c}" ${checked} onchange="toggleDashboardCompany(this)">
                    ${c}
                </label>
            `;
        }).join('');

        const monthOptions = ['all', ...ORDERED_MONTH_KEYS].map(m => 
            `<option value="${m}" ${m === dashboardSelectedMonth ? 'selected' : ''}>${m === 'all' ? 'Todos los meses' : MESES[m]}</option>`
        ).join('');

        const yearOptions = allYears.length > 0 
            ? allYears.map(y => `<option value="${y}" ${y === dashboardSelectedYear ? 'selected' : ''}>${y}</option>`).join('')
            : `<option value="${dashboardSelectedYear}">${dashboardSelectedYear}</option>`;

        controlsContainer.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #e2e8f0; padding-bottom:10px; gap:10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <strong style="font-size:0.9rem; color:#334155;">Año:</strong>
                    <select onchange="changeDashboardYear(this.value)" style="padding:5px 10px; border-radius:6px; border:1px solid #cbd5e1; font-weight:bold; color:#0f172a; cursor:pointer;">
                        ${yearOptions}
                    </select>
                    <strong style="font-size:0.9rem; color:#334155; margin-left:10px;">Mes:</strong>
                    <select onchange="changeDashboardMonth(this.value)" style="padding:5px 10px; border-radius:6px; border:1px solid #cbd5e1; font-weight:bold; color:#0f172a; cursor:pointer;">
                        ${monthOptions}
                    </select>
                </div>
                <div style="display:flex; gap:10px;">
                    <strong style="font-size:0.9rem; color:#334155;">Empresas:</strong>
                    <button onclick="setAllDashboardCompanies(true)" style="font-size:0.75rem; color:#0ea5e9; background:none; border:none; cursor:pointer; text-decoration:underline;">Todas</button>
                    <button onclick="setAllDashboardCompanies(false)" style="font-size:0.75rem; color:#64748b; background:none; border:none; cursor:pointer; text-decoration:underline;">Ninguna</button>
                </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">${checkboxesHTML}</div>
        `;
    }

    const reports = {
        general: createMonthlyStructure()
    };
    allCompanies.forEach(c => {
        reports[c] = createMonthlyStructure();
    });

    docs.forEach(doc => {
        // Procesar solo registros del año SELECCIONADO
        if (!doc['Fecha de inicio'] || !doc['Fecha de inicio'].startsWith(dashboardSelectedYear)) return;

        const month = doc['Fecha de inicio'].split('-')[1];
        if (!month || !MESES[month]) return;

        // Filtro de Mes
        if (dashboardSelectedMonth !== 'all' && month !== dashboardSelectedMonth) return;

        // --- VARIABLES BASE ---
        const company = doc['EMPRESA'] || "Sin Empresa";
        const students = parseInt(doc['#Participantes Real Total'] || 0);
        const price = parseFloat(doc['Precio Sinfo'] || 0);
        const duration = parseInt(doc['Duracion'] || doc['Duración'] || 0);
        
        const beca = parseInt(doc['Part_Beca'] || 0);
        const pago = (parseInt(doc['Part_Pago_Programa']) || 0) + (parseInt(doc['Part_Pago_Curso']) || 0);
        const patrocinio = students - beca - pago;
        
        const ingresoPatrocinio = patrocinio * price;
        const ingresoPago = pago * price;
        const totalIncome = ingresoPatrocinio + ingresoPago; // Ingreso calculado
        const totalHours = students * duration;
        const hasNRC = !!doc.NRC;

        // --- LÓGICA DE ACUMULACIÓN GENERAL (EFECTIVA) ---
        let effStudents = students;
        let effIncome = totalIncome;
        let effHours = totalHours;
        let effHasNRC = hasNRC;
        let effBeca = beca;
        let effPago = pago;
        let effPatrocinio = patrocinio;
        let effIngresoPatrocinio = ingresoPatrocinio;
        let effIngresoPago = ingresoPago;

        let includeInGeneral = false;

        if (dashboardGeneralMode === 'adjusted') {
            // Solo incluir empresas clave si están seleccionadas
            if (allCompanies.includes(company) && dashboardSelectedCompanies.includes(company)) {
                includeInGeneral = true;
                const state = dashboardCardState[company] || { noSumStudents: false, noSumNRC: false, incomeDeduction: 0 };
                
                if (state.noSumNRC || state.noSumStudents) {
                    effHasNRC = state.noSumNRC ? false : effHasNRC;
                    effStudents = 0;
                    effHours = 0;
                    effBeca = 0;
                    effPago = 0;
                    effPatrocinio = 0;
                }
                if (state.incomeDeduction > 0) {
                    const factor = (100 - state.incomeDeduction) / 100;
                    effIncome *= factor;
                    effIngresoPatrocinio *= factor;
                    effIngresoPago *= factor;
                }
            }
        } else {
            // Modo RAW: Sumar todo lo que esté marcado en el filtro superior
            if (dashboardSelectedCompanies.includes(company)) {
                includeInGeneral = true;
            }
        }

        if (includeInGeneral) {
            const target = reports.general[month];
            target.students += effStudents;
            target.income += effIncome;
            target.hours += effHours;
            target.nrcCount += effHasNRC ? 1 : 0;
            target.beca += effBeca;
            target.pago += effPago;
            target.patrocinio += effPatrocinio;
            target.ingresoPatrocinio += effIngresoPatrocinio;
            target.ingresoPago += effIngresoPago;

            // Totales anuales
            reports.general.total.students += effStudents;
            reports.general.total.income += effIncome;
            reports.general.total.hours += effHours;
            reports.general.total.nrcCount += effHasNRC ? 1 : 0;
            reports.general.total.beca += effBeca;
            reports.general.total.pago += effPago;
            reports.general.total.patrocinio += effPatrocinio;
            reports.general.total.ingresoPatrocinio += effIngresoPatrocinio;
            reports.general.total.ingresoPago += effIngresoPago;
        }

        // --- ACUMULACIÓN POR EMPRESA (SIEMPRE RAW PARA LA TARJETA INDIVIDUAL) ---
        if (allCompanies.includes(company)) {
            const rep = reports[company][month];
            rep.students += students;
            rep.income += totalIncome;
            rep.hours += totalHours;
            rep.nrcCount += hasNRC ? 1 : 0;
            
            reports[company].total.students += students;
            reports[company].total.income += totalIncome;
            reports[company].total.hours += totalHours;
            reports[company].total.nrcCount += hasNRC ? 1 : 0;
        }
    });




    const detailedDocs = docs.filter(doc => {
        if (!doc['Fecha de inicio'] || !doc['Fecha de inicio'].startsWith(dashboardSelectedYear)) return false;
        const month = doc['Fecha de inicio'].split('-')[1];
        if (dashboardSelectedMonth !== 'all' && month !== dashboardSelectedMonth) return false;
        
        const company = doc.EMPRESA || "Sin Empresa";
        if (!dashboardSelectedCompanies.includes(company)) return false;

        // En modo ajustado, la tabla solo debe mostrar las empresas de interés
        if (dashboardGeneralMode === 'adjusted') {
            return allCompanies.includes(company);
        }
        return true;
    });

    // Renderizar los reportes
    let dashboardHTML = renderReportCard(`Resumen General ${dashboardSelectedYear}`, reports.general);
    
    // Agregar contenedores para los gráficos justo debajo del resumen general
    dashboardHTML += `
        <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 2rem;">
            <div class="report-card" style="height: 350px;"><canvas id="chartStudents"></canvas></div>
            <div class="report-card" style="height: 350px;"><canvas id="chartIncome"></canvas></div>
        </div>
    `;

    // Tabla detallada de NRCs
    dashboardHTML += renderDetailedNRCTable(detailedDocs);

    allCompanies.forEach(c => {
        dashboardHTML += renderReportCard(`Empresa: ${c}`, reports[c], c);
    });

    dashboardContainer.innerHTML = dashboardHTML;

    // Actualizar campo oculto con el total de NRCs
    const hiddenNRC = document.getElementById('hiddenTotalNRC');
    if (hiddenNRC) hiddenNRC.value = reports.general.total.nrcCount;

    // Renderizar los gráficos después de que los elementos existan en el DOM
    renderDashboardCharts(reports.general);
}

function renderDashboardCharts(generalData) {
    const ctxS = document.getElementById('chartStudents');
    const ctxI = document.getElementById('chartIncome');
    if (!ctxS || !ctxI || typeof Chart === 'undefined') return;

    const labels = ORDERED_MONTH_KEYS.map(k => MESES[k]);
    const realStudents = ORDERED_MONTH_KEYS.map(k => generalData[k].students);
    const metaStudents = ORDERED_MONTH_KEYS.map(k => METAS_MENSUALES[k].students);
    const realIncome = ORDERED_MONTH_KEYS.map(k => generalData[k].income);
    const metaIncome = ORDERED_MONTH_KEYS.map(k => METAS_MENSUALES[k].income);

    if (chartStudentsInstance) chartStudentsInstance.destroy();
    if (chartIncomeInstance) chartIncomeInstance.destroy();

    const commonOptions = (title) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
            title: { display: true, text: title, font: { size: 15, weight: 'bold' }, padding: { bottom: 20 }, color: '#1e293b' }
        },
        scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
    });

    chartStudentsInstance = new Chart(ctxS, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Alumnos Reales', data: realStudents, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, pointRadius: 3 },
                { label: 'Meta Alumnos', data: metaStudents, borderColor: '#94a3b8', borderDash: [5, 5], fill: false, tension: 0, pointRadius: 0 }
            ]
        },
        options: commonOptions('Tendencia de Alumnos vs Meta')
    });

    chartIncomeInstance = new Chart(ctxI, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Ingresos Reales', data: realIncome, borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)', fill: true, tension: 0.4, pointRadius: 3 },
                { label: 'Meta Ingresos', data: metaIncome, borderColor: '#94a3b8', borderDash: [5, 5], fill: false, tension: 0, pointRadius: 0 }
            ]
        },
        options: commonOptions('Tendencia de Ingresos vs Meta')
    });
}

// Funciones globales para interacción con los filtros del dashboard
window.changeDashboardYear = (year) => {
    dashboardSelectedYear = year;
    renderDashboard(window.lastDashboardDocs);
};

window.changeDashboardMonth = (month) => {
    dashboardSelectedMonth = month;
    renderDashboard(window.lastDashboardDocs);
};

window.toggleDashboardCompany = (el) => {
    const val = el.value;
    if (el.checked) {
        if (!dashboardSelectedCompanies.includes(val)) dashboardSelectedCompanies.push(val);
    } else {
        dashboardSelectedCompanies = dashboardSelectedCompanies.filter(c => c !== val);
    }
    // Re-renderizar usando los últimos datos guardados
    renderDashboard(window.lastDashboardDocs);
};

window.setAllDashboardCompanies = (state) => {
    const all = [...new Set(window.lastDashboardDocs.map(d => d.EMPRESA || "Sin Empresa").filter(Boolean))];
    dashboardSelectedCompanies = state ? all : [];
    renderDashboard(window.lastDashboardDocs);
};

window.toggleGeneralDashboardMode = () => {
    dashboardGeneralMode = dashboardGeneralMode === 'raw' ? 'adjusted' : 'raw';
    renderDashboard(window.lastDashboardDocs);
};

window.toggleDashboardHours = () => {
    dashboardShowHours = !dashboardShowHours;
    renderDashboard(window.lastDashboardDocs);
};

window.toggleDashboardNRC = () => {
    dashboardShowNRC = !dashboardShowNRC;
    renderDashboard(window.lastDashboardDocs);
};

window.toggleDashboardPatrocinio = () => {
    dashboardShowPatrocinio = !dashboardShowPatrocinio;
    renderDashboard(window.lastDashboardDocs);
};

window.toggleDashboardBeca = () => {
    dashboardShowBeca = !dashboardShowBeca;
    renderDashboard(window.lastDashboardDocs);
};

window.toggleDashboardPago = () => {
    dashboardShowPago = !dashboardShowPago;
    renderDashboard(window.lastDashboardDocs);
};

window.toggleDashboardIngresoPatrocinio = () => {
    dashboardShowIngresoPatrocinio = !dashboardShowIngresoPatrocinio;
    renderDashboard(window.lastDashboardDocs);
};

window.toggleDashboardIngresoPago = () => {
    dashboardShowIngresoPago = !dashboardShowIngresoPago;
    renderDashboard(window.lastDashboardDocs);
};

window.toggleDashboardGoals = () => {
    dashboardHideGoals = !dashboardHideGoals;
    renderDashboard(window.lastDashboardDocs);
};

window.toggleDashboardIng2021 = () => { dashboardShowIng2021 = !dashboardShowIng2021; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardIng2022 = () => { dashboardShowIng2022 = !dashboardShowIng2022; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardIng2023 = () => { dashboardShowIng2023 = !dashboardShowIng2023; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardIng2024 = () => { dashboardShowIng2024 = !dashboardShowIng2024; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardIng2025 = () => { dashboardShowIng2025 = !dashboardShowIng2025; renderDashboard(window.lastDashboardDocs); };

window.toggleDashboardIngPatrocinio2021 = () => { dashboardShowIngPatrocinio2021 = !dashboardShowIngPatrocinio2021; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardIngPatrocinio2022 = () => { dashboardShowIngPatrocinio2022 = !dashboardShowIngPatrocinio2022; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardIngPatrocinio2023 = () => { dashboardShowIngPatrocinio2023 = !dashboardShowIngPatrocinio2023; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardIngPatrocinio2024 = () => { dashboardShowIngPatrocinio2024 = !dashboardShowIngPatrocinio2024; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardIngPatrocinio2025 = () => { dashboardShowIngPatrocinio2025 = !dashboardShowIngPatrocinio2025; renderDashboard(window.lastDashboardDocs); };

window.toggleDashboardTotalHis2021 = () => { dashboardShowTotalHis2021 = !dashboardShowTotalHis2021; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardTotalHis2022 = () => { dashboardShowTotalHis2022 = !dashboardShowTotalHis2022; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardTotalHis2023 = () => { dashboardShowTotalHis2023 = !dashboardShowTotalHis2023; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardTotalHis2024 = () => { dashboardShowTotalHis2024 = !dashboardShowTotalHis2024; renderDashboard(window.lastDashboardDocs); };
window.toggleDashboardTotalHis2025 = () => { dashboardShowTotalHis2025 = !dashboardShowTotalHis2025; renderDashboard(window.lastDashboardDocs); };

window.toggleShowAllNRCs = () => {
    dashboardShowAllNRCs = !dashboardShowAllNRCs;
    renderDashboard(window.lastDashboardDocs);
};

window.downloadNRCTableImage = () => {
    const element = document.getElementById('detailedNRCTableContainer');
    if (!element) return;

    // Ocultar el botón de captura temporalmente para que no aparezca en la imagen
    const btn = element.querySelector('.btn-capture');
    if (btn) btn.style.display = 'none';

    html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2, // Mayor resolución
        logging: false,
        useCORS: true
    }).then(canvas => {
        if (btn) btn.style.display = '';
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        link.download = `Detalle_NRC_${dashboardSelectedYear}_Mes_${dashboardSelectedMonth}_${date}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
};

window.downloadNRCTableExcel = () => {
    const docs = window.lastDetailedDocs;
    if (!docs || docs.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    const currencyFormatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

    const data = docs.map(d => {
        const totalPart = parseInt(d['#Participantes Real Total'] || 0);
        const beca = parseInt(d['Part_Beca'] || 0);
        const pago = (parseInt(d['Part_Pago_Programa']) || 0) + (parseInt(d['Part_Pago_Curso']) || 0);
        const patrocinio = totalPart - beca - pago;
        const costo = parseFloat(d['Precio Sinfo'] || 0);
        const duracion = parseInt(d['Duracion'] || d['Duración'] || 0);

        let effTotalPart = totalPart, effBeca = beca, effPago = pago, effPatrocinio = patrocinio, effIngreso = patrocinio * costo, effHoras = totalPart * duracion;

        if (dashboardGeneralMode === 'adjusted') {
            const state = dashboardCardState[d.EMPRESA || "Sin Empresa"];
            if (state) {
                if (state.noSumStudents || state.noSumNRC) {
                    effTotalPart = 0; effBeca = 0; effPago = 0; effPatrocinio = 0; effHoras = 0;
                }
                if (state.incomeDeduction > 0) {
                    effIngreso *= (100 - state.incomeDeduction) / 100;
                }
            }
        }

        return {
            "NRC": d.NRC || '--',
            "Módulo / Curso": d['MODULO-CURSO'] || d['PROGRAMA'] || '--',
            "Inicio": d['Fecha de inicio'] || '--',
            "Duración": duracion,
            "Modalidad": d['MODALIDAD MÓDULO'] || d['MODALIDAD PROGRAMA'] || '--',
            "Costo": costo,
            "Total Part.": effTotalPart,
            "Beca": effBeca,
            "Pago": effPago,
            "Patrocinio": effPatrocinio,
            "Ingreso": effIngreso,
            "Horas Transf.": effHoras
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalle NRC");
    XLSX.writeFile(wb, `Detalle_NRC_${dashboardSelectedYear}_Mes_${dashboardSelectedMonth}.xlsx`);
};

window.updateCardState = (companyKey, field, value) => {
    if (!dashboardCardState[companyKey]) dashboardCardState[companyKey] = { noSumStudents: false, noSumNRC: false, incomeDeduction: 0 };
    
    // Convertir a número si es deducción, o booleano si es checkbox
    if (field === 'incomeDeduction') value = parseInt(value);
    
    dashboardCardState[companyKey][field] = value;
    renderDashboard(window.lastDashboardDocs);
};

function renderReportCard(title, data, companyKey = null) {
    // Clonar datos para no afectar el objeto original (importante para no dañar el Resumen General si se reusara)
    let displayData = JSON.parse(JSON.stringify(data));
    let controlsHTML = '';
    let totalStudentsDisplay = `<strong>${displayData.total.students}</strong>`;
    const isGeneral = !companyKey;

    // Lógica específica si es una tarjeta de Empresa (tiene companyKey)
    if (companyKey) {
        // Inicializar estado si no existe
        if (!dashboardCardState[companyKey]) {
            dashboardCardState[companyKey] = { noSumStudents: false, noSumNRC: false, incomeDeduction: 0 };
        }
        const state = dashboardCardState[companyKey];

        // 1. Aplicar Deducción de Ingresos (-82% o -70%)
        if (state.incomeDeduction > 0) {
            const factor = (100 - state.incomeDeduction) / 100;
            for (const monthKey in MESES) {
                displayData[monthKey].income *= factor;
            }
            displayData.total.income *= factor;
        }

        // 2. Aplicar "No sumar total alumnos"
        if (state.noSumStudents) {
            totalStudentsDisplay = `<span style="color:#94a3b8; font-weight:normal;">--</span>`;
        }

        // 3. Generar HTML de los Controles
        controlsHTML = `
            <div style="margin-bottom: 15px; padding: 10px; background: #f1f5f9; border-radius: 8px; font-size: 0.85rem; border: 1px solid #e2e8f0;">
                <div style="margin-bottom: 8px; font-weight: 600; color: #475569;">Filtros de Visualización:</div>
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:8px; cursor:pointer;">
                    <input type="checkbox" onchange="updateCardState('${companyKey}', 'noSumStudents', this.checked)" ${state.noSumStudents ? 'checked' : ''}>
                    No sumar total alumnos
                </label>
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:8px; cursor:pointer;">
                    <input type="checkbox" onchange="updateCardState('${companyKey}', 'noSumNRC', this.checked)" ${state.noSumNRC ? 'checked' : ''}>
                    No sumar total de NRC
                </label>
                <div style="display:flex; align-items:center; gap:8px;">
                    <label>Ingresos:</label>
                    <select onchange="updateCardState('${companyKey}', 'incomeDeduction', this.value)" style="padding: 4px; border-radius: 4px; border: 1px solid #cbd5e1; background:white;">
                        <option value="0" ${state.incomeDeduction === 0 ? 'selected' : ''}>100% (Original)</option>
                        <option value="82" ${state.incomeDeduction === 82 ? 'selected' : ''}>Restar 82% (Queda 18%)</option>
                        <option value="70" ${state.incomeDeduction === 70 ? 'selected' : ''}>Restar 70% (Queda 30%)</option>
                    </select>
                </div>
            </div>
        `;
    } else {
        // Lógica para el Resumen General (Botón de Actualizar)
        const isAdjusted = dashboardGeneralMode === 'adjusted';
        controlsHTML = `
            <div style="margin-bottom: 15px;">
                <button onclick="toggleGeneralDashboardMode()" style="width:100%; padding:10px; background:${isAdjusted ? '#475569' : '#0ea5e9'}; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:8px; transition: background 0.2s;">
                    ${isAdjusted ? '↩️ Restaurar Valores Reales' : '⚡ Actualizar con Filtros Aplicados'}
                </button>
                ${isAdjusted ? '<div style="margin-top:8px; font-size:0.75rem; color:#ef4444; text-align:center; background:#fef2f2; padding:4px; border-radius:4px; border:1px solid #fecaca;">⚠️ Visualizando proyección ajustada (Ingresos/Alumnos reducidos)</div>' : ''}
                <label style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:10px; font-size:0.85rem; cursor:pointer; color:#64748b;">
                    <input type="checkbox" onchange="toggleDashboardHours()" ${dashboardShowHours ? 'checked' : ''}>
                    Mostrar columna de Horas-Alumno
                </label>
                <label style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:5px; font-size:0.85rem; cursor:pointer; color:#64748b;">
                    <input type="checkbox" onchange="toggleDashboardNRC()" ${dashboardShowNRC ? 'checked' : ''}>
                    Mostrar columna de Cant. NRC
                </label>
                <label style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:5px; font-size:0.85rem; cursor:pointer; color:#64748b;">
                    <input type="checkbox" onchange="toggleDashboardPatrocinio()" ${dashboardShowPatrocinio ? 'checked' : ''}>
                    Mostrar Alumnos Patrocinio
                </label>
                <label style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:5px; font-size:0.85rem; cursor:pointer; color:#64748b;">
                    <input type="checkbox" onchange="toggleDashboardBeca()" ${dashboardShowBeca ? 'checked' : ''}>
                    Mostrar Alumnos Beca
                </label>
                <label style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:5px; font-size:0.85rem; cursor:pointer; color:#64748b;">
                    <input type="checkbox" onchange="toggleDashboardPago()" ${dashboardShowPago ? 'checked' : ''}>
                    Mostrar Alumnos Pago
                </label>
                <label style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:5px; font-size:0.85rem; cursor:pointer; color:#64748b;">
                    <input type="checkbox" onchange="toggleDashboardIngresoPatrocinio()" ${dashboardShowIngresoPatrocinio ? 'checked' : ''}>
                    Mostrar Ingresos Patrocinio
                </label>
                <label style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:5px; font-size:0.85rem; cursor:pointer; color:#64748b;">
                    <input type="checkbox" onchange="toggleDashboardIngresoPago()" ${dashboardShowIngresoPago ? 'checked' : ''}>
                    Mostrar Ingresos Pago
                </label>
                <label style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:5px; font-size:0.85rem; cursor:pointer; color:#64748b;">
                    <input type="checkbox" onchange="toggleDashboardGoals()" ${dashboardHideGoals ? 'checked' : ''}>
                    Ocultar Metas y % de avance
                </label>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:10px; border-top:1px solid #e2e8f0; padding-top:10px;">
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b;">
                        <input type="checkbox" onchange="toggleDashboardIng2021()" ${dashboardShowIng2021 ? 'checked' : ''}> ING PAG. 2021
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b;">
                        <input type="checkbox" onchange="toggleDashboardIng2022()" ${dashboardShowIng2022 ? 'checked' : ''}> ING PAG. 2022
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b;">
                        <input type="checkbox" onchange="toggleDashboardIng2023()" ${dashboardShowIng2023 ? 'checked' : ''}> ING PAG. 2023
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b;">
                        <input type="checkbox" onchange="toggleDashboardIng2024()" ${dashboardShowIng2024 ? 'checked' : ''}> ING PAG. 2024
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b;">
                        <input type="checkbox" onchange="toggleDashboardIng2025()" ${dashboardShowIng2025 ? 'checked' : ''}> ING PAG. 2025
                    </label>
                </div>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:5px; padding-top:5px;">
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b;">
                        <input type="checkbox" onchange="toggleDashboardIngPatrocinio2021()" ${dashboardShowIngPatrocinio2021 ? 'checked' : ''}> ING PATROCINIO 2021
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b;">
                        <input type="checkbox" onchange="toggleDashboardIngPatrocinio2022()" ${dashboardShowIngPatrocinio2022 ? 'checked' : ''}> ING PATROCINIO 2022
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b;">
                        <input type="checkbox" onchange="toggleDashboardIngPatrocinio2023()" ${dashboardShowIngPatrocinio2023 ? 'checked' : ''}> ING PATROCINIO 2023
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b;">
                        <input type="checkbox" onchange="toggleDashboardIngPatrocinio2024()" ${dashboardShowIngPatrocinio2024 ? 'checked' : ''}> ING PATROCINIO 2024
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b;">
                        <input type="checkbox" onchange="toggleDashboardIngPatrocinio2025()" ${dashboardShowIngPatrocinio2025 ? 'checked' : ''}> ING PATROCINIO 2025
                    </label>
                </div>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:5px; padding-top:5px;">
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b; font-weight:bold;">
                        <input type="checkbox" onchange="toggleDashboardTotalHis2021()" ${dashboardShowTotalHis2021 ? 'checked' : ''}> TOTAL HIS 2021
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b; font-weight:bold;">
                        <input type="checkbox" onchange="toggleDashboardTotalHis2022()" ${dashboardShowTotalHis2022 ? 'checked' : ''}> TOTAL HIS 2022
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b; font-weight:bold;">
                        <input type="checkbox" onchange="toggleDashboardTotalHis2023()" ${dashboardShowTotalHis2023 ? 'checked' : ''}> TOTAL HIS 2023
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b; font-weight:bold;">
                        <input type="checkbox" onchange="toggleDashboardTotalHis2024()" ${dashboardShowTotalHis2024 ? 'checked' : ''}> TOTAL HIS 2024
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:#64748b; font-weight:bold;">
                        <input type="checkbox" onchange="toggleDashboardTotalHis2025()" ${dashboardShowTotalHis2025 ? 'checked' : ''}> TOTAL HIS 2025
                    </label>
                </div>
            </div>
        `;
    }

    const currencyFormatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
    const percentFormatter = new Intl.NumberFormat('es-PE', { style: 'percent', minimumFractionDigits: 0 });

    const tableHeader = isGeneral 
        ? `<thead><tr>
            <th>Mes</th>
            <th style="text-align:center;">Alumnos</th>
            <th style="text-align:center; color:#64748b; display:${dashboardHideGoals ? 'none' : 'table-cell'};">Meta</th>
            <th style="text-align:center; display:${dashboardHideGoals ? 'none' : 'table-cell'};">%</th>
            <th style="text-align:center; display:${dashboardShowHours ? 'table-cell' : 'none'};">Horas-Alumno</th>
            <th style="text-align:center; display:${dashboardShowNRC ? 'table-cell' : 'none'};">Cant. NRC</th>
            <th style="text-align:center; display:${dashboardShowPatrocinio ? 'table-cell' : 'none'};">Patrocinio</th>
            <th style="text-align:center; display:${dashboardShowBeca ? 'table-cell' : 'none'};">Beca</th>
            <th style="text-align:center; display:${dashboardShowPago ? 'table-cell' : 'none'};">Pago</th>
            <th style="text-align:right; display:${dashboardShowIngresoPatrocinio ? 'table-cell' : 'none'};">Ing. Patrocinio</th>
            <th style="text-align:right; display:${dashboardShowIngresoPago ? 'table-cell' : 'none'};">Ing. Pago</th>
            <th style="text-align:right; display:${dashboardShowIng2021 ? 'table-cell' : 'none'};">ING 2021</th>
            <th style="text-align:right; display:${dashboardShowIng2022 ? 'table-cell' : 'none'};">ING 2022</th>
            <th style="text-align:right; display:${dashboardShowIng2023 ? 'table-cell' : 'none'};">ING 2023</th>
            <th style="text-align:right; display:${dashboardShowIng2024 ? 'table-cell' : 'none'};">ING 2024</th>
            <th style="text-align:right; display:${dashboardShowIng2025 ? 'table-cell' : 'none'};">ING 2025</th>
            <th style="text-align:right; display:${dashboardShowIngPatrocinio2021 ? 'table-cell' : 'none'};">ING PATR. 2021</th>
            <th style="text-align:right; display:${dashboardShowIngPatrocinio2022 ? 'table-cell' : 'none'};">ING PATR. 2022</th>
            <th style="text-align:right; display:${dashboardShowIngPatrocinio2023 ? 'table-cell' : 'none'};">ING PATR. 2023</th>
            <th style="text-align:right; display:${dashboardShowIngPatrocinio2024 ? 'table-cell' : 'none'};">ING PATR. 2024</th>
            <th style="text-align:right; display:${dashboardShowIngPatrocinio2025 ? 'table-cell' : 'none'};">ING PATR. 2025</th>
            <th style="text-align:right; display:${dashboardShowTotalHis2021 ? 'table-cell' : 'none'};">TOTAL HIS 2021</th>
            <th style="text-align:right; display:${dashboardShowTotalHis2022 ? 'table-cell' : 'none'};">TOTAL HIS 2022</th>
            <th style="text-align:right; display:${dashboardShowTotalHis2023 ? 'table-cell' : 'none'};">TOTAL HIS 2023</th>
            <th style="text-align:right; display:${dashboardShowTotalHis2024 ? 'table-cell' : 'none'};">TOTAL HIS 2024</th>
            <th style="text-align:right; display:${dashboardShowTotalHis2025 ? 'table-cell' : 'none'};">TOTAL HIS 2025</th>
            <th style="text-align:right;">Ingresos</th>
            <th style="text-align:right; color:#64748b; display:${dashboardHideGoals ? 'none' : 'table-cell'};">Meta</th>
            <th style="text-align:center; display:${dashboardHideGoals ? 'none' : 'table-cell'};">%</th>
          </tr></thead>`
        : `<thead><tr><th>Mes</th><th style="text-align:center;"># Alumnos</th><th style="text-align:right;">Ingresos</th></tr></thead>`;
    
    const monthsToDisplay = dashboardSelectedMonth === 'all' 
        ? ORDERED_MONTH_KEYS 
        : [dashboardSelectedMonth];

    const tableRows = monthsToDisplay.map(monthKey => {
        const monthData = displayData[monthKey];
        if (isGeneral) {
            const meta = METAS_MENSUALES[monthKey] || { students: 0, income: 0 };
            const pAlumnos = meta.students > 0 ? (monthData.students / meta.students) : 0;
            const pIngresos = meta.income > 0 ? (monthData.income / meta.income) : 0;
            return `
                <tr>
                    <td>${MESES[monthKey]}</td>
                    <td style="text-align:center;">${monthData.students}</td>
                    <td style="text-align:center; color:#64748b; font-size:0.75rem; display:${dashboardHideGoals ? 'none' : 'table-cell'};">${meta.students}</td>
                    <td style="text-align:center; font-weight:bold; color:${pAlumnos >= 1 ? '#10b981' : '#f59e0b'}; display:${dashboardHideGoals ? 'none' : 'table-cell'};">${percentFormatter.format(pAlumnos)}</td>
                    <td style="text-align:center; display:${dashboardShowHours ? 'table-cell' : 'none'};">${monthData.hours.toLocaleString()}</td>
                    <td style="text-align:center; display:${dashboardShowNRC ? 'table-cell' : 'none'};">${monthData.nrcCount}</td>
                    <td style="text-align:center; display:${dashboardShowPatrocinio ? 'table-cell' : 'none'};">${monthData.patrocinio}</td>
                    <td style="text-align:center; display:${dashboardShowBeca ? 'table-cell' : 'none'};">${monthData.beca}</td>
                    <td style="text-align:center; display:${dashboardShowPago ? 'table-cell' : 'none'};">${monthData.pago}</td>
                    <td style="text-align:right; display:${dashboardShowIngresoPatrocinio ? 'table-cell' : 'none'};">${currencyFormatter.format(monthData.ingresoPatrocinio)}</td>
                    <td style="text-align:right; display:${dashboardShowIngresoPago ? 'table-cell' : 'none'};">${currencyFormatter.format(monthData.ingresoPago)}</td>
                    <td style="text-align:right; display:${dashboardShowIng2021 ? 'table-cell' : 'none'}; color:#64748b;">${currencyFormatter.format(HISTORICO_INGRESOS["2021"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowIng2022 ? 'table-cell' : 'none'}; color:#64748b;">${currencyFormatter.format(HISTORICO_INGRESOS["2022"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowIng2023 ? 'table-cell' : 'none'}; color:#64748b;">${currencyFormatter.format(HISTORICO_INGRESOS["2023"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowIng2024 ? 'table-cell' : 'none'}; color:#64748b;">${currencyFormatter.format(HISTORICO_INGRESOS["2024"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowIng2025 ? 'table-cell' : 'none'}; color:#64748b;">${currencyFormatter.format(HISTORICO_INGRESOS["2025"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowIngPatrocinio2021 ? 'table-cell' : 'none'}; color:#64748b;">${currencyFormatter.format(HISTORICO_INGRESOS_PATROCINIO["2021"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowIngPatrocinio2022 ? 'table-cell' : 'none'}; color:#64748b;">${currencyFormatter.format(HISTORICO_INGRESOS_PATROCINIO["2022"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowIngPatrocinio2023 ? 'table-cell' : 'none'}; color:#64748b;">${currencyFormatter.format(HISTORICO_INGRESOS_PATROCINIO["2023"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowIngPatrocinio2024 ? 'table-cell' : 'none'}; color:#64748b;">${currencyFormatter.format(HISTORICO_INGRESOS_PATROCINIO["2024"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowIngPatrocinio2025 ? 'table-cell' : 'none'}; color:#64748b;">${currencyFormatter.format(HISTORICO_INGRESOS_PATROCINIO["2025"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowTotalHis2021 ? 'table-cell' : 'none'}; color:#475569; font-weight:bold;">${currencyFormatter.format(HISTORICO_INGRESOS["2021"][monthKey] + HISTORICO_INGRESOS_PATROCINIO["2021"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowTotalHis2022 ? 'table-cell' : 'none'}; color:#475569; font-weight:bold;">${currencyFormatter.format(HISTORICO_INGRESOS["2022"][monthKey] + HISTORICO_INGRESOS_PATROCINIO["2022"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowTotalHis2023 ? 'table-cell' : 'none'}; color:#475569; font-weight:bold;">${currencyFormatter.format(HISTORICO_INGRESOS["2023"][monthKey] + HISTORICO_INGRESOS_PATROCINIO["2023"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowTotalHis2024 ? 'table-cell' : 'none'}; color:#475569; font-weight:bold;">${currencyFormatter.format(HISTORICO_INGRESOS["2024"][monthKey] + HISTORICO_INGRESOS_PATROCINIO["2024"][monthKey])}</td>
                    <td style="text-align:right; display:${dashboardShowTotalHis2025 ? 'table-cell' : 'none'}; color:#475569; font-weight:bold;">${currencyFormatter.format(HISTORICO_INGRESOS["2025"][monthKey] + HISTORICO_INGRESOS_PATROCINIO["2025"][monthKey])}</td>
                    <td style="text-align:right;">${currencyFormatter.format(monthData.income)}</td>
                    <td style="text-align:right; color:#64748b; font-size:0.75rem; display:${dashboardHideGoals ? 'none' : 'table-cell'};">${currencyFormatter.format(meta.income)}</td>
                    <td style="text-align:center; font-weight:bold; color:${pIngresos >= 1 ? '#10b981' : '#f59e0b'}; display:${dashboardHideGoals ? 'none' : 'table-cell'};">${percentFormatter.format(pIngresos)}</td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td>${MESES[monthKey]}</td>
                    <td style="text-align:center;">${monthData.students}</td>
                    <td style="text-align:right;">${currencyFormatter.format(monthData.income)}</td>
                </tr>
            `;
        }
    }).join('');

    let footerHTML = '';
    if (isGeneral) {
        const totalMetaStudents = Object.values(METAS_MENSUALES).reduce((a, b) => a + b.students, 0);
        const totalMetaIncome = Object.values(METAS_MENSUALES).reduce((a, b) => a + b.income, 0);
        const totalPAlumnos = totalMetaStudents > 0 ? displayData.total.students / totalMetaStudents : 0;
        const totalPIngresos = totalMetaIncome > 0 ? displayData.total.income / totalMetaIncome : 0;
        
        let sum2021 = 0, sum2022 = 0, sum2023 = 0, sum2024 = 0, sum2025 = 0;
        let sumPatr2021 = 0, sumPatr2022 = 0, sumPatr2023 = 0, sumPatr2024 = 0, sumPatr2025 = 0;
        monthsToDisplay.forEach(m => {
            sum2021 += HISTORICO_INGRESOS["2021"][m];
            sum2022 += HISTORICO_INGRESOS["2022"][m];
            sum2023 += HISTORICO_INGRESOS["2023"][m];
            sum2024 += HISTORICO_INGRESOS["2024"][m];
            sum2025 += HISTORICO_INGRESOS["2025"][m];
            sumPatr2021 += HISTORICO_INGRESOS_PATROCINIO["2021"][m];
            sumPatr2022 += HISTORICO_INGRESOS_PATROCINIO["2022"][m];
            sumPatr2023 += HISTORICO_INGRESOS_PATROCINIO["2023"][m];
            sumPatr2024 += HISTORICO_INGRESOS_PATROCINIO["2024"][m];
            sumPatr2025 += HISTORICO_INGRESOS_PATROCINIO["2025"][m];
        });

        footerHTML = `<tfoot><tr>
            <td><strong>Total</strong></td>
            <td style="text-align:center;"><strong>${displayData.total.students}</strong></td>
            <td style="text-align:center; display:${dashboardHideGoals ? 'none' : 'table-cell'};"><strong>${totalMetaStudents}</strong></td>
            <td style="text-align:center; display:${dashboardHideGoals ? 'none' : 'table-cell'};"><strong>${percentFormatter.format(totalPAlumnos)}</strong></td>
            <td style="text-align:center; display:${dashboardShowHours ? 'table-cell' : 'none'};"><strong>${displayData.total.hours.toLocaleString()}</strong></td>
            <td style="text-align:center; display:${dashboardShowNRC ? 'table-cell' : 'none'};"><strong>${displayData.total.nrcCount}</strong></td>
            <td style="text-align:center; display:${dashboardShowPatrocinio ? 'table-cell' : 'none'};"><strong>${displayData.total.patrocinio}</strong></td>
            <td style="text-align:center; display:${dashboardShowBeca ? 'table-cell' : 'none'};"><strong>${displayData.total.beca}</strong></td>
            <td style="text-align:center; display:${dashboardShowPago ? 'table-cell' : 'none'};"><strong>${displayData.total.pago}</strong></td>
            <td style="text-align:right; display:${dashboardShowIngresoPatrocinio ? 'table-cell' : 'none'};"><strong>${currencyFormatter.format(displayData.total.ingresoPatrocinio)}</strong></td>
            <td style="text-align:right; display:${dashboardShowIngresoPago ? 'table-cell' : 'none'};"><strong>${currencyFormatter.format(displayData.total.ingresoPago)}</strong></td>
            <td style="text-align:right; display:${dashboardShowIng2021 ? 'table-cell' : 'none'}; color:#64748b;"><strong>${currencyFormatter.format(sum2021)}</strong></td>
            <td style="text-align:right; display:${dashboardShowIng2022 ? 'table-cell' : 'none'}; color:#64748b;"><strong>${currencyFormatter.format(sum2022)}</strong></td>
            <td style="text-align:right; display:${dashboardShowIng2023 ? 'table-cell' : 'none'}; color:#64748b;"><strong>${currencyFormatter.format(sum2023)}</strong></td>
            <td style="text-align:right; display:${dashboardShowIng2024 ? 'table-cell' : 'none'}; color:#64748b;"><strong>${currencyFormatter.format(sum2024)}</strong></td>
            <td style="text-align:right; display:${dashboardShowIng2025 ? 'table-cell' : 'none'}; color:#64748b;"><strong>${currencyFormatter.format(sum2025)}</strong></td>
            <td style="text-align:right; display:${dashboardShowIngPatrocinio2021 ? 'table-cell' : 'none'}; color:#64748b;"><strong>${currencyFormatter.format(sumPatr2021)}</strong></td>
            <td style="text-align:right; display:${dashboardShowIngPatrocinio2022 ? 'table-cell' : 'none'}; color:#64748b;"><strong>${currencyFormatter.format(sumPatr2022)}</strong></td>
            <td style="text-align:right; display:${dashboardShowIngPatrocinio2023 ? 'table-cell' : 'none'}; color:#64748b;"><strong>${currencyFormatter.format(sumPatr2023)}</strong></td>
            <td style="text-align:right; display:${dashboardShowIngPatrocinio2024 ? 'table-cell' : 'none'}; color:#64748b;"><strong>${currencyFormatter.format(sumPatr2024)}</strong></td>
            <td style="text-align:right; display:${dashboardShowIngPatrocinio2025 ? 'table-cell' : 'none'}; color:#64748b;"><strong>${currencyFormatter.format(sumPatr2025)}</strong></td>
            <td style="text-align:right; display:${dashboardShowTotalHis2021 ? 'table-cell' : 'none'}; color:#475569;"><strong>${currencyFormatter.format(sum2021 + sumPatr2021)}</strong></td>
            <td style="text-align:right; display:${dashboardShowTotalHis2022 ? 'table-cell' : 'none'}; color:#475569;"><strong>${currencyFormatter.format(sum2022 + sumPatr2022)}</strong></td>
            <td style="text-align:right; display:${dashboardShowTotalHis2023 ? 'table-cell' : 'none'}; color:#475569;"><strong>${currencyFormatter.format(sum2023 + sumPatr2023)}</strong></td>
            <td style="text-align:right; display:${dashboardShowTotalHis2024 ? 'table-cell' : 'none'}; color:#475569;"><strong>${currencyFormatter.format(sum2024 + sumPatr2024)}</strong></td>
            <td style="text-align:right; display:${dashboardShowTotalHis2025 ? 'table-cell' : 'none'}; color:#475569;"><strong>${currencyFormatter.format(sum2025 + sumPatr2025)}</strong></td>
            <td style="text-align:right;"><strong>${currencyFormatter.format(displayData.total.income)}</strong></td>
            <td style="text-align:right; display:${dashboardHideGoals ? 'none' : 'table-cell'};"><strong>${currencyFormatter.format(totalMetaIncome)}</strong></td>
            <td style="text-align:center; display:${dashboardHideGoals ? 'none' : 'table-cell'};"><strong>${percentFormatter.format(totalPIngresos)}</strong></td>
        </tr></tfoot>`;
    } else {
        footerHTML = `<tfoot><tr><td><strong>Total</strong></td><td style="text-align:center;">${totalStudentsDisplay}</td><td style="text-align:right;"><strong>${currencyFormatter.format(displayData.total.income)}</strong></td></tr></tfoot>`;
    }

    return `
        <div class="report-card">
            <h3>${title}</h3>
            ${controlsHTML}
            <table class="report-table">
                ${tableHeader}
                <tbody>${tableRows}</tbody>
                ${footerHTML}
            </table>
        </div>
    `;
}

function renderDetailedNRCTable(docs) {
    const currencyFormatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
    
    let totalPartSum = 0;
    let becaSum = 0;
    let pagoSum = 0;
    let ingresoSum = 0;
    let ingresoPagoSum = 0;
    let horasTransfSum = 0;
    let patrocinioSum = 0;

    // Ordenar por fecha de inicio ascendente (de la más próxima a la más lejana)
    const sortedDocs = [...docs].sort((a, b) => (a['Fecha de inicio'] || "").localeCompare(b['Fecha de inicio'] || ""));
    window.lastDetailedDocs = sortedDocs;

    // --- CÁLCULO DE TOTALES SOBRE TODOS LOS DOCUMENTOS ---
    sortedDocs.forEach(d => {
        const costo = parseFloat(d['Precio Sinfo'] || 0);
        const totalPart = parseInt(d['#Participantes Real Total'] || 0);
        const beca = parseInt(d['Part_Beca'] || 0);
        const pago = (parseInt(d['Part_Pago_Programa']) || 0) + (parseInt(d['Part_Pago_Curso']) || 0);
        const patrocinio = totalPart - beca - pago;
        const ingresoPatrocinio = patrocinio * costo;
        const ingresoPago = pago * costo;
        const duracion = parseInt(d['Duracion'] || d['Duración'] || 0);
        const horasTransf = totalPart * duracion;

        let effTotalPart = totalPart;
        let effBeca = beca;
        let effPago = pago;
        let effPatrocinio = patrocinio;
        let effIngresoPatrocinio = ingresoPatrocinio;
        let effIngresoPago = ingresoPago;
        let effHorasTransf = horasTransf;

        if (dashboardGeneralMode === 'adjusted') {
            const state = dashboardCardState[d.EMPRESA || "Sin Empresa"];
            if (state) {
                if (state.noSumStudents || state.noSumNRC) {
                    effTotalPart = 0; effBeca = 0; effPago = 0; effPatrocinio = 0; effHorasTransf = 0;
                }
                if (state.incomeDeduction > 0) {
                    const factor = (100 - state.incomeDeduction) / 100;
                    effIngresoPatrocinio *= factor;
                    effIngresoPago *= factor;
                }
            }
        }
        totalPartSum += effTotalPart;
        becaSum += effBeca;
        pagoSum += effPago;
        ingresoSum += effIngresoPatrocinio;
        ingresoPagoSum += effIngresoPago;
        horasTransfSum += effHorasTransf;
        patrocinioSum += effPatrocinio;
    });

    // --- RENDERIZADO DE FILAS (VISIBLES) ---
    const docsToShow = dashboardShowAllNRCs ? sortedDocs : sortedDocs.slice(0, 10);

    const rows = docsToShow.map(d => {
        const nrc = d.NRC || '--';
        const nombre = d['MODULO-CURSO'] || d['PROGRAMA'] || '--';
        const inicio = d['Fecha de inicio'] || '--';
        const duracion = parseInt(d['Duracion'] || d['Duración'] || 0);
        const modalidad = d['MODALIDAD MÓDULO'] || d['MODALIDAD PROGRAMA'] || '--';
        const costo = parseFloat(d['Precio Sinfo'] || 0);
        const totalPart = parseInt(d['#Participantes Real Total'] || 0);
        const beca = parseInt(d['Part_Beca'] || 0);
        const pago = (parseInt(d['Part_Pago_Programa']) || 0) + (parseInt(d['Part_Pago_Curso']) || 0);
        const patrocinio = totalPart - beca - pago;
        const ingresoPatrocinio = patrocinio * costo;
        const horasTransf = totalPart * duracion;

        // Aplicar ajustes para la fila individual
        let effTotalPart = totalPart, effBeca = beca, effPago = pago, effPatrocinio = patrocinio, effIngresoPatrocinio = ingresoPatrocinio, effHorasTransf = horasTransf;
        if (dashboardGeneralMode === 'adjusted') {
            const state = dashboardCardState[d.EMPRESA || "Sin Empresa"];
            if (state) {
                if (state.noSumStudents || state.noSumNRC) {
                    effTotalPart = 0; effBeca = 0; effPago = 0; effPatrocinio = 0; effHorasTransf = 0;
                }
                if (state.incomeDeduction > 0) {
                    const factor = (100 - state.incomeDeduction) / 100;
                    effIngresoPatrocinio *= factor;
                }
            }
        }

        return `
            <tr>
                <td>${nrc}</td>
                <td>${nombre}</td>
                <td>${inicio}</td>
                <td style="text-align:center;">${duracion}</td>
                <td>${modalidad}</td>
                <td style="text-align:right;">${currencyFormatter.format(costo)}</td>
                <td style="text-align:center;">${effTotalPart}</td>
                <td style="text-align:center;">${effBeca}</td>
                <td style="text-align:center;">${effPago}</td>
                <td style="text-align:center;">${effPatrocinio}</td>
                <td style="text-align:right;">${currencyFormatter.format(effIngresoPatrocinio)}</td>
                <td style="text-align:center;">${effHorasTransf.toLocaleString()}</td>
            </tr>
        `;
    }).join('');

    // Actualizar campos ocultos con los totales calculados de la grilla detallada
    const hPatrocinio = document.getElementById('hiddenTotalPatrocinio');
    const hBeca = document.getElementById('hiddenTotalBeca');
    const hPago = document.getElementById('hiddenTotalPago');
    const hIngPatrocinio = document.getElementById('hiddenTotalIngresoPatrocinio');
    const hIngPago = document.getElementById('hiddenTotalIngresoPago');
    
    if (hPatrocinio) hPatrocinio.value = patrocinioSum;
    if (hBeca) hBeca.value = becaSum;
    if (hPago) hPago.value = pagoSum;
    if (hIngPatrocinio) hIngPatrocinio.value = ingresoSum;
    if (hIngPago) hIngPago.value = ingresoPagoSum;

    const footerHTML = docs.length > 0 ? `
        <tfoot>
            <tr style="font-weight: bold; background: #f1f5f9;">
                <td colspan="6" style="text-align:right;">TOTALES:</td>
                <td style="text-align:center;">${totalPartSum}</td>
                <td style="text-align:center;">${becaSum}</td>
                <td style="text-align:center;">${pagoSum}</td>
                <td style="text-align:center;">${patrocinioSum}</td>
                <td style="text-align:right;">${currencyFormatter.format(ingresoSum)}</td>
                <td style="text-align:center;">${horasTransfSum.toLocaleString()}</td>
            </tr>
        </tfoot>
    ` : '';

    // --- BOTÓN VER MÁS ---
    let seeMoreButtonHTML = '';
    if (sortedDocs.length > 10) {
        const buttonText = dashboardShowAllNRCs ? 'Ver Menos' : `Ver los ${sortedDocs.length - 10} restantes...`;
        seeMoreButtonHTML = `
            <div style="text-align: center; padding: 15px 0 5px 0;">
                <button onclick="toggleShowAllNRCs()" class="btn-secondary" style="font-size:0.8rem; padding:8px 20px;">${buttonText}</button>
            </div>
        `;
    }

    return `
        <div class="report-card" id="detailedNRCTableContainer" style="grid-column: 1 / -1; overflow-x: auto; background: white;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
                <h3 style="margin:0; border:none;">Detalle de NRCs Ejecutadas</h3>
                <div style="display:flex; gap:8px;">
                    <button onclick="downloadNRCTableExcel()" class="btn-primary" style="font-size:0.75rem; padding:5px 12px; background:#10b981;">📊 Descargar Excel</button>
                    <button onclick="downloadNRCTableImage()" class="btn-primary btn-capture" style="font-size:0.75rem; padding:5px 12px; background:#6366f1;">📸 Descargar Captura</button>
                </div>
            </div>
            <table class="report-table" style="min-width: 1100px;">
                <thead>
                    <tr>
                        <th>NRC</th>
                        <th>Módulo / Curso</th>
                        <th>Inicio</th>
                        <th style="text-align:center;">Dur.</th>
                        <th>Modalidad</th>
                        <th style="text-align:right;">Costo</th>
                        <th style="text-align:center;">Total Part.</th>
                        <th style="text-align:center;">Beca</th>
                        <th style="text-align:center;">Pago</th>
                        <th style="text-align:center;">Patrocinio</th>
                        <th style="text-align:right;">Ingreso</th>
                        <th style="text-align:center;">Hrs Transf.</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="12" style="text-align:center;">No hay datos para los filtros seleccionados</td></tr>'}
                </tbody>
                ${footerHTML}
            </table>
            ${seeMoreButtonHTML}
        </div>
    `;
}

// 8. LISTADO

// Función para actualizar la fecha fin automáticamente cuando se edita la fecha de inicio en la tabla
function actualizarFechaFinEnTabla(moduloId) {
    console.log(`[FECHA FIN] Actualizando fecha fin para módulo: ${moduloId}`);
    
    const inputFechaInicio = document.querySelector(`input[data-modulo-id="${moduloId}"].fecha-modulo-inicio`);
    const inputFechaFin = document.querySelector(`input[data-modulo-id="${moduloId}"].fecha-modulo-fin`);
    
    if (!inputFechaInicio || !inputFechaFin) {
        console.warn(`[FECHA FIN] No se encontraron los inputs para módulo: ${moduloId}`);
        return;
    }
    
    // Obtener los datos del módulo desde Firebase para calcular la fecha fin
    getDoc(doc(db, "programaciones", moduloId)).then(snap => {
        if (!snap.exists()) {
            console.warn(`[FECHA FIN] No existe el módulo en Firebase: ${moduloId}`);
            return;
        }
        
        const modulo = snap.data();
        const nuevaFechaInicio = inputFechaInicio.value;
        
        console.log(`[FECHA FIN] Fecha inicio nueva: ${nuevaFechaInicio}`);
        
        if (!nuevaFechaInicio) {
            console.warn(`[FECHA FIN] Fecha de inicio vacía`);
            return;
        }
        
        // Actualizar la fecha de inicio en el objeto del módulo
        modulo["Fecha de inicio"] = nuevaFechaInicio;
        
        // Calcular la nueva fecha fin
        const nuevaFechaFin = calcularFechaFinModulo(modulo);
        
        console.log(`[FECHA FIN] Fecha fin calculada: ${nuevaFechaFin}`);
        
        // Actualizar el campo en la tabla
        inputFechaFin.value = nuevaFechaFin;
        
    }).catch(err => {
        console.error(`[FECHA FIN] Error al obtener datos: `, err);
    });
}

function loadAdminTable() {

    const tbody = document.getElementById('adminTableBody');

    if (!tbody) return;

    onSnapshot(query(colRef, orderBy("timestamp", "desc")), (snap) => {

        tbody.innerHTML = '';

        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Renderizar el dashboard con los datos actualizados
        renderDashboard(docs);

        // Poblar el selector de docentes para cruces de horario

        const conflictSel = document.getElementById('conflictDocenteSelector');

        if (conflictSel && conflictSel.options.length <= 1) {
            conflictSel.innerHTML = '<option value="">Seleccione un docente...</option>' + 
            DOCENTES.map(d => `<option value="${d}">${d}</option>`).join('');
            conflictSel.onchange = (e) => checkTeacherConflicts(e.target.value);
        }


        // Separar cursos y módulos

        const modules = docs.filter(d => d.TIPO === "MÓDULO");

        const courses = docs.filter(d => d.TIPO !== "MÓDULO");



        // Agrupar módulos por programa

        const progMap = {};

        modules.forEach(m => {

            const prog = m.PROGRAMA || 'Sin Programa';

            if (!progMap[prog]) progMap[prog] = [];

            progMap[prog].push(m);

        });



        // Renderizar programas

        Object.keys(progMap).sort().forEach(progName => {

            const progId = progName.replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/gi, '').toLowerCase();

           

            progMap[progName].sort((a, b) => (parseInt(a["Modulo Orden"]) || 0) - (parseInt(b["Modulo Orden"]) || 0));



            const trProg = document.createElement('tr');

            trProg.className = 'prog-master-row';

            trProg.innerHTML = `

                <td style="padding:12px;">-</td>

                <td style="padding:12px;">

                    <button class="expand-btn" data-prog="${progId}" aria-expanded="false">▸</button>

                    <b>${progName}</b>

                    <small style="color:var(--text-muted);">(${progMap[progName].length} módulos)</small>

                </td>

                <td style="padding:12px;">-</td>

                <td class="actions-col" style="text-align:center; padding:12px;">

                    <button class="action-button" onclick="toggleProgram('${progId}')">Ver</button>

                    <button class="action-button" onclick="cloneRecord(null, '${progName}')" style="background:#f59e0b; color:white; margin-left:5px;">Clonar Prog.</button>

                    <button class="action-button" onclick="prepareEditPrograma('${progName}')" style="background:#0ea5e9; color:white; margin-left:5px;">Editar Prog.</button>

                    <button class="action-button delete" onclick="deleteProgram('${progName}')" style="background:#ef4444; color:white; margin-left:5px;">Eliminar</button>

                </td>

            `;

            tbody.appendChild(trProg);



            const expandBtnLocal = trProg.querySelector('.expand-btn');

            if (expandBtnLocal) {

                expandBtnLocal.onclick = () => {

                    const progIdBtn = expandBtnLocal.getAttribute('data-prog');

                    const expanded = expandBtnLocal.getAttribute('aria-expanded') === 'true';

                    expandBtnLocal.setAttribute('aria-expanded', expanded ? 'false' : 'true');

                    expandBtnLocal.textContent = expanded ? '▸' : '▾';

                    document.querySelectorAll(`.prog-child-${progIdBtn}`).forEach(r => r.classList.toggle('hidden-row'));

                };

            }



            progMap[progName].forEach(m => {

                const tr = document.createElement('tr');

                tr.className = `child-row-style prog-child-${progId} hidden-row`;

                const nombreModulo = m["Modulo Orden"] ? `[Mód. ${m["Modulo Orden"]}] ${m["MODULO-CURSO"]}` : m["MODULO-CURSO"];



                // Crear inputs editables para fechas

                const fechaInicio = m["Fecha de inicio"] || '';

                const fechaFin = m["Fecha de fin"] || '';



                tr.innerHTML = `

                    <td style="padding:12px;">${m.NRC || '--'}</td>

                    <td style="padding:12px; padding-left: 30px;">

                        <div style="margin-bottom: 8px;"><strong>${nombreModulo}</strong></div>

                        <div style="display: flex; gap: 10px; font-size: 0.9rem;">

                            <div>

                                <label style="color: #64748b; font-size: 0.85rem;">Inicio:</label>

                                <input type="date" class="fecha-modulo-inicio" data-modulo-id="${m.id}" value="${fechaInicio}" style="padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; width: 120px;">

                            </div>

                            <div>

                                <label style="color: #64748b; font-size: 0.85rem;">Fin:</label>

                                <input type="date" class="fecha-modulo-fin" data-modulo-id="${m.id}" value="${fechaFin}" style="padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; width: 120px;">

                            </div>

                        </div>

                    </td>

                    <td style="padding:12px; text-align: center; vertical-align: middle;">

                        <div class="actions-col" style="text-align:center; padding:0;">

                            <button class="action-button" onclick="actualizarCascadaDesdeModulo('${m.id}', '${progName}')" title="Actualizar fechas en cascada desde este módulo" style="background:#10b981; color:white; margin-right:5px;">⬇️ Cascada</button>

                            <button class="action-button" onclick="actualizarHorarioCascada('${m.id}', '${progName}')" title="Copiar horario, días y modalidad a módulos siguientes" style="background:#8b5cf6; color:white; margin-right:5px;">🕐 Horario</button>

                            <button class="action-button" onclick="cloneRecord('${m.id}')" title="Clonar Módulo">📋</button>

                            <button class="action-button" onclick="prepareEdit('${m.id}')">✏️</button>

                            <button class="action-button delete" onclick="deleteRecord('${m.id}')">🗑️</button>

                        </div>

                    </td>

                `;

                tbody.appendChild(tr);



                // Agregar evento para actualizar fechas al cambiar

                const inputFechaInicio = tr.querySelector('.fecha-modulo-inicio');

                if (inputFechaInicio) {

                    inputFechaInicio.addEventListener('change', () => {

                        actualizarFechasModuloDesdeTabla(m.id, inputFechaInicio.value, progName);

                    });

                }

            });

        });



        // Renderizar cursos sueltos

        courses.forEach(c => {

            const tr = document.createElement('tr');

            const fechaInicio = c["Fecha de inicio"] || '';

            const fechaFin = c["Fecha de fin"] || '';

           

            tr.innerHTML = `

                <td style="padding:12px;">${c.NRC || '--'}</td>

                <td style="padding:12px;">

                    <div style="margin-bottom: 8px;"><strong>[CUR] ${c.PROGRAMA || c["MODULO-CURSO"]}</strong></div>

                    <div style="display: flex; gap: 10px; font-size: 0.9rem;">

                        <div>

                            <label style="color: #64748b; font-size: 0.85rem;">Inicio:</label>

                            <input type="date" class="fecha-modulo-inicio" data-modulo-id="${c.id}" value="${fechaInicio}" style="padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; width: 120px;">

                        </div>

                        <div>

                            <label style="color: #64748b; font-size: 0.85rem;">Fin:</label>

                            <input type="date" class="fecha-modulo-fin" data-modulo-id="${c.id}" value="${fechaFin}" style="padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; width: 120px;">

                        </div>

                    </div>

                </td>

                <td style="padding:12px; text-align: center; vertical-align: middle;">

                    <div class="actions-col" style="text-align:center; padding:0;">

                        <button class="action-button" onclick="cloneRecord('${c.id}')" title="Clonar Curso">📋</button>

                        <button class="action-button" onclick="prepareEdit('${c.id}')">✏️</button>

                        <button class="action-button delete" onclick="deleteRecord('${c.id}')">🗑️</button>

                    </div>

                </td>

                </td>

            `;

            tbody.appendChild(tr);

        });

    });

}

// Listener global con delegación de eventos para los campos de fecha en la tabla
const actualizarFechaFinHandler = (e) => {
    if (e.target.classList.contains('fecha-modulo-inicio')) {
        const moduloId = e.target.getAttribute('data-modulo-id');
        if (moduloId) {
            console.log(`[EVENT] Evento disparado en fecha-modulo-inicio: ${e.type}`);
            actualizarFechaFinEnTabla(moduloId);
        }
    }
};

// Escuchar múltiples eventos para asegurar compatibilidad con diferentes navegadores y date pickers
document.addEventListener('change', actualizarFechaFinHandler);
document.addEventListener('input', actualizarFechaFinHandler);
document.addEventListener('blur', actualizarFechaFinHandler, true); // Capture phase

window.toggleProgram = (progId) => {

    try {

        const rows = Array.from(document.querySelectorAll(`.prog-child-${progId}`));

        // Si no hay filas, no hacemos nada

        if (rows.length === 0) return;



        // Determinamos si actualmente están ocultas (si al menos una lo está)

        const anyHidden = rows.some(r => r.classList.contains('hidden-row'));



        // Aplicamos la acción: mostrar si estaban ocultas, ocultar si estaban visibles

        rows.forEach(r => {

            if (anyHidden) r.classList.remove('hidden-row');

            else r.classList.add('hidden-row');

        });



        // Sincronizamos el botón de expandir para reflejar el estado

        const masterBtn = document.querySelector(`.prog-master-row .expand-btn[data-prog="${progId}"]`);

        if (masterBtn) {

            masterBtn.setAttribute('aria-expanded', anyHidden ? 'true' : 'false');

            masterBtn.textContent = anyHidden ? '▾' : '▸';

        }

    } catch (err) {

        console.error('toggleProgram error:', err);

    }

};



window.deleteRecord = async (id) => { if (confirm("¿Eliminar?")) await deleteDoc(doc(db, "programaciones", id)); };



window.deleteProgram = async (nombrePrograma) => {

    if (!confirm(`¿Deseas ELIMINAR el programa completo "${nombrePrograma}" y todos sus módulos? Esta acción no se puede deshacer.`)) return;



    try {

        const q = query(colRef, where("PROGRAMA", "==", nombrePrograma));

        const snap = await getDocs(q);

        const batch = writeBatch(db);

       

        snap.forEach(docSnap => {

            batch.delete(docSnap.ref);

        });

       

        await batch.commit();

        alert(`✅ Programa "${nombrePrograma}" eliminado completamente.`);

    } catch (err) {

        console.error("Error al eliminar programa:", err);

        alert("❌ Error: " + err.message);

    }

};

window.prepareEdit = async (id) => {

    selectedDocId = id;

    // PRIMERO: Verificar si estamos editando un módulo dentro de un programa
    let dt = null;
    if (window.editandoProgramaActivo) {
        const modEnTemporal = modulosTemporales.find(m => m.id === id);
        if (modEnTemporal) dt = modEnTemporal;
    }

    // SEGUNDO: Si no está en modulosTemporales, cargar desde Firebase
    if (!dt) {
        const snap = await getDoc(doc(db, "programaciones", id));
        if (snap.exists()) dt = snap.data();
    }

    if (dt) {
        // Cambiar a MÓDULO si estamos editando dentro de un programa
        if (window.editandoProgramaActivo && dt.TIPO === "MÓDULO") {
            document.getElementById('regType').value = "CURSO";
            document.getElementById('regType').dispatchEvent(new Event('change'));
        }

        // Cargar todos los campos
        [...CAMPOS_CABECERA, ...CAMPOS_GESTION].forEach(c => {
            const el = document.getElementById(`f_${c.replace(/ /g, "_")}`);
            if (el) el.value = dt[c] || "";
        });
        
        const elCod = document.getElementById('f_CODIGO_PROGRAMA');
        if (elCod) {
            elCod.value = dt["CODIGO-PROGRAMA"] || dt["f_CODIGO_PROGRAMA"] || "";
        }

        CAMPOS_CHECKBOX.forEach(c => {
            const el = document.getElementById(`f_${c.replace(/ /g, "_")}`);
            if (el) el.checked = dt[c] === "SI";
        });

        // IMPORTANTE: Crear estructura de horario ANTES de llenarla
        const modalidad = dt["MODALIDAD MÓDULO"] || "Online";
        updateHorarioUI(modalidad);

        // Esperar a que el DOM esté actualizado
        if (dt.Horario) {
            await new Promise(resolve => requestAnimationFrame(resolve));
            rellenarHorarioVisual(dt.Horario);
        }

        // Abrir la sección de configuración si está cerrada
        const configContainer = document.getElementById('configSection');
        if (configContainer) {
            const configHeader = configContainer.querySelector('.section-header-collapsible');
            const contentSection = configHeader.nextElementSibling;
            // Verificar si está cerrada (maxHeight === '0px' o display === 'none')
            if (contentSection && (contentSection.style.maxHeight === '0px' || contentSection.style.display === 'none')) {
                toggleSection(configHeader);
            }
        }

        // Scroll hacia el formulario para editar (con retardo para permitir animación de apertura)
        setTimeout(() => {
            const formElement = document.getElementById('adminForm');
            if (formElement) {
                formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 300);
    }

};





function rellenarHorarioVisual(horarioStr) {

    if (!horarioStr || typeof horarioStr !== 'string') return;

    // 1. Asegurarse de que los bloques estén creados según la modalidad actual
    const modalidad = document.getElementById('f_MODALIDAD_MÓDULO')?.value || "Online";
    updateHorarioUI(modalidad);

    // 2. PRIMERO: Limpiar todos los bloques antes de rellenar
    document.querySelectorAll('.horario-bloque').forEach(bloqueEl => {
        bloqueEl.querySelectorAll('.btn-dia').forEach(btn => btn.classList.remove('active'));
        const inputIni = bloqueEl.querySelector('.t-ini');
        const inputFin = bloqueEl.querySelector('.t-fin');
        if (inputIni) inputIni.value = '';
        if (inputFin) inputFin.value = '';
    });

    // 3. Separar los bloques (usualmente divididos por " | ") y filtrar vacíos
    const bloques = horarioStr.split(' | ').filter(b => b.trim());

    bloques.forEach(bloqueTexto => {
        if (!bloqueTexto.trim()) return;

        // Extraer partes: "BLOQUE: ONLINE: Lun-Mar (08:00 a 10:00)"
        const match = bloqueTexto.match(/BLOQUE: (.*?): (.*?) \((.*?) a (.*?)\)/);
        if (match) {
            const [_, tipo, diasStr, horaIni, horaFin] = match;
            const diasArray = diasStr.split('-').map(s => s.trim());

            // Buscar el contenedor del bloque correcto (Online o Presencial)
            // Usar una bandera para asegurar que solo rellena UNA vez por tipo
            let bloqueEncontrado = false;
            document.querySelectorAll('.horario-bloque').forEach(bloqueEl => {
                const titulo = bloqueEl.querySelector('p')?.textContent || '';

                if (titulo.includes(tipo) && !bloqueEncontrado) {
                    bloqueEncontrado = true;
                    
                    // Marcar días
                    bloqueEl.querySelectorAll('.btn-dia').forEach(btn => {
                        if (diasArray.includes(btn.textContent)) {
                            btn.classList.add('active');
                        }
                    });
                    
                    // Rellenar horas
                    const inputIni = bloqueEl.querySelector('.t-ini');
                    const inputFin = bloqueEl.querySelector('.t-fin');
                    if (inputIni) inputIni.value = horaIni;
                    if (inputFin) inputFin.value = horaFin;
                }
            });
        }
    });
}





// Calcula una nueva fecha desplazada por `diasMover` (enteros, puede ser negativo).

// Se aplica el desplazamiento en días calendario y luego se ajusta para evitar domingos y feriados

// Si el desplazamiento es positivo, avanzamos hasta encontrar una fecha válida; si es negativo, retrocedemos.

function calcularDesplazamientoFecha(fechaBase, diasMover) {

    if (!fechaBase) return fechaBase;



    const dir = diasMover >= 0 ? 1 : -1;

    // Fecha tentativa: aplicamos desplazamiento en días calendario

    const f = new Date(fechaBase + 'T00:00:00');

    f.setDate(f.getDate() + diasMover);



    // Ajustamos solo para saltar feriados (los domingos SÍ pueden tener clases)

    let safety = 0;

    while (FERIADOS_2026.includes(f.toISOString().split('T')[0]) && safety < 365) {

        f.setDate(f.getDate() + dir);

        safety++;

    }



    return f.toISOString().split('T')[0];

}



async function ejecutarCascadaProgramas(nombrePrograma, ordenActual, diasMover) {

    if (diasMover === 0) return;



    try {

        // Obtenemos todos los registros del programa y filtramos por orden en el cliente

        const q = query(colRef, where("PROGRAMA", "==", nombrePrograma));

        const snap = await getDocs(q);

        const batch = writeBatch(db);



        console.debug('ejecutarCascadaProgramas: encontrados', snap.size, 'doc(s) para programa', nombrePrograma, 'ordenActual:', ordenActual, 'diasMover:', diasMover);



        snap.forEach(docSnap => {

            const data = docSnap.data();

            const orden = parseInt(data["Modulo Orden"]) || 0;

            if (orden > ordenActual) {

                const fechaBase = data["Fecha de inicio"];

                const nuevaFecha = calcularDesplazamientoFecha(fechaBase, diasMover);

                batch.set(doc(db, "programaciones", docSnap.id), {

                    "Fecha de inicio": nuevaFecha

                }, { merge: true });

                console.debug('ejecutarCascadaProgramas: program', nombrePrograma, '-> update', docSnap.id, 'orden', orden, fechaBase, '=>', nuevaFecha);

            }

        });



        await batch.commit();

    } catch (err) {

        console.error('Error en ejecutarCascadaProgramas:', err);

        throw err;

    }

}



// Función para clonar un registro o un programa completo

window.cloneRecord = async (id, nombrePrograma = null) => {
    if (!confirm("¿Deseas clonar este registro? Se creará una copia totalmente independiente.")) return;

    try {
        if (nombrePrograma && nombrePrograma !== 'Sin Programa') {
            // CASO A: Clonar un Programa Completo
            const q = query(colRef, where("PROGRAMA", "==", nombrePrograma));
            const snap = await getDocs(q);
            const batch = writeBatch(db);
            
            // Creamos un sufijo único (ej: COPIA-1420) para evitar colisiones de nombres
            const idUnico = Math.floor(Math.random() * 10000);
            const nuevoNombrePrograma = `${nombrePrograma} (CLON-${idUnico})`;

            snap.forEach(docSnap => {
                const data = docSnap.data();
                // Creamos una referencia nueva (ID de documento nuevo)
                const newRef = doc(collection(db, "programaciones"));
                
                // Extraemos los datos omitiendo el campo ID si existiera en el data
                const { id: _, ...cleanData } = data;

                const dataClon = {
                    ...cleanData,
                    PROGRAMA: nuevoNombrePrograma, // Nombre único para desvincularlo del original
                    timestamp: new Date()
                };

                batch.set(newRef, dataClon);
            });

            await batch.commit();
            alert(`✅ Programa clonado como: ${nuevoNombrePrograma}. Ahora puedes editar su nombre libremente.`);
            location.reload();

        } else {
            // CASO B: Clonar un Curso o Módulo individual
            const snap = await getDoc(doc(db, "programaciones", id));
            if (snap.exists()) {
                const data = snap.data();
                const { id: _, ...dataToClone } = data;

                await addDoc(colRef, {
                    ...dataToClone,
                    // Si es módulo de un programa, mantenemos el programa pero marcamos el curso
                    "MODULO-CURSO": `${dataToClone["MODULO-CURSO"] || "Sin Nombre"} (COPIA)`,
                    timestamp: new Date()
                });

                alert("✅ Registro individual clonado con éxito.");
                location.reload();
            }
        }
    } catch (err) {
        console.error("Error al clonar:", err);
        alert("Error: " + err.message);
    }
};


// Selección de elementos
const inputNRC = document.getElementById('filterNRC');
const inputNombre = document.getElementById('filterNombre');
const tablaBody = document.getElementById('adminTableBody');

// Función principal de filtrado
function filtrarTabla() {
    const valNRC = inputNRC ? inputNRC.value.toLowerCase() : "";
    const valNombre = inputNombre ? inputNombre.value.toLowerCase() : "";
    const estaFiltrando = valNRC !== "" || valNombre !== "";

    const filas = Array.from(tablaBody.querySelectorAll('tr'));

    if (!estaFiltrando) {
        // Si no hay filtros, restauramos el estado original: master visible, hijos ocultos
        filas.forEach(f => {
            f.style.display = "";
            if (f.classList.contains('child-row-style')) {
                f.classList.add('hidden-row');
            }
            const btn = f.querySelector('.expand-btn');
            if (btn) {
                btn.textContent = '▸';
                btn.setAttribute('aria-expanded', 'false');
            }
        });
        return;
    }

    // Ocultar todo inicialmente para aplicar el filtro
    filas.forEach(f => f.style.display = "none");

    // Agrupar por programas para manejar la jerarquía
    const masterRows = filas.filter(f => f.classList.contains('prog-master-row'));
    
    masterRows.forEach(master => {
        const expandBtn = master.querySelector('.expand-btn');
        const progId = expandBtn ? expandBtn.getAttribute('data-prog') : null;
        const childRows = filas.filter(f => f.classList.contains(`prog-child-${progId}`));

        // Verificamos si el master o alguno de sus hijos coincide con los filtros
        const matchMaster = master.textContent.toLowerCase().includes(valNRC) && 
                            master.textContent.toLowerCase().includes(valNombre);
        
        const algunHijoCoincide = childRows.some(h => 
            h.textContent.toLowerCase().includes(valNRC) && 
            h.textContent.toLowerCase().includes(valNombre)
        );

        if (matchMaster || algunHijoCoincide) {
            master.style.display = "";
            // Si coincide el programa, mostramos TODOS sus módulos y expandimos visualmente
            childRows.forEach(h => {
                h.style.display = "";
                h.classList.remove('hidden-row');
            });
            if (expandBtn) {
                expandBtn.textContent = '▾';
                expandBtn.setAttribute('aria-expanded', 'true');
            }
        }
    });

    // Cursos independientes (los que no son ni master ni hijos de programa)
    filas.filter(f => !f.classList.contains('prog-master-row') && !f.classList.contains('child-row-style')).forEach(curso => {
        if (curso.textContent.toLowerCase().includes(valNRC) && 
            curso.textContent.toLowerCase().includes(valNombre)) {
            curso.style.display = "";
        }
    });
}

// Escuchadores de eventos para tiempo real
if (inputNRC) inputNRC.addEventListener('input', filtrarTabla);
if (inputNombre) inputNombre.addEventListener('input', filtrarTabla);

document.getElementById('btnFinalizar').onclick = () => location.reload();

document.getElementById('btnLogout').onclick = () => signOut(auth);

// --- GESTIÓN DE CRUCES DE HORARIO POR DOCENTE ---
function checkTeacherConflicts(docenteName) {
    const container = document.getElementById('conflictResultsContainer');
    if (!docenteName) {
        container.innerHTML = '';
        return;
    }

    const allDocs = window.lastDashboardDocs || [];
    const teacherDocs = allDocs.filter(d => (d.Docente || "").includes(docenteName));

    if (teacherDocs.length === 0) {
        container.innerHTML = '<p style="padding:20px; color:#64748b;">No hay horarios asignados para este docente.</p>';
        return;
    }

    // 1. ORDENAMIENTO INICIAL
    teacherDocs.sort((a, b) => (a["Fecha de inicio"] || "").localeCompare(b["Fecha de inicio"] || ""));

    // 2. LÓGICA DE AGRUPACIÓN PARA EL RESUMEN (El fragmento que analizamos)
    const scheduleGroups = {};
    teacherDocs.forEach(doc => {
        const sched = doc.Horario || "Sin Horario";
        if (!scheduleGroups[sched]) {
            scheduleGroups[sched] = {
                horario: sched,
                inicio: doc["Fecha de inicio"] || "---",
                fin: doc["Fecha de fin"] || "---",
                cursos: new Set()
            };
        }
        // Actualizar fechas extremas del grupo
        if (doc["Fecha de inicio"] && (scheduleGroups[sched].inicio === "---" || doc["Fecha de inicio"] < scheduleGroups[sched].inicio)) 
            scheduleGroups[sched].inicio = doc["Fecha de inicio"];
        if (doc["Fecha de fin"] && (scheduleGroups[sched].fin === "---" || doc["Fecha de fin"] > scheduleGroups[sched].fin)) 
            scheduleGroups[sched].fin = doc["Fecha de fin"];
        
        scheduleGroups[sched].cursos.add(doc["MODULO-CURSO"] || doc["PROGRAMA"]);
    });

    const groupedSchedules = Object.values(scheduleGroups).sort((a, b) => a.inicio.localeCompare(b.inicio));

    // 3. GENERACIÓN DEL HTML (Resumen + Tabla)
    let html = `
        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #bae6fd; margin-bottom: 20px;">
            <h3 style="font-size: 0.95rem; color: #0369a1; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.2rem;">📋</span> Resumen de Disponibilidad: ${docenteName}
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 12px;">
                ${groupedSchedules.map(g => `
                    <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.85rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <div style="color: #0ea5e9; font-weight: 700; margin-bottom: 6px; font-size: 0.9rem;">⏰ ${g.horario}</div>
                        <div style="color: #1e293b; font-weight: 600; margin-bottom: 4px;">📅 Periodo: ${g.inicio} al ${g.fin}</div>
                        <div style="color: #64748b; font-size: 0.75rem; line-height: 1.4;">
                            <strong>Cursos ocupando este horario:</strong><br>
                            ${Array.from(g.cursos).join(', ')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <h3 style="font-size: 0.95rem; color: #1e293b; margin-bottom: 10px;">Análisis Detallado de Conflictos</h3>
        <div class="table-container" style="margin-top:10px; overflow-x:auto;">
            <table class="report-table" style="min-width: 800px;">
                <thead>
                    <tr>
                        <th>Programa / Módulo</th>
                        <th>Periodo</th>
                        <th>Horario Detallado</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // 4. BUCLE DE DETECCIÓN DE CONFLICTOS (Tu lógica original)
    for (let i = 0; i < teacherDocs.length; i++) {
        const docA = teacherDocs[i];
        const scheduleA = parseHorario(docA.Horario);
        let hasConflict = false;
        let conflictDetails = [];

        for (let j = 0; j < teacherDocs.length; j++) {
            if (i === j) continue;
            const docB = teacherDocs[j];
            
            if (datesOverlap(docA["Fecha de inicio"], docA["Fecha de fin"], docB["Fecha de inicio"], docB["Fecha de fin"])) {
                const scheduleB = parseHorario(docB.Horario);
                const overlap = checkScheduleOverlap(scheduleA, scheduleB);
                if (overlap) {
                    hasConflict = true;
                    conflictDetails.push(`Cruce con: ${docB["MODULO-CURSO"] || docB["PROGRAMA"]} (${overlap})`);
                }
            }
        }

        html += `
            <tr style="${hasConflict ? 'background:#fff1f2;' : ''}">
                <td>
                    <strong>${docA["MODULO-CURSO"] || docA["PROGRAMA"]}</strong><br>
                    <small style="color:#64748b;">NRC: ${docA.NRC || '--'}</small>
                </td>
                <td>${docA["Fecha de inicio"]} al ${docA["Fecha de fin"]}</td>
                <td style="font-size:0.8rem;">${docA.Horario || '--'}</td>
                <td>
                    ${hasConflict 
                        ? `<span style="color:#e11d48; font-weight:bold;">⚠️ CRUCE DETECTADO</span><br><small style="color:#e11d48;">${conflictDetails.join('<br>')}</small>` 
                        : '<span style="color:#10b981; font-weight:bold;">✅ OK</span>'}
                </td>
            </tr>
        `;
    }

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}


function parseHorario(str) {
    if (!str) return [];
    return str.split(' | ').map(b => {
        const match = b.match(/BLOQUE: (.*?): (.*?) \((.*?) a (.*?)\)/);
        return match ? { type: match[1], days: match[2].split('-').map(d => d.trim()), start: match[3], end: match[4] } : null;
    }).filter(Boolean);
}

function datesOverlap(sA, eA, sB, eB) { return (sA && eA && sB && eB) ? (sA <= eB && eA >= sB) : false; }

function checkScheduleOverlap(schedA, schedB) {
    for (const bA of schedA) {
        for (const bB of schedB) {
            const commonDays = bA.days.filter(d => bB.days.includes(d));
            if (commonDays.length > 0 && bA.start < bB.end && bB.start < bA.end) {
                return `Días: ${commonDays.join(', ')} (${bA.start}-${bA.end} vs ${bB.start}-${bB.end})`;
            }
        }
    }
    return null;
}