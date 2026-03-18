const largurasDesejadas = [1.2, 2.67, 0.6];

const formatadorMoedaBR = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatadorNumeroBR = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatarMoeda = (valor) => formatadorMoedaBR.format(Number(valor) || 0);
const formatarMetros = (valor) => `${formatadorNumeroBR.format(Number(valor) || 0)}m`;
const opcaoAtiva = (valor) => String(valor ?? 'sim').toLowerCase() !== 'nao';

const extrairMaiorValorNumerico = (trecho = '') => {
  const numeros = String(trecho)
    .split('/')
    .map((item) => parseFloat(item))
    .filter((item) => Number.isFinite(item) && item > 0);

  if (numeros.length === 0) return NaN;
  return Math.max(...numeros);
};

const obterLarguraEmMetros = (textoDimensoes = '') => {
  const texto = String(textoDimensoes).toLowerCase().replace(/,/g, '.');

  const patterns = [
    /x\s*([\d.]+)\s*(m|cm|mm)\s*largura/i,
    /([\d.]+)\s*(m|cm|mm)\s*largura/i,
    /x\s*([\d.]+)\s*(m|cm|mm)\s*parte\s*do\s*l/i,
    /([\d.]+)\s*(m|cm|mm)\s*parte\s*do\s*l/i,
  ];

  for (const regex of patterns) {
    const match = texto.match(regex);
    if (!match) continue;

    const valor = extrairMaiorValorNumerico(match[1]);
    const unidade = (match[2] || '').toLowerCase();

    if (!Number.isFinite(valor) || valor <= 0) continue;
    if (unidade === 'mm') return valor / 1000;
    if (unidade === 'cm') return valor / 100;
    return valor;
  }

  return null;
};

const calcularOrcamento = (precoBase, larguraBase, larguraDesejada) => {
  if (!Number.isFinite(precoBase) || !Number.isFinite(larguraBase) || larguraBase <= 0) {
    return null;
  }

  return (precoBase / larguraBase) * larguraDesejada;
};

const carregar = async () => {
  const body = document.getElementById('orcamento-body');
  if (!body) return;

  const resposta = await fetch('../dados/produtos.json');
  const produtos = await resposta.json();

  body.innerHTML = produtos
    .map((produto) => {
      const larguraBase = obterLarguraEmMetros(produto.dimensoes);
      const permiteOrcamentoMedida = opcaoAtiva(produto.permiteOrcamentoMedida);

      const resultados = largurasDesejadas.map((largura) => {
        if (!permiteOrcamentoMedida) return 'desabilitado';
        return calcularOrcamento(Number(produto.preco), larguraBase, largura);
      });

      const colunasResultados = resultados
        .map((valor) => {
          if (valor === 'desabilitado') return '<td class="warn">Não habilitado</td>';
          if (valor === null) return '<td class="warn">Sem largura base</td>';
          return `<td class="money ok">${formatarMoeda(valor)}</td>`;
        })
        .join('');

      return `
        <tr>
          <td class="id-cell">${produto.id}</td>
          <td>${produto.nome}</td>
          <td>${larguraBase === null ? '<span class="warn">Não identificada</span>' : formatarMetros(larguraBase)}</td>
          <td class="money">${formatarMoeda(produto.preco)}</td>
          ${colunasResultados}
        </tr>
      `;
    })
    .join('');
};

carregar().catch((erro) => {
  console.error('Erro ao carregar orçamentos:', erro);
});
