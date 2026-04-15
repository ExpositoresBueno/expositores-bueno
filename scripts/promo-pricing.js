const PROMOCOES_CARROSSEL = [
  { id: 40, precoPromocional: 699 },
  { id: 2, precoPromocional: 799 },
  { id: 58, precoPromocional: 799 },
  { id: 57, precoPromocional: 2900 },
  { id: 68, precoPromocional: 749 },
];

const mapaPromocoes = new Map(
  PROMOCOES_CARROSSEL.map((promocao) => [Number(promocao.id), Number(promocao.precoPromocional)]),
);

export function obterPromocoesCarrossel() {
  return PROMOCOES_CARROSSEL.map((promocao) => ({ ...promocao }));
}

export function obterPrecoPromocionalPorId(idProduto) {
  const idNormalizado = Number(idProduto);
  if (!Number.isFinite(idNormalizado)) return null;

  const precoPromocional = mapaPromocoes.get(idNormalizado);
  if (!Number.isFinite(precoPromocional) || precoPromocional <= 0) return null;

  return precoPromocional;
}

export function enriquecerProdutoComPromocao(produto) {
  if (!produto || typeof produto !== "object") return produto;

  const precoPromocional = obterPrecoPromocionalPorId(produto.id);
  if (precoPromocional == null) return produto;

  return {
    ...produto,
    precoPromocional,
  };
}
