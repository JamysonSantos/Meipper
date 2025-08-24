// ======================
// AUTHENTICATION SYSTEM
// ======================
class AuthManager {
    constructor() {
        this.user = null;
        this.authLoadingOverlay = document.getElementById('auth-loading-overlay');
        this.mainApp = document.getElementById('main-app');
        this.loginModal = document.getElementById('login-modal');
        this.registerModal = document.getElementById('register-modal');
        this.forgotPasswordModal = document.getElementById('forgot-password-modal');
        this.successModal = document.getElementById('success-modal');
        
        this.init();
    }

    init() {
        this.waitForFirebase().then(() => {
            this.setupEventListeners();
            this.checkAuthState();
        });
    }

    waitForFirebase() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.firebaseAuth && window.onAuthStateChanged) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));

    // Register form
    document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));

    // Forgot password form
    document.getElementById('forgot-password-form').addEventListener('submit', (e) => this.handleForgotPassword(e));

    // Navigation buttons
    document.getElementById('show-register-btn').addEventListener('click', () => this.showRegisterModal());
    document.getElementById('back-to-login').addEventListener('click', () => this.showLoginModal());
    document.getElementById('back-to-login-from-forgot').addEventListener('click', () => this.showLoginModal());
    document.getElementById('show-forgot-password').addEventListener('click', () => this.showForgotPasswordModal());
    
    // ALTERADO: Botão de sucesso agora apenas fecha o modal
    document.getElementById('success-ok-btn').addEventListener('click', () => this.hideSuccessModal());

    // User menu toggle
    const userMenuToggle = document.getElementById('user-menu-toggle');
    const userMenu = document.getElementById('user-menu');
    if (userMenuToggle && userMenu) {
        userMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('hidden');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuToggle.contains(e.target) && !userMenu.contains(e.target)) {
                userMenu.classList.add('hidden');
            }
        });
    }

    // Logout button
    const logoutBtn = document.querySelector('#logout-btn, [data-action="logout"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Password toggles
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            this.togglePassword(e.target.closest('.password-toggle').dataset.target);
        });
    });

    const confirmPasswordInput = document.getElementById('confirm-password');
    const registerPasswordInput = document.getElementById('register-password');

    if (confirmPasswordInput && registerPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
        registerPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
    }
}

// Adicione este método à classe AuthManager:
hideSuccessModal() {
    this.successModal.classList.remove('active');
}

    checkAuthState() {
        window.onAuthStateChanged(window.firebaseAuth, (user) => {
            this.hideAuthLoading();
            if (user) {
                this.user = user;

                // 🔹 Atualiza perfil no Firestore
                salvarPerfilUsuario(user);

                // 🔹 Resetar editor e limpar todos os campos ao logar
                this.clearAllUserData();

                this.showMainApp();
                console.log("Usuário autenticado:", user.email);
                this.loadUserName(user);
            } else {
                this.user = null;
                this.showLoginModal();
                console.log("Usuário não autenticado");
            }
        });
    }

    clearAllUserData() {
        // Limpar editor
        if (typeof editor !== "undefined") {
            editor.clear();
        }
        
        // Resetar variáveis globais
        if (typeof nodeIdCounter !== "undefined") nodeIdCounter = 0;
        if (typeof connectionLabels !== "undefined") connectionLabels = new Map();
        if (typeof taskDescriptions !== "undefined") taskDescriptions = new Map();
        if (typeof currentZoom !== "undefined") currentZoom = 1;
        if (typeof actors !== "undefined") actors = {};

        // Limpar campos da interface
        const processNameInput = document.getElementById('process-name');
        if (processNameInput) processNameInput.value = '';

        const processDisplayName = document.getElementById('process-display-name');
        if (processDisplayName) processDisplayName.textContent = 'Processo sem nome';

        const actorsLegend = document.getElementById('actors-legend');
        if (actorsLegend) actorsLegend.innerHTML = '';

        const actorsList = document.getElementById('actors-list');
        if (actorsList) actorsList.innerHTML = '';

        const actorSelect = document.getElementById('actor-select');
        if (actorSelect) {
            actorSelect.innerHTML = '<option value="">Selecione...</option>';
        }

        const actorInput = document.getElementById('actor-input');
        if (actorInput) actorInput.value = '';

        const taskInput = document.getElementById('task-input');
        if (taskInput) taskInput.value = '';

        const taskDescriptionInput = document.getElementById('task-description-input');
        if (taskDescriptionInput) taskDescriptionInput.value = '';
    }

    async loadUserName(user) {
        try {
            const userDoc = await window.getDoc(window.doc(window.firebaseDB, "usuarios", user.uid));
            let displayName = user.displayName || 'Usuário';
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                displayName = userData.name || userData.nome || user.displayName || 'Usuário';
            }

            const userNameDisplay = document.getElementById('user-name-display');
            if (userNameDisplay) {
                userNameDisplay.textContent = displayName;
            }
        } catch (error) {
            console.error('Erro ao carregar nome do usuário:', error);
            const userNameDisplay = document.getElementById('user-name-display');
            if (userNameDisplay) {
                userNameDisplay.textContent = user.displayName || 'Usuário';
            }
        }
    }
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const loginBtn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');

        if (!email || !password) {
            this.showError(errorDiv, 'Por favor, preencha todos os campos.');
            return;
        }

        this.setButtonLoading(loginBtn, true);
        this.hideError(errorDiv);

        try {
            await window.signInWithEmailAndPassword(window.firebaseAuth, email, password);
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError(errorDiv, this.getAuthErrorMessage(error));
        } finally {
            this.setButtonLoading(loginBtn, false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const displayName = document.getElementById('register-name').value.trim();
        const registerBtn = document.getElementById('register-btn');
        const errorDiv = document.getElementById('register-error');

        if (!displayName) {
            this.showError(errorDiv, 'Por favor, preencha o nome.');
            return;
        }
        if (password !== confirmPassword) {
            this.showError(errorDiv, 'As senhas não coincidem.');
            return;
        }

        this.setButtonLoading(registerBtn, true);
        this.hideError(errorDiv);

        try {
            const cred = await window.createUserWithEmailAndPassword(window.firebaseAuth, email, password);
            const user = cred.user;


            // Atualizar perfil do usuário
            await window.updateProfile(user, { displayName });

            // Salvar no Firestore
            await window.setDoc(window.doc(window.firebaseDB, "usuarios", user.uid), {
                email: user.email,
                name: displayName,
                nome: displayName,
                createdAt: window.serverTimestamp()
            });

            this.showSuccessModal();
        } catch (error) {
            console.error("Erro no cadastro:", error);
            this.showError(errorDiv, this.getAuthErrorMessage(error));
        } finally {
            this.setButtonLoading(registerBtn, false);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value.trim();
        const forgotBtn = document.getElementById('forgot-password-btn');
        const errorDiv = document.getElementById('forgot-password-error');
        const successDiv = document.getElementById('forgot-password-success');

        if (!email) {
            this.showError(errorDiv, 'Por favor, digite seu e-mail.');
            return;
        }

        this.setButtonLoading(forgotBtn, true);
        this.hideError(errorDiv);
        this.hideSuccess(successDiv);

        try {
            await window.sendPasswordResetEmail(window.firebaseAuth, email);
            this.showSuccess(successDiv, 'E-mail de recuperação enviado! Verifique sua caixa de entrada.');
            document.getElementById('forgot-email').value = '';
        } catch (error) {
            console.error('Erro ao enviar e-mail de recuperação:', error);
            this.showError(errorDiv, this.getAuthErrorMessage(error));
        } finally {
            this.setButtonLoading(forgotBtn, false);
        }
    }

    async handleLogout() {
        if (confirm('Tem certeza que deseja sair?')) {
            try {
                // Fechar menu antes do logout
                const userMenu = document.getElementById('user-menu');
                if (userMenu) {
                    userMenu.classList.add('hidden');
                }

                await window.signOut(window.firebaseAuth);
                console.log("Logout realizado com sucesso.");
            } catch (error) {
                console.error('Erro no logout:', error);
                alert('Erro ao sair: ' + error.message);
            }
        }
    }

    showMainApp() {
        this.hideAllModals();
        this.mainApp.style.display = 'flex';
        this.mainApp.style.flexDirection = 'column';
        if (!window.appInitialized) {
            setTimeout(() => {
                if (typeof initializeDrawflow === 'function') {
                    initializeDrawflow();
                    window.appInitialized = true;
                }
            }, 100);
        }
    }

    showLoginModal() {
        this.hideAllModals();
        this.mainApp.style.display = 'none';
        this.loginModal.classList.add('active');
        this.clearLoginForm();
        setTimeout(() => document.getElementById('login-email').focus(), 300);
    }

    showRegisterModal() {
        this.hideAllModals();
        this.registerModal.classList.add('active');
        this.clearRegisterForm();
        setTimeout(() => document.getElementById('register-email').focus(), 300);
    }

    showForgotPasswordModal() {
        this.hideAllModals();
        this.forgotPasswordModal.classList.add('active');
        this.clearForgotPasswordForm();
        setTimeout(() => document.getElementById('forgot-email').focus(), 300);
    }

    showSuccessModal() {
        this.hideAllModals();
        this.successModal.classList.add('active');
    }

    hideAllModals() {
        this.loginModal.classList.remove('active');
        this.registerModal.classList.remove('active');
        this.forgotPasswordModal.classList.remove('active');
        this.successModal.classList.remove('active');
    }

    hideAuthLoading() {
        if (this.authLoadingOverlay) {
            this.authLoadingOverlay.classList.add('hidden');
            this.authLoadingOverlay.style.display = 'none';
        }
    }

    togglePassword(targetId) {
        const input = document.getElementById(targetId);
        const toggle = document.querySelector(`[data-target="${targetId}"]`);
        const eyeIcon = toggle.querySelector('.eye-icon');
        if (input.type === 'password') {
            input.type = 'text';
            eyeIcon.textContent = '🙈';
        } else {
            input.type = 'password';
            eyeIcon.textContent = '👁️';
        }
    }

    validatePasswordMatch() {
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const confirmInput = document.getElementById('confirm-password');
        if (confirmPassword.length > 0) {
            if (password === confirmPassword) {
                confirmInput.style.borderColor = '#10b981';
                confirmInput.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
            } else {
                confirmInput.style.borderColor = '#ef4444';
                confirmInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
            }
        } else {
            confirmInput.style.borderColor = '#e5e7eb';
            confirmInput.style.boxShadow = 'none';
        }
    }

    setButtonLoading(button, isLoading) {
        const btnText = button.querySelector('.btn-text');
        const btnSpinner = button.querySelector('.btn-spinner');
        if (isLoading) {
            button.disabled = true;
            btnText.style.display = 'none';
            btnSpinner.style.display = 'block';
        } else {
            button.disabled = false;
            btnText.style.display = 'block';
            btnSpinner.style.display = 'none';
        }
    }

    showError(errorDiv, message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideError(errorDiv) {
        errorDiv.style.display = 'none';
    }

    showSuccess(successDiv, message) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        successDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideSuccess(successDiv) {
        successDiv.style.display = 'none';
    }

    clearLoginForm() {
        document.getElementById('login-form').reset();
        this.hideError(document.getElementById('login-error'));
    }

    clearRegisterForm() {
        document.getElementById('register-form').reset();
        this.hideError(document.getElementById('register-error'));
        const confirmInput = document.getElementById('register-confirm-password');
        confirmInput.style.borderColor = '#e5e7eb';
        confirmInput.style.boxShadow = 'none';
    }

    clearForgotPasswordForm() {
        document.getElementById('forgot-password-form').reset();
        this.hideError(document.getElementById('forgot-password-error'));
        this.hideSuccess(document.getElementById('forgot-password-success'));
    }

    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found': return 'Usuário não encontrado. Verifique o e-mail digitado.';
            case 'auth/wrong-password': return 'Senha incorreta. Tente novamente.';
            case 'auth/email-already-in-use': return 'Este e-mail já está cadastrado. Tente fazer login.';
            case 'auth/weak-password': return 'Senha muito fraca. Use pelo menos 6 caracteres.';
            case 'auth/invalid-email': return 'E-mail inválido. Verifique o formato.';
            case 'auth/invalid-credential': return 'Credenciais inválidas. Verifique e-mail e senha.';
            case 'auth/too-many-requests': return 'Muitas tentativas. Tente novamente em alguns minutos.';
            case 'auth/network-request-failed': return 'Erro de conexão. Verifique sua internet.';
            case 'auth/user-disabled': return 'Esta conta foi desativada.';
            default:
                console.error('Erro Firebase:', error.code, error.message);
                return 'Ocorreu um erro inesperado. Tente novamente.';
        }
    }
}

async function salvarPerfilUsuario(user) {
    if (!user) return;
    try {
        await window.setDoc(
            window.doc(window.firebaseDB, "usuarios", user.uid),
            {
                nome: user.displayName || "Usuário",
                name: user.displayName || "Usuário",
                email: user.email || null,
                updatedAt: window.serverTimestamp()
            },
            { merge: true }
        );
        console.log("Perfil atualizado no Firestore!");
    } catch (err) {
        console.error("Erro ao salvar perfil:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
window.AuthManager = AuthManager;
