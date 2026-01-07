import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, query, orderBy, onSnapshot, 
    updateDoc, deleteDoc, doc, getDocs, limit, getDoc, writeBatch, where 
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

    else if (campo === "PROGRAMA") input = `<select id="${id}"><option value="">Seleccione...</option>${PROGRAMAS_NOMBRES.map(p => `<option value="${p}">${p}</option>`).join('')}</select>`;
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
    
    // 1. Recolección de Horario (Bloques)
    document.querySelectorAll('.horario-bloque').forEach(b => {
        const dias = Array.from(b.querySelectorAll('.btn-dia.active')).map(btn => btn.textContent);
        if (dias.length > 0) {
            horarioStr += `${b.querySelector('p').textContent}: ${dias.join('-')} (${b.querySelector('.t-ini').value} a ${b.querySelector('.t-fin').value}) | `;
        }
    });

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
    if(!nombrePrograma) return;
    try {
        // 1. Cargar datos de la Cabecera (del primer registro encontrado)
        const qCabecera = query(colRef, where("PROGRAMA", "==", nombrePrograma), limit(1));
        const snapCabecera = await getDocs(qCabecera);
        
        if (!snapCabecera.empty) {
            const data = snapCabecera.docs[0].data();
            
            // Cambiar el tipo de registro a PROGRAMA para mostrar los campos correctos
            const regTypeSelect = document.getElementById('regType');
            regTypeSelect.value = "PROGRAMA";
            regTypeSelect.dispatchEvent(new Event('change'));
            
            // --- MAPEO DE CAMPOS CABECERA ---
            CAMPOS_CABECERA.forEach(c => {
                const idHTML = `f_${c.replace(/ /g, "_")}`;
                const el = document.getElementById(idHTML);
                if (el) {
                    // Lógica de prioridad para nombres de campos
                    if (c === "f_CODIGO_PROGRAMA") {
                        el.value = data["f_CODIGO_PROGRAMA"] || data["CODIGO-PROGRAMA"] || "";
                    } else {
                        el.value = data[c] || "";
                    }
                }
            });

            // --- CARGA MANUAL DE CAMPOS CRÍTICOS (Faltantes) ---
            // Estos campos a veces no están en CAMPOS_CABECERA pero son necesarios
            const extraMappings = {
                "f_Horario": data["Horario"],
                "f_Fecha_de_inicio": data["Fecha de inicio"],
                "f_Part_Programa": data["Part Programa"] || data["Part_Programa"],
                "f_CODIGO_PROGRAMA": data["f_CODIGO_PROGRAMA"] || data["CODIGO-PROGRAMA"]
            };

            for (const [id, valor] of Object.entries(extraMappings)) {
                const el = document.getElementById(id);
                if (el && valor !== undefined) el.value = valor;
            }

            // 2. Recuperar y cargar todos los Módulos componentes
            const qModulos = query(colRef, 
                where("PROGRAMA", "==", nombrePrograma), 
                where("TIPO", "==", "MÓDULO"), 
                orderBy("Fecha de inicio", "asc")
            );
            const snapModulos = await getDocs(qModulos);
            
            modulosTemporales = [];
            snapModulos.forEach(docModulo => {
                modulosTemporales.push({ id: docModulo.id, ...docModulo.data() });
            });

            // Actualizar la interfaz
            actualizarListaVisual();

            window.editandoProgramaActivo = nombrePrograma;
            const btnSave = document.getElementById('btnSubmitMain');
            btnSave.textContent = "ACTUALIZAR PROGRAMA COMPLETO";
            btnSave.style.background = "#0369a1";
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) { 
        console.error("Error al recuperar programa:", error); 
        alert("Error al cargar los componentes del programa.");
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
document.getElementById('adminForm').onsubmit = async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('regType').value;

    // --- 1. LÓGICA DE DETECCIÓN PARA REPROGRAMACIÓN EN CASCADA ---
    let diffDiasUtiles = 0;
    let programaParaCascada = null;
    let ordenActual = 0;

    // Solo verificamos cascada si estamos editando un registro individual que ya existe en DB
    if (selectedDocId && !window.editandoProgramaActivo) {
        const snapAnterior = await getDoc(doc(db, "programaciones", selectedDocId));
        if (snapAnterior.exists()) {
            const dataAnt = snapAnterior.data();
            const fechaNueva = document.getElementById('f_Fecha_de_inicio').value;
            const fechaVieja = dataAnt["Fecha de inicio"];

            // Si la fecha cambió y es un MÓDULO, calculamos el desplazamiento
            if (fechaNueva !== fechaVieja && dataAnt.TIPO === "MÓDULO") {
                const d1 = new Date(fechaVieja + "T00:00:00");
                const d2 = new Date(fechaNueva + "T00:00:00");
                const diffMilis = d2 - d1;
                // Diferencia en días calendario (la función calcularDesplazamientoFecha se encargará de los útiles)
                diffDiasUtiles = Math.round(diffMilis / (1000 * 60 * 60 * 24));
                
                programaParaCascada = dataAnt.PROGRAMA;
                ordenActual = parseInt(dataAnt["Modulo Orden"]) || 0;
            }
        }
    }

    // --- 2. CASO: EDICIÓN DE PROGRAMA COMPLETO (DESDE EL MODAL DEL INDEX) ---
    if (window.editandoProgramaActivo) {
        try {
            const batch = writeBatch(db);
            const nCabecera = {};
            // Recolectar datos de cabecera comunes a todos los módulos
            CAMPOS_CABECERA.forEach(c => { 
                const el = document.getElementById(`f_${c.replace(/ /g, "_")}`);
                if (el) nCabecera[c] = el.value; 
            });

            // Actualizar o crear cada módulo en la lista temporal
            for (const m of modulosTemporales) {
                if (m.id) {
                    const docRef = doc(db, "programaciones", m.id);
                    batch.update(docRef, { ...nCabecera, ...m });
                } else {
                    const newRef = doc(collection(db, "programaciones"));
                    batch.set(newRef, { ...nCabecera, ...m, TIPO: "MÓDULO", timestamp: new Date() });
                }
            }
            
            await batch.commit();
            alert("✅ Programa y todos sus módulos actualizados correctamente.");
            location.reload();
            return;
        } catch (err) { 
            console.error("Error en batch update:", err);
            alert("Error al actualizar programa: " + err.message); 
            return; 
        }
    }

    // --- 3. CASO: NUEVA PUBLICACIÓN O EDICIÓN INDIVIDUAL ---
    if (tipo === "PROGRAMA" && modulosTemporales.length === 0) {
        return alert("⚠️ Debe agregar al menos un módulo para publicar un Programa.");
    }
    
    try {
        const cab = {};
        CAMPOS_CABECERA.forEach(c => { 
            const el = document.getElementById(`f_${c.replace(/ /g, "_")}`);
            if (el) cab[c] = el.value; 
        });
        
        const gestionData = recolectarDatosGestion();

        if (tipo === "PROGRAMA") {
            // Publicar múltiples módulos nuevos
            for (const m of modulosTemporales) { 
                await addDoc(colRef, { ...cab, ...m, TIPO: "MÓDULO", timestamp: new Date() }); 
            }
            alert("✅ Programa publicado con éxito.");
        } else if (selectedDocId) {
            // ACTUALIZAR REGISTRO INDIVIDUAL
            
            // Si se detectó cambio de fecha, ejecutar el efecto dominó primero
            if (programaParaCascada && diffDiasUtiles !== 0) {
                await ejecutarCascadaProgramas(programaParaCascada, ordenActual, diffDiasUtiles);
            }

            await updateDoc(doc(db, "programaciones", selectedDocId), { 
                ...cab, 
                ...gestionData, 
                timestamp: new Date() 
            });
            alert("✅ Registro actualizado. Se han movido las fechas de los módulos siguientes si correspondía.");
        } else {
            // Crear un curso independiente (CURSO)
            await addDoc(colRef, { ...cab, ...gestionData, TIPO: "CURSO", timestamp: new Date() });
            alert("✅ Curso publicado con éxito.");
        }
        location.reload();
    } catch (err) { 
        console.error("Error al guardar:", err);
        alert("Error: " + err.message); 
    }
};

// EXCEL FUNCTIONS
document.getElementById('btnDescargarPlantilla').onclick = () => {
    // Lista actualizada con los 5 nuevos campos de participantes
    const head = [
        "TIPO", "Item", "EMPRESA", "Docente", "AÑO", "PROGRAMA", "EDICIÓN", 
        "MODALIDAD PROGRAMA", "MODULO-CURSO", "MODALIDAD MÓDULO", "MAT-CUR", 
        "NRC Semilla", "NRC", "Horario", "Duracion", "Fecha de inicio", 
        "Fecha de fin", "Precio Sinfo", "#Participantes Objetivo", 
        "Part Programa", "Part Curso", "Part Beca", "Part Pago Programa", "Part Pago Curso", // Campos nuevos
        "#Participantes Real Total", "#Participantes aprobados", 
        "# participantes desertaron", "Software-Aplicativo", "OBS", 
        "curso virtualizado", "Con nota en SINFO?", "Con certificados emitidos?", 
        "Con atributo?_SSADETL", "Con acta de notas_SFASLST", "Con VAEE (SENATI VIRTUAL)"
    ];

    // Se incluye una fila de ejemplo con valores en 0 para los nuevos campos
    const ejemplo = {
        "TIPO": "MÓDULO",
        "PROGRAMA": "EJEMPLO",
        "MODULO-CURSO": "MOD 1",
        "NRC": "00000",
        "Part Programa": 0,
        "Part Curso": 0,
        "Part Beca": 0,
        "Part Pago Programa": 0,
        "Part Pago Curso": 0,
        "#Participantes Real Total": 0
    };

    const ws = XLSX.utils.json_to_sheet([ejemplo], { header: head });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_CTTC_2026.xlsx");
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

        // Renderizar programas con controles para expandir/contraer

        Object.keys(progMap).sort().forEach(progName => {
            const progId = progName.replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/gi, '').toLowerCase();
            
            // --- NUEVO: ORDENAR MÓDULOS POR NÚMERO DE ORDEN ---
            // Esto asegura que la secuencia 1, 2, 3... se respete visualmente
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
                    <button class="action-button" onclick="prepareEditPrograma('${progName}')" style="background:#0ea5e9; margin-left:5px;">Editar Prog.</button>
                </td>
            `;
            tbody.appendChild(trProg);

            // Enlazamos el manejador directamente al botón de expandir para evitar dependencias de re-query global
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
                
                // Se añade el número de módulo al nombre para mayor claridad visual
                const nombreModulo = m["Modulo Orden"] ? `[Mód. ${m["Modulo Orden"]}] ${m["MODULO-CURSO"]}` : m["MODULO-CURSO"];

                tr.innerHTML = `
                    <td style="padding:12px;">${m.NRC || '--'}</td>
                    <td style="padding:12px; padding-left: 30px;">${nombreModulo}</td>
                    <td style="padding:12px;">${m["Fecha de inicio"] || '--'}</td>
                    <td class="actions-col" style="text-align:center; padding:12px;">
                        <button class="action-button" onclick="prepareEdit('${m.id}')">✏️</button> 
                        <button class="action-button delete" onclick="deleteRecord('${m.id}')">🗑️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });

        // Renderizar cursos sueltos
        courses.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:12px;">${c.NRC || '--'}</td>
                <td style="padding:12px;"><b>[CUR]</b> ${c.PROGRAMA || c["MODULO-CURSO"]}</td>
                <td style="padding:12px;">${c["Fecha de inicio"] || '--'}</td>
                <td class="actions-col" style="text-align:center; padding:12px;"><button class="action-button" onclick="prepareEdit('${c.id}')">✏️</button> <button class="action-button delete" onclick="deleteRecord('${c.id}')">🗑️</button></td>
            `;
            tbody.appendChild(tr);
        });

        // Asignar control de expand/colapso
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.onclick = () => {
                const progId = btn.getAttribute('data-prog');
                const expanded = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                btn.textContent = expanded ? '▸' : '▾';
                document.querySelectorAll(`.prog-child-${progId}`).forEach(r => r.classList.toggle('hidden-row'));
            };
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
window.prepareEdit = async (id) => {
    selectedDocId = id;
    const snap = await getDoc(doc(db, "programaciones", id));
    if (snap.exists()) {
        const dt = snap.data();
        [...CAMPOS_CABECERA, ...CAMPOS_GESTION].forEach(c => {
            const el = document.getElementById(`f_${c.replace(/ /g, "_")}`);
            if (el) el.value = dt[c] || "";
        });
        CAMPOS_CHECKBOX.forEach(c => {
            const el = document.getElementById(`f_${c.replace(/ /g, "_")}`);
            if (el) el.checked = dt[c] === "SI";
        });

        // 3. RECONSTRUIR HORARIO VISUAL (si existe en el documento)
        if (dt.Horario) {
            rellenarHorarioVisual(dt.Horario);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};


function rellenarHorarioVisual(horarioStr) {
    if (!horarioStr || typeof horarioStr !== 'string') return;

    // 1. Asegurarse de que los bloques estén creados según la modalidad actual
    const modalidad = document.getElementById('f_MODALIDAD_MÓDULO')?.value || "Online";
    updateHorarioUI(modalidad);

    // 2. Separar los bloques (usualmente divididos por " | ")
    const bloques = horarioStr.split(' | ');

    bloques.forEach(bloqueTexto => {
        if (!bloqueTexto.trim()) return;

        // Extraer partes: "BLOQUE: ONLINE: Lun-Mar (08:00 a 10:00)"
        const match = bloqueTexto.match(/BLOQUE: (.*?): (.*?) \((.*?) a (.*?)\)/);
        if (match) {
            const [_, tipo, diasStr, horaIni, horaFin] = match;
            const diasArray = diasStr.split('-').map(s => s.trim());

            // Buscar el contenedor del bloque correcto (Online o Presencial)
            document.querySelectorAll('.horario-bloque').forEach(bloqueEl => {
                const titulo = bloqueEl.querySelector('p')?.textContent || '';

                if (titulo.includes(tipo)) {
                    // Marcar días
                    bloqueEl.querySelectorAll('.btn-dia').forEach(btn => {
                        if (diasArray.includes(btn.textContent)) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
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


async function ejecutarCascadaProgramas(nombrePrograma, ordenActual, diasMover) {
    if (diasMover === 0) return;

    // Consultamos los módulos del mismo programa con orden superior
    const q = query(
        colRef, 
        where("PROGRAMA", "==", nombrePrograma),
        where("Modulo Orden", ">", ordenActual)
    );
    
    const snap = await getDocs(q);
    const batch = writeBatch(db);

    snap.forEach(docSnap => {
        const data = docSnap.data();
        const fechaBase = data["Fecha de inicio"];
        // Usamos tu función existente para saltar domingos y feriados
        const nuevaFecha = calcularDesplazamientoFecha(fechaBase, diasMover);
        
        batch.update(doc(db, "programaciones", docSnap.id), {
            "Fecha de inicio": nuevaFecha
        });
    });

    await batch.commit();
}


document.getElementById('btnFinalizar').onclick = () => location.reload();
document.getElementById('btnLogout').onclick = () => signOut(auth);