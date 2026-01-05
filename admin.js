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

const FERIADOS_2026 = ["2026-01-01", "2026-04-02", "2026-04-03", "2026-05-01", "2026-06-07", "2026-06-29", "2026-07-23", "2026-07-28", "2026-07-29", "2026-08-06", "2026-08-30", "2026-10-08", "2026-11-01", "2026-12-08", "2026-12-09", "2026-12-25"];
const CAMPOS_CABECERA = ["Item", "EMPRESA", "Docente", "AÑO", "PROGRAMA", "EDICIÓN", "MODALIDAD PROGRAMA"];
const CAMPOS_GESTION = ["MODULO-CURSO", "MODALIDAD MÓDULO", "MAT-CUR", "NRC Semilla", "NRC", "Horario", "Duracion", "Fecha de inicio", "Fecha de fin", "Precio Sinfo", "#Participantes Objetivo", "#Participantes Real Total", "#Participantes aprobados", "# participantes desertaron", "Software-Aplicativo", "OBS"];
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
    
    // CORRECCIÓN BOTÓN AGREGAR (SOLUCIÓN AL LAG)
    const btnSubirModulo = document.getElementById('btnSubirModulo');
    if (btnSubirModulo) {
        btnSubirModulo.onclick = (e) => {
            e.preventDefault();
            const data = recolectarDatosGestion();
            if(!data.NRC || !data["MODULO-CURSO"]) return alert("⚠️ Complete NRC y Nombre del Módulo");

            modulosTemporales.push(data);
            actualizarListaVisual();
            vaciarCamposModuloControlado(data["Fecha de fin"]);
            
            const item = document.getElementById('f_Item');
            if(item) item.value = parseInt(item.value) + 1;
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
        const q = query(colRef, where("PROGRAMA", "==", nombrePrograma), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            document.getElementById('regType').value = "PROGRAMA";
            document.getElementById('regType').dispatchEvent(new Event('change'));
            CAMPOS_CABECERA.forEach(c => {
                const el = document.getElementById(`f_${c.replace(/ /g, "_")}`);
                if (el) el.value = data[c] || "";
            });
            window.editandoProgramaActivo = nombrePrograma;
            const btnSave = document.getElementById('btnSubmitMain');
            btnSave.textContent = "ACTUALIZAR CABECERA (TODO EL PROGRAMA)";
            btnSave.style.background = "#0369a1";
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) { console.error(error); }
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

    if (window.editandoProgramaActivo) {
        try {
            const batch = writeBatch(db);
            const nCabecera = {};
            CAMPOS_CABECERA.forEach(c => { nCabecera[c] = document.getElementById(`f_${c.replace(/ /g, "_")}`).value; });
            const q = query(colRef, where("PROGRAMA", "==", window.editandoProgramaActivo));
            const snap = await getDocs(q);
            snap.forEach(d => batch.update(d.ref, nCabecera));
            await batch.commit();
            alert("✅ Programa actualizado.");
            location.reload();
            return;
        } catch (err) { alert(err.message); return; }
    }

    if (tipo === "PROGRAMA" && modulosTemporales.length === 0) return alert("Agregue módulos.");
    try {
        const cab = {};
        CAMPOS_CABECERA.forEach(c => { cab[c] = document.getElementById(`f_${c.replace(/ /g, "_")}`).value; });
        if (tipo === "PROGRAMA") {
            for (const m of modulosTemporales) { await addDoc(colRef, { ...cab, ...m, TIPO: "MÓDULO", timestamp: new Date() }); }
            alert("✅ Programa publicado.");
        } else if (selectedDocId) {
            await updateDoc(doc(db, "programaciones", selectedDocId), { ...cab, ...recolectarDatosGestion(), timestamp: new Date() });
            alert("✅ Registro actualizado.");
        } else {
            await addDoc(colRef, { ...cab, ...recolectarDatosGestion(), TIPO: "CURSO", timestamp: new Date() });
            alert("✅ Curso publicado.");
        }
        location.reload();
    } catch (err) { alert(err.message); }
};

// EXCEL FUNCTIONS
document.getElementById('btnDescargarPlantilla').onclick = () => {
    const head = ["TIPO", "Item", "EMPRESA", "Docente", "AÑO", "PROGRAMA", "EDICIÓN", "MODALIDAD PROGRAMA", "MODULO-CURSO", "MODALIDAD MÓDULO", "MAT-CUR", "NRC Semilla", "NRC", "Horario", "Duracion", "Fecha de inicio", "Fecha de fin", "Precio Sinfo", "#Participantes Objetivo", "#Participantes Real Total", "#Participantes aprobados", "# participantes desertaron", "Software-Aplicativo", "OBS", "curso virtualizado", "Con nota en SINFO?", "Con certificados emitidos?", "Con atributo?_SSADETL", "Con acta de notas_SFASLST", "Con VAEE (SENATI VIRTUAL)"];
    const ws = XLSX.utils.json_to_sheet([{"TIPO":"MÓDULO","PROGRAMA":"EJEMPLO","MODULO-CURSO":"MOD 1","NRC":"00000"}], { header: head });
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
        snap.forEach((d) => {
            const dt = d.data();
            const label = dt.TIPO === "MÓDULO" ? "[MOD]" : "[CUR]";
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="padding:12px;">${dt.NRC || '--'}</td><td style="padding:12px;"><b>${label}</b> ${dt.PROGRAMA || dt["MODULO-CURSO"]}</td><td style="padding:12px;">${dt["Fecha de inicio"] || '--'}</td><td style="text-align:center;"><button onclick="prepareEdit('${d.id}')">✏️</button>${dt.TIPO==="MÓDULO" ? `<button onclick="prepareEditPrograma('${dt.PROGRAMA}')">🏢</button>` : ''}<button onclick="deleteRecord('${d.id}')">🗑️</button></td>`;
            tbody.appendChild(tr);
        });
    });
}

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

document.getElementById('btnFinalizar').onclick = () => location.reload();
document.getElementById('btnLogout').onclick = () => signOut(auth);