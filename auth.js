// --- LISTA BLANCA ---
const correosPermitidos = [
  "dpachecog2@unemi.edu.ec", "cnavarretem4@unemi.edu.ec", "htigrer@unemi.edu.ec",
  "gorellanas2@unemi.edu.ec", "iastudillol@unemi.edu.ec", "sgavilanezp2@unemi.edu.ec",
  "jzamoram9@unemi.edu.ec", "fcarrillop@unemi.edu.ec", "naguilarb@unemi.edu.ec",
  "ehidalgoc4@unemi.edu.ec", "lbrionesg3@unemi.edu.ec", "xsalvadorv@unemi.edu.ec",
  "nbravop4@unemi.edu.ec", "jmoreirap6@unemi.edu.ec", "kholguinb2@unemi.edu.ec",
  "jcastrof8@unemi.edu.ec", "ky2112h@gmail.com"
];

// --- FUNCIONES UTILES ---
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// --- ELEMENTOS DOM ---
const authPanel = document.getElementById("authPanel");
const appPanel = document.getElementById("appPanel");
const email = document.getElementById("email");
const password = document.getElementById("password");
const authMsg = document.getElementById("authMsg");
const btnLogin = document.getElementById("btnLogin");
const btnRegistro = document.getElementById("btnRegistro");
const btnGoogle = document.getElementById("btnGoogle");
const btnLogout = document.getElementById("btnLogout");

// --- GENERAR ID DE DISPOSITIVO ---
function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

// --- REGISTRAR INTENTOS FALLIDOS ---
async function registrarIntentoFallido(correo) {
  try {
    await db.collection("loginAttempts").add({
      email: correo,
      fecha: new Date(),
      dispositivo: getDeviceId()
    });
  } catch (e) {
    console.error("Error registrando intento fallido:", e);
  }
}

// --- VALIDAR LÍMITE DE DISPOSITIVOS ---
async function validarDispositivos(user) {
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();
  const devId = getDeviceId();

  if (!snap.exists) {
    await ref.set({
      email: user.email,
      devices: [devId],
      lastLogin: new Date()
    });
    return true;
  }

  let data = snap.data();
  let devices = data.devices || [];

  if (!devices.includes(devId)) {
    if (devices.length >= 2) return false;
    devices.push(devId);
  }

  await ref.update({
    devices,
    lastLogin: new Date()
  });

  return true;
}

// --- LOGIN ---
btnLogin.onclick = async () => {
  try {
    const correo = email.value.trim().toLowerCase();
    if (!correosPermitidos.includes(correo)) {
      toast("ACCESO DENEGADO");
      registrarIntentoFallido(correo);
      return;
    }

    const cred = await auth.signInWithEmailAndPassword(correo, password.value);

    const permitido = await validarDispositivos(cred.user);
    if (!permitido) {
      toast("Límite de dispositivos (2) excedido");
      registrarIntentoFallido(correo);
      auth.signOut();
      return;
    }
  } catch (e) {
    authMsg.textContent = e.message;
  }
};

// --- REGISTRO ---
btnRegistro.onclick = async () => {
  try {
    const correo = email.value.trim().toLowerCase();
    if (!correosPermitidos.includes(correo)) {
      toast("ACCESO DENEGADO");
      registrarIntentoFallido(correo);
      return;
    }

    const cred = await auth.createUserWithEmailAndPassword(correo, password.value);

    await validarDispositivos(cred.user); // registrar dispositivo inicial
  } catch (e) {
    authMsg.textContent = e.message;
  }
};

// --- GOOGLE LOGIN ---
btnGoogle.onclick = async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);

    const correo = result.user.email.toLowerCase();
    if (!correosPermitidos.includes(correo)) {
      toast("ACCESO DENEGADO");
      registrarIntentoFallido(correo);
      await auth.signOut();
      return;
    }

    const permitido = await validarDispositivos(result.user);
    if (!permitido) {
      toast("Límite de dispositivos (2) excedido");
      registrarIntentoFallido(correo);
      await auth.signOut();
      return;
    }

  } catch (e) {
    authMsg.textContent = e.message;
  }
};

// --- LOGOUT ---
btnLogout.onclick = () => auth.signOut();

// --- ON AUTH STATE ---
auth.onAuthStateChanged(user => {
  if (user) {
    authPanel.classList.add("hidden");
    appPanel.classList.remove("hidden");
  } else {
    authPanel.classList.remove("hidden");
    appPanel.classList.add("hidden");
  }
});
