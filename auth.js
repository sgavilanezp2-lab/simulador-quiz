const authPanel=document.getElementById('authPanel');
const appPanel=document.getElementById('appPanel');
const email=document.getElementById('email');
const password=document.getElementById('password');
const msg=document.getElementById('authMsg');
const userInfo=document.getElementById('userInfo');
const btnLogin=document.getElementById('btnLogin');
const btnRegistro=document.getElementById('btnRegistro');
const btnGoogle=document.getElementById('btnGoogle');
const btnLogout=document.getElementById('btnLogout');

btnLogin.onclick=()=>auth.signInWithEmailAndPassword(email.value,password.value).catch(e=>msg.textContent=e.message);
btnRegistro.onclick=()=>auth.createUserWithEmailAndPassword(email.value,password.value).catch(e=>msg.textContent=e.message);
btnGoogle.onclick=()=>auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>msg.textContent=e.message);
btnLogout.onclick=()=>auth.signOut();

auth.onAuthStateChanged(user=>{
  if(user){authPanel.classList.add('hidden');appPanel.classList.remove('hidden');btnLogout.classList.remove('hidden');userInfo.textContent=user.email;}
  else{authPanel.classList.remove('hidden');appPanel.classList.add('hidden');btnLogout.classList.add('hidden');userInfo.textContent='';}
});
