import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

const DOCENTE_IDS = {
    "ANDRES CCOCA": "000310149",
    "CARMELON GONZALES": "1140234",
    "JONATAN BEGAZO": "000872470",
    "JORGE CAYCHO": "001489131",
    "LUIS QUELOPANA": "000275632",
    "MARCO POLO": "419010",
    "MARIA PEREZ": "000508547",
    "MARTA LAURA": "001108028",
    "MARTHA MAYTA": "001470313",
    "NANCY PACHECO": "000908855",
    "RICARDO MORENO": "001404715",
    "ROBERT CALDERON": "000070025",
    "VICTOR HUAMANÍ": "000697786",
    "VICTOR GASTAÑETA": "001514007"
};

// Configuración de campos
const CAMPOS_MODAL = ["Part_Programa", "Part_Curso", "Part_Beca", "Part_Pago_Programa", "Part_Pago_Curso"];

// Estado de la aplicación
let selectedDocId = null;
let currentYear = "all";
let currentMonth = "all";
let currentDocente = "all";
let currentPrograma = "all";
let currentModuloQuery = "";
let currentNrcQuery = "";
let hideStartedCourses = false;
let userLogged = null;
let lastSnapshotData = [];
let sortDateAsc = true; // Control de orden ascendente/descendente de fecha

let selectedEmpresas = []; // Almacena las empresas marcadas


// --- SEGURIDAD Y CARGA INICIAL ---
onAuthStateChanged(auth, (user) => {
    userLogged = user;
    const btn = document.getElementById('btnAuthNav');
    if (btn) {
        btn.textContent = user ? "Panel Admin" : "Acceso Administrador";
        btn.onclick = () => window.location.href = user ? 'admin.html' : 'login.html';
    }
    loadData(); 
});

// --- GESTIÓN DE DATOS ---
function loadData() {
    const q = query(colRef, orderBy("Fecha de inicio", "asc"));
    onSnapshot(q, (snapshot) => {
        lastSnapshotData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderFromData(lastSnapshotData);
    });
}

function renderFromData(rawData) {
    try {
        const tbody = document.getElementById('publicTableBody'); 
        if (!tbody) return;
        tbody.innerHTML = '';

        // 1. Filtrado lógico integral
        const filtered = rawData.filter(d => {
            // Filtro de Año
            if (currentYear !== "all" && (d["Fecha de inicio"] || "").split('-')[0] !== currentYear) return false;

            // Filtro de Mes
            if (currentMonth !== "all" && (d["Fecha de inicio"] || "").split('-')[1] !== currentMonth) return false;
            
            // Filtro de Docente
            if (currentDocente !== 'all') {
                const docStr = (d.Docente || '').toLowerCase();
                if (!docStr.includes(currentDocente.toLowerCase())) return false;
            }
            
            // Filtro de Programa (Selector)
            if (currentPrograma !== 'all' && (d.PROGRAMA || '').toLowerCase() !== currentPrograma.toLowerCase()) return false;

            // --- CORRECCIÓN: FILTRO MULTIPLE POR EMPRESA (CHECKBOXES) ---
            // Eliminamos 'currentEmpresa' para evitar conflictos
            if (selectedEmpresas.length > 0) {
                const empresaDoc = (d.EMPRESA || '').trim();
                if (!selectedEmpresas.includes(empresaDoc)) return false;
            }
            
            // Búsqueda por texto (Módulo o Programa)
            if (currentModuloQuery.trim() !== '') {
                const q = currentModuloQuery.toLowerCase();
                const mod = (d['MODULO-CURSO'] || '').toLowerCase();
                const prog = (d['PROGRAMA'] || '').toLowerCase();
                if (!mod.includes(q) && !prog.includes(q)) return false;
            }

            // Filtro por NRC
            if (currentNrcQuery.trim() !== '') {
                const qNrc = currentNrcQuery.toLowerCase();
                const nrcVal = (d.NRC || '').toLowerCase();
                if (!nrcVal.includes(qNrc)) return false;
            }

            // Filtro para ocultar cursos iniciados
            if (hideStartedCourses) {
                const fechaInicio = d["Fecha de inicio"];
                if (fechaInicio) {
                    const hoy = new Date().toISOString().split('T')[0];
                    if (fechaInicio < hoy) return false;
                }
            }

            return true;
        });

        // 2. Actualización de UI y opciones de filtros
        window.proximosIds = filtered.slice(0, 3).map(d => d.id);
        populateFilterOptions(rawData);

        // 3. Agrupamiento por Programas
        const programasMap = {};
        const independientes = [];

        filtered.forEach(item => {
            // Asegúrate que TIPO sea exactamente igual a tu DB (MÓDULO o PROGRAMA)
            if (item.TIPO === "MÓDULO") { 
                if (!programasMap[item.PROGRAMA]) programasMap[item.PROGRAMA] = [];
                programasMap[item.PROGRAMA].push(item);
            } else {
                independientes.push(item);
            }
        });

        // 4. Crear bloques para ordenar globalmente
        const renderBlocks = [];

        Object.keys(programasMap).forEach(nombreProg => {
            const modulos = programasMap[nombreProg];

            const tieneModuloUno = modulos.some(m => (parseInt(m["Modulo Orden"]) || 0) === 1);

            if (!tieneModuloUno) {
                modulos.forEach(m => renderBlocks.push({ type: 'curso', data: m, date: m["Fecha de inicio"] || "9999-12-31" }));
                return;
            }

            const progId = nombreProg.replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/gi, '').toLowerCase();
            
            // Ordenar módulos por fecha de inicio
            const modulosOrdenados = [...modulos].sort((a, b) => new Date(a["Fecha de inicio"]) - new Date(b["Fecha de inicio"]));
            const primerModulo = modulosOrdenados[0];
            
            renderBlocks.push({ 
                type: 'programa', 
                nombreProg, 
                progId,
                modulos: modulosOrdenados, 
                primerModulo,
                date: primerModulo["Fecha de inicio"] || "9999-12-31" 
            });
        });

        independientes.forEach(c => renderBlocks.push({ type: 'curso', data: c, date: c["Fecha de inicio"] || "9999-12-31" }));

        // 5. Ordenar bloques por fecha
        renderBlocks.sort((a, b) => {
            const valA = a.date === "9999-12-31" ? Infinity : new Date(a.date).getTime();
            const valB = b.date === "9999-12-31" ? Infinity : new Date(b.date).getTime();
            return sortDateAsc ? (valA - valB) : (valB - valA);
        });

        // 6. Renderizado Final ordenado
        renderBlocks.forEach(block => {
            if (block.type === 'curso') {
                tbody.appendChild(createDataRow(block.data, 'curso-row-style'));
            } else {
                const { nombreProg, progId, modulos, primerModulo } = block;

            // Datos de cabecera de programa
            const codigoProg = primerModulo["f_CODIGO_PROGRAMA"] || primerModulo["PROGRAMA"] || 'Sin Código';
            const partObjetivoProg = parseInt(primerModulo["#Participantes Objetivo"]) || 0;
            const duracionTotal = modulos.reduce((acc, m) => acc + (parseInt(m["Duracion"] || m["Duración"]) || 0), 0);

            const trMaster = document.createElement('tr');
            trMaster.className = 'prog-master-row';
            trMaster.style.cursor = "pointer";
            trMaster.style.backgroundColor = "#f1f5f9"; 
            
            trMaster.innerHTML = `
                <td><strong>${primerModulo["Fecha de inicio"] || '-'}</strong></td>
                <td colspan="2">
                    <strong>📂 PROGRAMA: ${nombreProg}</strong><br>
                    <small style="color:#0ea5e9;">ID: ${codigoProg}</small>
                </td>
                <td style="text-align:center;">---</td>
                <td>${duracionTotal} hrs</td>
                <td style="font-size:10px;">${primerModulo["Horario"] || '-'}</td>
                <td style="text-align:center;">---</td>
                <td style="text-align:center;"><strong>${partObjetivoProg}</strong></td>
                <td style="text-align:center;">---</td> 
            `;

            trMaster.onclick = () => {
                const childRows = document.querySelectorAll(`.prog-child-${progId}`);
                childRows.forEach(row => row.classList.toggle('hidden-row'));
            };

            tbody.appendChild(trMaster);
            modulos.forEach(m => {
                tbody.appendChild(createDataRow(m, `prog-child-${progId} hidden-row child-row-style`));
            });
            }
        });

    } catch (err) {
        console.error('Error en renderFromData:', err);
    }
}

function createDataRow(d, customClass = '') {
    const tr = document.createElement('tr');
    const esProximo = typeof proximosIds !== 'undefined' && proximosIds.includes(d.id);
    tr.className = `${customClass} ${esProximo ? 'highlight-urgent' : ''}`;
    tr.style.cursor = "pointer";
    const nombreModuloCurso = d["MODULO-CURSO"] || d["PROGRAMA"] || "---";

    tr.innerHTML = `
        <td>
            <strong>${d["Fecha de inicio"] || '--'}</strong>
            ${esProximo ? '<br><span class="badge-urgent">PRÓXIMO</span>' : ''}
        </td>
        <td style="color: #64748b; font-size: 0.85rem;">${d["PROGRAMA"] || 'CURSO INDEP.'}</td>
        <td><strong>${nombreModuloCurso}</strong></td>
        <td>${d["Docente"] || '--'}</td>
        <td>${d.Duracion || d.Duración || '--'} hrs</td>
        <td style="font-size:10px;">${d.Horario || '--'}</td>
        <td>
            ${d.NRC || '--'}
            ${userLogged ? `<br><button class="btn-nrc-info" onclick="event.stopPropagation(); window.showNrcDetails('${d.id}')">DATOS NRC</button>` : ''}
        </td>
        <td style="text-align:center;">${d["#Participantes Objetivo"] || 0}</td>
        <td style="text-align:center;">${d["#Participantes Real Total"] || 0}</td>
    `;
    tr.onclick = () => openQuickEdit(d.id, d);
    return tr;
}

window.showNrcDetails = (id) => {
    const d = lastSnapshotData.find(item => item.id === id);
    if (!d) return;
    
    const docenteRaw = d.Docente || '';
    const ids = docenteRaw.split(',')
        .map(name => name.trim())
        .map(name => DOCENTE_IDS[name] || 'N/A')
        .join(', ');

    const msg = `📋 DATOS TÉCNICOS NRC\n\n` +
                `• NRC SEMILLA: ${d["NRC Semilla"] || '---'}\n` +
                `• PRECIO SINFO: S/ ${d["Precio Sinfo"] || '0'}\n` +
                `• HORARIO: ${d.Horario || '---'}\n` +
                `• FECHA INICIO: ${d["Fecha de inicio"] || '---'}\n` +
                `• FECHA FIN: ${d["Fecha de fin"] || '---'}\n` +
                `• DOCENTE: ${docenteRaw || '---'}\n` +
                `• ID DOCENTE: ${ids}\n` +
                `• ATRIBUTO: ${d["Con atributo?_SSADETL"] || 'NO'}`;

    const modal = document.getElementById('nrcDetailsModal');
    const textArea = document.getElementById('nrcDetailsText');
    if (modal && textArea) {
        textArea.value = msg;
        modal.classList.remove('hidden');
    }
};

// --- GESTIÓN DE FILTROS ---
function populateFilterOptions(rawData) {
    const docentesSet = new Set();
    const programasSet = new Set();
    const empresasSet = new Set();
    const yearsSet = new Set();

    rawData.forEach(d => {
        if (d.Docente) d.Docente.split(',').map(s => s.trim()).forEach(s => { if (s) docentesSet.add(s); });
        if (d.PROGRAMA) programasSet.add(d.PROGRAMA);
        if (d.EMPRESA) empresasSet.add(d.EMPRESA);
        if (d["Fecha de inicio"]) {
            const y = d["Fecha de inicio"].split('-')[0];
            if (y) yearsSet.add(y);
        }
    });

    const ySel = document.getElementById('yearFilter');
    if (ySel) {
        const val = ySel.value || 'all';
        ySel.innerHTML = '<option value="all">Todos los años</option>' + 
            Array.from(yearsSet).sort().reverse().map(y => `<option value="${y}">${y}</option>`).join('');
        ySel.value = (val === 'all' || Array.from(yearsSet).includes(val)) ? val : 'all';
    }

    // Filtros de Docente y Programa (Selectores estándar)
    const dSel = document.getElementById('docenteFilter');
    if (dSel) {
        const val = dSel.value || 'all';
        dSel.innerHTML = '<option value="all">Todos los docentes</option>' + 
            Array.from(docentesSet).sort().map(d => `<option value="${d}">${d}</option>`).join('');
        dSel.value = Array.from(docentesSet).includes(val) ? val : 'all';
    }

    const pSel = document.getElementById('programaFilter');
    if (pSel) {
        const val = pSel.value || 'all';
        pSel.innerHTML = '<option value="all">Todos los programas</option>' + 
            Array.from(programasSet).sort().map(p => `<option value="${p}">${p}</option>`).join('');
        pSel.value = Array.from(programasSet).includes(val) ? val : 'all';
    }

    // --- LÓGICA DE DESPLEGABLE: Checkboxes para Empresa ---
    const container = document.getElementById('empresaCheckboxContainer');
    const summaryText = document.getElementById('empresaSummaryText');
    
    if (container) {
        // Actualizar el texto dinámico del desplegable
        if (summaryText) {
            summaryText.textContent = selectedEmpresas.length > 0 
                ? `${selectedEmpresas.length} seleccionada(s)` 
                : "Seleccionar Empresas";
        }

        // Generar el HTML de las casillas con estilo mejorado para lista
        container.innerHTML = Array.from(empresasSet).sort().map(e => `
            <label style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; font-size:0.85rem; border-radius:4px; transition: background 0.2s;">
                <input type="checkbox" class="empresa-ck" value="${e}" ${selectedEmpresas.includes(e) ? 'checked' : ''}>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${e}</span>
            </label>
        `).join('');

        // Eventos para las casillas
        document.querySelectorAll('.empresa-ck').forEach(ck => {
            ck.onchange = (e) => {
                e.stopPropagation(); // Evita cierres accidentales en algunos navegadores
                const val = ck.value;
                if (ck.checked) {
                    if (!selectedEmpresas.includes(val)) selectedEmpresas.push(val);
                } else {
                    selectedEmpresas = selectedEmpresas.filter(item => item !== val);
                }
                renderFromData(lastSnapshotData); // Ejecutar el filtrado y actualizar texto
            };
        });
    }
}



// --- MODAL DE EDICIÓN RÁPIDA ---
function openQuickEdit(id, data) {
    selectedDocId = id;
    const modal = document.getElementById('quickEditModal');
    document.getElementById('courseNameTitle').textContent = data["MODULO-CURSO"] || data["PROGRAMA"] || "Sin nombre";

    // Cargar NRC
    const nrcInput = document.getElementById('q_NRC');
    if (nrcInput) nrcInput.value = data.NRC || "";

    let sumaActual = 0;
    CAMPOS_MODAL.forEach(campo => {
        const idInput = `q_${campo.replace(/ /g, "_")}`;
        const inputEl = document.getElementById(idInput);
        if (inputEl) {
            const valor = parseInt(data[campo] || data[campo.replace(/_/g, " ")] || 0);
            inputEl.value = valor;
            sumaActual += valor;
        }
    });

    document.getElementById('q_Total_Calculado').textContent = sumaActual;
    const adminActions = document.getElementById('modalAdminActions');
    const inputs = modal.querySelectorAll('.q-input');
    
    inputs.forEach(i => i.disabled = !userLogged);
    if (adminActions) userLogged ? adminActions.classList.remove('hidden') : adminActions.classList.add('hidden');

    modal.classList.remove('hidden');
}

// Inicializar eventos de inputs del modal para suma en tiempo real
CAMPOS_MODAL.forEach(campo => {
    const idInput = `q_${campo.replace(/ /g, "_")}`;
    const el = document.getElementById(idInput);
    if (el) {
        el.addEventListener('input', () => {
            let nuevoTotal = 0;
            CAMPOS_MODAL.forEach(c => {
                const idC = `q_${c.replace(/ /g, "_")}`;
                nuevoTotal += parseInt(document.getElementById(idC).value || 0);
            });
            document.getElementById('q_Total_Calculado').textContent = nuevoTotal;
        });
    }
});


const btnSaveQuick = document.getElementById('btnSaveQuick');
if (btnSaveQuick) {
    btnSaveQuick.onclick = async () => {
        if (!userLogged || !selectedDocId) return;

        const updates = {};
        let totalReal = 0;

        // Capturar NRC
        const nrcInput = document.getElementById('q_NRC');
        if (nrcInput) updates["NRC"] = nrcInput.value;

        // Itera sobre cada campo para capturar el valor numérico
        CAMPOS_MODAL.forEach(campo => {
            const inputId = `q_${campo}`; // Coincide con el ID en index.html
            const el = document.getElementById(inputId);
            
            if (el) {
                const val = parseInt(el.value || 0);
                // Se guarda en la DB usando el nombre exacto del campo (ej: Part_Programa)
                updates[campo] = val; 
                totalReal += val;
            }
        });

        // Actualiza también el total sumado automáticamente
        updates["#Participantes Real Total"] = totalReal;

        try {
            // Actualización atómica en Firebase Firestore
            await updateDoc(doc(db, "programaciones", selectedDocId), updates);
            closeModal();
            alert("✅ Cantidades actualizadas correctamente en la base de datos.");
        } catch (e) {
            console.error("Error al actualizar:", e);
            alert("Error: No se pudo guardar en la base de datos.");
        }
    };
}
const closeModal = () => { 
    document.getElementById('quickEditModal').classList.add('hidden'); 
    selectedDocId = null; 
};

document.getElementById('btnCloseModal').onclick = closeModal;

// Eventos de Filtros
document.getElementById('yearFilter').onchange = (e) => { currentYear = e.target.value; renderFromData(lastSnapshotData); };
document.getElementById('monthFilter').onchange = (e) => { currentMonth = e.target.value; renderFromData(lastSnapshotData); };
document.getElementById('docenteFilter').onchange = (e) => { currentDocente = e.target.value; renderFromData(lastSnapshotData); };
document.getElementById('programaFilter').onchange = (e) => { currentPrograma = e.target.value; renderFromData(lastSnapshotData); };
document.getElementById('moduloFilter').oninput = (e) => { currentModuloQuery = e.target.value; renderFromData(lastSnapshotData); };
document.getElementById('hideStartedFilter').onchange = (e) => { hideStartedCourses = e.target.checked; renderFromData(lastSnapshotData); };
const nrcFilterInput = document.getElementById('nrcFilterInput'); if (nrcFilterInput) { nrcFilterInput.oninput = (e) => { currentNrcQuery = e.target.value; renderFromData(lastSnapshotData); }; }

// Evento para ordenar por fecha desde el encabezado de tabla
const btnSortFecha = document.getElementById('btnSortFecha');
if (btnSortFecha) {
    btnSortFecha.onclick = () => {
        sortDateAsc = !sortDateAsc;
        document.getElementById('sortIconDate').textContent = sortDateAsc ? '🔼' : '🔽';
        renderFromData(lastSnapshotData);
    };
}

// Eventos para el modal de detalles NRC
document.getElementById('btnCloseNrcModal').onclick = () => {
    document.getElementById('nrcDetailsModal').classList.add('hidden');
};

document.getElementById('btnCopyNrcModal').onclick = () => {
    const textArea = document.getElementById('nrcDetailsText');
    navigator.clipboard.writeText(textArea.value).then(() => {
        alert("✅ ¡Información completa copiada al portapapeles!");
    });
};

// Al final de app.js, junto a los otros eventos
document.getElementById('empresaFilter').onchange = (e) => { 
    currentEmpresa = e.target.value; 
    renderFromData(lastSnapshotData); 
};


// Cerrar modal al clickear fuera
window.onclick = (e) => {
    const modal = document.getElementById('quickEditModal');
    if (e.target === modal) closeModal();
};