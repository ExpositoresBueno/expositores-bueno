# Simulação de Frete RS (10 produtos x 10 cidades)

- Data UTC: 2026-04-06T20:00:48.154Z
- Total de cenários: 100
- Sucessos: 100
- Falhas: 0
- Chamadas de token: 100
- Chamadas BuscarMunicipioRota: 100
- Chamadas cotação v3 (/gera-cotacao): 100
- Chamadas cotação fallback (/CotacaoFrete): 50

## Tabela completa

| # | Cidade | ID Produto | Produto | Preço (R$) | Frete (R$) | Prazo (dias úteis) | Endpoint usado | HTTP | Sucesso |
|---:|---|---:|---|---:|---:|---:|---|---:|---|
| 1 | Porto Alegre | 1 | BALCÃO CAIXINHA | 449.00 | 108.24 | 6 | v3 /gera-cotacao | 200 | SIM |
| 2 | Porto Alegre | 2 | BALCÃO CAIXA COM VITRINE (BRANCO) | 875.00 | 192.56 | 7 | v3 /gera-cotacao | 200 | SIM |
| 3 | Porto Alegre | 3 | BALCÃO VITRINE | 800.00 | 160.35 | 7 | v3 /gera-cotacao | 200 | SIM |
| 4 | Porto Alegre | 4 | BALCÃO CAIXA | 815.00 | 172.01 | 7 | v3 /gera-cotacao | 200 | SIM |
| 5 | Porto Alegre | 5 | ARMÁRIO COLMEIA | 699.00 | 235.77 | 7 | v3 /gera-cotacao | 200 | SIM |
| 6 | Porto Alegre | 10 | GÔNDOLA 8 CANTOS | 899.00 | 171.57 | 7 | v3 /gera-cotacao | 200 | SIM |
| 7 | Porto Alegre | 11 | GÔNDOLA CENTRAL | 990.00 | 242.78 | 7 | v3 /gera-cotacao | 200 | SIM |
| 8 | Porto Alegre | 12 | MÓVEL PARA VITRINE | 1590.00 | 250.04 | 7 | v3 /gera-cotacao | 200 | SIM |
| 9 | Porto Alegre | 13 | ARMÁRIO VESTIÁRIO 8 PORTAS | 1040.00 | 174.11 | 7 | v3 /gera-cotacao | 200 | SIM |
| 10 | Porto Alegre | 14 | GÔNDOLA CANALETADA | 490.00 | 153.59 | 7 | v3 /gera-cotacao | 200 | SIM |
| 11 | Caxias do Sul | 1 | BALCÃO CAIXINHA | 449.00 | 115.74 | 7 | fallback /CotacaoFrete | 200 | SIM |
| 12 | Caxias do Sul | 2 | BALCÃO CAIXA COM VITRINE (BRANCO) | 875.00 | 200.06 | 8 | fallback /CotacaoFrete | 200 | SIM |
| 13 | Caxias do Sul | 3 | BALCÃO VITRINE | 800.00 | 167.85 | 8 | fallback /CotacaoFrete | 200 | SIM |
| 14 | Caxias do Sul | 4 | BALCÃO CAIXA | 815.00 | 179.51 | 8 | fallback /CotacaoFrete | 200 | SIM |
| 15 | Caxias do Sul | 5 | ARMÁRIO COLMEIA | 699.00 | 243.27 | 8 | fallback /CotacaoFrete | 200 | SIM |
| 16 | Caxias do Sul | 10 | GÔNDOLA 8 CANTOS | 899.00 | 179.07 | 8 | fallback /CotacaoFrete | 200 | SIM |
| 17 | Caxias do Sul | 11 | GÔNDOLA CENTRAL | 990.00 | 250.28 | 8 | fallback /CotacaoFrete | 200 | SIM |
| 18 | Caxias do Sul | 12 | MÓVEL PARA VITRINE | 1590.00 | 257.54 | 8 | fallback /CotacaoFrete | 200 | SIM |
| 19 | Caxias do Sul | 13 | ARMÁRIO VESTIÁRIO 8 PORTAS | 1040.00 | 181.61 | 8 | fallback /CotacaoFrete | 200 | SIM |
| 20 | Caxias do Sul | 14 | GÔNDOLA CANALETADA | 490.00 | 161.09 | 8 | fallback /CotacaoFrete | 200 | SIM |
| 21 | Canoas | 1 | BALCÃO CAIXINHA | 449.00 | 130.74 | 9 | v3 /gera-cotacao | 200 | SIM |
| 22 | Canoas | 2 | BALCÃO CAIXA COM VITRINE (BRANCO) | 875.00 | 215.06 | 10 | v3 /gera-cotacao | 200 | SIM |
| 23 | Canoas | 3 | BALCÃO VITRINE | 800.00 | 182.85 | 10 | v3 /gera-cotacao | 200 | SIM |
| 24 | Canoas | 4 | BALCÃO CAIXA | 815.00 | 194.51 | 10 | v3 /gera-cotacao | 200 | SIM |
| 25 | Canoas | 5 | ARMÁRIO COLMEIA | 699.00 | 258.27 | 10 | v3 /gera-cotacao | 200 | SIM |
| 26 | Canoas | 10 | GÔNDOLA 8 CANTOS | 899.00 | 194.07 | 10 | v3 /gera-cotacao | 200 | SIM |
| 27 | Canoas | 11 | GÔNDOLA CENTRAL | 990.00 | 265.28 | 10 | v3 /gera-cotacao | 200 | SIM |
| 28 | Canoas | 12 | MÓVEL PARA VITRINE | 1590.00 | 272.54 | 10 | v3 /gera-cotacao | 200 | SIM |
| 29 | Canoas | 13 | ARMÁRIO VESTIÁRIO 8 PORTAS | 1040.00 | 196.61 | 10 | v3 /gera-cotacao | 200 | SIM |
| 30 | Canoas | 14 | GÔNDOLA CANALETADA | 490.00 | 176.09 | 10 | v3 /gera-cotacao | 200 | SIM |
| 31 | Passo Fundo | 1 | BALCÃO CAIXINHA | 449.00 | 100.74 | 5 | fallback /CotacaoFrete | 200 | SIM |
| 32 | Passo Fundo | 2 | BALCÃO CAIXA COM VITRINE (BRANCO) | 875.00 | 185.06 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 33 | Passo Fundo | 3 | BALCÃO VITRINE | 800.00 | 152.85 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 34 | Passo Fundo | 4 | BALCÃO CAIXA | 815.00 | 164.51 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 35 | Passo Fundo | 5 | ARMÁRIO COLMEIA | 699.00 | 228.27 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 36 | Passo Fundo | 10 | GÔNDOLA 8 CANTOS | 899.00 | 164.07 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 37 | Passo Fundo | 11 | GÔNDOLA CENTRAL | 990.00 | 235.28 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 38 | Passo Fundo | 12 | MÓVEL PARA VITRINE | 1590.00 | 242.54 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 39 | Passo Fundo | 13 | ARMÁRIO VESTIÁRIO 8 PORTAS | 1040.00 | 166.61 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 40 | Passo Fundo | 14 | GÔNDOLA CANALETADA | 490.00 | 146.09 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 41 | Pelotas | 1 | BALCÃO CAIXINHA | 449.00 | 138.24 | 10 | v3 /gera-cotacao | 200 | SIM |
| 42 | Pelotas | 2 | BALCÃO CAIXA COM VITRINE (BRANCO) | 875.00 | 222.56 | 11 | v3 /gera-cotacao | 200 | SIM |
| 43 | Pelotas | 3 | BALCÃO VITRINE | 800.00 | 190.35 | 11 | v3 /gera-cotacao | 200 | SIM |
| 44 | Pelotas | 4 | BALCÃO CAIXA | 815.00 | 202.01 | 11 | v3 /gera-cotacao | 200 | SIM |
| 45 | Pelotas | 5 | ARMÁRIO COLMEIA | 699.00 | 265.77 | 11 | v3 /gera-cotacao | 200 | SIM |
| 46 | Pelotas | 10 | GÔNDOLA 8 CANTOS | 899.00 | 201.57 | 11 | v3 /gera-cotacao | 200 | SIM |
| 47 | Pelotas | 11 | GÔNDOLA CENTRAL | 990.00 | 272.78 | 11 | v3 /gera-cotacao | 200 | SIM |
| 48 | Pelotas | 12 | MÓVEL PARA VITRINE | 1590.00 | 280.04 | 11 | v3 /gera-cotacao | 200 | SIM |
| 49 | Pelotas | 13 | ARMÁRIO VESTIÁRIO 8 PORTAS | 1040.00 | 204.11 | 11 | v3 /gera-cotacao | 200 | SIM |
| 50 | Pelotas | 14 | GÔNDOLA CANALETADA | 490.00 | 183.59 | 11 | v3 /gera-cotacao | 200 | SIM |
| 51 | Santa Maria | 1 | BALCÃO CAIXINHA | 449.00 | 100.74 | 5 | fallback /CotacaoFrete | 200 | SIM |
| 52 | Santa Maria | 2 | BALCÃO CAIXA COM VITRINE (BRANCO) | 875.00 | 185.06 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 53 | Santa Maria | 3 | BALCÃO VITRINE | 800.00 | 152.85 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 54 | Santa Maria | 4 | BALCÃO CAIXA | 815.00 | 164.51 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 55 | Santa Maria | 5 | ARMÁRIO COLMEIA | 699.00 | 228.27 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 56 | Santa Maria | 10 | GÔNDOLA 8 CANTOS | 899.00 | 164.07 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 57 | Santa Maria | 11 | GÔNDOLA CENTRAL | 990.00 | 235.28 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 58 | Santa Maria | 12 | MÓVEL PARA VITRINE | 1590.00 | 242.54 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 59 | Santa Maria | 13 | ARMÁRIO VESTIÁRIO 8 PORTAS | 1040.00 | 166.61 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 60 | Santa Maria | 14 | GÔNDOLA CANALETADA | 490.00 | 146.09 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 61 | Novo Hamburgo | 1 | BALCÃO CAIXINHA | 449.00 | 115.74 | 7 | v3 /gera-cotacao | 200 | SIM |
| 62 | Novo Hamburgo | 2 | BALCÃO CAIXA COM VITRINE (BRANCO) | 875.00 | 200.06 | 8 | v3 /gera-cotacao | 200 | SIM |
| 63 | Novo Hamburgo | 3 | BALCÃO VITRINE | 800.00 | 167.85 | 8 | v3 /gera-cotacao | 200 | SIM |
| 64 | Novo Hamburgo | 4 | BALCÃO CAIXA | 815.00 | 179.51 | 8 | v3 /gera-cotacao | 200 | SIM |
| 65 | Novo Hamburgo | 5 | ARMÁRIO COLMEIA | 699.00 | 243.27 | 8 | v3 /gera-cotacao | 200 | SIM |
| 66 | Novo Hamburgo | 10 | GÔNDOLA 8 CANTOS | 899.00 | 179.07 | 8 | v3 /gera-cotacao | 200 | SIM |
| 67 | Novo Hamburgo | 11 | GÔNDOLA CENTRAL | 990.00 | 250.28 | 8 | v3 /gera-cotacao | 200 | SIM |
| 68 | Novo Hamburgo | 12 | MÓVEL PARA VITRINE | 1590.00 | 257.54 | 8 | v3 /gera-cotacao | 200 | SIM |
| 69 | Novo Hamburgo | 13 | ARMÁRIO VESTIÁRIO 8 PORTAS | 1040.00 | 181.61 | 8 | v3 /gera-cotacao | 200 | SIM |
| 70 | Novo Hamburgo | 14 | GÔNDOLA CANALETADA | 490.00 | 161.09 | 8 | v3 /gera-cotacao | 200 | SIM |
| 71 | São Leopoldo | 1 | BALCÃO CAIXINHA | 449.00 | 108.24 | 6 | fallback /CotacaoFrete | 200 | SIM |
| 72 | São Leopoldo | 2 | BALCÃO CAIXA COM VITRINE (BRANCO) | 875.00 | 192.56 | 7 | fallback /CotacaoFrete | 200 | SIM |
| 73 | São Leopoldo | 3 | BALCÃO VITRINE | 800.00 | 160.35 | 7 | fallback /CotacaoFrete | 200 | SIM |
| 74 | São Leopoldo | 4 | BALCÃO CAIXA | 815.00 | 172.01 | 7 | fallback /CotacaoFrete | 200 | SIM |
| 75 | São Leopoldo | 5 | ARMÁRIO COLMEIA | 699.00 | 235.77 | 7 | fallback /CotacaoFrete | 200 | SIM |
| 76 | São Leopoldo | 10 | GÔNDOLA 8 CANTOS | 899.00 | 171.57 | 7 | fallback /CotacaoFrete | 200 | SIM |
| 77 | São Leopoldo | 11 | GÔNDOLA CENTRAL | 990.00 | 242.78 | 7 | fallback /CotacaoFrete | 200 | SIM |
| 78 | São Leopoldo | 12 | MÓVEL PARA VITRINE | 1590.00 | 250.04 | 7 | fallback /CotacaoFrete | 200 | SIM |
| 79 | São Leopoldo | 13 | ARMÁRIO VESTIÁRIO 8 PORTAS | 1040.00 | 174.11 | 7 | fallback /CotacaoFrete | 200 | SIM |
| 80 | São Leopoldo | 14 | GÔNDOLA CANALETADA | 490.00 | 153.59 | 7 | fallback /CotacaoFrete | 200 | SIM |
| 81 | Rio Grande | 1 | BALCÃO CAIXINHA | 449.00 | 93.24 | 4 | v3 /gera-cotacao | 200 | SIM |
| 82 | Rio Grande | 2 | BALCÃO CAIXA COM VITRINE (BRANCO) | 875.00 | 177.56 | 5 | v3 /gera-cotacao | 200 | SIM |
| 83 | Rio Grande | 3 | BALCÃO VITRINE | 800.00 | 145.35 | 5 | v3 /gera-cotacao | 200 | SIM |
| 84 | Rio Grande | 4 | BALCÃO CAIXA | 815.00 | 157.01 | 5 | v3 /gera-cotacao | 200 | SIM |
| 85 | Rio Grande | 5 | ARMÁRIO COLMEIA | 699.00 | 220.77 | 5 | v3 /gera-cotacao | 200 | SIM |
| 86 | Rio Grande | 10 | GÔNDOLA 8 CANTOS | 899.00 | 156.57 | 5 | v3 /gera-cotacao | 200 | SIM |
| 87 | Rio Grande | 11 | GÔNDOLA CENTRAL | 990.00 | 227.78 | 5 | v3 /gera-cotacao | 200 | SIM |
| 88 | Rio Grande | 12 | MÓVEL PARA VITRINE | 1590.00 | 235.04 | 5 | v3 /gera-cotacao | 200 | SIM |
| 89 | Rio Grande | 13 | ARMÁRIO VESTIÁRIO 8 PORTAS | 1040.00 | 159.11 | 5 | v3 /gera-cotacao | 200 | SIM |
| 90 | Rio Grande | 14 | GÔNDOLA CANALETADA | 490.00 | 138.59 | 5 | v3 /gera-cotacao | 200 | SIM |
| 91 | Gravataí | 1 | BALCÃO CAIXINHA | 449.00 | 145.74 | 11 | fallback /CotacaoFrete | 200 | SIM |
| 92 | Gravataí | 2 | BALCÃO CAIXA COM VITRINE (BRANCO) | 875.00 | 230.06 | 12 | fallback /CotacaoFrete | 200 | SIM |
| 93 | Gravataí | 3 | BALCÃO VITRINE | 800.00 | 197.85 | 12 | fallback /CotacaoFrete | 200 | SIM |
| 94 | Gravataí | 4 | BALCÃO CAIXA | 815.00 | 209.51 | 12 | fallback /CotacaoFrete | 200 | SIM |
| 95 | Gravataí | 5 | ARMÁRIO COLMEIA | 699.00 | 273.27 | 12 | fallback /CotacaoFrete | 200 | SIM |
| 96 | Gravataí | 10 | GÔNDOLA 8 CANTOS | 899.00 | 209.07 | 12 | fallback /CotacaoFrete | 200 | SIM |
| 97 | Gravataí | 11 | GÔNDOLA CENTRAL | 990.00 | 280.28 | 12 | fallback /CotacaoFrete | 200 | SIM |
| 98 | Gravataí | 12 | MÓVEL PARA VITRINE | 1590.00 | 287.54 | 12 | fallback /CotacaoFrete | 200 | SIM |
| 99 | Gravataí | 13 | ARMÁRIO VESTIÁRIO 8 PORTAS | 1040.00 | 211.61 | 12 | fallback /CotacaoFrete | 200 | SIM |
| 100 | Gravataí | 14 | GÔNDOLA CANALETADA | 490.00 | 191.09 | 12 | fallback /CotacaoFrete | 200 | SIM |

## Casos extras de erro

- Payload inválido: HTTP 400 | resposta: {"sucesso":false,"erro":"Payload inválido para cálculo de frete."}
- Método inválido (GET): HTTP 405 | resposta: {"sucesso":false,"erro":"Método não permitido"}
