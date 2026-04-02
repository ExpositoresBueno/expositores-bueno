import { supabase } from './supabase-client.js';
import { checkAuth } from './auth.js';
import { addItemToDb, buildCartKey } from './cart-db.js';

const ITENS_POR_PAGINA_PADRAO = 10;
const STATUS_META = {
  enviado_whatsapp: { label: 'Enviado', color: '#2E8BC6' },
  confirmado: { label: 'Confirmado', color: '#1ebe5d' },
  em_producao: { label: 'Em Produção', color: '#F7941D' },
  entregue: { label: 'Entregue', color: '#1f7a39' },
  cancelado: { label: 'Cancelado', color: '#c0392b' },
};

function getUserId() {
  return supabase.auth.getUser().then(({ data }) => data?.user?.id || null).catch(() => null);
}

function getFilterDate(filtro) {
  const now = new Date();
  if (filtro === 'mes') {
    now.setMonth(now.getMonth() - 1);
    return now.toISOString();
  }
  if (filtro === 'trimestre') {
    now.setMonth(now.getMonth() - 3);
    return now.toISOString();
  }
  if (filtro === 'ano') {
    now.setFullYear(now.getFullYear() - 1);
    return now.toISOString();
  }
  return null;
}

function formatOrderCode(uuid = '') {
  return `#${String(uuid).slice(0, 8).toUpperCase()}`;
}

function formatDatePt(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function getLocalCart() {
  try {
    return JSON.parse(localStorage.getItem('cart')) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

export async function getOrders(filtro = 'todos') {
  const userId = await getUserId();
  if (!userId) return [];

  let query = supabase
    .from('orders')
    .select('id, created_at, status, total, subtotal, desconto, forma_pagamento, parcelas, endereco_entrega, order_items(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const filterDate = getFilterDate(filtro);
  if (filterDate) {
    query = query.gte('created_at', filterDate);
  }

  const { data, error } = await query;
  if (error) return [];

  return (data || []).map((order) => ({
    ...order,
    itens_count: order.order_items?.[0]?.count || 0,
  }));
}

export async function getOrderDetails(orderId) {
  const { data, error } = await supabase
    .from('order_items')
    .select('id, order_id, produto_id, nome, preco_unitario, quantidade, img, cor_orcada, largura_orcada, altura_orcada, profundidade_orcada')
    .eq('order_id', orderId)
    .order('id', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function repeatOrder(orderId) {
  const itens = await getOrderDetails(orderId);
  if (!itens.length) return 0;

  const cart = getLocalCart();
  const { data } = await supabase.auth.getSession();
  const logado = Boolean(data?.session?.user);

  for (const item of itens) {
    const cartItem = {
      id: item.produto_id,
      nome: item.nome,
      preco: Number(item.preco_unitario) || 0,
      quantidade: Math.max(1, Number(item.quantidade) || 1),
      img: item.img || '',
      corOrcada: item.cor_orcada || null,
      larguraOrcada: Number(item.largura_orcada) || 0,
      alturaOrcada: Number(item.altura_orcada) || 0,
      profundidadeOrcada: Number(item.profundidade_orcada) || 0,
    };

    const cartKey = buildCartKey(cartItem);
    cartItem.cartKey = cartKey;
    const existing = cart.find((entry) => (entry.cartKey || buildCartKey(entry)) === cartKey);
    if (existing) {
      existing.quantidade = (Number(existing.quantidade) || 1) + cartItem.quantidade;
    } else {
      cart.push(cartItem);
    }

    if (logado) {
      addItemToDb(cartItem).catch(() => {});
    }
  }

  saveCart(cart);
  if (typeof window.atualizarContadorCarrinho === 'function') {
    window.atualizarContadorCarrinho();
  }

  return itens.length;
}

export async function getTotalPages(filtro = 'todos', itensPorPagina = ITENS_POR_PAGINA_PADRAO) {
  const orders = await getOrders(filtro);
  return Math.max(1, Math.ceil(orders.length / itensPorPagina));
}

export async function getOrdersPage(filtro = 'todos', pagina = 1, itensPorPagina = ITENS_POR_PAGINA_PADRAO) {
  const orders = await getOrders(filtro);
  const start = (pagina - 1) * itensPorPagina;
  return orders.slice(start, start + itensPorPagina);
}

function renderEmptyState() {
  const list = document.getElementById('orders-list');
  if (!list) return;

  list.innerHTML = `
    <div class="orders-empty">
      <div class="orders-empty-illustration"><i class="fa-regular fa-clipboard"></i></div>
      <p>Você ainda não fez nenhum pedido</p>
      <a href="../index.html" class="orders-empty-btn">Ver produtos</a>
    </div>
  `;
}

function renderPagination(totalPages, currentPage, onPageClick) {
  const pagination = document.getElementById('orders-pagination');
  if (!pagination) return;

  pagination.innerHTML = '';
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    btn.textContent = String(i);
    btn.addEventListener('click', () => onPageClick(i));
    pagination.appendChild(btn);
  }
}

function renderOrderItems(items = []) {
  return items.map((item) => {
    const cor = item.cor_orcada ? `<p>Cor: ${item.cor_orcada}</p>` : '';
    const largura = Number(item.largura_orcada) > 0 ? `<p>Largura: ${Number(item.largura_orcada).toFixed(2)}m</p>` : '';
    const altura = Number(item.altura_orcada) > 0 ? `<p>Altura: ${Number(item.altura_orcada).toFixed(2)}m</p>` : '';
    const profundidade = Number(item.profundidade_orcada) > 0 ? `<p>Profundidade: ${Number(item.profundidade_orcada).toFixed(2)}m</p>` : '';
    const subtotal = (Number(item.preco_unitario) || 0) * (Number(item.quantidade) || 0);

    return `
      <article class="order-item">
        <img src="../${String(item.img || '').replace('./', '')}" alt="${item.nome}" />
        <div>
          <h5>${item.nome}</h5>
          ${cor}
          ${largura}
          ${altura}
          ${profundidade}
          <p>Quantidade: ${item.quantidade}</p>
          <p>Valor unitário: ${formatMoney(item.preco_unitario)}</p>
          <p>Subtotal: <strong>${formatMoney(subtotal)}</strong></p>
        </div>
      </article>
    `;
  }).join('');
}

async function renderOrdersPage(filtro, pagina) {
  const loading = document.getElementById('orders-loading');
  const list = document.getElementById('orders-list');
  if (!list || !loading) return;

  loading.style.display = 'block';
  list.innerHTML = '';

  const [ordersPage, totalPages] = await Promise.all([
    getOrdersPage(filtro, pagina, ITENS_POR_PAGINA_PADRAO),
    getTotalPages(filtro, ITENS_POR_PAGINA_PADRAO),
  ]);

  loading.style.display = 'none';

  if (!ordersPage.length) {
    renderEmptyState();
    renderPagination(0, 1, () => {});
    return;
  }

  list.innerHTML = ordersPage.map((order) => {
    const status = STATUS_META[order.status] || { label: order.status || 'Desconhecido', color: '#6b7280' };
    return `
      <article class="order-card" data-order-id="${order.id}">
        <div class="order-card-top">
          <div>
            <h4>${formatOrderCode(order.id)}</h4>
            <p>${formatDatePt(order.created_at)}</p>
          </div>
          <div class="order-meta-right">
            <span class="order-status" style="background:${status.color}">${status.label}</span>
            <strong>${formatMoney(order.total)}</strong>
            <p>${order.itens_count} item(ns)</p>
          </div>
        </div>
        <button type="button" class="order-details-btn">Ver detalhes</button>
        <div class="order-details" hidden>
          <div class="order-items-wrap"></div>
          <div class="order-extra"></div>
          <div class="order-footer-actions">
            <button type="button" class="repeat-order-btn">Repetir pedido</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  renderPagination(totalPages, pagina, (nextPage) => {
    renderOrdersPage(filtro, nextPage);
  });

  list.querySelectorAll('.order-card').forEach((card) => {
    const orderId = card.dataset.orderId;
    const detailsBtn = card.querySelector('.order-details-btn');
    const detailsWrap = card.querySelector('.order-details');
    const itemsWrap = card.querySelector('.order-items-wrap');
    const extraWrap = card.querySelector('.order-extra');
    const repeatBtn = card.querySelector('.repeat-order-btn');
    const order = ordersPage.find((o) => String(o.id) === String(orderId));

    detailsBtn?.addEventListener('click', async () => {
      const isHidden = detailsWrap.hasAttribute('hidden');
      if (!isHidden) {
        detailsWrap.setAttribute('hidden', 'hidden');
        detailsBtn.textContent = 'Ver detalhes';
        return;
      }

      const items = await getOrderDetails(orderId);
      itemsWrap.innerHTML = renderOrderItems(items);
      const endereco = order?.endereco_entrega
        ? `<p><strong>Endereço de entrega:</strong> ${order.endereco_entrega.logradouro || ''}, ${order.endereco_entrega.numero || ''} ${order.endereco_entrega.complemento || ''} - ${order.endereco_entrega.bairro || ''}, ${order.endereco_entrega.cidade || ''}/${order.endereco_entrega.estado || ''}</p>`
        : '';

      extraWrap.innerHTML = `
        ${endereco}
        <p><strong>Forma de pagamento:</strong> ${order.forma_pagamento || '-'}</p>
        <p><strong>Parcelas:</strong> ${order.parcelas || 1}x</p>
        <p><strong>Subtotal:</strong> ${formatMoney(order.subtotal)}</p>
        <p><strong>Desconto:</strong> ${formatMoney(order.desconto)}</p>
        <p><strong>Total:</strong> ${formatMoney(order.total)}</p>
      `;

      detailsWrap.removeAttribute('hidden');
      detailsBtn.textContent = 'Ocultar detalhes';
    });

    repeatBtn?.addEventListener('click', async () => {
      const addedCount = await repeatOrder(orderId);
      if (!addedCount) return;

      const feedback = document.getElementById('orders-feedback');
      if (feedback) {
        feedback.textContent = 'Itens adicionados ao carrinho!';
        feedback.style.display = 'block';
        clearTimeout(repeatBtn._feedbackTimer);
        repeatBtn._feedbackTimer = setTimeout(() => {
          feedback.style.display = 'none';
          feedback.textContent = '';
        }, 2500);
      }
    });
  });
}

async function initOrdersPage() {
  const authorized = await checkAuth();
  if (!authorized) return;

  let filtroAtual = 'todos';
  let paginaAtual = 1;

  const filterButtons = document.querySelectorAll('[data-filter]');
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filtroAtual = btn.dataset.filter;
      paginaAtual = 1;
      filterButtons.forEach((item) => item.classList.toggle('active', item === btn));
      renderOrdersPage(filtroAtual, paginaAtual);
    });
  });

  await renderOrdersPage(filtroAtual, paginaAtual);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'meus-pedidos') {
    initOrdersPage();
  }
});
