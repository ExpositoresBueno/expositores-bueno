# Auditoria técnica completa — pré-limpeza

## ETAPA 1 — Backup completo (concluído)
- Backup integral criado em: `/workspace/backups/expositores-bueno-backup-20260310-222121.tar.gz`.
- Integridade validada com listagem do `tar`.
- Nenhum arquivo do projeto foi alterado antes da criação do backup.

## ETAPA 2 — Diagnóstico de performance

### 2.1 Lighthouse audit
- **Não foi possível executar o Lighthouse** no ambiente atual: `npx lighthouse` falhou com `403 Forbidden` ao acessar o registro npm (bloqueio de rede/política).
- Como contingência, foi feita medição por Web Performance API via Playwright (browser container), cobrindo todas as páginas HTML.

### 2.2 Performance report (Web Performance API)
| Página | Load (ms) | Recursos | Transferência total |
|---|---:|---:|---:|
| `/index.html` | 1588.4 | 17 | 1,542,344 B |
| `/pages/about.html` | 251.5 | 10 | 26,184 B |
| `/pages/avaliacoes.html` | 226.9 | 10 | 2,447 B |
| `/pages/checkout.html` | 115.2 | 2 | 11,845 B |
| `/pages/instalacoes.html` | 1346.5 | 26 | 1,451,126 B |
| `/pages/orcamentos.html` | 89.9 | 3 | 3,190 B |
| `/pages/productDetails.html` | 229.3 | 10 | 31,072 B |
| `/pages/projetos3D.html` | 280.2 | 21 | 1,778,873 B |

### 2.3 Scripts JS mais pesados
1. `scripts/index.js` — 24,318 B
2. `scripts/productDetails.js` — 19,683 B
3. `scripts/checkout.js` — 9,297 B

### 2.4 CSS potencialmente bloqueante de renderização
- `styles/index.css` — 42,092 B (carregado no `<head>` em múltiplas páginas).
- CSS externo Font Awesome (CDN) também é bloqueante no carregamento inicial.

### 2.5 Imagens e mídias pesadas
- Muito pesado: `images/12pvideo.MOV` (24,777,606 B)
- Muito pesado: `images/kit2600.mp4` (7,283,407 B)
- Muito pesado: `images/3balcoes1499.mp4` (5,268,645 B)
- Muito pesado: `images/3moveis1299.mp4` (4,972,038 B)
- Muito pesado: `images/lojasprontas (20).jpeg` (1,207,632 B)

### 2.6 Recursos duplicados (checksum idêntico)
Foram detectados **12 grupos de imagens duplicadas**, por exemplo:
- `images/nicholat (2).jpeg` == `images/nicholat (3).jpeg`
- `images/RETANGULAR (2).jpg` == `images/gretangular (1).jpg`
- `images/COLMEIA (1).jpg` == `images/colmeia-1.jpg`
- `images/L180X120 (2).jpg` == `images/cards/L180X120 (2).jpg`

### 2.7 Recursos carregados mas não utilizados
- Varredura estática por referência textual apontou **103 assets potencialmente não referenciados** (necessário validar caso a caso, pois há carregamento dinâmico).

### 2.8 Erros de console / requisições quebradas / imagens que não carregam
- Página `instalacoes.html` apresentou **5 erros de console** (404 de recursos) e **50 imagens quebradas** (principalmente `.webp` ausentes para `lojasprontas (9..58).webp`, com fallback parcial para `.jpg/.jpeg`).
- Nas demais páginas auditadas, não houve erros de console nem request failed no cenário analisado.

---

## ETAPA 3 — Auditoria de código do projeto

### 3.1 Arquivos não utilizados (potenciais)
- `audit/unused-assets-by-reference.txt` lista 103 arquivos possivelmente sem referência direta.
- Scripts e CSS principais parecem todos referenciados em HTML (0 JS/CSS totalmente órfãos na checagem simples).

### 3.2 Imagens duplicadas
- 12 grupos de duplicidade por hash, com alto potencial de limpeza sem impacto funcional se referências forem unificadas.

### 3.3 Imagens muito pesadas
- Há múltiplos vídeos > 1 MB e imagens JPEG acima de 300 KB que impactam tempo de carregamento.

### 3.4 CSS não utilizado (aproximação)
- Detecção heurística aponta alto volume de seletores possivelmente não usados, especialmente em `styles/index.css`.
- Recomendado validar com cobertura real no navegador antes de remoção.

### 3.5 Imports mortos / rotas não utilizadas / dependências
- Projeto não possui `package.json`; não há dependências npm locais para desinstalação nesta etapa.
- Não foram identificadas rotas HTML quebradas localmente na validação de caminhos relativos/absolutos.

### 3.6 Organização de pastas e gargalos
- Pasta `images/` contém muitos arquivos com nomenclatura inconsistente (`(1)`, `(2)`, maiúsculas/minúsculas misturadas) e extensões variantes para mesmo conteúdo, dificultando manutenção.
- Gargalos de performance principais: peso de mídia, possíveis downloads redundantes, e CSS global volumoso.

---

## ETAPA 4 — Relatório antes da limpeza (sem remoções)

### 1) Arquivos que podem ser removidos (candidatos)
- Duplicados de imagem validados por hash (12 grupos) — manter somente 1 referência canônica por grupo.
- Assets listados como potencialmente não referenciados (103 itens), após validação manual dos usos dinâmicos.

### 2) Arquivos que podem ser otimizados
- Vídeos e JPEGs grandes (lista em `audit/heavy-images.txt`).
- `styles/index.css` (redução de regras não utilizadas e quebra por página).

### 3) Imagens que podem ser comprimidas
- Prioridade: arquivos acima de 300 KB e vídeos acima de 1 MB.

### 4) Scripts que podem ser removidos
- Não há JS totalmente órfão identificado; primeiro passo é identificar funções/blocos não usados internamente.

### 5) CSS que pode ser reduzido
- `styles/index.css` é o principal candidato.
- Também há redução possível em `styles/productDetail.css`, `styles/instalacoes.css`, `styles/projetos3D.css`.

### 6) Dependências que podem ser desinstaladas
- Não aplicável (sem `package.json`).

### 7) Possíveis erros encontrados no projeto
- 404 recorrentes na página de instalações para imagens `.webp` inexistentes.
- Volume elevado de mídia, com impacto de performance.
- Duplicidade de assets e nomenclatura inconsistente.

## Status
✅ Auditoria e diagnóstico concluídos.
⏸️ **Nenhuma limpeza foi executada ainda**, aguardando sua confirmação para a ETAPA 5.
