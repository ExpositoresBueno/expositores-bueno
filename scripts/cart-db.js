import { supabase } from './supabase-client.js';

const CART_STORAGE_KEY = 'cart';

function getLocalCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function normalizeColor(cor) {
  return String(cor || 'branco')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeMeasure(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(2) : '0.00';
}

function buildCartKey(item) {
  return [
    String(item.id ?? item.produto_id ?? ''),
    normalizeMeasure(item.larguraOrcada ?? item.largura_orcada),
    normalizeMeasure(item.alturaOrcada ?? item.altura_orcada),
    normalizeMeasure(item.profundidadeOrcada ?? item.profundidade_orcada),
    normalizeColor(item.corOrcada ?? item.cor_orcada),
  ].join('-');
}

function parseCartKey(cartKey) {
  const [id, largura = '0.00', altura = '0.00', profundidade = '0.00', ...corParts] = String(cartKey || '').split('-');
  if (!id) return null;

  return {
    produto_id: Number(id),
    largura_orcada: Number(largura) || 0,
    altura_orcada: Number(altura) || 0,
    profundidade_orcada: Number(profundidade) || 0,
    cor_orcada: corParts.join('-') || 'branco',
  };
}

async function getLoggedUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user || null;
  } catch {
    return null;
  }
}

function mapItemToDb(userId, item) {
  return {
    user_id: userId,
    produto_id: Number(item.id),
    nome: item.nome,
    preco: Number(item.preco) || 0,
    quantidade: Math.max(1, Number(item.quantidade) || 1),
    img: item.img || '',
    cor_orcada: normalizeColor(item.corOrcada),
    largura_orcada: Number(normalizeMeasure(item.larguraOrcada)),
    altura_orcada: Number(normalizeMeasure(item.alturaOrcada)),
    profundidade_orcada: Number(normalizeMeasure(item.profundidadeOrcada)),
    updated_at: new Date().toISOString(),
  };
}

function mapDbToItem(row) {
  const item = {
    id: row.produto_id,
    nome: row.nome,
    preco: Number(row.preco) || 0,
    quantidade: Math.max(1, Number(row.quantidade) || 1),
    img: row.img,
    corOrcada: row.cor_orcada || 'branco',
    larguraOrcada: Number(row.largura_orcada) || 0,
    alturaOrcada: Number(row.altura_orcada) || 0,
    profundidadeOrcada: Number(row.profundidade_orcada) || 0,
  };

  item.cartKey = buildCartKey(item);
  return item;
}

export async function loadCartFromDb() {
  const user = await getLoggedUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from('carts')
      .select('produto_id, nome, preco, quantidade, img, cor_orcada, largura_orcada, altura_orcada, profundidade_orcada, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) return null;
    return (data || []).map(mapDbToItem);
  } catch {
    return null;
  }
}

export async function addItemToDb(item) {
  const user = await getLoggedUser();
  if (!user || !item) return false;

  try {
    console.debug('[cart-db] addItemToDb chamado', {
      user_id: user.id,
      produto_id: item.id ?? item.produto_id ?? null,
      quantidade: item.quantidade ?? 1,
      cartKey: item.cartKey || buildCartKey(item),
    });

    const row = mapItemToDb(user.id, item);

    const { data: existing, error: existingError } = await supabase
      .from('carts')
      .select('quantidade')
      .eq('user_id', row.user_id)
      .eq('produto_id', row.produto_id)
      .eq('cor_orcada', row.cor_orcada)
      .eq('largura_orcada', row.largura_orcada)
      .eq('altura_orcada', row.altura_orcada)
      .eq('profundidade_orcada', row.profundidade_orcada)
      .maybeSingle();

    if (existingError) return false;

    const quantidadeFinal = (Number(existing?.quantidade) || 0) + row.quantidade;

    const { error } = await supabase.from('carts').upsert(
      {
        ...row,
        quantidade: quantidadeFinal,
      },
      {
        onConflict: 'user_id,produto_id,cor_orcada,largura_orcada,altura_orcada,profundidade_orcada',
      },
    );

    return !error;
  } catch {
    return false;
  }
}

export async function removeItemFromDb(cartKey) {
  const user = await getLoggedUser();
  const parsed = parseCartKey(cartKey);
  if (!user || !parsed) return false;

  try {
    const { error } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', user.id)
      .eq('produto_id', parsed.produto_id)
      .eq('cor_orcada', normalizeColor(parsed.cor_orcada))
      .eq('largura_orcada', Number(normalizeMeasure(parsed.largura_orcada)))
      .eq('altura_orcada', Number(normalizeMeasure(parsed.altura_orcada)))
      .eq('profundidade_orcada', Number(normalizeMeasure(parsed.profundidade_orcada)));

    return !error;
  } catch {
    return false;
  }
}

export async function updateQuantityInDb(cartKey, quantidade) {
  const user = await getLoggedUser();
  const parsed = parseCartKey(cartKey);
  const quantidadeFinal = Math.max(1, Number(quantidade) || 1);
  if (!user || !parsed) return false;

  try {
    const { error } = await supabase
      .from('carts')
      .update({ quantidade: quantidadeFinal, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('produto_id', parsed.produto_id)
      .eq('cor_orcada', normalizeColor(parsed.cor_orcada))
      .eq('largura_orcada', Number(normalizeMeasure(parsed.largura_orcada)))
      .eq('altura_orcada', Number(normalizeMeasure(parsed.altura_orcada)))
      .eq('profundidade_orcada', Number(normalizeMeasure(parsed.profundidade_orcada)));

    return !error;
  } catch {
    return false;
  }
}

export async function clearCartInDb() {
  const user = await getLoggedUser();
  if (!user) return false;

  try {
    const { error } = await supabase.from('carts').delete().eq('user_id', user.id);
    return !error;
  } catch {
    return false;
  }
}

export async function syncCartOnLogin() {
  const user = await getLoggedUser();
  if (!user) return false;

  try {
    const localItems = getLocalCart();
    await Promise.all(localItems.map((item) => addItemToDb(item)));

    const dbItems = await loadCartFromDb();
    if (Array.isArray(dbItems)) {
      saveLocalCart(dbItems);
      if (typeof window.atualizarContadorCarrinho === 'function') {
        window.atualizarContadorCarrinho();
      }
    }

    return true;
  } catch {
    return false;
  }
}

export { buildCartKey };
