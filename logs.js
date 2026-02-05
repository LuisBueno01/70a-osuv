// 🔐 Protección
auth.onAuthStateChanged(user => {
  if (!user) window.location.href = "login.html";
});

const listaLogs = document.getElementById("listaLogs");
let cacheLogs = [];

/* =========================
   ESCUCHAR LOGS
========================= */
db.collection("logs")
  .orderBy("timestamp", "desc")
  .onSnapshot(snapshot => {

    cacheLogs = [];
    listaLogs.innerHTML = "";

    snapshot.forEach(doc => {
      cacheLogs.push(doc.data());
    });

    renderLogs(cacheLogs);
  });

/* =========================
   RENDER
========================= */
function renderLogs(logs) {
  listaLogs.innerHTML = "";

  if (logs.length === 0) {
    listaLogs.innerHTML = "<p>No hay registros</p>";
    return;
  }

  logs.forEach(log => {
    listaLogs.innerHTML += `
      <div class="card">
        <strong>Acción:</strong> ${log.accion}<br>
        <strong>Usuario:</strong> ${log.usuario}<br>
        <strong>Visitante:</strong> ${log.visitante || "—"}<br>
        <strong>Hora:</strong>
        ${log.timestamp ? log.timestamp.toDate().toLocaleString() : "—"}
      </div>
    `;
  });
}

/* =========================
   FILTRO
========================= */
function aplicarFiltro() {
  const filtro = document.getElementById("filtro").value;

  if (filtro === "TODOS") {
    renderLogs(cacheLogs);
  } else {
    renderLogs(cacheLogs.filter(l => l.accion === filtro));
  }
}
