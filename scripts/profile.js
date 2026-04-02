import { supabase } from './supabase-client.js';
import { clearCartInDb } from './cart-db.js';
import {
  checkAuth,
  getUser,
  getProfile as getAuthProfile,
  sendPasswordReset,
} from './auth.js';

function byId(id) {
  return document.getElementById(id);
}

function setInlineMessage(id, message, type = 'success') {
  const el = byId(id);
  if (!el) return;
  el.textContent = message || '';
  el.className = `inline-message ${type}`;
}

function moneyBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const STATUS_META = {
  enviado_whatsapp: { label: 'Enviado', color: '#2E8BC6' },
  confirmado: { label: 'Confirmado', color: '#1ebe5d' },
  em_producao: { label: 'Em Produção', color: '#F7941D' },
  entregue: { label: 'Entregue', color: '#1f7a39' },
  cancelado: { label: 'Cancelado', color: '#c0392b' },
};

export async function getProfile() {
  const user = await getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, nome, telefone, email, endereco_padrao')
    .eq('id', user.id)
    .maybeSingle();

  return data || null;
}

export async function updateProfile(nome, telefone) {
  const user = await getUser();
  if (!user) return { error: new Error('Usuário não autenticado.') };

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      nome,
      telefone,
      email: user.email,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single();

  return { data, error };
}

export async function getAddresses() {
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('addresses')
    .select('id, label, cep, logradouro, numero, complemento, bairro, cidade, estado, is_default, created_at')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function addAddress(dados) {
  const user = await getUser();
  if (!user) return { error: new Error('Usuário não autenticado.') };

  const current = await getAddresses();
  if (current.length >= 5) {
    return { error: new Error('Máximo de 5 endereços atingido.') };
  }

  const payload = {
    user_id: user.id,
    label: dados.label,
    cep: dados.cep,
    logradouro: dados.logradouro,
    numero: dados.numero,
    complemento: dados.complemento,
    bairro: dados.bairro,
    cidade: dados.cidade,
    estado: dados.estado,
    is_default: Boolean(dados.is_default),
  };

  const { data, error } = await supabase.from('addresses').insert(payload).select().single();
  if (error) return { error };

  if (payload.is_default) {
    await setDefaultAddress(data.id);
  }

  return { data, error: null };
}

export async function updateAddress(id, dados) {
  const user = await getUser();
  if (!user) return { error: new Error('Usuário não autenticado.') };

  const { data, error } = await supabase
    .from('addresses')
    .update({
      label: dados.label,
      cep: dados.cep,
      logradouro: dados.logradouro,
      numero: dados.numero,
      complemento: dados.complemento,
      bairro: dados.bairro,
      cidade: dados.cidade,
      estado: dados.estado,
      is_default: Boolean(dados.is_default),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { error };

  if (dados.is_default) {
    await setDefaultAddress(id);
  }

  return { data, error: null };
}

export async function deleteAddress(id) {
  const user = await getUser();
  if (!user) return { error: new Error('Usuário não autenticado.') };

  const { error } = await supabase.from('addresses').delete().eq('id', id).eq('user_id', user.id);
  return { error };
}

export async function setDefaultAddress(id) {
  const user = await getUser();
  if (!user) return { error: new Error('Usuário não autenticado.') };

  await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
  const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id).eq('user_id', user.id);

  const addresses = await getAddresses();
  const defaultAddress = addresses.find((a) => a.is_default) || null;
  await supabase.from('profiles').update({ endereco_padrao: defaultAddress }).eq('id', user.id);

  return { error };
}

export async function getRecentOrders() {
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('orders')
    .select('id, total, status, created_at, order_items(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) return [];

  return (data || []).map((order) => ({
    ...order,
    itens_count: order.order_items?.[0]?.count || 0,
  }));
}

export async function getCartSummary() {
  const user = await getUser();
  if (!user) return { itens: 0, total: 0, items: [] };

  const { data, error } = await supabase
    .from('carts')
    .select('produto_id, nome, img, quantidade, preco')
    .eq('user_id', user.id);

  if (error || !data) return { itens: 0, total: 0, items: [] };

  const summary = data.reduce((acc, item) => {
    const qtd = Math.max(1, Number(item.quantidade) || 1);
    const preco = Number(item.preco) || 0;
    acc.itens += qtd;
    acc.total += qtd * preco;
    return acc;
  }, { itens: 0, total: 0 });

  return {
    ...summary,
    items: data,
  };
}

function renderOrders(orders) {
  const wrap = byId('orders-summary');
  if (!wrap) return;

  if (!orders.length) {
    wrap.innerHTML = '<p>Nenhum pedido ainda</p>';
    return;
  }

  wrap.innerHTML = orders.map((order) => {
    const status = STATUS_META[order.status] || { label: order.status || 'Desconhecido', color: '#6b7280' };
    return `
      <article class="account-card-row">
        <div>
          <h4>Pedido #${order.id}</h4>
          <p>${formatDate(order.created_at)}</p>
          <p>${order.itens_count} item(ns)</p>
        </div>
        <div class="account-card-right">
          <strong>${moneyBRL(order.total)}</strong>
          <span class="status-badge" style="background:${status.color}">${status.label}</span>
        </div>
      </article>
    `;
  }).join('');
}

function formatAddressText(address) {
  return `${address.logradouro}, ${address.numero} ${address.complemento || ''} - ${address.bairro}, ${address.cidade}/${address.estado}`;
}

function openAddressForm(address = null) {
  byId('address-form-wrapper').hidden = false;
  byId('address-id').value = address?.id || '';
  byId('address-label').value = address?.label || '';
  byId('address-cep').value = address?.cep || '';
  byId('address-logradouro').value = address?.logradouro || '';
  byId('address-numero').value = address?.numero || '';
  byId('address-complemento').value = address?.complemento || '';
  byId('address-bairro').value = address?.bairro || '';
  byId('address-cidade').value = address?.cidade || '';
  byId('address-estado').value = address?.estado || '';
  byId('address-default').checked = Boolean(address?.is_default);
}

function closeAddressForm() {
  byId('address-form-wrapper').hidden = true;
  byId('address-form').reset();
}

async function renderAddresses() {
  const addresses = await getAddresses();
  const wrap = byId('addresses-list');
  const addBtn = byId('add-address-btn');
  if (!wrap || !addBtn) return;

  addBtn.disabled = addresses.length >= 5;

  if (!addresses.length) {
    wrap.innerHTML = '<p>Você ainda não tem endereços salvos.</p>';
    return;
  }

  wrap.innerHTML = addresses.map((address) => `
    <article class="address-card">
      <div>
        <h4>${address.label || 'Endereço'}</h4>
        <p>${formatAddressText(address)}</p>
        ${address.is_default ? '<span class="default-badge">Padrão</span>' : ''}
      </div>
      <div class="address-actions">
        <button type="button" data-action="default" data-id="${address.id}">Definir como padrão</button>
        <button type="button" data-action="edit" data-id="${address.id}">Editar</button>
        <button type="button" data-action="delete" data-id="${address.id}">Excluir</button>
      </div>
    </article>
  `).join('');

  wrap.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const target = addresses.find((a) => String(a.id) === String(id));
      if (!target) return;

      if (action === 'default') {
        await setDefaultAddress(id);
        await renderAddresses();
      }

      if (action === 'edit') {
        openAddressForm(target);
      }

      if (action === 'delete') {
        if (!confirm('Deseja excluir este endereço?')) return;
        await deleteAddress(id);
        await renderAddresses();
      }
    });
  });
}

async function preencherPerfil() {
  const profile = await getAuthProfile() || await getProfile();
  const user = await getUser();
  if (!user) return;

  byId('profile-name').value = profile?.nome || user.user_metadata?.nome || '';
  byId('profile-phone').value = profile?.telefone || user.user_metadata?.telefone || '';
  byId('profile-email').value = user.email || profile?.email || '';
}

function initTabs() {
  const tabs = document.querySelectorAll('[data-tab-btn]');
  const panels = document.querySelectorAll('[data-tab-panel]');

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tabBtn;
      tabs.forEach((item) => item.classList.toggle('is-active', item === btn));
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.tabPanel !== target;
      });
    });
  });
}

async function preencherResumoPedidos() {
  const orders = await getRecentOrders();
  renderOrders(orders);
}

async function preencherResumoCarrinho() {
  const summary = await getCartSummary();
  const el = byId('saved-cart-summary');
  if (!el) return;

  if (!summary.itens) {
    el.innerHTML = '<p>Seu carrinho está vazio</p>';
    return;
  }

  const itemsHtml = (summary.items || []).map((item) => `
    <article class="account-card-row">
      <div style="display:flex; gap:10px; align-items:center;">
        <img src="../${String(item.img || '').replace('./', '')}" alt="${item.nome}" style="width:56px; height:56px; object-fit:cover; border-radius:8px; border:1px solid #e6ebf2;" />
        <div>
          <h4 style="margin:0 0 4px;">${item.nome}</h4>
          <p style="margin:0;">Quantidade: ${Math.max(1, Number(item.quantidade) || 1)}</p>
        </div>
      </div>
      <div class="account-card-right">
        <strong>${moneyBRL((Number(item.preco) || 0) * (Math.max(1, Number(item.quantidade) || 1)))}</strong>
      </div>
    </article>
  `).join('');

  el.innerHTML = `
    <p><strong>${summary.itens}</strong> item(ns) salvos</p>
    <p>Total: <strong>${moneyBRL(summary.total)}</strong></p>
    <div style="margin-top:10px">${itemsHtml}</div>
    <div class="actions">
      <a class="link-btn" href="../index.html#carrinho">Ir para o carrinho</a>
      <button type="button" id="clear-saved-cart-btn" class="btn-secondary">Limpar carrinho salvo</button>
    </div>
  `;

  byId('clear-saved-cart-btn')?.addEventListener('click', async () => {
    await clearCartInDb();
    localStorage.setItem('cart', JSON.stringify([]));
    if (typeof window.atualizarContadorCarrinho === 'function') {
      window.atualizarContadorCarrinho();
    }
    await preencherResumoCarrinho();
  });
}

async function initPage() {
  const autorizado = await checkAuth();
  if (!autorizado) return;

  initTabs();
  await preencherPerfil();
  await renderAddresses();
  await preencherResumoPedidos();
  await preencherResumoCarrinho();

  byId('add-address-btn')?.addEventListener('click', () => openAddressForm());
  byId('cancel-address-btn')?.addEventListener('click', closeAddressForm);

  byId('profile-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveBtn = byId('save-profile-btn');
    const nome = byId('profile-name').value.trim();
    const telefone = byId('profile-phone').value.trim();

    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';
    const { error } = await updateProfile(nome, telefone);
    saveBtn.disabled = false;
    saveBtn.textContent = 'Salvar alterações';

    if (error) {
      setInlineMessage('profile-message', 'Não foi possível salvar seu perfil.', 'error');
      return;
    }

    setInlineMessage('profile-message', 'Perfil atualizado com sucesso!', 'success');
  });

  byId('reset-password-btn')?.addEventListener('click', async () => {
    const user = await getUser();
    if (!user?.email) return;

    const btn = byId('reset-password-btn');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    const { error } = await sendPasswordReset(user.email);
    btn.disabled = false;
    btn.textContent = 'Alterar senha';

    if (error) {
      setInlineMessage('profile-message', 'Não foi possível enviar o e-mail.', 'error');
      return;
    }

    setInlineMessage('profile-message', 'Email enviado!', 'success');
  });

  byId('address-cep')?.addEventListener('blur', async () => {
    const cep = byId('address-cep').value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) return;

      byId('address-logradouro').value = data.logradouro || '';
      byId('address-bairro').value = data.bairro || '';
      byId('address-cidade').value = data.localidade || '';
      byId('address-estado').value = data.uf || '';
    } catch {
      // Falha silenciosa para não travar fluxo.
    }
  });

  byId('address-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = byId('address-id').value;
    const payload = {
      label: byId('address-label').value.trim(),
      cep: byId('address-cep').value.trim(),
      logradouro: byId('address-logradouro').value.trim(),
      numero: byId('address-numero').value.trim(),
      complemento: byId('address-complemento').value.trim(),
      bairro: byId('address-bairro').value.trim(),
      cidade: byId('address-cidade').value.trim(),
      estado: byId('address-estado').value.trim(),
      is_default: byId('address-default').checked,
    };

    const result = id ? await updateAddress(id, payload) : await addAddress(payload);
    if (result?.error) {
      setInlineMessage('address-message', result.error.message || 'Não foi possível salvar endereço.', 'error');
      return;
    }

    setInlineMessage('address-message', 'Endereço salvo com sucesso!', 'success');
    closeAddressForm();
    await renderAddresses();
  });
}

document.addEventListener('DOMContentLoaded', initPage);
