// ============================================================
// LIGA / DESLIGA O BLOCO DE FRETE NO CHECKOUT
// false = remove completamente o bloco de frete
// true  = widget ativo
// ============================================================
const FRETE_ATIVO = true;
// ============================================================

const FRETE_PROXY_URL = 'https://frete-proxy.tiagocbueno.workers.dev/cotacao';
const VENDEDOR_WHATSAPP_URL = 'https://wa.me/5551996034579';

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(valor) || 0);

const fetchJSON = async (url, init) => {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.erro || `Falha na requisição (${res.status})`);
  }
  return data;
};

const carregarDimensoesFrete = async () => fetchJSON('../dados/dimensoes-frete.json');
const carregarTabelaFreteCaminhao = async () => fetchJSON('../dados/tabela-frete-caminhao.json');
const getCart = () => JSON.parse(localStorage.getItem('cart') || '[]');

const normalizarCidade = (texto = '') => String(texto || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const identificarCidadeEUf = (valorCidade = '') => {
  const texto = String(valorCidade || '').trim();
  if (!texto) return { cidade: '', uf: 'RS' };

  const match = texto.match(/^(.+?)(?:\s*[-/]\s*([A-Za-z]{2}))?$/);
  const cidade = (match?.[1] || '').trim();
  const ufRaw = (match?.[2] || '').trim().toUpperCase();
  return { cidade, uf: ufRaw || 'RS' };
};

const chamarFreteProxy = async (payload) => fetchJSON(FRETE_PROXY_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const obterFreteCaminhaoCidade = (cidadeInfo) => {
  const valorFreteDireto = Number(cidadeInfo?.valorFrete);
  if (Number.isFinite(valorFreteDireto) && valorFreteDireto >= 0) {
    return {
      valorFrete: valorFreteDireto,
      prazoEntregaDiasUteis: Number(cidadeInfo?.prazoEntregaDiasUteis) || 0,
      distanciaKm: Number(cidadeInfo?.distanciaKm) || 0,
    };
  }

  const faixas = Array.isArray(cidadeInfo?.faixas) ? cidadeInfo.faixas : [];
  const faixaPadrao = faixas[0];
  if (!faixaPadrao) return null;

  return {
    valorFrete: Number(faixaPadrao?.valorFrete) || 0,
    prazoEntregaDiasUteis: Number(faixaPadrao?.prazoEntregaDiasUteis) || 0,
    distanciaKm: Number(cidadeInfo?.distanciaKm) || 0,
  };
};

const gerarAssinaturaCarrinho = (cart = []) => cart
  .map((item) => `${item.id}:${item.quantidade}:${Number(item.preco) || 0}`)
  .sort()
  .join('|');

const atualizarResumoFreteCheckout = ({ tipo, valorFrete, prazoEntrega, observacao, assinaturaCarrinho }) => {
  const resultado = document.getElementById('frete-checkout-resultado');
  if (!resultado) return;

  resultado.dataset.freteTipo = tipo || '';
  resultado.dataset.freteValor = String(Number(valorFrete) || 0);
  resultado.dataset.fretePrazo = String(Number(prazoEntrega) || 0);
  resultado.dataset.freteObservacao = observacao || '';
  resultado.dataset.freteCartSignature = assinaturaCarrinho || '';

  document.dispatchEvent(new CustomEvent('frete:atualizado', {
    detail: {
      tipo,
      valorFrete: Number(valorFrete) || 0,
      prazoEntrega: Number(prazoEntrega) || 0,
      observacao: observacao || '',
    },
  }));
};

const renderizarTabelaCaminhao = ({ tabelaFreteCaminhao, resultado, cidadeInput, assinaturaCarrinho }) => {
  const container = document.getElementById('frete-caminhao-tabela');
  if (!container) return;

  const cidades = Array.isArray(tabelaFreteCaminhao?.cidades) ? tabelaFreteCaminhao.cidades : [];
  if (!cidades.length) {
    container.hidden = true;
    return;
  }

  container.innerHTML = '';
  const titulo = document.createElement('h4');
  titulo.textContent = 'Clique na cidade para calcular o frete do caminhão próprio:';
  container.appendChild(titulo);

  const cidadesGrid = document.createElement('div');
  cidadesGrid.className = 'frete-cidades-grid';

  cidades.forEach((cidadeInfo) => {
    const cidade = String(cidadeInfo?.cidade || '').trim();
    if (!cidade) return;

    const botaoCidade = document.createElement('button');
    botaoCidade.type = 'button';
    botaoCidade.className = 'frete-cidade-btn';
    const valorPreview = Number(cidadeInfo?.valorFrete);
    const kmPreview = Number(cidadeInfo?.distanciaKm);
    const partesPreview = [cidade];
    if (Number.isFinite(kmPreview) && kmPreview > 0) partesPreview.push(`${kmPreview} km`);
    if (Number.isFinite(valorPreview) && valorPreview >= 0) partesPreview.push(formatarMoeda(valorPreview));
    botaoCidade.textContent = partesPreview.join(' • ');
    botaoCidade.addEventListener('click', () => {
      const freteCidade = obterFreteCaminhaoCidade(cidadeInfo);
      if (!freteCidade) {
        resultado.hidden = false;
        resultado.classList.add('is-error');
        resultado.textContent = `Não encontramos frete configurado para ${cidade}.`;
        atualizarResumoFreteCheckout({
          tipo: 'Caminhão próprio Expositores Bueno (não encontrado)',
          valorFrete: 0,
          prazoEntrega: 0,
          observacao: `Tabela sem frete válido para ${cidade}.`,
          assinaturaCarrinho,
        });
        return;
      }

      const frete = Number(freteCidade.valorFrete) || 0;
      const prazo = Number(freteCidade.prazoEntregaDiasUteis) || 0;
      const distanciaKm = Number(freteCidade.distanciaKm) || 0;
      const trechoDistancia = distanciaKm > 0 ? ` • Distância: ${distanciaKm} km` : '';
      const trechoPrazo = prazo > 0 ? ` • Prazo: ${prazo} dia(s) úteis` : '';
      resultado.hidden = false;
      resultado.classList.remove('is-error');
      resultado.textContent = `Caminhão próprio para ${cidade}/RS${trechoDistancia} • Frete: ${formatarMoeda(frete)}${trechoPrazo}.`;
      if (cidadeInput) cidadeInput.value = `${cidade} - RS`;
      atualizarResumoFreteCheckout({
        tipo: 'Caminhão próprio Expositores Bueno',
        valorFrete: frete,
        prazoEntrega: prazo,
        observacao: `Entrega com caminhão próprio para ${cidade}/RS${trechoDistancia}.`,
        assinaturaCarrinho,
      });
    });

    cidadesGrid.appendChild(botaoCidade);
  });

  container.appendChild(cidadesGrid);
  container.hidden = false;
};

const initFreteCheckout = async (dimensoesMap, tabelaFreteCaminhao) => {
  const wrap = document.querySelector('.frete-checkout-wrap');
  const botao = document.getElementById('frete-checkout-btn');
  const resultado = document.getElementById('frete-checkout-resultado');
  const tabelaCaminhaoEl = document.getElementById('frete-caminhao-tabela');
  const cidadeInput = document.getElementById('client-city');
  if (!botao || !resultado) return;

  if (!FRETE_ATIVO) {
    wrap?.remove();
    return;
  }

  const atualizarVisibilidadeTabelaCaminhao = () => {
    const opcaoSelecionada = document.querySelector('input[name="frete-opcao"]:checked')?.value || 'transportadora';
    if (opcaoSelecionada !== 'caminhao-proprio') {
      if (tabelaCaminhaoEl) tabelaCaminhaoEl.hidden = true;
      return;
    }

    resultado.hidden = false;
    resultado.classList.remove('is-error');
    resultado.textContent = 'Clique em "Calcular Frete" para abrir as cidades do caminhão próprio.';
  };

  document.querySelectorAll('input[name="frete-opcao"]').forEach((radio) => {
    radio.addEventListener('change', atualizarVisibilidadeTabelaCaminhao);
  });
  atualizarVisibilidadeTabelaCaminhao();

  botao.addEventListener('click', async () => {
    const opcaoSelecionada = document.querySelector('input[name="frete-opcao"]:checked')?.value || 'transportadora';
    botao.disabled = true;
    resultado.hidden = false;
    resultado.classList.remove('is-error');
    resultado.textContent = 'Calculando...';

    try {
      const cart = getCart();
      if (!cart.length) throw new Error('Carrinho vazio para cálculo de frete.');

      const valorPedido = cart.reduce((acc, item) => acc + ((Number(item.preco) || 0) * (Number(item.quantidade) || 0)), 0);
      const assinaturaCarrinho = gerarAssinaturaCarrinho(cart);
      if (opcaoSelecionada === 'caminhao-proprio') {
        resultado.classList.remove('is-error');
        resultado.textContent = 'Selecione a cidade na tabela abaixo para obter o valor do frete.';
        renderizarTabelaCaminhao({
          tabelaFreteCaminhao,
          resultado,
          cidadeInput,
          assinaturaCarrinho,
        });
        return;
      }
      if (tabelaCaminhaoEl) tabelaCaminhaoEl.hidden = true;
      const cidadeRaw = document.getElementById('client-city')?.value || '';
      const { cidade: cidadeDestino, uf: ufDestino } = identificarCidadeEUf(cidadeRaw);
      if (!cidadeDestino) throw new Error('Informe a cidade para calcular o frete.');

      const volumes = cart.flatMap((item) => {
        const id = String(item.id);
        const base = dimensoesMap[id];
        if (!base) return [];
        const quantidade = Math.max(1, Number(item.quantidade) || 1);
        return [{ ...base, quantidade }];
      });

      if (!volumes.length) throw new Error('Não encontramos dimensões para os itens do carrinho.');

      const resposta = await chamarFreteProxy({ cidadeDestino, ufDestino, volumes, valorNf: valorPedido });
      if (!resposta?.sucesso) throw new Error(resposta?.erro || 'Não foi possível calcular o frete.');

      const avisoDesmontado = 'Envio via transportadora parceira. Produto enviado desmontado (montagem por conta do comprador).';
      resultado.textContent = `${avisoDesmontado} Frete: ${formatarMoeda(resposta.valorFrete)} • Prazo: ${resposta.prazoEntrega} dia(s) úteis.`;
      atualizarResumoFreteCheckout({
        tipo: 'Transportadora (mobiliário desmontado)',
        valorFrete: resposta.valorFrete,
        prazoEntrega: resposta.prazoEntrega,
        observacao: avisoDesmontado,
        assinaturaCarrinho,
      });
    } catch (e) {
      resultado.classList.add('is-error');
      if (tabelaCaminhaoEl) tabelaCaminhaoEl.hidden = true;
      if (opcaoSelecionada === 'transportadora') {
        const mensagem = e?.message || 'Não foi possível calcular o frete da transportadora.';
        resultado.innerHTML = `${mensagem} Não conseguimos retornar valor agora. <a href="${VENDEDOR_WHATSAPP_URL}" target="_blank" rel="noopener noreferrer">Chamar vendedor para consultar o frete</a>.`;
        atualizarResumoFreteCheckout({
          tipo: 'Transportadora (valor sob consulta com vendedor)',
          valorFrete: 0,
          prazoEntrega: 0,
          observacao: 'Frete da transportadora sem valor automático. Consultar vendedor no WhatsApp.',
          assinaturaCarrinho: gerarAssinaturaCarrinho(getCart()),
        });
      } else {
        resultado.innerHTML = `${e.message || 'Erro ao calcular frete com caminhão próprio.'} <a href="${VENDEDOR_WHATSAPP_URL}" target="_blank" rel="noopener noreferrer">Chamar vendedor para consultar o frete</a>.`;
      }
    } finally {
      botao.disabled = false;
    }
  });
};

const startFrete = async () => {
  try {
    const [dimensoesMap, tabelaFreteCaminhao] = await Promise.all([
      carregarDimensoesFrete(),
      carregarTabelaFreteCaminhao(),
    ]);
    await initFreteCheckout(dimensoesMap, tabelaFreteCaminhao);
  } catch (e) {
    console.error('Falha ao inicializar cálculo de frete no checkout:', e);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => startFrete());
    } else {
      window.setTimeout(startFrete, 0);
    }
  });
} else if ('requestIdleCallback' in window) {
  window.requestIdleCallback(() => startFrete());
} else {
  window.setTimeout(startFrete, 0);
}
