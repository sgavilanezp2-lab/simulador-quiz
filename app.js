// --- Config y estado ---
const mapaMaterias = {
  web: 'preguntas/web.json',
  investigacion: 'preguntas/investigacion.json'
};

const estado       = document.getElementById('estado');
const contenedor   = document.getElementById('contenedor');
const timerEl      = document.getElementById('timer');

const btnEmpezar   = document.getElementById('btnEmpezar');
const btnGuardar   = document.getElementById('btnGuardar');
const btnCargar    = document.getElementById('btnCargar');

const materiaSel   = document.getElementById('materia');
const modoSel      = document.getElementById('modo');
const minutosSel   = document.getElementById('minutos');

let banco = [];
let ronda = [];
let idx = 0;
let correctas = 0;
let respuestas = [];
let interval = null;

// --- Utils ---
function shuffle(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]];} return b; }
function sample(a,n){ return shuffle(a).slice(0, Math.min(n, a.length)); }
function fmt(seg){ const m=Math.floor(seg/60).toString().padStart(2,'0'); const s=(seg%60).toString().padStart(2,'0'); return `${m}:${s}`; }

async function cargarMateria(key){
  const res = await fetch(mapaMaterias[key]);
  if(!res.ok) throw new Error('No pude cargar el banco de preguntas');
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

// --- Render pregunta + feedback ---
function mostrarPregunta(){
  if(idx >= ronda.length){ finalizar(false); return; }
  const q = ronda[idx];

  contenedor.innerHTML = `
    <div class="border p-3 bg-white rounded">
      <h2 class="font-semibold">Pregunta ${idx+1} de ${ronda.length}</h2>
      <p class="mt-2 mb-3">${q.pregunta}</p>
      <div id="opciones"></div>
      <div id="feedback" class="mt-3 text-sm"></div>
      <div class="mt-4 flex gap-2">
        <button id="btnPrev" class="border px-3 py-1 rounded" ${idx===0?'disabled':''}>Anterior</button>
        <button id="btnNext" class="border px-3 py-1 rounded">Siguiente</button>
        <button id="btnFin"  class="ml-auto border px-3 py-1 rounded">Finalizar</button>
      </div>
    </div>
  `;

  // opciones
  const wrap = document.getElementById('opciones');
  wrap.innerHTML = q.opciones.map((op,i)=>`
    <button class="opcion border block w-full text-left p-2 my-1 rounded" data-i="${i}">
      ${op}
    </button>
  `).join('');

  // listeners
  wrap.querySelectorAll('.opcion').forEach(btn=>{
    btn.addEventListener('click',()=>responder(parseInt(btn.dataset.i,10)));
  });
  document.getElementById('btnPrev').onclick = ()=>{ if(idx>0){ idx--; mostrarPregunta(); } };
  document.getElementById('btnNext').onclick = ()=>{ if(idx<ronda.length-1){ idx++; mostrarPregunta(); } else { finalizar(false); } };
  document.getElementById('btnFin').onclick  = ()=>finalizar(false);

  // si ya había respuesta, refléjala
  if (respuestas[idx] != null){
    deshabilitarOpciones(q.respuesta, respuestas[idx], modoSel.value==='examen');
    if (modoSel.value==='estudio'){
      mostrarFeedback(respuestas[idx]===q.respuesta, q);
    }
  }
}

function responder(iElegido){
  const q = ronda[idx];
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
    if (!soloMarcar && indiceCorrecta!=null && i===indiceCorrecta) b.classList.add('ring','ring-green-300');
    if (i===indiceElegida) b.classList.add('ring','ring-gray-300');
  });
}

// --- Finalizar + guardado (opcional Firestore) ---
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

  // Guardar en Firestore si existe 'db' y hay usuario
  try{
    if (typeof db !== 'undefined' && auth?.currentUser){
      await db.collection('resultados').add({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || null,
        materia: materiaSel.value,
        puntaje: total,
        total: ronda.length,
        modo: modoSel.value,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('Resultado guardado en Firestore');
    }
  }catch(e){
    console.error('No se pudo guardar el resultado:', e);
  }
}

// --- Botones principales ---
btnEmpezar.onclick = async () => {
  try{
    btnEmpezar.disabled = true;
    estado.textContent = 'Cargando preguntas...';
    contenedor.innerHTML = '';
    correctas = 0; respuestas = []; idx = 0;

    banco = await cargarMateria(materiaSel.value);
    ronda = sample(banco, 15);  // 15 al azar
    estado.textContent = `Materia: ${materiaSel.options[materiaSel.selectedIndex].text} — Preguntas seleccionadas: ${ronda.length}`;
    mostrarPregunta();
    iniciarTimer();
  }catch(e){
    estado.textContent = 'Error: ' + e.message;
  }finally{
    btnEmpezar.disabled = false;
  }
};

// --- Guardar/Cargar progreso local (opcional) ---
const STORAGE_KEY = 'simulador_quiz_estado_v1';
btnGuardar && (btnGuardar.onclick = ()=>{
  const data = { materia: materiaSel.value, modo: modoSel.value, minutos: minutosSel.value, ronda, idx, correctas, respuestas };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  alert('✅ Progreso guardado en este dispositivo.');
});
btnCargar && (btnCargar.onclick = ()=>{
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return alert('No hay progreso guardado.');
  try{
    const d = JSON.parse(raw);
    materiaSel.value = d.materia; modoSel.value = d.modo; minutosSel.value = d.minutos;
    ronda = d.ronda; idx = d.idx; correctas = d.correctas; respuestas = d.respuestas || [];
    estado.textContent = `Progreso cargado. Materia: ${materiaSel.options[materiaSel.selectedIndex].text} — Preguntas: ${ronda.length}`;
    mostrarPregunta(); iniciarTimer();
  }catch(e){ alert('No pude cargar el progreso.'); }
});

