import { supabase } from './supabase-client.js';
import { syncCartOnLogin } from './cart-db.js';

const AUTH_STYLE_ID = 'auth-header-style';

function getLoginUrl() {
  return window.location.pathname.includes('/pages/') ? './login.html' : './pages/login.html';
}

function getIndexUrl() {
  return window.location.pathname.includes('/pages/') ? '../index.html' : './index.html';
}

function getAccountUrl() {
  return window.location.pathname.includes('/pages/') ? './minha-conta.html' : './pages/minha-conta.html';
}

function getOrdersUrl() {
  return window.location.pathname.includes('/pages/') ? './meus-pedidos.html' : './pages/meus-pedidos.html';
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getBaseProfileName(profile, user) {
  return (
    profile?.nome ||
    user?.user_metadata?.nome ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Cliente'
  );
}

function ensureAuthStyles() {
  if (document.getElementById(AUTH_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = AUTH_STYLE_ID;
  style.textContent = `
    .field-error { color: #c0392b; font-size: 12px; min-height: 16px; margin-top: 4px; }
    .auth-feedback { font-size: 14px; margin-bottom: 14px; min-height: 20px; }
    .auth-feedback.error { color: #c0392b; }
    .auth-feedback.success { color: #1f7a39; }
  `;
  document.head.appendChild(style);
}

function findAuthHost() {
  const existing = document.querySelector('[data-auth-user-menu]');
  if (existing) return existing;

  const cartIcon = document.querySelector('.header-main .cart-icon');
  if (cartIcon && cartIcon.parentElement) {
    const container = document.createElement('div');
    container.className = 'header-user-auth';
    container.dataset.authUserMenu = 'true';
    cartIcon.insertAdjacentElement('afterend', container);
    return container;
  }

  const headerSearch = document.querySelector('.header-main .header-search');
  if (headerSearch && headerSearch.parentElement) {
    const container = document.createElement('div');
    container.className = 'header-user-auth';
    container.dataset.authUserMenu = 'true';
    headerSearch.insertAdjacentElement('afterend', container);
    return container;
  }

  return null;
}

async function renderHeaderAuth() {
  const host = findAuthHost();
  if (!host) return;
  host.classList.add('header-user-auth');

  const headerMain = host.closest('.header-main');
  const headerBackground = window.getComputedStyle(headerMain || document.body).backgroundColor || '';
  const rgbMatch = headerBackground.match(/\d+/g) || [];
  const [r = 255, g = 255, b = 255] = rgbMatch.map(Number);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  host.classList.toggle('auth-on-dark', luminance < 0.55);
  host.classList.toggle('auth-on-light', luminance >= 0.55);

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user || null;

  if (!user) {
    host.classList.add('is-guest');
    host.innerHTML = `
      <button class="header-user-button" type="button" aria-label="Entrar ou criar conta">
        <i class="fa-regular fa-user"></i>
        <span class="header-user-label">Entrar / Cadastrar</span>
      </button>
    `;
    host.querySelector('button')?.addEventListener('click', () => {
      window.location.href = getLoginUrl();
    });
    return;
  }

  const profile = await getProfile();
  const nome = escapeHtml(getBaseProfileName(profile, user));
  host.classList.remove('is-guest');
  host.innerHTML = `
    <button class="header-user-button" type="button" aria-haspopup="true" aria-expanded="false">
      <i class="fa-solid fa-user-check"></i>
      <span class="header-user-label">Minha Conta</span>
      <i class="fa-solid fa-chevron-down" style="font-size:12px"></i>
    </button>
    <ul class="header-user-dropdown" role="menu" aria-hidden="true">
      <li class="header-user-dropdown-greeting">Olá, ${nome}</li>
      <li class="header-user-dropdown-divider" role="separator"></li>
      <li><a href="${getAccountUrl()}"><i class="fa-regular fa-id-card"></i>Minha Conta</a></li>
      <li><a href="${getOrdersUrl()}"><i class="fa-solid fa-box"></i>Meus Pedidos</a></li>
      <li class="header-user-dropdown-divider" role="separator"></li>
      <li><button type="button" data-auth-signout><i class="fa-solid fa-right-from-bracket"></i>Sair</button></li>
    </ul>
  `;

  const button = host.querySelector('.header-user-button');
  const dropdown = host.querySelector('.header-user-dropdown');
  const signoutButton = host.querySelector('[data-auth-signout]');

  button?.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = dropdown?.classList.toggle('open');
    button.setAttribute('aria-expanded', String(Boolean(isOpen)));
    dropdown?.setAttribute('aria-hidden', String(!isOpen));
  });

  signoutButton?.addEventListener('click', async () => {
    await signOut();
  });

  document.addEventListener('click', (event) => {
    if (!host.contains(event.target)) {
      dropdown?.classList.remove('open');
      button?.setAttribute('aria-expanded', 'false');
      dropdown?.setAttribute('aria-hidden', 'true');
    }
  });
}

function setButtonLoading(button, loadingText) {
  if (!button) return () => {};
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = loadingText;
  return () => {
    button.disabled = false;
    button.textContent = originalText;
  };
}

function clearErrors(form) {
  form.querySelectorAll('[data-error-for]').forEach((item) => {
    item.textContent = '';
  });
}

function setError(form, field, message) {
  const errorNode = form.querySelector(`[data-error-for="${field}"]`);
  if (errorNode) errorNode.textContent = message;
}

function setFeedback(form, message, type = 'error') {
  const node = form.querySelector('[data-auth-feedback]');
  if (!node) return;
  node.textContent = message || '';
  node.classList.remove('error', 'success');
  if (message) node.classList.add(type);
}

function initLoginPage() {
  const authTabs = document.querySelectorAll('[data-auth-tab]');
  const tabPanels = document.querySelectorAll('[data-auth-panel]');

  authTabs.forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      const target = tabButton.dataset.authTab;
      authTabs.forEach((tab) => tab.classList.toggle('is-active', tab === tabButton));
      tabPanels.forEach((panel) => {
        panel.hidden = panel.dataset.authPanel !== target;
      });
    });
  });

  const signInForm = document.getElementById('sign-in-form');
  const signUpForm = document.getElementById('sign-up-form');
  const forgotPasswordButton = document.getElementById('forgot-password-link');

  signInForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(signInForm);
    setFeedback(signInForm, '');

    const email = signInForm.email.value.trim();
    const senha = signInForm.senha.value;

    if (!email) setError(signInForm, 'email', 'Informe seu e-mail.');
    if (!senha) setError(signInForm, 'senha', 'Informe sua senha.');
    if (!email || !senha) return;

    const resetLoading = setButtonLoading(signInForm.querySelector('button[type="submit"]'), 'Entrando...');
    const result = await signIn(email, senha);
    resetLoading();

    if (result.error) {
      setFeedback(signInForm, result.error.message || 'Não foi possível entrar.');
      return;
    }

    window.location.href = './minha-conta.html';
  });

  signUpForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(signUpForm);
    setFeedback(signUpForm, '');

    const nome = signUpForm.nome.value.trim();
    const email = signUpForm.email.value.trim();
    const telefone = signUpForm.telefone.value.trim();
    const senha = signUpForm.senha.value;
    const confirmarSenha = signUpForm.confirmar_senha.value;

    if (!nome) setError(signUpForm, 'nome', 'Informe seu nome completo.');
    if (!email) setError(signUpForm, 'email', 'Informe seu e-mail.');
    if (!telefone) setError(signUpForm, 'telefone', 'Informe seu telefone.');
    if (!senha) setError(signUpForm, 'senha', 'Informe sua senha.');
    if (senha && senha.length < 6) setError(signUpForm, 'senha', 'Use ao menos 6 caracteres.');
    if (!confirmarSenha) setError(signUpForm, 'confirmar_senha', 'Confirme sua senha.');
    if (senha && confirmarSenha && senha !== confirmarSenha) {
      setError(signUpForm, 'confirmar_senha', 'As senhas não coincidem.');
    }

    if (!nome || !email || !telefone || !senha || senha.length < 6 || !confirmarSenha || senha !== confirmarSenha) {
      return;
    }

    const resetLoading = setButtonLoading(signUpForm.querySelector('button[type="submit"]'), 'Criando conta...');
    const result = await signUp(nome, email, telefone, senha);
    resetLoading();

    if (result.error) {
      setFeedback(signUpForm, result.error.message || 'Não foi possível criar sua conta.');
      return;
    }

    setFeedback(
      signUpForm,
      'Conta criada com sucesso! Se necessário, confirme o e-mail e depois faça login.',
      'success',
    );
    signUpForm.reset();
  });

  forgotPasswordButton?.addEventListener('click', async (event) => {
    event.preventDefault();
    clearErrors(signInForm);
    setFeedback(signInForm, '');

    const email = signInForm?.email?.value?.trim();
    if (!email) {
      setError(signInForm, 'email', 'Digite seu e-mail para recuperar a senha.');
      return;
    }

    const result = await sendPasswordReset(email);
    if (result.error) {
      setFeedback(signInForm, result.error.message || 'Não foi possível enviar o e-mail de recuperação.');
      return;
    }

    setFeedback(signInForm, 'E-mail de recuperação enviado com sucesso.', 'success');
  });
}

export async function signUp(nome, email, telefone, senha) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, telefone },
      emailRedirectTo: window.location.origin + '/pages/login.html',
    },
  });

  if (error) return { data: null, error };

  const user = data?.user;
  if (user?.id) {
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        nome,
        telefone,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (profileError) return { data, error: profileError };
  }

  try {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'sign_up', { method: 'email' });
    }
  } catch {
    // Falha silenciosa de analytics.
  }

  try {
    if (typeof fbq !== 'undefined') {
      fbq('track', 'CompleteRegistration');
    }
  } catch {
    // Falha silenciosa de analytics.
  }

  return { data, error: null };
}

export async function signIn(email, senha) {
  const result = await supabase.auth.signInWithPassword({ email, password: senha });
  if (!result.error) {
    await syncCartOnLogin();

    try {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'login', { method: 'email' });
      }
    } catch {
      // Falha silenciosa de analytics.
    }
  }
  return result;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = getIndexUrl();
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user || null;
}

export async function getProfile() {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, telefone, email')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

export async function checkAuth() {
  const { data } = await supabase.auth.getSession();
  const isLogged = Boolean(data?.session);
  if (!isLogged) {
    window.location.href = getLoginUrl();
  }
  return isLogged;
}

export async function sendPasswordReset(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/pages/login.html',
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  ensureAuthStyles();
  await renderHeaderAuth();
  if (document.body.dataset.page === 'login') {
    initLoginPage();
  }
});
