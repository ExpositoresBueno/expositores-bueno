# Comparativo de performance — antes vs depois

## Método
- Lighthouse: indisponível no ambiente (bloqueio de instalação).
- Métricas coletadas via Playwright + Performance API.

| Página | Load antes (ms) | Load depois (ms) | Δ load | Requests antes | Requests depois | Δ requests | JS (depois) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/index.html` | 1588.4 | 1404.2 | -184.2 | 17 | 17 | +0 | 24,618 B |
| `/pages/about.html` | 251.5 | 233.9 | -17.6 | 10 | 10 | +0 | 0 B |
| `/pages/avaliacoes.html` | 226.9 | 206.9 | -20.0 | 10 | 10 | +0 | 0 B |
| `/pages/checkout.html` | 115.2 | 94.1 | -21.1 | 2 | 2 | +0 | 9,597 B |
| `/pages/instalacoes.html` | 1346.5 | 1259.4 | -87.1 | 26 | 21 | -5 | 4,581 B |
| `/pages/orcamentos.html` | 89.9 | 66.7 | -23.2 | 3 | 3 | +0 | 3,190 B |
| `/pages/productDetails.html` | 229.3 | 196.0 | -33.3 | 10 | 10 | +0 | 19,983 B |
| `/pages/projetos3D.html` | 280.2 | 280.3 | +0.1 | 21 | 21 | +0 | 4,504 B |

## Destaques
- `pages/instalacoes.html`: erros de console 404 eliminados após ajuste de prioridade de extensões da galeria.
- Requests na página de instalações reduziram de 26 para 21 no cenário testado.
- Sem quebra funcional detectada na navegação principal e carregamento das páginas auditadas.