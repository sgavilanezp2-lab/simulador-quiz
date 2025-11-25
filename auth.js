// --- LISTA BLANCA DE CORREOS ---
const correosPermitidos = [
  "dpachecog2@unemi.edu.ec", "cnavarretem4@unemi.edu.ec", "htigrer@unemi.edu.ec",
  "gorellanas2@unemi.edu.ec", "iastudillol@unemi.edu.ec", "sgavilanezp2@unemi.edu.ec",
  "jzamoram9@unemi.edu.ec", "fcarrillop@unemi.edu.ec", "naguilarb@unemi.edu.ec",
  "ehidalgoc4@unemi.edu.ec", "lbrionesg3@unemi.edu.ec", "xsalvadorv@unemi.edu.ec",
  "nbravop4@unemi.edu.ec", "jmoreirap6@unemi.edu.ec", "kholguinb2@unemi.edu.ec",
  "jcastrof8@unemi.edu.ec", "ky2112h@gmail.com"
];

// --- REFERENCIAS DOM ---
const authPanel = document.getElementById("authPanel");
const appPanel = document.getElementById("appPanel");
const email = document.getElementById("email");
const password = document.getElementById("password");
const authMsg = document.getElementById("authMsg");
const btnLogin = document.getElementById("btnLogin");
const btnRegistro = document.getElementById("btnRegistro");
const btnGoogle = document.getElementById("btnGoogle");
const btnLogout = document.getElementById("btnLogout");

// --- UTILIDAD: TOAST ---
function toast(msg) {
  let t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// --- 1. GENERAR ID DE DISPOSITIVO ÚNICO ---
function getDeviceId() {
  let id = localStorage.getItem("deviceId_secure");
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem("deviceId_secure", id);
  }
  return id;
}

// --- 2. VALIDAR SOLO DISPOSITIVOS (Sin IP) ---
async function validarSeguridad(user) {
  try {
    const userRef = db.collection("usuarios_seguros").doc(user.email); 
    const snap = await userRef.get();
    const miDispositivo = getDeviceId();

    // A) USUARIO NUEVO
    if (!snap.exists) {
      await userRef.set({
        uid: user.uid,
        email: user.email,
        dispositivos: [miDispositivo],
        ultimoAcceso: new Date()
      });
      return { permitido: true };
    }

    // B) USUARIO EXISTENTE
    const data = snap.data();
    let dispositivos = data.dispositivos || [];

    // Verificación: ¿Es este navegador uno de los registrados?
    if (dispositivos.includes(miDispositivo)) {
      await userRef.update({ ultimoAcceso: new Date() });
      return { permitido: true };
    } else {
      // DISPOSITIVO NUEVO - ¿Tiene cupo? (Máximo 2)
      if (dispositivos.length < 2) {
        dispositivos.push(miDispositivo);
        await userRef.update({ dispositivos: dispositivos, ultimoAcceso: new Date() });
        return { permitido: true };
      } else {
        return { 
          permitido: false, 
          msg: "⛔ Límite de dispositivos excedido (PC + Celular). No puedes usar un tercer equipo." 
        };
      }
    }
  } catch (error) {
    console.error("Error seguridad:", error);
    return { permitido: true }; // En caso de error de red, permitimos entrar
  }
}

// --- LOGICA DE LOGIN ---
btnLogin.onclick = async () => {
  try {
    let correo = email.value.trim().toLowerCase();
    if (!correosPermitidos.includes(correo)) {
      toast("⛔ Correo no autorizado.");
      return;
    }
    await auth.signInWithEmailAndPassword(correo, password.value);
  } catch (e) {
    authMsg.textContent = "Error: " + e.message;
  }
};

btnRegistro.onclick = async () => {
  try {
    let correo = email.value.trim().toLowerCase();
    if (!correosPermitidos.includes(correo)) {
      toast("⛔ Correo no autorizado.");
      return;
    }
    await auth.createUserWithEmailAndPassword(correo, password.value);
    toast("✅ Registro exitoso. Ingresando...");
  } catch (e) {
    authMsg.textContent = "Error Registro: " + e.message;
  }
};

btnGoogle.onclick = async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    let correo = result.user.email.toLowerCase();

    if (!correosPermitidos.includes(correo)) {
      await auth.signOut();
      toast("⛔ Correo Google no autorizado.");
      return;
    }
  } catch (e) {
    authMsg.textContent = e.message;
  }
};

// Botón Salir
if (btnLogout) {
  btnLogout.onclick = () => {
    auth.signOut();
    window.location.reload();
  };
}

// --- MONITOR DE SESIÓN ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    authPanel.classList.add("hidden");
    const validacion = await validarSeguridad(user);

    if (validacion.permitido) {
      appPanel.classList.remove("hidden");
      authMsg.textContent = "";
    } else {
      toast(validacion.msg);
      authMsg.textContent = validacion.msg; 
      await auth.signOut();
      setTimeout(() => {
        authPanel.classList.remove("hidden");
        appPanel.classList.add("hidden");
      }, 2500);
    }
  } else {
    authPanel.classList.remove("hidden");
    appPanel.classList.add("hidden");
  }
});
