// Configuración
const MATERIA_URL = 'preguntas/escalabilidad.json'; 
const CANTIDAD_EXAMEN = 30;

// Elementos del DOM
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

// Variables
let banco = [];
let ronda = [];
let idx = 0;
let respuestasUsuario = [];
let seleccionTemporal = null;
let interval = null;

// 1. CARGAR DATOS
async function cargarMateria(){
  try {
    const res = await fetch(MATERIA_URL); 
    if(!res.ok) throw new Error('No se encuentra escalabilidad.json');
    banco = await res.json();
    return true;
  } catch(e) {
    alert("Error cargando preguntas: " + e.message);
    estado.textContent = "Error: " + e.message;
    return false;
  }
}

// 2. BOTÓN EMPEZAR (La parte que fallaba)
btnEmpezar.onclick = async () => {
  btnEmpezar.disabled = true;
  btnEmpezar.innerText = "Cargando...";
  
  const cargo = await cargarMateria();
  
  if(!cargo) { 
      btnEmpezar.disabled = false; 
      btnEmpezar.innerText = "EMPEZAR EXAMEN";
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
      finalizarQuiz(true);
    }
  },1000);
}
function fmt(s){ 
  const m=Math.floor(s/60).toString().padStart(2,'0'); 
  const sec=(s%60).toString().padStart(2,'0'); 
  return `${m}:${sec}`; 
}

// 4. MOSTRAR PREGUNTA
function mostrarPregunta(){
  seleccionTemporal = null;

  if (idx >= ronda.length) { 
    finalizarQuiz(false); 
    return; 
  }

  const q = ronda[idx];

  quizContainer.innerHTML = `
    <div class="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
      <div class="flex justify-between mb-4">
         <span class="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Pregunta ${idx+1} / ${ronda.length}</span>
      </div>

      <h2 class="text-lg font-bold text-gray-800 mb-4">${q.pregunta}</h2>
      
      ${q.imagen ? `
      <div class="flex justify-center mb-4">
        <img src="${q.imagen}" class="max-w-full h-auto max-h-60 rounded-lg border shadow-sm">
      </div>` : ''}

      <div id="opcionesBox" class="flex flex-col gap-2"></div>

      <div class="mt-6 flex justify-end">
        <button id="btnSiguiente" class="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold opacity-50 cursor-not-allowed transition" disabled>
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

function seleccionar(index, btnRef) {
  seleccionTemporal = index;
  const allBtns = document.querySelectorAll('#opcionesBox button');
  allBtns.forEach(b => b.classList.remove('option-selected', 'bg-indigo-50', 'ring-2', 'ring-indigo-500'));
  
  btnRef.classList.add('option-selected', 'bg-indigo-50', 'ring-2', 'ring-indigo-500');

  const btnNext = document.getElementById('btnSiguiente');
  btnNext.disabled = false;
  btnNext.classList.remove('opacity-50', 'cursor-not-allowed');
  btnNext.classList.add('hover:bg-blue-700');
}

function avanzar() {
  if (seleccionTemporal === null) return;
  respuestasUsuario.push(seleccionTemporal);
  idx++;
  mostrarPregunta();
}

function finalizarQuiz(porTiempo) {
  clearInterval(interval);
  quizContainer.classList.add('hidden');
  resultScreen.classList.remove('hidden');

  let aciertos = 0;
  ronda.forEach((p, i) => {
    if (respuestasUsuario[i] === p.respuesta) aciertos++;
  });

  scoreDisplay.textContent = `${aciertos} / ${ronda.length}`;
  if(porTiempo) alert("¡Tiempo agotado!");
}

// 5. REVISIÓN
btnReview.onclick = () => {
  resultScreen.classList.add('hidden');
  reviewContainer.classList.remove('hidden');
  reviewActions.classList.remove('hidden');
  reviewContainer.innerHTML = '';

  ronda.forEach((p, i) => {
    const userAns = respuestasUsuario[i];
    const isCorrect = (userAns === p.respuesta);
    
    const card = document.createElement('div');
    card.className = "bg-white p-4 rounded-xl border shadow-sm text-left";
    
    let htmlContent = `
      <p class="font-bold text-gray-800 mb-2">${i+1}. ${p.pregunta}</p>
      ${p.imagen ? `<img src="${p.imagen}" class="max-h-40 mb-2 rounded border mx-auto">` : ''}
      <div class="flex flex-col gap-1 text-sm">
    `;

    p.opciones.forEach((op, optIndex) => {
      let claseExtra = "";
      let icono = "";

      if (optIndex === p.respuesta) {
        claseExtra = "ans-correct";
        icono = "✅";
      } else if (optIndex === userAns && !isCorrect) {
        claseExtra = "ans-wrong";
        icono = "❌";
      }

      let borderClass = (optIndex === userAns) ? "border-2 border-blue-500" : "border border-gray-200";

      htmlContent += `
        <div class="p-2 rounded ${borderClass} ${claseExtra} flex justify-between items-center">
          <span>${op}</span>
          <span>${icono}</span>
        </div>
      `;
    });

    htmlContent += `</div>`;
    if(p.explicacion) {
        htmlContent += `<div class="mt-2 text-xs text-gray-500 italic bg-gray-50 p-2 rounded"><strong>Nota:</strong> ${p.explicacion}</div>`;
    }

    card.innerHTML = htmlContent;
    reviewContainer.appendChild(card);
  });
};

// Guardado Local
const STORAGE_KEY = 'simulador_v2_data';
btnGuardar.onclick = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ronda, respuestasUsuario, idx }));
  alert("Guardado.");
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
    alert("No hay datos.");
  }
};
