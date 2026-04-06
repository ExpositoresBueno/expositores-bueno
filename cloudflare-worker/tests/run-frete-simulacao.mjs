import { readFile } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
import worker from '../frete-proxy.js';

const produtos = JSON.parse(await readFile(new URL('../../dados/produtos.json', import.meta.url), 'utf8'));
const dimensoesMap = JSON.parse(await readFile(new URL('../../dados/dimensoes-frete.json', import.meta.url), 'utf8'));

const CIDADES_RS = [
  'Porto Alegre',
  'Caxias do Sul',
  'Canoas',
  'Passo Fundo',
  'Pelotas',
  'Santa Maria',
  'Novo Hamburgo',
  'São Leopoldo',
  'Rio Grande',
  'Gravataí',
];

const PRODUTOS_TESTE = [1, 2, 3, 4, 5, 10, 11, 12, 13, 14];

const produtoPorId = new Map(produtos.map((p) => [Number(p.id), p]));

const hashCidade = (cidade) => {
  let hash = 0;
  for (const ch of cidade) hash = ((hash * 31) + ch.charCodeAt(0)) % 100000;
  return 1000 + hash;
};

const municipioIdParaCidade = new Map();
const endpointUsado = new Map();
let tokenCalls = 0;
let municipioCalls = 0;
let cotacaoV3Calls = 0;
let cotacaoLegacyCalls = 0;

const valorBase = ({ peso, altura, largura, comprimento, valorNf, cidade }) => {
  const volume = (altura * largura * comprimento) / 1000000;
  const fatorCidade = (cidade.length % 9) + 1;
  const valor = (peso * 0.41) + (volume * 120) + (valorNf * 0.018) + (fatorCidade * 7.5);
  const prazo = Math.max(1, Math.round((comprimento + largura) / 80) + fatorCidade);
  return {
    valorFrete: Number(valor.toFixed(2)),
    prazoEntrega: prazo,
  };
};

const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const rawUrl = typeof input === 'string' ? input : input.url;
  const url = new URL(rawUrl);

  if (url.pathname === '/token') {
    tokenCalls += 1;
    return Response.json({ access_token: 'token-mock-123' }, { status: 200 });
  }

  if (url.pathname.endsWith('/BuscarMunicipioRota')) {
    municipioCalls += 1;
    const cidade = url.searchParams.get('municipio') || '';
    const id = hashCidade(cidade);
    municipioIdParaCidade.set(id, cidade);
    return Response.json([{ id }], { status: 200 });
  }

  if (url.pathname.endsWith('/gera-cotacao') || url.pathname.endsWith('/CotacaoFrete')) {
    const body = JSON.parse(init.body || '{}');
    const cidade = municipioIdParaCidade.get(Number(body.idMunicipioDestino)) || 'Cidade desconhecida';
    const vol = Array.isArray(body.volumes) && body.volumes[0] ? body.volumes[0] : {};

    // força fallback em metade das cidades para validar a estratégia em cadeia
    const cidadeIdx = CIDADES_RS.findIndex((c) => c.toLowerCase() === cidade.toLowerCase());
    const deveFalharNoV3 = cidadeIdx >= 0 && (cidadeIdx % 2 === 1);

    if (url.pathname.endsWith('/gera-cotacao')) {
      cotacaoV3Calls += 1;
      if (deveFalharNoV3) {
        return Response.json({ message: 'Endpoint v3 temporariamente indisponível (simulado)' }, { status: 503 });
      }

      const calc = valorBase({
        peso: Number(vol.peso) || 0,
        altura: Number(vol.altura) || 0,
        largura: Number(vol.largura) || 0,
        comprimento: Number(vol.comprimento) || 0,
        valorNf: Number(body.valorNf) || 0,
        cidade,
      });
      endpointUsado.set(`${cidade}::${vol.peso}::${vol.comprimento}`, 'v3 /gera-cotacao');
      return Response.json(calc, { status: 200 });
    }

    cotacaoLegacyCalls += 1;
    const calc = valorBase({
      peso: Number(vol.peso) || 0,
      altura: Number(vol.altura) || 0,
      largura: Number(vol.largura) || 0,
      comprimento: Number(vol.comprimento) || 0,
      valorNf: Number(body.valorNf) || 0,
      cidade,
    });
    endpointUsado.set(`${cidade}::${vol.peso}::${vol.comprimento}`, 'fallback /CotacaoFrete');
    return Response.json(calc, { status: 200 });
  }

  return Response.json({ message: `URL não mockada: ${url.toString()}` }, { status: 404 });
};

const env = {
  RODONAVES_CNPJ: '00000000000191',
  RODONAVES_SENHA: 'senha-mock',
  RODONAVES_CEP_ORIGEM: '92410350',
};

const rows = [];

for (const cidade of CIDADES_RS) {
  for (const produtoId of PRODUTOS_TESTE) {
    const produto = produtoPorId.get(produtoId);
    const volume = dimensoesMap[String(produtoId)];
    if (!produto || !volume) {
      rows.push({ cidade, produtoId, erro: 'Produto ou dimensões não encontrados' });
      continue;
    }

    const payload = {
      cidadeDestino: cidade,
      ufDestino: 'RS',
      volumes: [{ ...volume, quantidade: 1 }],
      valorNf: Number(produto.preco) || 0,
    };

    const req = new Request('https://frete-proxy.exemplo.workers.dev/cotacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://expositoresbueno.com.br' },
      body: JSON.stringify(payload),
    });

    const res = await worker.fetch(req, env);
    const data = await res.json();

    const endpoint = endpointUsado.get(`${cidade}::${volume.peso}::${volume.comprimento}`) || 'indefinido';

    rows.push({
      cidade,
      produtoId,
      produto: produto.nome,
      preco: Number(produto.preco) || 0,
      valorFrete: data.valorFrete,
      prazoEntrega: data.prazoEntrega,
      endpoint,
      status: res.status,
      sucesso: Boolean(data.sucesso),
    });
  }
}

// Casos extras de erro
const reqInvalido = new Request('https://frete-proxy.exemplo.workers.dev/cotacao', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://expositoresbueno.com.br' },
  body: JSON.stringify({ cidadeDestino: '', ufDestino: 'RS', volumes: [] }),
});
const resInvalido = await worker.fetch(reqInvalido, env);
const invalidoJson = await resInvalido.json();

const reqMetodo = new Request('https://frete-proxy.exemplo.workers.dev/cotacao', {
  method: 'GET',
  headers: { Origin: 'https://expositoresbueno.com.br' },
});
const resMetodo = await worker.fetch(reqMetodo, env);
const metodoJson = await resMetodo.json();

const sucessoTotal = rows.filter((r) => r.sucesso).length;
const falhasTotal = rows.length - sucessoTotal;

const linhasTabela = rows.map((r, idx) => `| ${idx + 1} | ${r.cidade} | ${r.produtoId} | ${r.produto} | ${r.preco.toFixed(2)} | ${Number(r.valorFrete).toFixed(2)} | ${r.prazoEntrega} | ${r.endpoint} | ${r.status} | ${r.sucesso ? 'SIM' : 'NÃO'} |`).join('\n');

const report = `# Simulação de Frete RS (10 produtos x 10 cidades)\n\n` +
`- Data UTC: ${new Date().toISOString()}\n` +
`- Total de cenários: ${rows.length}\n` +
`- Sucessos: ${sucessoTotal}\n` +
`- Falhas: ${falhasTotal}\n` +
`- Chamadas de token: ${tokenCalls}\n` +
`- Chamadas BuscarMunicipioRota: ${municipioCalls}\n` +
`- Chamadas cotação v3 (/gera-cotacao): ${cotacaoV3Calls}\n` +
`- Chamadas cotação fallback (/CotacaoFrete): ${cotacaoLegacyCalls}\n\n` +
`## Tabela completa\n\n` +
`| # | Cidade | ID Produto | Produto | Preço (R$) | Frete (R$) | Prazo (dias úteis) | Endpoint usado | HTTP | Sucesso |\n` +
`|---:|---|---:|---|---:|---:|---:|---|---:|---|\n` +
`${linhasTabela}\n\n` +
`## Casos extras de erro\n\n` +
`- Payload inválido: HTTP ${resInvalido.status} | resposta: ${JSON.stringify(invalidoJson)}\n` +
`- Método inválido (GET): HTTP ${resMetodo.status} | resposta: ${JSON.stringify(metodoJson)}\n`;

const outPath = new URL('../reports/simulacao-frete-rs-2026-04-06.md', import.meta.url);
await writeFile(outPath, report, 'utf8');

console.log('=== RESUMO DA SIMULAÇÃO ===');
console.log(`Cenários: ${rows.length} | Sucessos: ${sucessoTotal} | Falhas: ${falhasTotal}`);
console.log(`Token: ${tokenCalls} | Município: ${municipioCalls} | V3: ${cotacaoV3Calls} | Fallback: ${cotacaoLegacyCalls}`);
console.log(`Relatório completo: ${outPath.pathname}`);
console.log('\nPrimeiras 12 linhas:');
for (const r of rows.slice(0, 12)) {
  console.log(`${r.cidade.padEnd(14)} | Produto ${String(r.produtoId).padStart(2)} | Frete R$ ${Number(r.valorFrete).toFixed(2).padStart(7)} | Prazo ${String(r.prazoEntrega).padStart(2)} | ${r.endpoint}`);
}
console.log('\nCasos de erro:');
console.log(`Payload inválido => HTTP ${resInvalido.status} ${JSON.stringify(invalidoJson)}`);
console.log(`Método GET => HTTP ${resMetodo.status} ${JSON.stringify(metodoJson)}`);

globalThis.fetch = originalFetch;
