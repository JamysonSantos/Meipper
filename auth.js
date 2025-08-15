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
        // Aguardar Firebase carregar
        this.waitForFirebase().then(() => {
            this.setupEventListeners();
            this.checkAuthState();
        });
    }

    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseAuth && window.onAuthStateChanged) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Forgot password form
        document.getElementById('forgot-password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });

        // Navigation buttons
        document.getElementById('show-register-btn').addEventListener('click', () => {
            this.showRegisterModal();
        });

        document.getElementById('back-to-login').addEventListener('click', () => {
            this.showLoginModal();
        });

        document.getElementById('back-to-login-from-forgot').addEventListener('click', () => {
            this.showLoginModal();
        });

        document.getElementById('show-forgot-password').addEventListener('click', () => {
            this.showForgotPasswordModal();
        });

        document.getElementById('success-ok-btn').addEventListener('click', () => {
            this.showLoginModal();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Password toggles
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                this.togglePassword(e.target.closest('.password-toggle').dataset.target);
            });
        });

        // Real-time password confirmation validation
        const confirmPasswordInput = document.getElementById('confirm-password');
        const registerPasswordInput = document.getElementById('register-password');
        
        confirmPasswordInput.addEventListener('input', () => {
            this.validatePasswordMatch();
        });
        
        registerPasswordInput.addEventListener('input', () => {
            this.validatePasswordMatch();
        });
    }

    checkAuthState() {
        window.onAuthStateChanged(window.firebaseAuth, (user) => {
            if (user) {
                this.user = user;
                this.showMainApp();
                console.log("Usuário autenticado:", user.email);
            } else {
                this.user = null;
                this.showLoginModal();
                console.log("Usuário não autenticado");
            }
            this.hideAuthLoading();
        });
    }

    async handleLogin() {
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
            // O onAuthStateChanged vai lidar com o sucesso
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError(errorDiv, this.getAuthErrorMessage(error));
        } finally {
            this.setButtonLoading(loginBtn, false);
        }
    }

    async handleRegister(event) {
    event.preventDefault();

    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const displayName = document.getElementById('register-name').value.trim();
    const photoFile = document.getElementById('register-photo').files[0];

    if (!displayName) {
        alert("Por favor, preencha o nome.");
        return;
    }
    if (password !== confirmPassword) {
        alert("As senhas não coincidem.");
        return;
    }

    try {
        const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        let photoURL = "";
        if (photoFile) {
            const storageRef = window.ref(window.firebaseStorage, `user_photos/${user.uid}`);
            await window.uploadBytes(storageRef, photoFile);
            photoURL = await window.getDownloadURL(storageRef);
        }

        await window.setDoc(window.doc(window.firebaseDB, "usuarios", user.uid), {
            email: user.email,
            name: displayName,
            photoURL: photoURL,
            createdAt: window.serverTimestamp()
        });

        alert("Cadastro realizado com sucesso!");
        this.closeAllModals();
    } catch (error) {
        console.error("Erro no cadastro:", error);
        alert("Erro ao cadastrar. Tente novamente.");
    }
}

    async handleForgotPassword() {
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
                await window.signOut(window.firebaseAuth);
                // O onAuthStateChanged vai lidar com o logout
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
        
        // Inicializar a aplicação principal se ainda não foi inicializada
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
        
        // Focar no campo de e-mail
        setTimeout(() => {
            document.getElementById('login-email').focus();
        }, 300);
    }

    showRegisterModal() {
        this.hideAllModals();
        this.registerModal.classList.add('active');
        this.clearRegisterForm();
        
        // Focar no campo de e-mail
        setTimeout(() => {
            document.getElementById('register-email').focus();
        }, 300);
    }

    showForgotPasswordModal() {
        this.hideAllModals();
        this.forgotPasswordModal.classList.add('active');
        this.clearForgotPasswordForm();
        
        // Focar no campo de e-mail
        setTimeout(() => {
            document.getElementById('forgot-email').focus();
        }, 300);
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
        this.authLoadingOverlay.classList.add('hidden');
        setTimeout(() => {
            this.authLoadingOverlay.style.display = 'none';
        }, 300);
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
        // Reset password match styling
        const confirmInput = document.getElementById('confirm-password');
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
            case 'auth/user-not-found':
                return 'Usuário não encontrado. Verifique o e-mail digitado.';
            case 'auth/wrong-password':
                return 'Senha incorreta. Tente novamente.';
            case 'auth/email-already-in-use':
                return 'Este e-mail já está cadastrado. Tente fazer login.';
            case 'auth/weak-password':
                return 'Senha muito fraca. Use pelo menos 6 caracteres.';
            case 'auth/invalid-email':
                return 'E-mail inválido. Verifique o formato.';
            case 'auth/invalid-credential':
                return 'Credenciais inválidas. Verifique e-mail e senha.';
            case 'auth/too-many-requests':
                return 'Muitas tentativas. Tente novamente em alguns minutos.';
            case 'auth/network-request-failed':
                return 'Erro de conexão. Verifique sua internet.';
            case 'auth/user-disabled':
                return 'Esta conta foi desativada.';
            default:
                console.error('Erro Firebase:', error.code, error.message);
                return 'Ocorreu um erro inesperado. Tente novamente.';
        }
    }
}

// Inicializar o gerenciador de autenticação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Exportar para uso global
window.AuthManager = AuthManager;
