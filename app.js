import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

let selectedDocId = null;
let currentMonth = "all";
let userLogged = null;

onAuthStateChanged(auth, (user) => {
    userLogged = user;
    const btn = document.getElementById('btnAuthNav');
    if (btn) {
        btn.textContent = user ? "Panel Admin" : "Acceso Administrador";
        btn.onclick = () => window.location.href = user ? 'admin.html' : 'login.html';
    }
    loadData(); 
});

function loadData() {
    const q = query(colRef, orderBy("Fecha de inicio", "asc"));

    onSnapshot(q, (snapshot) => {
        const tbody = document.getElementById('publicTableBody'); 
        if (!tbody) return;
        tbody.innerHTML = '';

        const rawData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const data = rawData.filter(d => currentMonth === "all" || (d["Fecha de inicio"] || "").split('-')[1] === currentMonth);
        
        // Declaramos globalmente en este scope para que createDataRow pueda leerla
        window.proximosIds = data.slice(0, 3).map(d => d.id);

        const programasMap = {};
        const independientes = [];

        data.forEach(item => {
            if (item.TIPO === "MÓDULO") {
                if (!programasMap[item.PROGRAMA]) programasMap[item.PROGRAMA] = [];
                programasMap[item.PROGRAMA].push(item);
            } else {
                independientes.push(item);
            }
        });

        // 1. Renderizar Programas
        Object.keys(programasMap).forEach(nombreProg => {
            const modulos = programasMap[nombreProg];
            const progId = nombreProg.replace(/\s+/g, '-');

            const modulosOrdenados = [...modulos].sort((a, b) => 
                new Date(a["Fecha de inicio"]) - new Date(b["Fecha de inicio"])
            );

            const primerModulo = modulosOrdenados[0];
            const codigoProg = primerModulo["f_CODIGO_PROGRAMA"] || primerModulo["PROGRAMA"] || 'Sin Código';
            
            const partObjetivoProg = parseInt(primerModulo["#Participantes Objetivo"]) || 0;
            const partRealProg = parseInt(primerModulo["#Participantes Real Total"]) || 0;
            const duracionTotal = modulos.reduce((acc, m) => acc + (parseInt(m["Duracion"] || m["Duración"]) || 0), 0);

            const trMaster = document.createElement('tr');
            trMaster.className = 'prog-master-row';
            trMaster.style.cursor = "pointer";
            trMaster.style.backgroundColor = "#f1f5f9"; 
            
            // Fila Maestra alineada a 9 columnas usando colspan="2"
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
                <td style="text-align:center;"><strong>${partRealProg}</strong></td>
            `;

            trMaster.onclick = (e) => {
                const childRows = document.querySelectorAll(`.prog-child-${progId}`);
                if (e.detail === 2) { 
                    openQuickEdit(primerModulo.id, primerModulo);
                } else {
                    childRows.forEach(row => row.classList.toggle('hidden-row'));
                }
            };

            tbody.appendChild(trMaster);

            modulos.forEach(m => {
                const objIndividual = parseInt(m["#Participantes Objetivo"]) || 0;
                const realIndividual = parseInt(m["#Participantes Real Total"]) || 0;

                // Lógica de sumatoria heredada para visualización
                const mVisual = {
                    ...m,
                    "#Participantes Objetivo": objIndividual + partObjetivoProg,
                    "#Participantes Real Total": realIndividual + partRealProg
                };

                tbody.appendChild(createDataRow(mVisual, `prog-child-${progId} hidden-row child-row-style`));
            });
        });

        // 2. Cursos Independientes
        independientes.forEach(c => tbody.appendChild(createDataRow(c, 'curso-row-style')));
    });
}
function createDataRow(d, customClass = '') {
    const tr = document.createElement('tr');
    
    // 1. Identificar si es uno de los 3 cursos más próximos para resaltar
    // proximosIds debe ser calculado en loadData() antes de llamar a esta función
    const esProximo = typeof proximosIds !== 'undefined' && proximosIds.includes(d.id);
    
    // 2. Asignar clases: customClass para estructura y highlight-urgent para atención visual
    tr.className = `${customClass} ${esProximo ? 'highlight-urgent' : ''}`;
    tr.style.cursor = "pointer";
    
    // 3. Determinar el nombre a mostrar (Prioridad al campo MODULO-CURSO)
    const nombreModuloCurso = d["MODULO-CURSO"] || d["PROGRAMA"] || "---";

    // 4. Mapeo final de las 9 columnas según index.html actualizado:
    // 1. Fecha | 2. Programa | 3. Módulo-Curso | 4. Docente | 5. Duración | 6. Horario | 7. NRC | 8. Obj | 9. Real
    tr.innerHTML = `
        <td>
            <strong>${d["Fecha de inicio"] || '--'}</strong>
            ${esProximo ? '<br><span class="badge-urgent">PRÓXIMO</span>' : ''}
        </td>
        <td style="color: #64748b; font-size: 0.85rem;">
            ${d["PROGRAMA"] || 'CURSO INDEP.'}
        </td>
        <td>
            <strong>${nombreModuloCurso}</strong>
        </td>
        <td>${d["Docente"] || '--'}</td>
        <td>${d.Duracion || d.Duración || '--'} hrs</td>
        <td style="font-size:10px;">${d.Horario || '--'}</td>
        <td>${d.NRC || '--'}</td>
        <td style="text-align:center;">
            ${d["#Participantes Objetivo"] || 0}
        </td>
        <td style="text-align:center;">
            ${d["#Participantes Real Total"] || 0}
        </td>
    `;

    // 5. Vincular evento de click para abrir el modal de edición rápida
    tr.onclick = () => openQuickEdit(d.id, d);

    return tr;
}

function openQuickEdit(id, data) {
    selectedDocId = id;
    const modal = document.getElementById('quickEditModal');
    const input = document.getElementById('inpRealTotal');
    const adminActions = document.getElementById('modalAdminActions');

    // Prioridad: Si tiene MODULO-CURSO lo muestra, si no, usa el nombre del PROGRAMA
    const nombreAMostrar = data["MODULO-CURSO"] || data["PROGRAMA"] || "Sin nombre";
    document.getElementById('courseNameTitle').textContent = nombreAMostrar;
    
    input.value = data["#Participantes Real Total"] || 0;

    if (!userLogged) {
        input.disabled = true;
        if (adminActions) adminActions.classList.add('hidden');
    } else {
        input.disabled = false;
        if (adminActions) adminActions.classList.remove('hidden');
    }
    modal.classList.remove('hidden');
}

document.getElementById('btnSaveQuick').onclick = async () => {
    if (!userLogged || !selectedDocId) return;
    await updateDoc(doc(db, "programaciones", selectedDocId), { "#Participantes Real Total": document.getElementById('inpRealTotal').value });
    closeModal();
};

document.getElementById('btnDeleteQuick').onclick = async () => {
    if (!userLogged || !confirm("¿Eliminar permanentemente?")) return;
    await deleteDoc(doc(db, "programaciones", selectedDocId));
    closeModal();
};

const closeModal = () => { document.getElementById('quickEditModal').classList.add('hidden'); selectedDocId = null; };
document.getElementById('btnCloseModal').onclick = closeModal;
const filter = document.getElementById('monthFilter');
if (filter) filter.onchange = (e) => { currentMonth = e.target.value; loadData(); };