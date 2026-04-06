# Cloudflare Worker - Proxy de Frete Rodonaves

Este Worker recebe o payload do frontend, autentica na Rodonaves, resolve o município de destino e retorna cotação de frete para o site.

> Base da API usada: `https://quotation-apigateway.rte.com.br` (v3). O host legado `https://01wapi.rte.com.br` foi descontinuado em 01/11/2025.

## 1) Pré-requisitos

- Node.js 18+
- Conta Cloudflare
- Wrangler instalado (`npm i -g wrangler`)

## 2) Login na Cloudflare

```bash
wrangler login
```

## 3) Deploy inicial

No diretório `cloudflare-worker/`:

```bash
wrangler deploy
```

Após o deploy, anote a URL publicada (ex.: `https://frete-proxy.<seu-subdominio>.workers.dev`).

## 4) Configurar secrets (credenciais)

> **Nunca** coloque credenciais em arquivo do repositório.

No diretório `cloudflare-worker/`, execute:

```bash
wrangler secret put RODONAVES_CNPJ
wrangler secret put RODONAVES_SENHA
wrangler secret put RODONAVES_CEP_ORIGEM
```

Valor recomendado para `RODONAVES_CEP_ORIGEM`:

- `92410350`

Depois de cadastrar os secrets, rode novamente:

```bash
wrangler deploy
```

## 5) Como testar localmente

```bash
wrangler dev
```

Exemplo de teste via `curl`:

```bash
curl -X POST "http://127.0.0.1:8787/cotacao" \
  -H "Content-Type: application/json" \
  -d '{
    "cidadeDestino": "Passo Fundo",
    "ufDestino": "RS",
    "volumes": [
      {
        "quantidade": 1,
        "peso": 25,
        "altura": 30,
        "largura": 90,
        "comprimento": 185
      }
    ],
    "valorNf": 699
  }'
```

Retorno esperado em sucesso:

```json
{
  "sucesso": true,
  "valorFrete": 185.5,
  "prazoEntrega": 3,
  "observacao": "Prazo em dias úteis"
}
```

## 6) Atualizar URL do Worker no frontend

No arquivo `scripts/frete.js`, altere:

```js
const FRETE_PROXY_URL = 'https://frete-proxy.SEU_SUBDOMINIO.workers.dev/cotacao';
```

para a URL real publicada no seu deploy.

## 7) CORS aceito pelo Worker

O Worker aceita origem para:

- `https://expositoresbueno.com.br`
- `https://www.expositoresbueno.com.br`
- `localhost` (portas 3000 e 5173)

Se você usar outra origem, adicione em `ORIGENS_PERMITIDAS` no arquivo `frete-proxy.js` e faça novo deploy.
