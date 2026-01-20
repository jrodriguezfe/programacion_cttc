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
            const configSection = document.querySelector('.section-header-collapsible');
            if (configSection) {
                const contentSection = configSection.nextElementSibling;
                if (contentSection && contentSection.style.display === 'none') {
                    configSection.click(); // Simular click para abrir
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

        // Actualizar en Firebase

        await setDoc(doc(db, "programaciones", moduloId), {

            "Fecha de inicio": nuevaFechaInicio

        }, { merge: true });

       

        // Actualizar en modulosTemporales si estamos editando un programa

        if (window.editandoProgramaActivo === nombrePrograma) {

            const modIndex = modulosTemporales.findIndex(m => m.id === moduloId);

            if (modIndex !== -1) {

                modulosTemporales[modIndex]["Fecha de inicio"] = nuevaFechaInicio;

                // Recalcular todas las fechas en cascada

                await recalcularFechasModulosCascadaDesdeTabla(nombrePrograma);

            }

        }

       

        // Recargar la tabla

        loadAdminTable();

    } catch (err) {

        console.error("Error al actualizar fecha:", err);

        alert("Error al actualizar la fecha: " + err.message);

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

    const cols = ["TIPO", ...CAMPOS_CABECERA, ...CAMPOS_GESTION, ...CAMPOS_CHECKBOX];

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



// 8. LISTADO

function loadAdminTable() {

    const tbody = document.getElementById('adminTableBody');

    if (!tbody) return;

    onSnapshot(query(colRef, orderBy("timestamp", "desc")), (snap) => {

        tbody.innerHTML = '';

        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));



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

                                <input type="date" class="fecha-modulo-fin" data-modulo-id="${m.id}" value="${fechaFin}" disabled style="padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; width: 120px; background: #f1f5f9; cursor: not-allowed;">

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

                            <input type="date" class="fecha-modulo-fin" data-modulo-id="${c.id}" value="${fechaFin}" disabled style="padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; width: 120px; background: #f1f5f9; cursor: not-allowed;">

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

        // Abrir la sección de configuración
        const configHeader = document.querySelector('.section-header-collapsible');
        if (configHeader && configHeader.nextElementSibling.style.display === 'none') {
            toggleSection(configHeader);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    if (!confirm("¿Deseas clonar este registro? Se creará una copia con los mismos datos.")) return;



    try {

        if (nombrePrograma && nombrePrograma !== 'Sin Programa') {

            // CASO A: Clonar un Programa Completo (Todos sus módulos)

            const q = query(colRef, where("PROGRAMA", "==", nombrePrograma));

            const snap = await getDocs(q);

            const batch = writeBatch(db);

           

            snap.forEach(docSnap => {

                const data = docSnap.data();

                const newRef = doc(collection(db, "programaciones"));

                // Limpiamos IDs y actualizamos timestamp para que aparezca arriba

                // Aseguramos que TIPO se mantiene (MÓDULO o CURSO) y copiamos todos los campos

                const dataClon = {

                    ...data,

                    PROGRAMA: `${data.PROGRAMA} (COPIA)`,

                    TIPO: data.TIPO || "MÓDULO",

                    timestamp: new Date()

                };

                

                // Asegurar que los campos de fecha se copien

                if (data["Fecha de inicio"]) dataClon["Fecha de inicio"] = data["Fecha de inicio"];

                if (data["Fecha de fin"]) dataClon["Fecha de fin"] = data["Fecha de fin"];

                if (data["Modulo Orden"]) dataClon["Modulo Orden"] = data["Modulo Orden"];

                

                batch.set(newRef, dataClon);

            });

            await batch.commit();

            alert("✅ Programa completo clonado como copia.");

            location.reload();

        } else {

            // CASO B: Clonar un Curso o Módulo individual

            const snap = await getDoc(doc(db, "programaciones", id));

            if (snap.exists()) {

                const data = snap.data();

                const { id: _, ...dataToClone } = data; // Eliminar ID antiguo

               

                await addDoc(colRef, {

                    ...dataToClone,

                    "MODULO-CURSO": `${dataToClone["MODULO-CURSO"] || dataToClone["PROGRAMA"]} (COPIA)`,

                    timestamp: new Date()

                });

                alert("✅ Registro clonado con éxito.");

                location.reload();

            }

        }

    } catch (err) {

        console.error("Error al clonar:", err);

        alert("Error: " + err.message);

    }

};



document.getElementById('btnFinalizar').onclick = () => location.reload();

document.getElementById('btnLogout').onclick = () => signOut(auth);