// LISTA BLANCA DE CORREOS AUTORIZADOS
const correosPermitidos = [
  "dpachecog2@unemi.edu.ec", "cnavarretem4@unemi.edu.ec", "htigrer@unemi.edu.ec",
  "gorellanas2@unemi.edu.ec", "iastudillol@unemi.edu.ec", "sgavilanezp2@unemi.edu.ec",
  "jzamoram9@unemi.edu.ec", "fcarrillop@unemi.edu.ec", "naguilarb@unemi.edu.ec",
  "ehidalgoc4@unemi.edu.ec", "lbrionesg3@unemi.edu.ec", "xsalvadorv@unemi.edu.ec",
  "nbravop4@unemi.edu.ec", "jmoreirap6@unemi.edu.ec", "kholguinb2@unemi.edu.ec",
  "jcastrof8@unemi.edu.ec" // Añadido para pruebas
];

// Referencias DOM
const authPanel = document.getElementById("authPanel");
const appPanel = document.getElementById("appPanel");
const authMsg = document.getElementById("authMsg");
const btnGoogle = document.getElementById("btnGoogle");
// Referencia al botón integrado en el Header
const btnLogout = document.getElementById("btnLogoutHeader"); 

// UI Usuario
const userEmailDisplay = document.getElementById("userEmailDisplay");
const verificationMsg = document.getElementById("verificationMsg");


// ID Dispositivo
function getDeviceId() {
  let id = localStorage.getItem("deviceId_secure");
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem("deviceId_secure", id);
  }
  return id;
}

// Validar Dispositivos en Firestore
async function validarSeguridad(user) {
  try {
    const userRef = db.collection("usuarios_seguros").doc(user.email); 
    const snap = await userRef.get();
    const miDispositivo = getDeviceId();

    if (!snap.exists) {
      await userRef.set({
        uid: user.uid, email: user.email,
        dispositivos: [miDispositivo], ultimoAcceso: new Date()
      });
      return { permitido: true };
    }

    const data = snap.data();
    let dispositivos = data.dispositivos || [];

    if (dispositivos.includes(miDispositivo)) {
      await userRef.update({ ultimoAcceso: new Date() });
      return { permitido: true };
    } else {
      if (dispositivos.length < 2) {
        dispositivos.push(miDispositivo);
        await userRef.update({ dispositivos: dispositivos, ultimoAcceso: new Date() });
        return { permitido: true };
      } else {
        return { permitido: false, msg: "⛔ Límite de dispositivos excedido." };
      }
    }
  } catch (error) {
    console.error("Error seguridad:", error);
    // Permite entrar para que la BD no bloquee la app si falla la conexión
    return { permitido: true }; 
  }
}

// Botón Google (Único método de Login)
btnGoogle.onclick = async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    let correo = result.user.email.toLowerCase();

    if (!correosPermitidos.includes(correo)) {
      await auth.signOut();
      authMsg.textContent = "Correo no autorizado.";
      return;
    }
  } catch (e) {
    authMsg.textContent = e.message;
  }
};

// Botón Logout (Conectado al nuevo botón en el Header)
if (btnLogout) {
  btnLogout.onclick = () => {
    auth.signOut().then(() => window.location.reload());
  };
}

// MONITOR DE SESIÓN
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // 1. Mostrar Correo Inmediatamente (Para que el usuario se vea reconocido)
    if(userEmailDisplay) userEmailDisplay.textContent = user.email;
    
    // 2. Ocultar Login
    authPanel.classList.add("hidden");
    
    // 3. Validar Seguridad en BD
    const validacion = await validarSeguridad(user);

    if (validacion.permitido) {
      // ÉXITO: Mostrar App y Botón de Cerrar Sesión
      appPanel.classList.remove("hidden");
      if(btnLogout) btnLogout.classList.remove("hidden"); 
      
      // MOSTRAR MENSAJE VERDE DE VALIDACIÓN
      if(verificationMsg) verificationMsg.classList.remove("hidden"); 

    } else {
      // FALLO (Límite de Dispositivos)
      alert(validacion.msg);
      await auth.signOut();
      window.location.reload();
    }
  } else {
    // NO HAY USUARIO
    authPanel.classList.remove("hidden");
    appPanel.classList.add("hidden");
    if(btnLogout) btnLogout.classList.add("hidden"); 
  }
});
