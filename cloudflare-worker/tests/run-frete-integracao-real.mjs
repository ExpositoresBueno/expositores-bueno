/**
 * Teste de integração real (sem mock) para diagnosticar erro de frete em produção.
 *
 * Uso:
 *   FRETE_PROXY_URL="https://frete-proxy.seu-worker.workers.dev/cotacao" \
 *   node cloudflare-worker/tests/run-frete-integracao-real.mjs
 *
 * Opcional (diagnóstico direto no token da Rodonaves):
 *   RODONAVES_CNPJ="00000000000191" \
 *   RODONAVES_SENHA="sua-senha" \
 *   node cloudflare-worker/tests/run-frete-integracao-real.mjs
 */

const FRETE_PROXY_URL = process.env.FRETE_PROXY_URL || 'https://frete-proxy.tiagocbueno.workers.dev/cotacao';
const ORIGIN = process.env.FRETE_TEST_ORIGIN || 'https://expositoresbueno.com.br';
const TIMEOUT_MS = Number(process.env.FRETE_TEST_TIMEOUT_MS || 20_000);

const payload = {
  cidadeDestino: process.env.FRETE_TEST_CIDADE || 'Porto Alegre',
  ufDestino: process.env.FRETE_TEST_UF || 'RS',
  volumes: [
    {
      quantidade: Number(process.env.FRETE_TEST_QTD || 1),
      peso: Number(process.env.FRETE_TEST_PESO || 25),
      altura: Number(process.env.FRETE_TEST_ALTURA || 30),
      largura: Number(process.env.FRETE_TEST_LARGURA || 90),
      comprimento: Number(process.env.FRETE_TEST_COMPRIMENTO || 185),
    },
  ],
  valorNf: Number(process.env.FRETE_TEST_VALOR_NF || 699),
};

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(new Error(`Timeout após ${TIMEOUT_MS}ms`)), TIMEOUT_MS);

const safeJson = (text, fallback = null) => {
  try {
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
};

const logObj = (title, obj) => {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(obj, null, 2));
};

const diagnosticarRespostaFrete = (status, bodyText) => {
  const bodyJson = safeJson(bodyText, null);
  const msg = bodyJson?.erro || bodyJson?.message || bodyText || '';
  const tokenError = /falha ao obter token|token/i.test(msg);

  if (status >= 200 && status < 300 && bodyJson?.sucesso) {
    return { ok: true, motivo: 'Cotação retornada com sucesso', bodyJson, msg };
  }

  if (tokenError) {
    return {
      ok: false,
      motivo: 'Falha de autenticação com a Rodonaves',
      bodyJson,
      msg,
      sugestao: 'Verifique secrets do Worker (RODONAVES_CNPJ/RODONAVES_SENHA) e se o deploy mais recente está ativo.',
    };
  }

  return {
    ok: false,
    motivo: `Cotação falhou com HTTP ${status}`,
    bodyJson,
    msg,
    sugestao: 'Inspecione logs do Worker para detalhes da falha no endpoint da transportadora.',
  };
};

const testarWorkerFrete = async () => {
  const started = Date.now();
  const res = await fetch(FRETE_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  const bodyText = await res.text().catch(() => '');
  const elapsedMs = Date.now() - started;
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), bodyText, elapsedMs };
};

const testarTokenDiretoRodonaves = async () => {
  const cnpj = (process.env.RODONAVES_CNPJ || '').replace(/\D/g, '');
  const senha = process.env.RODONAVES_SENHA || '';
  if (!cnpj || !senha) return { skipped: true, reason: 'RODONAVES_CNPJ/RODONAVES_SENHA não informados.' };

  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(new Error(`Timeout no token após ${TIMEOUT_MS}ms`)), TIMEOUT_MS);

  try {
    const reqBody = new URLSearchParams({
      grant_type: 'password',
      username: cnpj,
      password: senha,
      companyId: '1',
      auth_type: 'dev',
    }).toString();

    const started = Date.now();
    const res = await fetch('https://quotation-apigateway.rte.com.br/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: reqBody,
      signal: ctrl.signal,
    });
    const text = await res.text().catch(() => '');
    const data = safeJson(text, null);
    const elapsedMs = Date.now() - started;
    return {
      skipped: false,
      status: res.status,
      elapsedMs,
      tokenOk: Boolean(data?.access_token || data?.token),
      body: data || text,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

try {
  logObj('Configuração do teste', { FRETE_PROXY_URL, ORIGIN, TIMEOUT_MS, payload });

  const resultadoFrete = await testarWorkerFrete();
  clearTimeout(timeout);

  logObj('Resposta bruta do Worker', {
    status: resultadoFrete.status,
    elapsedMs: resultadoFrete.elapsedMs,
    bodyPreview: resultadoFrete.bodyText.slice(0, 600),
  });

  const diagnostico = diagnosticarRespostaFrete(resultadoFrete.status, resultadoFrete.bodyText);
  logObj('Diagnóstico do frete', diagnostico);

  const tokenDireto = await testarTokenDiretoRodonaves();
  logObj('Diagnóstico direto token Rodonaves', tokenDireto);

  if (!diagnostico.ok) process.exit(2);
} catch (error) {
  clearTimeout(timeout);
  console.error('\n=== Falha de execução do teste ===');
  console.error(error);
  process.exit(1);
}
