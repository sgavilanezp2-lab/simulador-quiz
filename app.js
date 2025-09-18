// === Utilidades ===
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// === Config ===
const RONDA_PREGUNTAS = 15;
const mapaMaterias = {
  web: 'preguntas/web.json',
  investigacion: 'preguntas/investigacion.json',
  software2: 'preguntas/software2.json',
  liderazgo: 'preguntas/liderazgo.json',
  mineria: 'preguntas/mineria.json',
  redes: 'preguntas/redes.json'
};

// === Estado ===
const estadoEl = document.getElementById('estado');
const contenedorEl = document.getElementById('contenedor');
const timerEl = document.getElementById('timer');
const btnEmpezar = document.getElementById('btnEmpezar');
const btnGuardar = document.getElementById('btnGuardar');
const btnCargar = document.getElementById('btnCargar');
const materiaSel = document.getElementById('materia');
const modoSel = document.getElementById('modo');
const minutosSel = document.getElementById('minutos');

let banco = [];
let ronda = [];
let idx = 0;
let correctas = 0;
let respuestasUsuario = []; // índices elegidos por el usuario
let feedbackBloqueado = false;
let tiempoRestante = 0;
let timerId = null;

// === Persistencia simple (localStorage) ===
const STORAGE_KEY = 'simulador_quiz_v1';

function guardarProgreso() {
  const data = {
    materia: materiaSel.value,
    modo: modoSel.value,
    minutos: minutosSel.value,
    ronda,
    idx,
    correctas,
    respuestasUsuario,
    tiempoRestante
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  alert('✅ Progreso guardado en este dispositivo.');
}

function cargarProgreso() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { alert('No hay progreso guardado.'); return; }
  try {
    const data = JSON.parse(raw);
    materiaSel.value = data.materia;
    modoSel.value = data.modo;
    minutosSel.value = data.minutos;
    ronda = data.ronda;
    idx = data.idx;
    correctas = data.correctas;
    respuestasUsuario = data.respuestasUsuario || [];
    tiempoRestante = data.tiempoRestante ?? 0;
    feedbackBloqueado = (modoSel.value === 'examen');
    estadoEl.innerHTML = `Progreso cargado. Materia: <b>${materiaSel.options[materiaSel.selectedIndex].text}</b> — Preguntas: <b>${ronda.length}</b>`;
    renderPregunta();
    iniciarTimer(true);
  } catch (e) {
    console.error(e);
    alert('No pude cargar el progreso.');
  }
}

// === Temporizador ===
function iniciarTimer(desdeCarga=false) {
  clearInterval(timerId);
  const minutos = parseInt(minutosSel.value, 10);
  if (minutos <= 0) {
    timerEl.textContent = 'Sin tiempo';
    return;
  }
  if (!desdeCarga) tiempoRestante = minutos * 60;
  timerEl.textContent = formatTime(tiempoRestante);
  timerId = setInterval(() => {
    tiempoRestante--;
    timerEl.textContent = formatTime(tiempoRestante);
    if (tiempoRestante <= 0) {
      clearInterval(timerId);
      finalizar(true);
    }
  }, 1000);
}

// === Render ===
function renderPregunta() {
  const q = ronda[idx];
  contenedorEl.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'bg-white border rounded-2xl p-4 md:p-6 shadow-sm';

  const h = document.createElement('h2');
  h.className = 'text-lg font-semibold';
  h.textContent = `Pregunta ${idx + 1} de ${ronda.length}`;
  wrap.appendChild(h);

  const p = document.createElement('p');
  p.className = 'mt-2';
  p.textContent = q.pregunta;
  wrap.appendChild(p);

  // barajamos opciones cada render, pero guardamos mapping para índices
  const opcionesIndices = shuffle(q.opciones.map((_, i) => i));

  const opcionesWrap = document.createElement('div');
  opcionesWrap.className = 'mt-3 grid gap-2';
  opcionesIndices.forEach((iOriginal, pos) => {
    const btn = document.createElement('button');
    btn.className = 'text-left rounded-xl border px-3 py-2 hover:bg-gray-50';
    btn.textContent = `${String.fromCharCode(65 + pos)}. ${q.opciones[iOriginal]}`;
    btn.onclick = () => validar(iOriginal, q, btn);
    opcionesWrap.appendChild(btn);
  });
  wrap.appendChild(opcionesWrap);

  const exp = document.createElement('div');
  exp.id = 'explicacion';
  exp.className = 'mt-3 text-sm';
  wrap.appendChild(exp);

  const nav = document.createElement('div');
  nav.className = 'mt-4 flex gap-2';
  const prev = document.createElement('button');
  prev.textContent = 'Anterior';
  prev.className = 'rounded-xl border px-3 py-2 bg-white hover:bg-gray-50';
  prev.onclick = () => mover(-1);
  prev.disabled = idx === 0;
  nav.appendChild(prev);

  const next = document.createElement('button');
  next.textContent = 'Siguiente';
  next.className = 'rounded-xl border px-3 py-2 bg-white hover:bg-gray-50';
  next.onclick = () => mover(1);
  nav.appendChild(next);

  const fin = document.createElement('button');
  fin.textContent = 'Finalizar';
  fin.className = 'ml-auto rounded-xl border px-3 py-2 bg-white hover:bg-gray-50';
  fin.onclick = () => finalizar(false);
  nav.appendChild(fin);

  wrap.appendChild(nav);
  contenedorEl.appendChild(wrap);

  // Si ya respondió esta pregunta, mostrar feedback (en modo estudio)
  if (respuestasUsuario[idx] != null && modoSel.value === 'estudio') {
    mostrarFeedback(respuestasUsuario[idx] === q.respuesta, q);
  }
}

function validar(iElegido, q, btnEl) {
  // Guardar respuesta del usuario
  respuestasUsuario[idx] = iElegido;

  if (modoSel.value === 'estudio') {
    const correcto = (iElegido === q.respuesta);
    if (correcto) correctas++; // contar al instante
    mostrarFeedback(correcto, q);
  } else {
    // Modo examen: solo marcar selección visualmente
    btnEl.classList.add('ring', 'ring-gray-300');
  }
}

function mostrarFeedback(correcto, q) {
  const exp = document.getElementById('explicacion');
  if (correcto) {
    exp.className = 'mt-3 text-sm rounded-xl border bg-green-50 border-green-200 text-green-800 px-3 py-2';
    exp.textContent = '✅ ¡Correcto!' + (q.explicacion ? ` ${q.explicacion}` : '');
  } else {
    exp.className = 'mt-3 text-sm rounded-xl border bg-red-50 border-red-200 text-red-800 px-3 py-2';
    const correcta = q.opciones[q.respuesta];
    exp.textContent = `❌ Incorrecto. Respuesta correcta: "${correcta}".` + (q.explicacion ? ` ${q.explicacion}` : '');
  }
}

function mover(delta) {
  const nuevo = idx + delta;
  if (nuevo < 0 || nuevo >= ronda.length) return;
  idx = nuevo;
  renderPregunta();
}

function finalizar(porTiempo) {
  clearInterval(timerId);

  // Calcular puntaje
  let totalCorrectas = correctas;
  if (modoSel.value === 'examen') {
    totalCorrectas = 0;
    respuestasUsuario.forEach((r, i) => {
      if (r != null && r === ronda[i].respuesta) totalCorrectas++;
    });
  }

  const detalles = [];
  if (modoSel.value === 'examen') {
    // Mostrar un resumen con cada pregunta y si acertó
    for (let i = 0; i < ronda.length; i++) {
      const q = ronda[i];
      const r = respuestasUsuario[i];
      detalles.push({
        i: i + 1,
        correcta: r === q.respuesta,
        correctaTxt: q.opciones[q.respuesta],
        elegidaTxt: r != null ? q.opciones[r] : '(sin respuesta)',
        explicacion: q.explicacion || ''
      });
    }
  }

  contenedorEl.innerHTML = '';
  estadoEl.innerHTML = porTiempo
    ? `⏰ Se acabó el tiempo. Puntaje: <b>${totalCorrectas}/${ronda.length}</b>`
    : `🏁 Finalizado. Puntaje: <b>${totalCorrectas}/${ronda.length}</b>`;

  // Render resumen (si examen)
  if (modoSel.value === 'examen') {
    const wrap = document.createElement('div');
    wrap.className = 'mt-4 space-y-2';

    detalles.forEach(d => {
      const card = document.createElement('div');
      card.className = 'rounded-2xl border p-3 bg-white';
      const head = document.createElement('div');
      head.className = 'font-medium';
      head.textContent = `Pregunta ${d.i} — ${d.correcta ? '✅ Correcta' : '❌ Incorrecta'}`;
      card.appendChild(head);

      const p1 = document.createElement('p');
      p1.className = 'text-sm mt-1';
      p1.innerHTML = `<b>Tu respuesta:</b> ${d.elegidaTxt}`;
      card.appendChild(p1);

      const p2 = document.createElement('p');
      p2.className = 'text-sm';
      p2.innerHTML = `<b>Correcta:</b> ${d.correctaTxt}`;
      card.appendChild(p2);

      if (d.explicacion) {
        const p3 = document.createElement('p');
        p3.className = 'text-xs text-gray-600';
        p3.textContent = d.explicacion;
        card.appendChild(p3);
      }
      wrap.appendChild(card);
    });

    contenedorEl.appendChild(wrap);
  }
}

// === Flujo principal ===
async function cargarMateria(key) {
  const url = mapaMaterias[key];
  const res = await fetch(url);
  if (!res.ok) throw new Error('No pude cargar el banco de preguntas.');
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('El banco de preguntas no es un arreglo JSON.');
  return data;
}

btnEmpezar.addEventListener('click', async () => {
  try {
    btnEmpezar.disabled = true;
    estadoEl.textContent = 'Cargando preguntas...';
    contenedorEl.innerHTML = '';
    idx = 0;
    correctas = 0;
    respuestasUsuario = [];
    feedbackBloqueado = (modoSel.value === 'examen');

    banco = await cargarMateria(materiaSel.value);
    // construir ronda: muestreamos 15 aleatorias
    ronda = sample(banco, RONDA_PREGUNTAS);
    estadoEl.innerHTML = `Materia: <b>${materiaSel.options[materiaSel.selectedIndex].text}</b> — Preguntas seleccionadas: <b>${ronda.length}</b>`;

    renderPregunta();
    iniciarTimer(false);
  } catch (e) {
    console.error(e);
    estadoEl.textContent = 'Error: ' + e.message;
  } finally {
    btnEmpezar.disabled = false;
  }
});

btnGuardar.addEventListener('click', guardarProgreso);
btnCargar.addEventListener('click', cargarProgreso);
