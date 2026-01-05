import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
<<<<<<< HEAD
    apiKey: "AIzaSyB38Wbf0Q9YLz61vxQXVw1oSpMNyPVGy-c",
    authDomain: "programacion-cttc.firebaseapp.com",
    projectId: "programacion-cttc",
    storageBucket: "programacion-cttc.firebasestorage.app",
    messagingSenderId: "2776502914",
    appId: "1:2776502914:web:6389898d92d7c4b5ba1a9b"
};

=======
  apiKey: "AIzaSyB38Wbf0Q9YLz61vxQXVw1oSpMNyPVGy-c",
  authDomain: "programacion-cttc.firebaseapp.com",
  projectId: "programacion-cttc",
  storageBucket: "programacion-cttc.firebasestorage.app",
  messagingSenderId: "2776502914",
  appId: "1:2776502914:web:6389898d92d7c4b5ba1a9b"
};
>>>>>>> a04f7016686eb0f23a2dc28bc1d4d3a50a4cc3f4
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
<<<<<<< HEAD
        Object.keys(programasMap).forEach(nombreProg => {
            const modulos = programasMap[nombreProg];
            const progId = nombreProg.replace(/\s+/g, '-');
            const trMaster = document.createElement('tr');
            trMaster.className = 'prog-master-row';
            trMaster.innerHTML = `<td colspan="6"><strong>📂 PROGRAMA: ${nombreProg}</strong></td><td style="text-align:center;"><span class="badge-prog">PROGRAMA</span></td><td style="text-align:center;">▼ ${modulos.length} Módulos</td>`;
            trMaster.onclick = () => document.querySelectorAll(`.prog-child-${progId}`).forEach(r => r.classList.toggle('hidden-row'));
            tbody.appendChild(trMaster);
            modulos.forEach(m => tbody.appendChild(createDataRow(m, `prog-child-${progId} hidden-row child-row-style`)));
        });
=======
        // Dentro de loadData() en app.js
        Object.keys(programasMap).forEach(nombreProg => {
            const modulos = programasMap[nombreProg];
            const progId = nombreProg.replace(/\s+/g, '-'); // Crea un ID único sin espacios

            const trMaster = document.createElement('tr');
            trMaster.className = 'prog-master-row';
            trMaster.style.cursor = "pointer";
            trMaster.innerHTML = `
                <td colspan="6"><strong>📂 PROGRAMA: ${nombreProg}</strong></td>
                <td style="text-align:center;"><span class="badge-prog">PROGRAMA</span></td>
                <td style="text-align:center;">▼ ${modulos.length} Módulos</td>
            `;

            // Lógica para mostrar/ocultar módulos al hacer clic
            trMaster.onclick = () => {
                const childRows = document.querySelectorAll(`.prog-child-${progId}`);
                childRows.forEach(row => {
                    row.classList.toggle('hidden-row');
                });
            };

            tbody.appendChild(trMaster);

            // Agregar los módulos como filas ocultas por defecto
            modulos.forEach(m => {
                // Se añade la clase 'hidden-row' para que inicien contraídos
                tbody.appendChild(createDataRow(m, `prog-child-${progId} hidden-row child-row-style`));
            });
        });
        
>>>>>>> a04f7016686eb0f23a2dc28bc1d4d3a50a4cc3f4

        // 2. Renderizar Cursos
        independientes.forEach(c => tbody.appendChild(createDataRow(c, 'curso-row-style')));
    });
}

function createDataRow(d, className) {
    const tr = document.createElement('tr');
    tr.className = className;
    tr.style.cursor = "pointer";
    // Mapeo de los 8 campos solicitados
    tr.innerHTML = `
        <td><strong>${d["Fecha de inicio"] || '-'}</strong></td>
<<<<<<< HEAD
        <td>${d["PROGRAMA"] || d["MODULO/CURSO"] || '-'}</td>
=======
        <td>${d["PROGRAMA"] || d["MODULO-CURSO"] || '-'}</td>
>>>>>>> a04f7016686eb0f23a2dc28bc1d4d3a50a4cc3f4
        <td>${d["Docente"] || '-'}</td>
        <td>${d["Duracion"] || d["Duración"] || '-'}</td>
        <td style="font-size:10px;">${d["Horario"] || '-'}</td>
        <td>${d["NRC"] || '-'}</td>
        <td style="text-align:center;">${d["#Participantes Objetivo"] || 0}</td>
        <td style="text-align:center;">${d["#Participantes Real Total"] || 0}</td>
    `;
    tr.onclick = () => openQuickEdit(d.id, d);
    return tr;
}

function openQuickEdit(id, data) {
    selectedDocId = id;
    const modal = document.getElementById('quickEditModal');
    const input = document.getElementById('inpRealTotal');
    const adminActions = document.getElementById('modalAdminActions');

    document.getElementById('courseNameTitle').textContent = data["MODULO/CURSO"] || data["PROGRAMA"] || "Sin nombre";
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