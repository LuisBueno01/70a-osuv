/* =========================
   VARIABLES GLOBALES
========================= */

let sistemaListo = false;
let rolUsuario = "";
let visitantesCache = [];
let unsubscribeVisitantes = null;

/* =========================
   PROTECCIÓN LOGIN
========================= */
let authRespondio = false;

console.log("admin.js cargado");

auth.onAuthStateChanged(async user => {
  authRespondio = true;
  console.log("Auth state:", user);

  if (!user) {
    window.location.replace("login.html");
    return;
  }

  try {
    const doc = await db.collection("users").doc(user.uid).get();

    if (!doc.exists) {
      alert("No tienes rol asignado");
      await auth.signOut();
      window.location.replace("login.html");
      return;
    }

    rolUsuario = doc.data().rol; // GENERAL | ASISTENTE
    console.log("ROL CARGADO =>", rolUsuario);

    sistemaListo = true;

    document.getElementById("loading").style.display = "none";
    document.getElementById("app").style.display = "block";

    iniciarSistema();

  } catch (e) {
    console.error("Error al validar usuario:", e);
    await auth.signOut();
    window.location.replace("login.html");
  }
});

/* ⏱️ FAILSAFE */
setTimeout(() => {
  if (!authRespondio) {
    alert("Error al validar sesión. Recarga la página.");
    console.error("Auth no respondió");
  }
}, 5000);

/* =========================
   ELEMENTOS DOM
========================= */
const lista = document.getElementById("lista");
const totalEl = document.getElementById("total");
const presentesEl = document.getElementById("presentes");
const ausentesEl = document.getElementById("ausentes");
const validadosEl = document.getElementById("validados");

/* =========================
   VARIABLES GRÁFICAS
========================= */
let graficaEstatus;
let graficaValidacion;
let graficaLlegadasHora;
let graficaPorTipo;

/* =========================
   LOGS
========================= */
function registrarLog(accion, visitante = "") {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("logs").add({
    usuario: user.email,
    rol: rolUsuario,
    accion,
    visitante,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/* =========================
   LISTENER PRINCIPAL
========================= */
let mencionesIniciadas = false;

function iniciarSistema() {
  if (!sistemaListo) return;

  /* =========================
     LISTENER PRINCIPAL
  ========================= */
  if (unsubscribeVisitantes) unsubscribeVisitantes();

  unsubscribeVisitantes = db
    .collection("visitantes")
    .onSnapshot(snapshot => {

      visitantesCache = [];

      let total = 0;
      let presentes = 0;
      let ausentes = 0;
      let validados = 0;

      let llegadasPorHora = {};
      let porTipo = { Alumno: 0, Maestro: 0, Empresa: 0 };

      snapshot.forEach(doc => {
        const v = doc.data();
        total++;

        visitantesCache.push({ id: doc.id, ...v });

        if (v.estatus === "Presente") presentes++;
        if (v.estatus === "Ausente") ausentes++;
        if (v.validado) validados++;

        if (v.hora) {
          const h = v.hora.toDate().getHours();
          llegadasPorHora[h] = (llegadasPorHora[h] || 0) + 1;
        }

        if (porTipo[v.tipo] !== undefined) {
          porTipo[v.tipo]++;
        }
      });

      // 🔢 MÉTRICAS
      totalEl.textContent = total;
      presentesEl.textContent = presentes;
      ausentesEl.textContent = ausentes;
      validadosEl.textContent = validados;

      // 📋 UI
      renderLista(visitantesCache);
      actualizarGraficasBasicas(presentes, ausentes, validados);
      actualizarGraficasAvanzadas(llegadasPorHora, porTipo);
      aplicarPermisos();
    });

  /* =========================
     MENCIONES HONORÍFICAS
  ========================= */
  if (!mencionesIniciadas) {
    iniciarMencionesHonorificas();
    mencionesIniciadas = true;
  }
}


/* =========================
   RENDER LISTA
========================= */
function renderLista(datos) {
  lista.innerHTML = "";

  datos.forEach(v => {
    lista.innerHTML += `
      <div class="card ${v.estatus === "Presente" ? "presente" : "ausente"}">
        <strong>${v.nombre}</strong><br>
        Tipo: ${v.tipo}<br>
        Cargo: ${v.cargo}<br>
        Estatus: ${v.estatus}<br>
        Código: ${v.codigo || "—"}<br>
        Hora: ${v.hora ? v.hora.toDate().toLocaleString() : "—"}<br><br>

        <button onclick="cambiarEstatus('${v.id}', '${v.nombre}', 'Presente')">
          Presente
        </button>
        <button onclick="cambiarEstatus('${v.id}', '${v.nombre}', 'Ausente')">
          Ausente
        </button>
      </div>
    `;
  });
}

/* =========================
   FILTRAR
========================= */
const inputBuscar = document.getElementById("buscarNombre");

inputBuscar.addEventListener("input", filtrarLista);

function filtrarLista() {
  const texto = inputBuscar.value.toLowerCase();

  const filtrados = visitantesCache.filter(v =>
    v.nombre.toLowerCase().includes(texto) ||
    (v.cargo && v.cargo.toLowerCase().includes(texto))
  );

  renderLista(filtrados);
}



/* =========================
   PERMISOS POR ROL
========================= */
function aplicarPermisos() {
  if (!rolUsuario) return;

  const btnExcel = document.querySelector("[onclick='exportarExcel()']");
  const btnPDF = document.querySelector("[onclick='exportarPDF()']");
  const btnLogs = document.querySelector("[onclick=\"window.location.href='logs.html'\"]");
  const seccionGraficas = document.getElementById("seccionGraficas");
  const seccionMenciones = document.getElementById("seccionMenciones");

  /* =========================
     ADMIN GENERAL
  ========================= */
  if (rolUsuario === "GENERAL") {
    if (btnExcel) btnExcel.style.display = "";
    if (btnPDF) btnPDF.style.display = "";
    if (btnLogs) btnLogs.style.display = "";
    if (seccionGraficas) seccionGraficas.style.display = "";
    return;
  }

  /* =========================
     ASISTENTE
  ========================= */
  if (rolUsuario === "ASISTENTE") {
    if (btnExcel) btnExcel.style.display = "none";
    if (btnPDF) btnPDF.style.display = "none";
    if (btnLogs) btnLogs.style.display = "none";
    if (seccionGraficas) seccionGraficas.style.display = "none";
    if (seccionMenciones) seccionMenciones.style.display = "none";
  }
}



/* =========================
   AGREGAR VISITANTE
========================= */
function agregarVisitante() {
  const nombre = document.getElementById("nombre").value.trim();
  const tipo = document.getElementById("tipo").value;

  if (!nombre) {
    alert("Escribe un nombre");
    return;
  }

  db.collection("visitantes").add({
    nombre,
    tipo,
    estatus: "Ausente",
    codigo: "",
    hora: "",
    validado: false,
    horaValidacion: ""
  });

  registrarLog("AGREGAR_VISITANTE", nombre);
  document.getElementById("nombre").value = "";
}

/* =========================
   CAMBIAR ESTATUS
========================= */
function cambiarEstatus(id, nombre, estatus) {
  let datos = { estatus };

  if (estatus === "Presente") {
    datos.codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    datos.hora = firebase.firestore.FieldValue.serverTimestamp();
    datos.validado = false;
    datos.horaValidacion = "";
  } else {
    datos.codigo = "";
    datos.hora = "";
    datos.validado = false;
    datos.horaValidacion = "";
  }

  db.collection("visitantes").doc(id).update(datos);

  registrarLog(
    estatus === "Presente" ? "MARCAR_PRESENTE" : "MARCAR_AUSENTE",
    nombre
  );
}

/* =========================
   EXPORTAR EXCEL
========================= */
function exportarExcel() {
  db.collection("visitantes").get().then(snapshot => {
    let csv = "Nombre,Tipo,Estatus,Codigo,Hora,Validado\n";

    snapshot.forEach(doc => {
      const v = doc.data();
      csv += `"${v.nombre}","${v.tipo}","${v.estatus}","${v.codigo}",
"${v.hora ? v.hora.toDate().toLocaleString() : ""}","${v.validado}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "asistencia_evento.csv";
    a.click();
  });
}

/* =========================
   EXPORTAR PDF
========================= */
function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  pdf.setFontSize(16);
  pdf.text("Reporte de Asistencia", 14, 15);

  let y = 25;
  pdf.setFontSize(10);

  db.collection("visitantes").get().then(snapshot => {
    snapshot.forEach(doc => {
      const v = doc.data();

      const texto =
        `${v.nombre} | ${v.tipo} | ${v.estatus} | ` +
        `${v.validado ? "Validado" : "No validado"}\n` +
        `Hora: ${v.hora ? v.hora.toDate().toLocaleString() : "—"}`;

      pdf.text(texto, 14, y);
      y += 12;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save("reporte_asistencia.pdf");
  });
}

/* =========================
   LOGOUT
========================= */
function logout() {
  auth.signOut().then(() => {
    window.location.href = "login.html";
  });
}

/* =========================
   GRÁFICAS
========================= */
function actualizarGraficasBasicas(presentes, ausentes, validados) {

  if (graficaEstatus) graficaEstatus.destroy();
  graficaEstatus = new Chart(document.getElementById("graficaEstatus"), {
    type: "bar",
    data: {
      labels: ["Presentes", "Ausentes"],
      datasets: [{ data: [presentes, ausentes] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  if (graficaValidacion) graficaValidacion.destroy();
  graficaValidacion = new Chart(document.getElementById("graficaValidacion"), {
    type: "pie",
    data: {
      labels: ["Validados", "No validados"],
      datasets: [{ data: [validados, presentes - validados] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function actualizarGraficasAvanzadas(llegadasPorHora, porTipo) {

  if (graficaLlegadasHora) graficaLlegadasHora.destroy();
  graficaLlegadasHora = new Chart(document.getElementById("graficaLlegadasHora"), {
    type: "line",
    data: {
      labels: Object.keys(llegadasPorHora),
      datasets: [{
        label: "Llegadas por hora",
        data: Object.values(llegadasPorHora)
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  if (graficaPorTipo) graficaPorTipo.destroy();
  graficaPorTipo = new Chart(document.getElementById("graficaPorTipo"), {
    type: "doughnut",
    data: {
      labels: Object.keys(porTipo),
      datasets: [{ data: Object.values(porTipo) }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
}

function activarPantallaPublica() {
  document.body.classList.toggle("publico");
}


function iniciarMencionesHonorificas() {
  const cont = document.getElementById("mencionesHonorificas");

  db.collection("visitantes")
    .where("recibeMencion", "==", true)
    .where("estatus", "==", "Presente")
    .onSnapshot(snapshot => {

      cont.innerHTML = "";

      if (snapshot.empty) {
        cont.innerHTML = `<p class="mencion-vacia">
          Aún no hay personas para mencionar
        </p>`;
        return;
      }

      // Ordenar por jerarquía (si existe)
      const menciones = [];
      snapshot.forEach(doc => menciones.push(doc.data()));

      menciones.sort((a, b) => (a.nivelProtocolo || 99) - (b.nivelProtocolo || 99));

      menciones.forEach(p => {
        cont.innerHTML += `
          <div class="mencion-card">
            <strong>${p.nombre}</strong>
            <span>${p.cargo || "Invitado especial"}</span>
          </div>
        `;
      });
    });
}

function toggleGraficas() {
  const sec = document.getElementById("seccionGraficas");
  sec.style.display = sec.style.display === "none" ? "block" : "none";
}


//pruebas borrar si no funciona para volver a lo anterior que si jalaba

function toggleGraficas() {
  const seccion = document.getElementById('seccionGraficas');
  seccion.classList.toggle('visible');
  
  const btn = event.target;
  btn.textContent = seccion.classList.contains('visible') 
    ? '📊 Ocultar gráficas' 
    : '📊 Mostrar gráficas';
}