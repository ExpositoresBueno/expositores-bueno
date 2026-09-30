export function normalizeColor(cor) {
  return String(cor || 'branco')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeMeasure(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(2) : '0.00';
}

export function buildCartKey(item) {
  return [
    String(item.id ?? item.produto_id ?? ''),
    normalizeMeasure(item.larguraOrcada ?? item.largura_orcada),
    normalizeMeasure(item.alturaOrcada ?? item.altura_orcada),
    normalizeMeasure(item.profundidadeOrcada ?? item.profundidade_orcada),
    normalizeColor(item.corOrcada ?? item.cor_orcada),
  ].join('-');
}

