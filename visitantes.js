/* =========================
   BUSCAR VISITANTE
========================= */
function buscarVisitante() {
  const nombreInput = document.getElementById("busqueda");
  const nombre = nombreInput.value.trim().toLowerCase();
  const resultado = document.getElementById("resultado");

  resultado.innerHTML = "";
  document.getElementById("codigo").innerHTML = "";
  document.getElementById("qrcode").innerHTML = "";

  if (!nombre) {
    mostrarMensaje("✏️ Escribe tu nombre para continuar", "info");
    return;
  }

  mostrarMensaje("🔍 Buscando tu invitación...", "info");

  let encontrado = false;

  db.collection("visitantes").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();

      if (data.nombre.toLowerCase().includes(nombre)) {
        encontrado = true;

        resultado.innerHTML = `
          <div class="card">
            <p><strong>${data.nombre}</strong></p>
            <p>Tipo: ${data.tipo}</p>
            <p>Estatus actual: ${data.estatus}</p>

            <button onclick="confirmarAsistencia('${doc.id}', '${data.nombre}')">
              Confirmar asistencia
            </button>
          </div>
        `;
      }
    });

    if (!encontrado) {
      mostrarMensaje("❌ No se encontró tu nombre en la lista", "error");
    }
  });
}

/* =========================
   CONFIRMAR ASISTENCIA
========================= */
function confirmarAsistencia(id, nombre) {

  db.collection("visitantes").doc(id).get().then(doc => {
    const data = doc.data();

    // 🔒 EVITAR DUPLICADOS
    if (data.estatus === "Presente") {
      mostrarMensaje("ℹ️ Tu asistencia ya fue registrada", "info");
      return;
    }

    // 🔐 GENERAR CÓDIGO
    const codigo = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    // 💾 ACTUALIZAR FIRESTORE
    db.collection("visitantes").doc(id).update({
      estatus: "Presente",
      codigo: codigo,
      hora: firebase.firestore.FieldValue.serverTimestamp(),
      validado: false
    }).then(() => {

      /* =========================
         MENSAJE PERSONALIZADO
      ========================= */
      let mensajeExtra = "";

      if (data.tipo === "Alumno") {
        mensajeExtra = "🎓 ¡Éxito en tus actividades!";
      } else if (data.tipo === "Maestro") {
        mensajeExtra = "📘 Gracias por acompañarnos";
      } else if (data.tipo === "Empresa") {
        mensajeExtra = "🤝 Bienvenidos a la Universidad Veracruzana";
      }

      // ✅ MENSAJE + CONFETI
      mostrarMensaje(`✅ Asistencia confirmada. ${mensajeExtra}`, "ok");
      lanzarConfeti();

      /* =========================
         MOSTRAR CÓDIGO
      ========================= */
      document.getElementById("codigo").innerHTML = `
        <h3>Tu código es:</h3>
        <h2>${codigo}</h2>
      `;

      /* =========================
         GENERAR QR
      ========================= */
      const qrCont = document.getElementById("qrcode");
      qrCont.innerHTML = "";
      qrCont.classList.remove("qr-animado");
      void qrCont.offsetWidth; // reinicia animación
      qrCont.classList.add("qr-animado");

      new QRCode(qrCont, {
        text: codigo,
        width: 180,
        height: 180
      });

      // ⏱ LIMPIEZA AUTOMÁTICA (KIOSKO)
      setTimeout(limpiarPantalla, 15000);

    }).catch(err => {
      console.error(err);
      mostrarMensaje("⚠️ Error al confirmar asistencia", "error");
    });
  });
}


/* =========================
   MENSAJES ANIMADOS
========================= */
function mostrarMensaje(texto, tipo = "info") {
  const cont = document.getElementById("resultado");
  cont.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
}

/* =========================
   LIMPIAR PANTALLA (KIOSKO)
========================= */
function limpiarPantalla() {
  document.getElementById("busqueda").value = "";
  document.getElementById("resultado").innerHTML = "";
  document.getElementById("codigo").innerHTML = "";
  document.getElementById("qrcode").innerHTML = "";
}

function lanzarConfeti() {
  const cantidad = 40;

  for (let i = 0; i < cantidad; i++) {
    const confeti = document.createElement("div");
    confeti.classList.add("confeti");

    // Variantes de azul
    if (Math.random() > 0.66) confeti.classList.add("claro");
    else if (Math.random() > 0.33) confeti.classList.add("oscuro");

    confeti.style.left = Math.random() * window.innerWidth + "px";
    confeti.style.animationDuration = 2 + Math.random() * 1.5 + "s";

    document.body.appendChild(confeti);

    setTimeout(() => confeti.remove(), 3500);
  }
}

function iniciarContadorPublico() {
  db.collection("visitantes")
    .where("estatus", "==", "Presente")
    .onSnapshot(snapshot => {
      const total = snapshot.size;
      document.getElementById("contadorPublico").textContent =
        `👥 Asistentes registrados: ${total}`;
    });
}

iniciarContadorPublico();
