// Configuración
// CORRECCIÓN: Se agrega la carpeta "preguntas/"
const MATERIA_URL = 'preguntas/escalabilidad.json'; 
const CANTIDAD_EXAMEN = 30;
const MATERIA_NOMBRE = 'escalabilidad';

const estado = document.getElementById('estado');
const contenedor = document.getElementById('contenedor');
const timerEl = document.getElementById('timer');
const btnEmpezar = document.getElementById('btnEmpezar');
const btnGuardar = document.getElementById('btnGuardar'); 
const btnCargar = document.getElementById('btnCargar'); 
const modoSel = document.getElementById('modo');
const minutosSel = document.getElementById('minutos');

let banco = []; 
let ronda = []; 
let idx = 0;
let correctas = 0;
let respuestas = [];
let interval = null;

// Utils
function shuffle(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]];} return b; }
function sample(a,n){ return shuffle(a).slice(0, Math.min(n, a.length)); }
function fmt(seg){ const m=Math.floor(seg/60).toString().padStart(2,'0'); const s=(seg%60).toString().padStart(2,'0'); return `${m}:${s}`; }

async function cargarMateria(){
  const res = await fetch(MATERIA_URL); 
  if(!res.ok) throw new Error('No pude cargar el banco de preguntas (verifique preguntas/escalabilidad.json)');
  const data = await res.json();
  return data;
}

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

function mostrarPregunta(){
  if (idx >= ronda.length) { finalizar(false); return; }
  const q = ronda[idx];

  contenedor.innerHTML = `
    <div class="bg-white/80 backdrop-blur shadow-xl rounded-2xl border border-gray-100 p-5">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 border">Pregunta ${idx+1} / ${ronda.length}</span>
      </div>

      <h2 class="text-lg font-semibold mb-3 text-gray-800">${q.pregunta}</h2>
      
      ${q.imagen ? `
      <div class="flex justify-center my-4">
        <img src="${q.imagen}" alt="Imagen pregunta"
              class="max-w-full md:max-w-xl rounded-xl border shadow-md">
      </div>
      ` : ''}

      <div id="opciones" class="space-y-2"></div>
      <div id="feedback" class="mt-4 text-sm"></div>

      <div class="mt-5 flex gap-2">
        <button id="btnPrev" class="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 transition" ${idx===0 ? "disabled" : ""}>Anterior</button>
        <button id="btnNext" class="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 transition">Siguiente</button>
        <button id="btnFin" class="ml-auto px-4 py-2 rounded-xl border bg-indigo-600 text-white hover:bg-indigo-700 transition">Finalizar</button>
      </div>
    </div>
  `;

  const wrap = document.getElementById('opciones');
  wrap.innerHTML = q.opciones.map((op,i)=>`
    <button class="opt w-full text-left px-4 py-3 rounded-xl border bg-white hover:bg-indigo-50 transition text-gray-700" data-i="${i}">
      ${op}
    </button>
  `).join('');

  wrap.querySelectorAll('.opt').forEach(btn=>{
    btn.addEventListener('click', () => responder(parseInt(btn.dataset.i,10)));
  });

  document.getElementById('btnPrev').onclick = () => { if (idx>0) { idx--; mostrarPregunta(); } };
  document.getElementById('btnNext').onclick = () => { if (idx<ronda.length-1) { idx++; mostrarPregunta(); } else { finalizar(false); } };
  document.getElementById('btnFin').onclick  = () => finalizar(false);

  if (respuestas[idx] != null){
    deshabilitarOpciones(q.respuesta, respuestas[idx], modoSel.value==='examen');
    if (modoSel.value==='estudio') mostrarFeedback(respuestas[idx]===q.respuesta, q);
  }
}

function responder(iElegido){
  const q = ronda[idx];
  if (modoSel.value === 'estudio' && respuestas[idx] !== undefined) {
    if (respuestas[idx] === q.respuesta) correctas--;
  }
  respuestas[idx] = iElegido;

  if (modoSel.value === 'estudio'){
    const ok = iElegido === q.respuesta;
    if (ok) correctas++;
    mostrarFeedback(ok, q);
    deshabilitarOpciones(q.respuesta, iElegido, false);
  } else {
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
  document.querySelectorAll('#opciones .opt').forEach((b,i)=>{
    b.disabled = true;
    b.classList.add('disabled:opacity-80');
    if (!soloMarcar && indiceCorrecta!=null && i===indiceCorrecta) b.classList.add('ring-2','ring-green-300', 'bg-green-50');
    if (i===indiceElegida) b.classList.add('ring-2','ring-indigo-300');
  });
}

async function finalizar(porTiempo){
  clearInterval(interval);
  let total;
  if (modoSel.value === 'examen'){
    total = respuestas.reduce((acc, r, i)=> acc + (r===ronda[i].respuesta ? 1 : 0), 0);
  } else {
    total = correctas;
  }
  estado.textContent = (porTiempo ? '⏰ Se acabó el tiempo. ' : '🏁 Finalizado. ') + `Puntaje: ${total}/${ronda.length}`;
  contenedor.innerHTML = '';
}

btnEmpezar.onclick = async () => {
  try{
    btnEmpezar.disabled = true;
    estado.textContent = 'Cargando preguntas...';
    contenedor.innerHTML = '';
    correctas = 0; respuestas = []; idx = 0;
    banco = await cargarMateria(); 
    if (modoSel.value === 'examen') ronda = sample(banco, CANTIDAD_EXAMEN);
    else ronda = shuffle(banco); 
    estado.textContent = `Modo: ${modoSel.value.toUpperCase()} — Preguntas: ${ronda.length}`;
    mostrarPregunta();
    iniciarTimer();
  }catch(e){
    estado.textContent = 'Error: ' + e.message;
  }finally{
    btnEmpezar.disabled = false;
  }
};

const STORAGE_KEY = 'simulador_quiz_estado_v1';
btnGuardar && (btnGuardar.onclick = ()=>{
  const data = { materia: MATERIA_NOMBRE, modo: modoSel.value, minutos: minutosSel.value, ronda, idx, correctas, respuestas };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  alert('✅ Progreso guardado.');
});
btnCargar && (btnCargar.onclick = ()=>{
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return alert('No hay progreso guardado.');
  try{
    const d = JSON.parse(raw);
    modoSel.value = d.modo; minutosSel.value = d.minutos;
    ronda = d.ronda; idx = d.idx; correctas = d.correctas; respuestas = d.respuestas || [];
    estado.textContent = `Progreso cargado.`;
    mostrarPregunta(); iniciarTimer();
  }catch(e){ alert('Error cargando progreso.'); }
});
