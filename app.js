// ===============================
// APP v12 - Simulador de preguntas
// ===============================

// --- Config y estado ---

// 1. ELIMINACIÓN DE mapaMaterias y se fija la URL de la materia
const MATERIA_URL = 'preguntas/escalabilidad.json';
const CANTIDAD_EXAMEN = 30; // Nuevo límite para el modo examen

const estado = document.getElementById('estado');
const contenedor = document.getElementById('contenedor');
const timerEl = document.getElementById('timer');

const btnEmpezar = document.getElementById('btnEmpezar');
// Se mantienen las referencias, aunque estarán ocultos en el HTML modificado
const btnGuardar = document.getElementById('btnGuardar'); 
const btnCargar = document.getElementById('btnCargar'); 

// 2. SE ELIMINA materiaSel
// const materiaSel = document.getElementById('materia');
const modoSel = document.getElementById('modo');
const minutosSel = document.getElementById('minutos');

let banco = []; // El banco completo de preguntas (solo Escalabilidad)
let ronda = []; // Las preguntas seleccionadas para la sesión (30 o todas)
let idx = 0;
let correctas = 0;
let respuestas = [];
let interval = null;

// --- Utils ---
function shuffle(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]];} return b; }
function sample(a,n){ return shuffle(a).slice(0, Math.min(n, a.length)); }
function fmt(seg){ const m=Math.floor(seg/60).toString().padStart(2,'0'); const s=(seg%60).toString().padStart(2,'0'); return `${m}:${s}`; }

async function cargarMateria(){
  const res = await fetch(MATERIA_URL); // Carga directa de la URL fija
  if(!res.ok) throw new Error('No pude cargar el banco de preguntas de Escalabilidad');
  const data = await res.json();
  if(!Array.isArray(data)) throw new Error('El JSON de preguntas debe ser un arreglo');
  return data;
}

// --- Timer ---
function iniciarTimer(){
  clearInterval(interval);
  let seg = parseInt(minutosSel.value,10)*60;
  if (seg <= 0){ timerEl.textContent = 'Sin tiempo'; return; }
  timerEl.textContent = fmt(seg);
  interval = setInterval(()=>{
    seg--; timerEl.textContent = fmt(seg);
    if(seg<=0){ clearInterval(interval); finalizar(true); }
  },1000);
}

// --- Render pregunta + feedback (estilo mejorado) ---
function mostrarPregunta(){
  if (idx >= ronda.length) { finalizar(false); return; }
  const q = ronda[idx];

  contenedor.innerHTML = `
    <div class="bg-white/80 backdrop-blur shadow-xl rounded-2xl border border-gray-100 p-5">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 border">Pregunta ${idx+1} / ${ronda.length}</span>
      </div>

      <h2 class="text-lg font-semibold mb-3">${q.pregunta}</h2>
      ${q.imagen ? `
  <div class="flex justify-center my-4">
    <img src="${q.imagen}" alt="Imagen de la pregunta"
         class="max-w-full md:max-w-2xl rounded-xl border shadow-md">
  </div>
` : ''}

      <div id="opciones" class="space-y-2"></div>

      <div id="feedback" class="mt-4 text-sm"></div>

      <div class="mt-5 flex gap-2">
        <button id="btnPrev" class="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 transition"
                ${idx===0 ? "disabled" : ""}>Anterior</button>

        <button id="btnNext" class="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 transition">
          Siguiente
        </button>

        <button id="btnFin" class="ml-auto px-4 py-2 rounded-xl border bg-indigo-600 text-white hover:bg-indigo-700 transition">
          Finalizar
        </button>
      </div>
    </div>
  `;

  // Opciones con mejor estilo visual
  const wrap = document.getElementById('opciones');
  wrap.innerHTML = q.opciones.map((op,i)=>`
    <button
      class="opcion w-full text-left px-4 py-3 rounded-xl border bg-white hover:bg-indigo-50 transition"
      data-i="${i}">
      ${op}
    </button>
  `).join('');

  // Listeners
  wrap.querySelectorAll('.opcion').forEach(btn=>{
    btn.addEventListener('click', () => responder(parseInt(btn.dataset.i,10)));
  });
  document.getElementById('btnPrev').onclick = () => { if (idx>0) { idx--; mostrarPregunta(); } };
  document.getElementById('btnNext').onclick = () => { if (idx<ronda.length-1) { idx++; mostrarPregunta(); } else { finalizar(false); } };
  document.getElementById('btnFin').onclick  = () => finalizar(false);

  // Si ya había respuesta, refléjala
  if (respuestas[idx] != null){
    deshabilitarOpciones(q.respuesta, respuestas[idx], modoSel.value==='examen');
    if (modoSel.value==='estudio'){
      mostrarFeedback(respuestas[idx]===q.respuesta, q);
    }
  }
}

function responder(iElegido){
  const q = ronda[idx];
  // si el usuario cambia de opción en estudio, ajustamos el conteo
  if (modoSel.value === 'estudio' && respuestas[idx] !== undefined) {
    if (respuestas[idx] === q.respuesta) correctas--; // quitamos la anterior si era correcta
  }
  respuestas[idx] = iElegido;

  if (modoSel.value === 'estudio'){
    const ok = iElegido === q.respuesta;
    if (ok) correctas++;
    mostrarFeedback(ok, q);
    deshabilitarOpciones(q.respuesta, iElegido, false);
  } else {
    // examen: solo marcar la opción elegida, sin decir si es correcta
    deshabilitarOpciones(null, iElegido, true);
  }
}

function mostrarFeedback(ok, q){
  const box = document.getElementById('feedback');
  const correcta = q.opciones[q.respuesta];
  const exp = q.explicacion ? ` ${q.explicacion}` : '';
  if(ok){
    box.className = 'mt-3 text-sm rounded border bg-green-50 border-green-200 text-green-800 px-3 py-2';
    box.textContent = '✅ ¡Correcto!' + exp;
  }else{
    box.className = 'mt-3 text-sm rounded border bg-red-50 border-red-200 text-red-800 px-3 py-2';
    box.textContent = `❌ Incorrecto. Respuesta correcta: "${correcta}".` + exp;
  }
}

function deshabilitarOpciones(indiceCorrecta, indiceElegida, soloMarcar){
  document.querySelectorAll('#opciones .opcion').forEach((b,i)=>{
    b.disabled = true;
    b.classList.add('disabled:opacity-80');
    // Marca visual: correcta en verde, elegida con aro indigo
    if (!soloMarcar && indiceCorrecta!=null && i===indiceCorrecta) {
      b.classList.add('ring-2','ring-green-300');
    }
    if (i===indiceElegida) {
      b.classList.add('ring-2','ring-indigo-300');
    }
  });
}

// --- Finalizar + guardado (opcional Firestore) ---
async function finalizar(porTiempo){
  clearInterval(interval);
  let total;

  if (modoSel.value === 'examen'){
    // Se calcula el puntaje final del examen
    total = respuestas.reduce((acc, r, i)=> acc + (r===ronda[i].respuesta ? 1 : 0), 0);
  } else {
    // Se usa el conteo acumulado en el modo estudio
    total = correctas;
  }

  estado.textContent = (porTiempo ? '⏰ Se acabó el tiempo. ' : '🏁 Finalizado. ') + `Puntaje: ${total}/${ronda.length}`;
  contenedor.innerHTML = '';

  // 3. SE ELIMINA el intento de guardar en Firestore
  // try{ ... }catch(e){ ... }
}

// --- Botones principales ---
btnEmpezar.onclick = async () => {
  try{
    btnEmpezar.disabled = true;
    estado.textContent = 'Cargando preguntas de Escalabilidad...';
    contenedor.innerHTML = '';
    correctas = 0; respuestas = []; idx = 0;

    // Carga el banco completo de Escalabilidad
    banco = await cargarMateria(); 

    // Lógica de selección basada en el modo
    if (modoSel.value === 'examen') {
        // Examen: 30 preguntas aleatorias (usando la función sample)
        ronda = sample(banco, CANTIDAD_EXAMEN);
    } else {
        // Estudio: Todas las preguntas del banco (se barajan para evitar orden estático)
        ronda = shuffle(banco); 
    }

    estado.textContent = `Materia: Escalabilidad de redes — Preguntas seleccionadas: ${ronda.length}`;
    mostrarPregunta();
    iniciarTimer();
  }catch(e){
    estado.textContent = 'Error al iniciar el simulador: ' + e.message;
  }finally{
    btnEmpezar.disabled = false;
  }
};

// --- Guardar/Cargar progreso local (opcional) ---
const STORAGE_KEY = 'simulador_quiz_estado_v1';
btnGuardar && (btnGuardar.onclick = ()=>{
  // 4. Se elimina la referencia a materiaSel al guardar y se fija el valor
  const data = { materia: 'escalabilidad', modo: modoSel.value, minutos: minutosSel.value, ronda, idx, correctas, respuestas };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  alert('✅ Progreso guardado en este dispositivo.');
});
btnCargar && (btnCargar.onclick = ()=>{
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return alert('No hay progreso guardado.');
  try{
    const d = JSON.parse(raw);
    // 5. Se elimina la referencia a materiaSel al cargar
    // materiaSel.value = d.materia;
    modoSel.value = d.modo; minutosSel.value = d.minutos;
    ronda = d.ronda; idx = d.idx; correctas = d.correctas; respuestas = d.respuestas || [];
    estado.textContent = `Progreso cargado. Materia: Escalabilidad de redes — Preguntas: ${ronda.length}`;
    mostrarPregunta(); iniciarTimer();
  }catch(e){ alert('No pude cargar el progreso.'); }
});
