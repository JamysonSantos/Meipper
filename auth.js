// auth.js
import { auth } from './firebase.js';

// Elementos do DOM
const authPopup = document.createElement('div');
let styleEl = null;

// Templates dos formulários
const loginForm = `
  <div class="auth-popup">
    <h3>Acesse sua conta</h3>
    <input type="email" id="login-email" placeholder="E-mail">
    <div class="password-container">
      <input type="password" id="login-password" placeholder="Senha">
      <span class="toggle-password">👁️</span>
    </div>
    <button id="login-btn">Entrar</button>
    <p class="auth-switch">Crie sua conta clicando aqui</p>
  </div>
`;

const signupForm = `
  <div class="auth-popup">
    <h3>Crie sua conta</h3>
    <input type="email" id="signup-email" placeholder="E-mail">
    <div class="password-container">
      <input type="password" id="signup-password" placeholder="Senha">
      <span class="toggle-password">👁️</span>
    </div>
    <div class="password-container">
      <input type="password" id="signup-confirm" placeholder="Confirme a senha">
      <span class="toggle-password">👁️</span>
    </div>
    <button id="signup-btn">Cadastrar</button>
    <p class="auth-switch">Já tem conta? Faça login</p>
  </div>
`;

// Estilos
const authStyles = `
  .auth-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
    z-index: 1000;
    width: 300px;
  }
  .password-container {
    position: relative;
    margin: 10px 0;
  }
  .toggle-password {
    position: absolute;
    right: 10px;
    top: 10px;
    cursor: pointer;
  }
  .auth-switch {
    cursor: pointer;
    color: blue;
    text-align: center;
  }
`;

// Mostrar popup de autenticação
export function showAuthPopup(isLogin = true) {
  authPopup.innerHTML = isLogin ? loginForm : signupForm;
  
  if (!document.contains(authPopup)) {
    document.body.appendChild(authPopup);
  }
  
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.textContent = authStyles;
    document.head.appendChild(styleEl);
  }
  
  setupAuthEvents(isLogin);
}

// Configurar eventos
function setupAuthEvents(isLogin) {
  // Alternar entre login/cadastro
  authPopup.querySelector('.auth-switch')?.addEventListener('click', () => {
    showAuthPopup(!isLogin);
  });
  
  // Toggle para mostrar senha
  authPopup.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      const input = e.target.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });
  
  // Botão de ação
  const actionBtn = isLogin 
    ? authPopup.querySelector('#login-btn') 
    : authPopup.querySelector('#signup-btn');
  
  actionBtn?.addEventListener('click', () => {
    if (isLogin) loginUser();
    else registerUser();
  });
}

// Login do usuário
async function loginUser() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeAuthPopup();
  } catch (error) {
    alert(error.message);
  }
}

// Registrar novo usuário
async function registerUser() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  
  if (password !== confirm) {
    alert("As senhas não coincidem!");
    return;
  }
  
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    closeAuthPopup();
  } catch (error) {
    alert(error.message);
  }
}

// Fechar popup
function closeAuthPopup() {
  if (document.contains(authPopup)) {
    document.body.removeChild(authPopup);
  }
}

// Logout
export async function logoutUser() {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  }
}

// Atualizar UI de autenticação
export function updateAuthUI() {
  const user = auth.currentUser;
  const authBtn = document.getElementById('auth-btn');
  
  if (authBtn) {
    authBtn.textContent = user ? 'Sair' : 'Entrar';
    authBtn.onclick = user ? logoutUser : () => showAuthPopup(true);
  }
}

// Monitorar estado de autenticação
auth.onAuthStateChanged((user) => {
  updateAuthUI();
  
  // Mostrar popup automaticamente apenas se não houver usuário
  if (!user && !document.querySelector('.auth-popup')) {
    showAuthPopup(true);
  }
});
