// Configuración
const MATERIA_URL = 'preguntas/escalabilidad.json'; // Asegúrate que el JSON tenga "img/"
const CANTIDAD_EXAMEN = 30;
const MATERIA_NOMBRE = 'escalabilidad';

// Elementos DOM
const startScreen = document.getElementById('startScreen');
const quizContainer = document.getElementById('quizContainer');
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

// Variables de Estado
let banco = [];
let ronda = []; // Preguntas seleccionadas
let idx = 0; // Índice actual
let respuestasUsuario = []; // Guardamos índice de opción (0, 1, 2...)
let seleccionTemporal = null; // Lo que el usuario marca antes de dar siguiente
let interval = null;

// --- 1. CARGAR DATOS ---
async function cargarMateria(){
  try {
    const res = await fetch(MATERIA_URL); 
    if(!res.ok) throw new Error('Error cargando JSON');
    banco = await res.json();
    return true;
  } catch(e) {
    estado.textContent = "Error: " + e.message;
    return false;
  }
}

// --- 2. LOGICA DEL TIMER ---
function iniciarTimer(){
  clearInterval(interval);
  let seg = parseInt(minutosSel.value,10)*60;
  if (seg <= 0){ timerEl.textContent = '∞'; return; }
  
  timerEl.textContent = fmt(seg);
  interval = setInterval(()=>{
    seg--; 
    timerEl.textContent = fmt(seg);
    if(seg<=0){ 
      clearInterval(interval); 
      finalizarQuiz(true); // Se acabó el tiempo
    }
  },1000);
}
function fmt(seg){ 
  const m=Math.floor(seg/60).toString().padStart(2,'0'); 
  const s=(seg%60).toString().padStart(2,'0'); 
  return `${m}:${s}`; 
}

// --- 3. INICIAR EL QUIZ ---
btnEmpezar.onclick = async () => {
  btnEmpezar.disabled = true;
  estado.textContent = "Cargando preguntas...";
  
  const cargo = await cargarMateria();
  if(!cargo) { btnEmpezar.disabled = false; return; }

  // Preparar ronda
  respuestasUsuario = [];
  idx = 0;
  correctas = 0;

  if (modoSel.value === 'examen') {
    ronda = sample(banco, CANTIDAD_EXAMEN);
  } else {
    ronda = shuffle(banco);
  }

  // Cambiar Pantallas
  startScreen.classList.add('hidden');
  quizContainer.classList.remove('hidden');
  
  iniciarTimer();
  mostrarPregunta();
};

// --- 4. MOSTRAR PREGUNTA ---
function mostrarPregunta(){
  seleccionTemporal = null; // Reset selección

  if (idx >= ronda.length) { 
    finalizarQuiz(false); 
    return; 
  }

  const q = ronda[idx];

  quizContainer.innerHTML = `
    <div class="bg-white/90 p-5 rounded-2xl border border-blue-100 shadow-sm">
      <div class="flex justify-between mb-4">
         <span class="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Pregunta ${idx+1} de ${ronda.length}</span>
      </div>

      <h2 class="text-lg font-bold text-gray-800 mb-4">${q.pregunta}</h2>
      
      ${q.imagen ? `
      <div class="flex justify-center mb-4">
        <img src="${q.imagen}" class="max-w-full h-auto max-h-60 rounded-lg border shadow-sm">
      </div>` : ''}

      <div id="opcionesBox" class="flex flex-col gap-3"></div>

      <div class="mt-6 flex justify-end">
        <button id="btnSiguiente" class="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold opacity-50 cursor-not-allowed" disabled>
          ${idx === ronda.length - 1 ? 'Finalizar' : 'Siguiente'}
        </button>
      </div>
    </div>
  `;

  const opcionesBox = document.getElementById('opcionesBox');
  
  q.opciones.forEach((op, i) => {
    const btn = document.createElement('button');
    btn.className = "opt w-full text-left px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 transition text-gray-700";
    btn.textContent = op;
    btn.onclick = () => seleccionar(i, btn);
    opcionesBox.appendChild(btn);
  });

  document.getElementById('btnSiguiente').onclick = avanzar;
}

// --- 5. SELECCIONAR OPCIÓN (Como en tu código) ---
function seleccionar(index, btnRef) {
  seleccionTemporal = index;
  
  // Quitar clase selected a todos
  const allBtns = document.querySelectorAll('#opcionesBox button');
  allBtns.forEach(b => b.classList.remove('option-selected', 'bg-indigo-50', 'ring-2', 'ring-indigo-500'));

  // Poner clase al seleccionado
  btnRef.classList.add('option-selected', 'bg-indigo-50', 'ring-2', 'ring-indigo-500');

  // Habilitar botón siguiente
  const btnNext = document.getElementById('btnSiguiente');
  btnNext.disabled = false;
  btnNext.classList.remove('opacity-50', 'cursor-not-allowed');
  btnNext.classList.add('hover:bg-blue-700');
}

// --- 6. AVANZAR ---
function avanzar() {
  if (seleccionTemporal === null) return; // Seguridad extra
  
  respuestasUsuario.push(seleccionTemporal);
  idx++;
  mostrarPregunta();
}

// --- 7. FINALIZAR Y MOSTRAR PUNTAJE ---
function finalizarQuiz(porTiempo) {
  clearInterval(interval);
  quizContainer.classList.add('hidden');
  resultScreen.classList.remove('hidden');

  // Calcular aciertos
  let aciertos = 0;
  ronda.forEach((p, i) => {
    if (respuestasUsuario[i] === p.respuesta) aciertos++;
  });

  scoreDisplay.textContent = `${aciertos} / ${ronda.length}`;
  
  if(porTiempo) alert("¡Se acabó el tiempo!");
}

// --- 8. LÓGICA DE REVISIÓN (Como la tuya) ---
btnReview.onclick = () => {
  resultScreen.classList.add('hidden');
  reviewContainer.classList.remove('hidden');
  reviewActions.classList.remove('hidden');
  
  reviewContainer.innerHTML = ''; // Limpiar

  ronda.forEach((p, i) => {
    const userAns = respuestasUsuario[i]; // Qué respondió el usuario
    const isCorrect = (userAns === p.respuesta);
    
    // Crear tarjeta de revisión
    const card = document.createElement('div');
    card.className = "bg-white p-4 rounded-xl border shadow-sm text-left";
    
    let htmlContent = `
      <p class="font-bold text-gray-800 mb-2">${i+1}. ${p.pregunta}</p>
      ${p.imagen ? `<img src="${p.imagen}" class="max-h-40 mb-2 rounded border">` : ''}
      <div class="flex flex-col gap-1 text-sm">
    `;

    p.opciones.forEach((op, optIndex) => {
      let claseExtra = "";
      let icono = "";

      // Logica de colores EXACTA a la tuya
      if (optIndex === p.respuesta) {
        // Esta es la correcta -> VERDE
        claseExtra = "ans-correct";
        icono = "✅";
      } else if (optIndex === userAns && !isCorrect) {
        // El usuario eligió esta y está mal -> ROJA
        claseExtra = "ans-wrong";
        icono = "❌";
      } else if (optIndex === userAns && isCorrect) {
        // Usuario eligió bien (ya cubierto arriba, pero por si acaso)
        claseExtra = "ans-correct"; 
      }

      // Marcamos visualmente cuál seleccionó el usuario (borde azul) si no es ni correcta ni incorrecta roja
      let borderClass = (optIndex === userAns) ? "border-2 border-blue-500" : "border border-gray-200";

      htmlContent += `
        <div class="p-2 rounded ${borderClass} ${claseExtra} flex justify-between items-center">
          <span>${op}</span>
          <span>${icono}</span>
        </div>
      `;
    });

    htmlContent += `
      </div>
      <div class="mt-2 text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
        <strong>Explicación:</strong> ${p.explicacion || "Sin explicación disponible."}
      </div>
    `;

    card.innerHTML = htmlContent;
    reviewContainer.appendChild(card);
  });
};

// Utils Arrays
function shuffle(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]];} return b; }
function sample(a,n){ return shuffle(a).slice(0, Math.min(n, a.length)); }

// Guardado Local (Opcional)
const STORAGE_KEY = 'simulador_v2_data';
btnGuardar.onclick = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ronda, respuestasUsuario, idx }));
  alert("Progreso guardado (Solo funciona si no has terminado el examen)");
};
btnCargar.onclick = () => {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if(data) {
    ronda = data.ronda; respuestasUsuario = data.respuestasUsuario; idx = data.idx;
    startScreen.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    iniciarTimer();
    mostrarPregunta();
  } else {
    alert("No hay datos guardados");
  }
};
