// ================================
//   VARIABLES GLOBALES
// ================================
let preguntas = [];
let preguntasEstudio = [];
let indicePreguntaActual = 0;
let modoEstudio = false;

// Elementos
const contenedorPregunta = document.getElementById("pregunta");
const contenedorOpciones = document.getElementById("opciones");
const btnSiguiente = document.getElementById("btnSiguiente");
const btnGuardar = document.getElementById("btnGuardar");
const btnCargar = document.getElementById("btnCargar");

// NUEVOS: Indicadores de progreso
const indicadorNumero = document.getElementById("indicadorNumero");
const indicadorRestantes = document.getElementById("indicadorRestantes");

// ================================
//   CARGAR ARCHIVO JSON
// ================================
fetch("preguntas.json")
    .then(res => res.json())
    .then(data => {
        preguntas = data;
        console.log("Preguntas cargadas:", preguntas.length);
    })
    .catch(err => console.error("Error cargando JSON:", err));

// ================================
//   INICIAR MODO ESTUDIO
// ================================
function iniciarModoEstudio() {
    modoEstudio = true;
    preguntasEstudio = [...preguntas]; // copia
    indicePreguntaActual = 0;

    btnGuardar.style.display = "inline-block";
    btnCargar.style.display = "inline-block";

    mostrarPregunta();
}

// ================================
//   MOSTRAR PREGUNTA
// ================================
function mostrarPregunta() {
    if (indicePreguntaActual >= preguntasEstudio.length) {
        contenedorPregunta.textContent = "¡Has terminado todas las preguntas!";
        contenedorOpciones.innerHTML = "";
        btnSiguiente.style.display = "none";
        return;
    }

    let preguntaActual = preguntasEstudio[indicePreguntaActual];

    contenedorPregunta.textContent = preguntaActual.pregunta;
    contenedorOpciones.innerHTML = "";

    preguntaActual.opciones.forEach((op, index) => {
        let btn = document.createElement("button");
        btn.classList.add("opcion");
        btn.textContent = op;
        btn.onclick = () => verificarRespuesta(index);
        contenedorOpciones.appendChild(btn);
    });

    // ACTUALIZAR INDICADORES
    actualizarIndicadores();
}

// ================================
//   VERIFICACIÓN
// ================================
function verificarRespuesta(indiceSeleccionado) {
    let correcta = preguntasEstudio[indicePreguntaActual].respuestaCorrecta;

    let botones = document.querySelectorAll(".opcion");

    botones.forEach((btn, i) => {
        if (i === correcta) btn.classList.add("correcta");
        if (i === indiceSeleccionado && i !== correcta) btn.classList.add("incorrecta");
        btn.disabled = true;
    });

    btnSiguiente.style.display = "inline-block";
}

// ================================
//   SIGUIENTE PREGUNTA
// ================================
btnSiguiente.onclick = () => {
    indicePreguntaActual++;
    btnSiguiente.style.display = "none";
    mostrarPregunta();
};

// ================================
//   GUARDAR PROGRESO LOCAL
// ================================
btnGuardar.onclick = () => {
    const progreso = {
        indice: indicePreguntaActual,
        preguntasEstudio: preguntasEstudio
    };
    localStorage.setItem("progresoEstudio", JSON.stringify(progreso));
    alert("Progreso guardado localmente.");
};

// ================================
//   CARGAR PROGRESO LOCAL
// ================================
btnCargar.onclick = () => {
    const guardado = localStorage.getItem("progresoEstudio");
    if (!guardado) {
        alert("No hay progreso guardado.");
        return;
    }

    const progreso = JSON.parse(guardado);
    indicePreguntaActual = progreso.indice;
    preguntasEstudio = progreso.preguntasEstudio;

    alert("Progreso cargado.");
    mostrarPregunta();
};

// ================================
//   ACTUALIZAR INDICADORES
// ================================
function actualizarIndicadores() {
    indicadorNumero.textContent =
        `Pregunta: ${indicePreguntaActual + 1} / ${preguntasEstudio.length}`;

    indicadorRestantes.textContent =
        `Restantes: ${preguntasEstudio.length - (indicePreguntaActual + 1)}`;
}
