/**
 * Cloudflare Worker - Proxy de cotação Rodonaves.
 *
 * Variáveis de ambiente (secrets) esperadas:
 * - RODONAVES_CNPJ
 * - RODONAVES_SENHA
 * - RODONAVES_CEP_ORIGEM (usar 92410350)
 *
 * Exemplo para cadastrar secrets:
 * wrangler secret put RODONAVES_CNPJ
 * wrangler secret put RODONAVES_SENHA
 * wrangler secret put RODONAVES_CEP_ORIGEM
 */

const TOKEN_URL = 'https://01wapi.rte.com.br/token';
const MUNICIPIO_URL = 'https://01wapi.rte.com.br/api/v1/RotaEntrega/BuscarMunicipioRota';
const COTACAO_URL = 'https://01wapi.rte.com.br/api/v1/CotacaoFrete';

const ORIGENS_PERMITIDAS = [
  'https://expositoresbueno.com.br',
  'https://www.expositoresbueno.com.br',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const jsonResponse = (body, status = 200, origin = '*') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    ...buildCorsHeaders(origin),
  },
});

const buildCorsHeaders = (origin) => {
  const originPermitida = ORIGENS_PERMITIDAS.includes(origin) ? origin : ORIGENS_PERMITIDAS[0];
  return {
    'Access-Control-Allow-Origin': originPermitida,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestToken(env, tentativas = 2) {
  const payload = {
    CNPJ: env.RODONAVES_CNPJ,
    senha: env.RODONAVES_SENHA,
  };

  let ultimoErro;

  for (let i = 0; i < tentativas; i += 1) {
    try {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      const token = data?.access_token || data?.token;

      if (!response.ok || !token) {
        throw new Error(data?.message || data?.erro || `Falha ao obter token (${response.status})`);
      }

      return token;
    } catch (erro) {
      ultimoErro = erro;
      if (i < tentativas - 1) {
        await delay(350 * (i + 1));
      }
    }
  }

  throw ultimoErro || new Error('Não foi possível autenticar na API da Rodonaves.');
}

async function buscarMunicipioId(token, cidadeDestino, ufDestino) {
  const url = new URL(MUNICIPIO_URL);
  url.searchParams.set('municipio', cidadeDestino);
  url.searchParams.set('uf', ufDestino);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error('Falha ao consultar município de entrega.');
  }

  const primeiro = Array.isArray(data) ? data[0] : data;
  const municipioId = primeiro?.id || primeiro?.idMunicipio || primeiro?.codigo || null;
  if (!municipioId) {
    throw new Error('Cidade não encontrada');
  }

  return municipioId;
}

function normalizarVolumes(volumes = []) {
  if (!Array.isArray(volumes) || volumes.length === 0) {
    throw new Error('Informe ao menos um volume para cotação.');
  }

  return volumes.map((volume) => ({
    quantidade: Math.max(1, Number(volume.quantidade) || 1),
    peso: Number(volume.peso) || 0,
    altura: Number(volume.altura) || 0,
    largura: Number(volume.largura) || 0,
    comprimento: Number(volume.comprimento) || 0,
  }));
}

async function cotarFrete(token, env, body, municipioIdDestino) {
  const volumes = normalizarVolumes(body.volumes);

  const payloadCotacao = {
    cepOrigem: String(env.RODONAVES_CEP_ORIGEM || '92410350').replace(/\D/g, ''),
    idMunicipioDestino: municipioIdDestino,
    valorNf: Number(body.valorNf) || 0,
    volumes,
  };

  const response = await fetch(COTACAO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payloadCotacao),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.erro || 'Falha ao cotar frete na Rodonaves.');
  }

  const valorFrete = Number(data?.valorFrete ?? data?.valor ?? data?.totalFrete);
  const prazoEntrega = Number(data?.prazoEntrega ?? data?.prazo ?? data?.dias);

  if (!Number.isFinite(valorFrete) || !Number.isFinite(prazoEntrega)) {
    throw new Error('Resposta de cotação inválida da transportadora.');
  }

  return {
    sucesso: true,
    valorFrete,
    prazoEntrega,
    observacao: data?.observacao || 'Prazo em dias úteis',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/cotacao') {
      return jsonResponse({ sucesso: false, erro: 'Rota não encontrada' }, 404, origin);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ sucesso: false, erro: 'Método não permitido' }, 405, origin);
    }

    try {
      if (!env.RODONAVES_CNPJ || !env.RODONAVES_SENHA) {
        return jsonResponse({ sucesso: false, erro: 'Secrets da Rodonaves não configurados no Worker.' }, 500, origin);
      }

      const body = await request.json().catch(() => null);
      if (!body?.cidadeDestino || !body?.ufDestino || !body?.volumes) {
        return jsonResponse({ sucesso: false, erro: 'Payload inválido para cálculo de frete.' }, 400, origin);
      }

      const token = await requestToken(env, 2);
      const municipioId = await buscarMunicipioId(token, body.cidadeDestino, body.ufDestino);
      const resultado = await cotarFrete(token, env, body, municipioId);

      return jsonResponse(resultado, 200, origin);
    } catch (erro) {
      return jsonResponse({ sucesso: false, erro: erro?.message || 'Erro inesperado no cálculo de frete.' }, 502, origin);
    }
  },
};
