// Configuración: APUNTA A LA CARPETA PREGUNTAS
const MATERIA_URL = './preguntas/escalabilidad.json';
const CANTIDAD_EXAMEN = 30;

// Referencias DOM
const startScreen = document.getElementById('startScreen');
const quizContainer = document.getElementById('quizContainer');
const preguntaRender = document.getElementById('preguntaRender');
const resultScreen = document.getElementById('resultScreen');
const reviewContainer = document.getElementById('reviewContainer');
const reviewActions = document.getElementById('reviewActions');
const scoreDisplay = document.getElementById('scoreDisplay');
const timerEl = document.getElementById('timer');
const estado = document.getElementById('estado');

// Botones
const btnEmpezar = document.getElementById('btnEmpezar');
const btnReview = document.getElementById('btnReview');
const btnGuardar = document.getElementById('btnGuardar');
const btnCargar = document.getElementById('btnCargar');
const modoSel = document.getElementById('modo');
const minutosSel = document.getElementById('minutos');

// Variables
let banco = [];
let ronda = [];
let idx = 0;
let respuestasUsuario = [];
let seleccionTemporal = null;
let interval = null;

// 1. CARGAR PREGUNTAS
async function cargarMateria() {
    try {
        const res = await fetch(MATERIA_URL);
        if (!res.ok) throw new Error('No encuentro preguntas/escalabilidad.json');
        banco = await res.json();
        return true;
    } catch (e) {
        alert("Error: " + e.message);
        estado.textContent = "Fallo al cargar preguntas. Verifica la carpeta.";
        return false;
    }
}

// 2. BOTÓN EMPEZAR
btnEmpezar.onclick = async () => {
    btnEmpezar.disabled = true;
    btnEmpezar.innerText = "Cargando...";

    const exito = await cargarMateria();
    if (!exito) {
        btnEmpezar.disabled = false;
        btnEmpezar.innerText = "Reintentar";
        return;
    }

    respuestasUsuario = [];
    idx = 0;

    if (modoSel.value === 'examen') {
        ronda = banco.sort(() => 0.5 - Math.random()).slice(0, CANTIDAD_EXAMEN);
    } else {
        ronda = banco.sort(() => 0.5 - Math.random());
    }

    startScreen.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    iniciarTimer();
    mostrarPregunta();
};

// 3. TIMER
function iniciarTimer() {
    clearInterval(interval);
    let seg = parseInt(minutosSel.value, 10) * 60;

    if (seg <= 0) {
        timerEl.textContent = '∞';
        return;
    }

    timerEl.textContent = fmt(seg);

    interval = setInterval(() => {
        seg--;
        timerEl.textContent = fmt(seg);
        if (seg <= 0) {
            clearInterval(interval);
            finalizarQuiz(true);
        }
    }, 1000);
}

function fmt(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
}

// 4. RENDERIZAR PREGUNTA
function mostrarPregunta() {
    seleccionTemporal = null;

    if (idx >= ronda.length) {
        finalizarQuiz(false);
        return;
    }

    const q = ronda[idx];

    // Inserto los botones locales DEBAJO de las opciones (se generarán en cada pregunta)
    preguntaRender.innerHTML = `
        <h2 class="text-lg font-bold text-gray-800 mb-4">${q.pregunta}</h2>

        ${q.imagen ? `
        <div class="flex justify-center mb-4">
            <img src="${q.imagen}" class="quiz-image">
        </div>` : ''}

        <div id="opcionesBox" class="flex flex-col gap-2"></div>

        <!-- BOTONES DE GUARDADO LOCAL (se muestran solo en modo estudio) -->
        <div id="studyLocalControls" class="hidden mt-4 flex gap-3">
            <button id="btnGuardarLocal" class="text-xs text-gray-500 underline hover:text-blue-600">Guardar progreso local</button>
            <button id="btnCargarLocal" class="text-xs text-gray-500 underline hover:text-blue-600">Cargar progreso local</button>
        </div>

        <div class="mt-6 flex justify-end">
            <button id="btnSiguiente" class="btn-start" style="width:auto; padding:8px 25px; opacity:0.5;" disabled>
                ${idx === ronda.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
        </div>
    `;

    const opcionesBox = document.getElementById('opcionesBox');

    q.opciones.forEach((op, i) => {
        const btn = document.createElement('button');
        btn.className = "opt";
        btn.textContent = op;
        btn.onclick = () => seleccionar(i, btn);
        opcionesBox.appendChild(btn);
    });

    // Mostrar/ocultar controles locales según modo
    const studyLocalControls = document.getElementById('studyLocalControls');
    if (modoSel.value === "estudio") {
        studyLocalControls.classList.remove('hidden');
    } else {
        studyLocalControls.classList.add('hidden');
    }

    // Conectar listeners de guardado/carga local (se re-conectan cada render)
    const btnGuardarLocal = document.getElementById('btnGuardarLocal');
    const btnCargarLocal = document.getElementById('btnCargarLocal');

    if (btnGuardarLocal) {
        btnGuardarLocal.onclick = () => {
            if (modoSel.value !== "estudio") {
                alert("Solo puedes guardar en modo estudio.");
                return;
            }
            const state = { ronda, idx, respuestasUsuario };
            localStorage.setItem("simulador_local", JSON.stringify(state));
            alert("Progreso guardado localmente.");
        };
    }

    if (btnCargarLocal) {
        btnCargarLocal.onclick = () => {
            const data = JSON.parse(localStorage.getItem("simulador_local"));
            if (!data) {
                alert("No hay progreso guardado localmente.");
                return;
            }

            // Restaurar estado guardado
            ronda = data.ronda || [];
            idx = typeof data.idx === 'number' ? data.idx : 0;
            respuestasUsuario = data.respuestasUsuario || [];

            // Mostrar quiz en el estado cargado
            startScreen.classList.add('hidden');
            quizContainer.classList.remove('hidden');
            if (modoSel.value === "estudio") studyLocalControls.classList.remove('hidden');
            iniciarTimer(); // reinicia timer según el select actual (no guarda tiempo restante)
            mostrarPregunta();

            alert("Progreso cargado.");
        };
    }

    document.getElementById('btnSiguiente').onclick = avanzar;
}

// ⭐⭐⭐ RETROALIMENTACIÓN INMEDIATA EN MODO ESTUDIO ⭐⭐⭐
function seleccionar(index, btnRef) {
    const q = ronda[idx];
    const all = document.querySelectorAll('#opcionesBox button');
    const btnNext = document.getElementById('btnSiguiente');

    all.forEach(b => b.classList.remove('option-selected', 'ans-correct', 'ans-wrong'));

    seleccionTemporal = index;

    // ⭐ MODO ESTUDIO → RETROALIMENTACIÓN INMEDIATA
    if (modoSel.value === "estudio") {

        if (index === q.respuesta) {
            btnRef.classList.add("ans-correct");
        } else {
            btnRef.classList.add("ans-wrong");
            if (all[q.respuesta]) all[q.respuesta].classList.add("ans-correct");
        }

        if (q.explicacion) {
            const box = document.createElement("div");
            box.className = "bg-blue-50 border border-blue-200 p-3 rounded mt-3 text-sm text-blue-800";
            box.innerHTML = `<b>Explicación:</b> ${q.explicacion}`;
            preguntaRender.appendChild(box);
        }

        btnNext.disabled = false;
        btnNext.style.opacity = "1";

        return;
    }

    // ⭐ MODO EXAMEN → SIN RETROALIMENTACIÓN
    btnRef.classList.add('option-selected');
    btnNext.disabled = false;
    btnNext.style.opacity = "1";
}

// CONTINUAR
function avanzar() {
    if (seleccionTemporal === null) return;
    respuestasUsuario.push(seleccionTemporal);
    idx++;
    mostrarPregunta();
}

function finalizarQuiz(tiempo) {
    clearInterval(interval);
    quizContainer.classList.add('hidden');
    resultScreen.classList.remove('hidden');

    let aciertos = 0;
    ronda.forEach((p, i) => {
        if (respuestasUsuario[i] === p.respuesta) aciertos++;
    });

    scoreDisplay.textContent = `${aciertos} / ${ronda.length}`;

    if (tiempo) alert("Tiempo terminado.");
}

// 5. REVISIÓN
btnReview.onclick = () => {
    resultScreen.classList.add('hidden');
    reviewContainer.classList.remove('hidden');
    reviewActions.classList.remove('hidden');

    reviewContainer.innerHTML = '';

    ronda.forEach((p, i) => {
        const userAns = respuestasUsuario[i];
        const ok = (userAns === p.respuesta);

        const card = document.createElement('div');
        card.className = "bg-white p-4 rounded border shadow-sm mb-4";

        let html = `<p class="font-bold mb-2">${i + 1}. ${p.pregunta}</p>`;

        if (p.imagen) html += `<img src="${p.imagen}" class="quiz-image" style="max-height:150px;">`;

        p.opciones.forEach((op, k) => {
            let cls = "";
            if (k === p.respuesta) cls = "ans-correct";
            else if (k === userAns && !ok) cls = "ans-wrong";
            else if (k === userAns) cls = "option-selected";

            html += `<div class="p-2 rounded border mb-1 ${cls}">${op}</div>`;
        });

        if (p.explicacion)
            html += `<div class="text-xs text-gray-500 mt-2 italic bg-gray-100 p-2">Nota: ${p.explicacion}</div>`;

        card.innerHTML = html;
        reviewContainer.appendChild(card);
    });
};

// Guardado
const KEY = 'simulador_data';

btnGuardar.onclick = () => {
    localStorage.setItem(KEY, JSON.stringify({ ronda, respuestasUsuario, idx }));
    alert("Guardado.");
};

btnCargar.onclick = () => {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d) {
        ronda = d.ronda;
        respuestasUsuario = d.respuestasUsuario;
        idx = d.idx;
        startScreen.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        iniciarTimer();
        mostrarPregunta();
    } else alert("No hay datos.");
};
