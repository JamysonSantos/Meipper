import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-V5suvNo46FndhUbqMiIomiuVma3li-w",
  authDomain: "meipper-74267.firebaseapp.com",
  projectId: "meipper-74267",
  storageBucket: "meipper-74267.firebasestorage.app",
  messagingSenderId: "619482964791",
  appId: "1:619482964791:web:2937f0ecead659e54d30b2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🔹 Verifica sessão ao abrir
document.getElementById("popup-loading").style.display = "flex";
onAuthStateChanged(auth, (user) => {
  document.getElementById("popup-loading").style.display = "none";
  if (user) {
    document.getElementById("popup-login").style.display = "none";
  } else {
    document.getElementById("popup-login").style.display = "flex";
  }
});

// 🔹 Login
document.getElementById("btn-login").addEventListener("click", () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      document.getElementById("popup-login").style.display = "none";
    })
    .catch(err => alert(err.message));
});

// 🔹 Criar conta
document.getElementById("btn-register").addEventListener("click", () => {
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const confirm = document.getElementById("register-confirm").value;
  if (password !== confirm) {
    alert("Senhas não conferem!");
    return;
  }
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Conta criada! Use seu e-mail e senha para entrar.");
      document.getElementById("popup-register").style.display = "none";
      document.getElementById("popup-login").style.display = "flex";
    })
    .catch(err => alert(err.message));
});

// 🔹 Esqueci senha
document.getElementById("btn-forgot").addEventListener("click", () => {
  const email = document.getElementById("forgot-email").value;
  sendPasswordResetEmail(auth, email)
    .then(() => alert("Link de recuperação enviado!"))
    .catch(err => alert(err.message));
});

// 🔹 Trocar telas
document.getElementById("btn-show-register").addEventListener("click", () => {
  document.getElementById("popup-login").style.display = "none";
  document.getElementById("popup-register").style.display = "flex";
});

document.getElementById("btn-show-forgot").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("popup-login").style.display = "none";
  document.getElementById("popup-forgot").style.display = "flex";
});

// 🔹 Botão sair
document.getElementById("btn-logout").addEventListener("click", () => {
  signOut(auth).then(() => {
    document.getElementById("popup-login").style.display = "flex";
  });
});
