// Black Bueno 2026. Uma unica fonte de precos, vigencia e parcelamento.
export const CAMPANHA_BLACK_BUENO = Object.freeze({
  nome: 'Black Bueno',
  inicio: '2026-11-05T00:00:00-03:00',
  fimExclusivo: '2026-12-01T00:00:00-03:00',
  periodo: '05/11 a 30/11/2026',
});
const PROMOCOES = Object.freeze([
  {
    "id": 1,
    "nome": "Balcão caixinha",
    "precoOriginal": 449.9,
    "precoPromocional": 390,
    "maxParcelasSemJuros": 2,
    "medidas": [
      0.55,
      1,
      0.4
    ],
    "medidasAlternativas": [
      0.55,
      1.1,
      0.4
    ],
    "precoCatalogoAnterior": 449
  },
  {
    "id": 2,
    "nome": "Balcão caixa com vitrine",
    "precoOriginal": 875,
    "precoPromocional": 799,
    "maxParcelasSemJuros": 3,
    "medidas": [
      1.15,
      1,
      0.4
    ],
    "medidasAlternativas": [
      1.15,
      1.1,
      0.4
    ]
  },
  {
    "id": 71,
    "nome": "Balcão caixa premium reto",
    "precoOriginal": 1990,
    "precoPromocional": 1780,
    "maxParcelasSemJuros": 4,
    "medidas": [
      0.9,
      1,
      0.4
    ]
  },
  {
    "id": 72,
    "nome": "Balcão caixa premium curva",
    "precoOriginal": 2390,
    "precoPromocional": 2150,
    "maxParcelasSemJuros": 4,
    "medidas": [
      0.9,
      1,
      0.4
    ]
  },
  {
    "id": 13,
    "nome": "Vestiário 8P",
    "precoOriginal": 1040,
    "precoPromocional": 920,
    "maxParcelasSemJuros": 3,
    "medidas": [
      0.6,
      1.8,
      0.3
    ]
  },
  {
    "id": 29,
    "nome": "Vestiário 20P",
    "precoOriginal": 2600,
    "precoPromocional": 2290,
    "maxParcelasSemJuros": 4,
    "medidas": [
      2,
      2,
      0.3
    ]
  },
  {
    "id": 18,
    "nome": "Móvel em S",
    "precoOriginal": 689,
    "precoPromocional": 619,
    "maxParcelasSemJuros": 3,
    "medidas": [
      0.9,
      1.8,
      0.3
    ]
  },
  {
    "id": 8,
    "nome": "Cabideiro com nicho lateral",
    "precoOriginal": 459,
    "precoPromocional": 405,
    "maxParcelasSemJuros": 2,
    "medidas": [
      0.9,
      1.8,
      0.3
    ]
  },
  {
    "id": 34,
    "nome": "Gôndola retangular",
    "precoOriginal": 875,
    "precoPromocional": 779,
    "maxParcelasSemJuros": 3,
    "medidas": [
      1.4,
      1.2,
      0.8
    ]
  },
  {
    "id": 35,
    "nome": "Gôndola quadrada",
    "precoOriginal": 805,
    "precoPromocional": 719,
    "maxParcelasSemJuros": 3,
    "medidas": [
      0.9,
      1.2,
      0.9
    ]
  }
]);
const mapa = new Map(PROMOCOES.map(p => [p.id, p]));
export function campanhaAtiva(agora = Date.now()) {
  const t = new Date(agora).getTime();
  return t >= Date.parse(CAMPANHA_BLACK_BUENO.inicio) && t < Date.parse(CAMPANHA_BLACK_BUENO.fimExclusivo);
}
export function obterPromocoesCarrossel(agora = Date.now()) {
  return campanhaAtiva(agora) ? PROMOCOES.map(p => ({...p})) : [];
}
export function obterPromocaoPorId(id, agora = Date.now()) {
  return campanhaAtiva(agora) ? mapa.get(Number(id)) || null : null;
}
export function obterPrecoPromocionalPorId(id, agora = Date.now()) {
  return obterPromocaoPorId(id, agora)?.precoPromocional ?? null;
}
export function enriquecerProdutoComPromocao(produto, agora = Date.now()) {
  if (!produto || typeof produto !== 'object') return produto;
  const promo = obterPromocaoPorId(produto.id, agora);
  if (!promo) return produto;
  return {...produto, preco: promo.precoPromocional, precoOriginal: promo.precoOriginal,
    precoPromocional: promo.precoPromocional, maxParcelasSemJuros: promo.maxParcelasSemJuros,
    naoAplicarDescontoAvista: true, blackBueno: true};
}
// A oferta vale para o modelo anunciado, nas medidas e acabamento de catalogo.
// Itens personalizados continuam com os precos e parcelamento normais.
export function itemPadraoBlackBueno(item) {
  const p = mapa.get(Number(item?.id ?? item?.produto_id));
  if (!p) return false;
  const cor = String(item.corOrcada || item.cor_orcada || 'branco').trim().toLowerCase();
  if (cor !== 'branco') return false;
  const medidas = ['largura','altura','profundidade'].map(k => Number(item[k+'Orcada'] ?? item[k+'_orcada'] ?? 0));
  return [p.medidas, p.medidasAlternativas].filter(Boolean).some(base =>
    medidas.every((v,i) => Number.isFinite(v) && (v === 0 || Math.abs(v-base[i]) < 0.011)));
}
// O Supabase persiste o preco, mas nao os metadados da campanha.
// Revalida itens padrao a cada leitura, inclusive carrinhos antigos e expirados.
export function atualizarItemCarrinho(item, agora = Date.now()) {
  const p = mapa.get(Number(item?.id ?? item?.produto_id));
  if (!p || !itemPadraoBlackBueno(item)) return item;
  const novo = {...item};
  delete novo.blackBueno;
  delete novo.precoOriginal;
  delete novo.precoPromocional;
  delete novo.maxParcelasSemJuros;
  delete novo.naoAplicarDescontoAvista;
  if (campanhaAtiva(agora)) return enriquecerProdutoComPromocao(novo, agora);
  novo.preco = p.precoOriginal;
  return novo;
}
export function atualizarCarrinhoPromocional(cart, agora = Date.now()) {
  return Array.isArray(cart) ? cart.map(item => atualizarItemCarrinho(item, agora)) : [];
}
export function lerCarrinhoPromocional() {
  try {
    const raw = localStorage.getItem('cart') || '[]';
    const cart = atualizarCarrinhoPromocional(JSON.parse(raw));
    const normalizado = JSON.stringify(cart);
    if (normalizado !== raw) localStorage.setItem('cart', normalizado);
    return cart;
  } catch { return []; }
}
export function calcularParcelasBlackBueno(valorTotal, limite = 12, promocional = false) {
  const valor = Number(valorTotal);
  if (!Number.isFinite(valor) || valor <= 0) return {parcelas:1, valorParcela:0};
  const max = Math.max(1, Math.floor(Number(limite) || 12));
  // Excecao expressa da campanha: caixinha de 390 reais pode ser 2x de 195.
  const parcelas = promocional ? max : Math.min(max, Math.max(1, Math.floor(valor / 200)));
  return {parcelas, valorParcela: valor / parcelas};
}
