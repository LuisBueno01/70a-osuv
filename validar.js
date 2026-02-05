function validar() {
  const codigo = document.getElementById("codigo").value.toUpperCase();
  const mensaje = document.getElementById("mensaje");

   db.collection("logs").add({
  usuario: "validador",
  accion: "VALIDAR_ACCESO",
  visitante: v.nombre,
  timestamp: firebase.firestore.FieldValue.serverTimestamp()
 });


  db.collection("visitantes")
    .where("codigo", "==", codigo)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        mensaje.innerText = " Código inválido";
        return;
      }

      snapshot.forEach(doc => {
        const v = doc.data();

        if (v.validado) {
          mensaje.innerText = " Código ya usado";
        } else {
          db.collection("visitantes").doc(doc.id).update({
            validado: true
          });
          mensaje.innerText = " Acceso permitido";
        }
      });
    });
}
