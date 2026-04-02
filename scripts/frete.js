const FRETE_PROXY_URL = 'https://frete-proxy.SEU_SUBDOMINIO.workers.dev/cotacao';
// SUBSTITUIR pela URL real do seu Cloudflare Worker após o deploy

const CIDADES_RS = new Set([
  'porto alegre', 'caxias do sul', 'canoas', 'passo fundo', 'pelotas', 'santa maria',
  'novo hamburgo', 'são leopoldo', 'rio grande', 'alvorada', 'gravataí', 'viamão',
  'bento gonçalves', 'erechim', 'lajeado', 'ijui', 'bagé', 'uruguaiana', 'santa cruz do sul',
]);

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(valor) || 0);

const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
};

const fetchJSON = async (url, init) => {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.erro || `Falha na requisição (${res.status})`);
  }
  return data;
};

const carregarDimensoesFrete = async () => fetchJSON('../dados/dimensoes-frete.json');

const obterProdutoIdDaUrl = () => {
  const id = Number(new URLSearchParams(window.location.search).get('id'));
  return Number.isFinite(id) && id > 0 ? String(id) : null;
};

const getCart = () => JSON.parse(localStorage.getItem('cart') || '[]');

const identificarCidadeEUf = (valorCidade = '') => {
  const texto = String(valorCidade || '').trim();
  if (!texto) return { cidade: '', uf: 'RS' };

  const match = texto.match(/^(.+?)(?:\s*[-/]\s*([A-Za-z]{2}))?$/);
  const cidade = (match?.[1] || '').trim();
  const ufRaw = (match?.[2] || '').trim().toUpperCase();
  const uf = ufRaw || (CIDADES_RS.has(cidade.toLowerCase()) ? 'RS' : 'RS');
  return { cidade, uf };
};

const chamarFreteProxy = async (payload) => fetchJSON(FRETE_PROXY_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const initFreteProduto = async (dimensoesMap) => {
  const section = document.getElementById('frete-calculator');
  if (!section) return;

  const cidadeInput = document.getElementById('frete-cidade-input');
  const ufSelect = document.getElementById('frete-uf-select');
  const calcularBtn = document.getElementById('frete-calcular-btn');
  const resultado = document.getElementById('frete-resultado');
  const valorTexto = document.getElementById('frete-valor-texto');
  const prazoTexto = document.getElementById('frete-prazo-texto');
  const loading = document.getElementById('frete-loading');
  const erro = document.getElementById('frete-erro');

  const productId = obterProdutoIdDaUrl();
  const volumeProduto = productId ? dimensoesMap[productId] : null;

  const resetarEstado = () => {
    section.classList.remove('is-loading', 'is-error', 'is-success');
    erro.hidden = true;
  };

  cidadeInput?.addEventListener('input', debounce(() => {
    const texto = cidadeInput.value.trim().toLowerCase();
    if (texto.length < 3) return;

    const sugestaoRS = Array.from(CIDADES_RS).some((cidade) => cidade.startsWith(texto));
    if (sugestaoRS && ufSelect) ufSelect.value = 'RS';
  }, 300));

  calcularBtn?.addEventListener('click', async () => {
    resetarEstado();

    const cidadeDestino = cidadeInput?.value?.trim();
    const ufDestino = ufSelect?.value || 'RS';

    if (!cidadeDestino || !volumeProduto) {
      section.classList.add('is-error');
      erro.textContent = 'Não foi possível identificar cidade ou dimensões deste produto.';
      erro.hidden = false;
      return;
    }

    section.classList.add('is-loading');
    loading.hidden = false;
    resultado.hidden = true;

    try {
      const produtoValor = Number(document.getElementById('product-price')?.textContent?.replace(/\./g, '').replace(',', '.') || 0);
      const payload = {
        cidadeDestino,
        ufDestino,
        volumes: [{ ...volumeProduto, quantidade: 1 }],
        valorNf: produtoValor || 0,
      };

      const resposta = await chamarFreteProxy(payload);
      if (!resposta?.sucesso) throw new Error(resposta?.erro || 'Não foi possível calcular o frete.');

      valorTexto.textContent = `Frete estimado: ${formatarMoeda(resposta.valorFrete)}`;
      prazoTexto.textContent = `Prazo: ${resposta.prazoEntrega} dia(s) úteis`;
      resultado.hidden = false;
      section.classList.add('is-success');
    } catch (e) {
      section.classList.add('is-error');
      erro.textContent = e.message || 'Erro ao calcular frete.';
      erro.hidden = false;
    } finally {
      loading.hidden = true;
      section.classList.remove('is-loading');
    }
  });
};

const initFreteCheckout = async (dimensoesMap) => {
  const botao = document.getElementById('frete-checkout-btn');
  const resultado = document.getElementById('frete-checkout-resultado');
  if (!botao || !resultado) return;

  botao.addEventListener('click', async () => {
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

      const volumes = cart.flatMap((item) => {
        const id = String(item.id);
        const base = dimensoesMap[id];
        if (!base) return [];
        const quantidade = Math.max(1, Number(item.quantidade) || 1);
        return [{ ...base, quantidade }];
      });

      if (!volumes.length) throw new Error('Não encontramos dimensões para os itens do carrinho.');

      const valorNf = cart.reduce((acc, item) => acc + ((Number(item.preco) || 0) * (Number(item.quantidade) || 0)), 0);

      const resposta = await chamarFreteProxy({ cidadeDestino, ufDestino, volumes, valorNf });
      if (!resposta?.sucesso) throw new Error(resposta?.erro || 'Não foi possível calcular o frete.');

      resultado.textContent = `Frete estimado: ${formatarMoeda(resposta.valorFrete)} • Prazo: ${resposta.prazoEntrega} dia(s) úteis`;
    } catch (e) {
      resultado.classList.add('is-error');
      resultado.textContent = e.message || 'Erro ao calcular frete no checkout.';
    } finally {
      botao.disabled = false;
    }
  });
};

const startFrete = async () => {
  try {
    const dimensoesMap = await carregarDimensoesFrete();
    await Promise.all([initFreteProduto(dimensoesMap), initFreteCheckout(dimensoesMap)]);
  } catch (e) {
    console.error('Falha ao inicializar cálculo de frete:', e);
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
