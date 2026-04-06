// ============================================================
// LIGA / DESLIGA O BLOCO DE FRETE NO CHECKOUT
// false = remove completamente o bloco de frete
// true  = widget ativo
// ============================================================
const FRETE_ATIVO = true;
// ============================================================

const FRETE_PROXY_URL = 'https://frete-proxy.tiagocbueno.workers.dev/cotacao';
const CAMINHAO_TABELA_URL = '../dados/tabela-frete-caminhao.json';
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
const carregarTabelaCaminhao = async () => fetchJSON(CAMINHAO_TABELA_URL);
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

const extrairFreteCaminhaoDaTabela = (tabela, cidadeDestino, valorPedido) => {
  const cidadeNormalizada = normalizarCidade(cidadeDestino);
  const cidades = Array.isArray(tabela?.cidades) ? tabela.cidades : [];

  const registroCidade = cidades.find((item) => normalizarCidade(item?.cidade) === cidadeNormalizada);
  if (!registroCidade) {
    throw new Error('Sua cidade não está na tabela do caminhão próprio. Fale com nosso time para cotação manual.');
  }

  const faixas = Array.isArray(registroCidade.faixas) ? registroCidade.faixas : [];
  if (!faixas.length) {
    throw new Error('Tabela do caminhão próprio sem faixas configuradas para esta cidade.');
  }

  const valor = Number(valorPedido) || 0;
  const faixaEncontrada = faixas.find((faixa) => {
    const min = Number(faixa?.valorPedidoMin ?? 0);
    const maxRaw = faixa?.valorPedidoMax;
    const max = maxRaw == null ? Infinity : Number(maxRaw);
    return valor >= min && valor <= max;
  });

  if (!faixaEncontrada) {
    throw new Error('Não encontramos faixa de valor para esta cidade na tabela do caminhão próprio.');
  }

  return {
    valorFrete: Number(faixaEncontrada.valorFrete) || 0,
    prazoEntrega: Number(faixaEncontrada.prazoEntregaDiasUteis) || 0,
    observacao: faixaEncontrada.observacao || registroCidade.observacao || 'Entrega com caminhão próprio Expositores Bueno.',
  };
};

const atualizarResumoFreteCheckout = ({ tipo, valorFrete, prazoEntrega, observacao }) => {
  const resultado = document.getElementById('frete-checkout-resultado');
  if (!resultado) return;

  resultado.dataset.freteTipo = tipo || '';
  resultado.dataset.freteValor = String(Number(valorFrete) || 0);
  resultado.dataset.fretePrazo = String(Number(prazoEntrega) || 0);
  resultado.dataset.freteObservacao = observacao || '';

  document.dispatchEvent(new CustomEvent('frete:atualizado', {
    detail: {
      tipo,
      valorFrete: Number(valorFrete) || 0,
      prazoEntrega: Number(prazoEntrega) || 0,
      observacao: observacao || '',
    },
  }));
};

const initFreteCheckout = async (dimensoesMap, tabelaCaminhao) => {
  const wrap = document.querySelector('.frete-checkout-wrap');
  const botao = document.getElementById('frete-checkout-btn');
  const resultado = document.getElementById('frete-checkout-resultado');
  if (!botao || !resultado) return;

  if (!FRETE_ATIVO) {
    wrap?.remove();
    return;
  }

  botao.addEventListener('click', async () => {
    const opcaoSelecionada = document.querySelector('input[name="frete-opcao"]:checked')?.value || 'transportadora';
    botao.disabled = true;
    resultado.hidden = false;
    resultado.classList.remove('is-error');
    resultado.textContent = 'Calculando...';

    try {
      const cart = getCart();
      if (!cart.length) throw new Error('Carrinho vazio para cálculo de frete.');

      const cidadeRaw = document.getElementById('client-city')?.value || '';
      const { cidade: cidadeDestino, uf: ufDestino } = identificarCidadeEUf(cidadeRaw);
      if (!cidadeDestino) throw new Error('Informe a cidade para calcular o frete.');

      const valorPedido = cart.reduce((acc, item) => acc + ((Number(item.preco) || 0) * (Number(item.quantidade) || 0)), 0);
      const opcaoSelecionada = document.querySelector('input[name="frete-opcao"]:checked')?.value || 'transportadora';

      if (opcaoSelecionada === 'caminhao-proprio') {
        const freteCaminhao = extrairFreteCaminhaoDaTabela(tabelaCaminhao, cidadeDestino, valorPedido);

        const aviso = 'Entrega com caminhão próprio da Expositores Bueno.';
        resultado.textContent = `${aviso} Frete: ${formatarMoeda(freteCaminhao.valorFrete)} • Prazo: ${freteCaminhao.prazoEntrega} dia(s) úteis.`;
        atualizarResumoFreteCheckout({
          tipo: 'Caminhão próprio Expositores Bueno',
          valorFrete: freteCaminhao.valorFrete,
          prazoEntrega: freteCaminhao.prazoEntrega,
          observacao: freteCaminhao.observacao,
        });
        return;
      }

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
      const avisoDesmontado = 'Transportadora: mobiliário enviado 100% desmontado. Montagem por conta do cliente.';
      resultado.textContent = `${avisoDesmontado} Frete: ${formatarMoeda(resposta.valorFrete)} • Prazo: ${resposta.prazoEntrega} dia(s) úteis.`;
      atualizarResumoFreteCheckout({
        tipo: 'Transportadora (mobiliário desmontado)',
        valorFrete: resposta.valorFrete,
        prazoEntrega: resposta.prazoEntrega,
        observacao: avisoDesmontado,
      });
    } catch (e) {
      resultado.classList.add('is-error');
      if (opcaoSelecionada === 'transportadora') {
        const mensagem = e?.message || 'Não foi possível calcular o frete da transportadora.';
        resultado.innerHTML = `${mensagem} Não conseguimos retornar valor agora. <a href="${VENDEDOR_WHATSAPP_URL}" target="_blank" rel="noopener noreferrer">Chamar vendedor para consultar o frete</a>.`;
        atualizarResumoFreteCheckout({
          tipo: 'Transportadora (valor sob consulta com vendedor)',
          valorFrete: 0,
          prazoEntrega: 0,
          observacao: 'Frete da transportadora sem valor automático. Consultar vendedor no WhatsApp.',
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
    const [dimensoesMap, tabelaCaminhao] = await Promise.all([
      carregarDimensoesFrete(),
      carregarTabelaCaminhao(),
    ]);

    await initFreteCheckout(dimensoesMap, tabelaCaminhao);
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
