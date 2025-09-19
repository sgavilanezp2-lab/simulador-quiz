const mapaMaterias={web:'preguntas/web.json',investigacion:'preguntas/investigacion.json'};
const estado=document.getElementById('estado');
const contenedor=document.getElementById('contenedor');
const timer=document.getElementById('timer');
const btnEmpezar=document.getElementById('btnEmpezar');
const materiaSel=document.getElementById('materia');
const modoSel=document.getElementById('modo');
const minutosSel=document.getElementById('minutos');
let ronda=[],idx=0,correctas=0,respuestas=[],tiempo=0,interval=null;

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function sample(a,n){return shuffle(a).slice(0,n);}

async function cargarMateria(m){
  const res=await fetch(mapaMaterias[m]);
  return await res.json();
}

btnEmpezar.onclick=async()=>{
  const banco=await cargarMateria(materiaSel.value);
  ronda=sample(banco,15);idx=0;correctas=0;respuestas=[];
  mostrarPregunta(); iniciarTimer();
};

function mostrarPregunta(){
  if(idx>=ronda.length){finalizar();return;}
  const q=ronda[idx];
  contenedor.innerHTML=`<div class='border p-3 bg-white rounded'>
    <h2>Pregunta ${idx+1} de ${ronda.length}</h2>
    <p>${q.pregunta}</p>
    ${q.opciones.map((op,i)=>`<button class='border block w-full text-left p-2 my-1' onclick='responder(${i})'>${op}</button>`).join('')}
  </div>`;
}

window.responder=(i)=>{
  respuestas[idx]=i;if(i===ronda[idx].respuesta)correctas++;idx++;mostrarPregunta();
};

function iniciarTimer(){
  clearInterval(interval);
  let seg=parseInt(minutosSel.value)*60;tiempo=seg;
  interval=setInterval(()=>{
    if(seg<=0){clearInterval(interval);finalizar();return;}
    seg--;timer.textContent=Math.floor(seg/60)+":"+String(seg%60).padStart(2,'0');
  },1000);
}

function finalizar(){
  contenedor.innerHTML='';
  estado.innerHTML=`Puntaje: ${correctas}/${ronda.length}`;
  if(auth.currentUser){
    db.collection('resultados').add({
      uid:auth.currentUser.uid,
      email:auth.currentUser.email,
      materia:materiaSel.value,
      puntaje:correctas,total:ronda.length,
      fecha:firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}
