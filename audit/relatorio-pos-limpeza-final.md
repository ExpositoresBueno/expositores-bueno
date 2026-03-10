# Relatório final de limpeza segura

## Resumo executivo
- Peso total do projeto antes: **161,321,673 bytes**
- Peso total do projeto depois: **120,420,317 bytes**
- Redução total: **40,901,356 bytes** (25.35%)
- Total de imagens removidas: **51**
- Total de imagens otimizadas/comprimidas: **0** (limitação do ambiente: sem ferramentas de compressão disponíveis)
- Total de arquivos removidos: **55**

## Arquivos removidos
- `images/COLMEIA (1).jpg`
- `images/COLMEIA (2).jpg`
- `images/COLMEIA (3).jpg`
- `images/cards/L180X120 (1).jpg`
- `images/cards/L180X120 (2).jpg`
- `images/cards/movelComPrateleiras.jpg`
- `images/gretangular (1).jpg`
- `images/kit60cm (3).jpeg`
- `images/lojasprontas (19).jpg`
- `images/manicuregaveta (2).jpeg`
- `images/mesamanicure (3).jpeg`
- `images/nicholat (3).jpeg`
- `images/12pvideo.MOV`
- `images/1497935_812234728829379_1942307210815463631_o.jpg`
- `images/3moveis1299.mp4`
- `images/8cantos (2).jpeg`
- `images/V-colmeiaaparador.mp4`
- `images/WhatsApp Image 2026-03-07 at 09.41.15 (1).jpeg`
- `images/WhatsApp Image 2026-03-07 at 09.41.23 (1).jpeg`
- `images/WhatsApp Image 2026-03-07 at 09.41.24 (1).jpeg`
- `images/WhatsApp Image 2026-03-07 at 09.41.24.jpeg`
- `images/WhatsApp Video 2026-03-07 at 09.41.04.mp4`
- `images/WhatsApp Video 2026-03-07 at 09.41.10.mp4`
- `images/araraMDFColmeia.png`
- `images/armarioColmeia.png`
- `images/balcaoCaixa.png`
- `images/balcaoCaixaRodape.png`
- `images/balcaoCaixaVitrine.png`
- `images/balcaoPrateleiras.png`
- `images/balcaoVitrine.png`
- `images/boxArrow.png`
- `images/cards/araraMDF.jpg`
- `images/cards/balcaoCaixaComVitrinePreto.jpg`
- `images/cards/kitNichos.jpg`
- `images/cards/movelPrateleiras`
- `images/carrinho (2).jpeg`
- `images/carrinho.png`
- `images/cartLogo.png`
- `images/client_area.png`
- `images/colmeia-1.jpg`
- `images/colmeia-2.jpg`
- `images/colmeia-3.jpg`
- `images/gondolapaine (1).jpeg`
- `images/gondoval (2).jpeg`
- `images/header_logo.png`
- `images/home.png`
- `images/quadradaMad (1).jpeg`
- `images/quadradaMad (3).jpeg`
- `images/videobalcao.mp4`
- `images/vitmad (2).jpeg`
- `images/whatsappContact.png`
- `fonts/Inter/Inter-Regular.woff2`
- `fonts/Inter/InterDisplay-Black.woff2`
- `fonts/Inter/InterDisplay-Bold.woff2`
- `fonts/Inter/InterDisplay-Medium.woff2`

## Comparativo de performance final (ANTES vs FINAL)
| Página | Load antes (ms) | Load final (ms) | Δ load | Requests antes | Requests final | Δ requests | JS final |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/index.html` | 1588.4 | 1553.9 | -34.5 | 17 | 17 | +0 | 24,618 B |
| `/pages/about.html` | 251.5 | 240.6 | -10.9 | 10 | 10 | +0 | 0 B |
| `/pages/avaliacoes.html` | 226.9 | 210.3 | -16.6 | 10 | 10 | +0 | 0 B |
| `/pages/checkout.html` | 115.2 | 97.3 | -17.9 | 2 | 2 | +0 | 9,597 B |
| `/pages/instalacoes.html` | 1346.5 | 1268.9 | -77.6 | 26 | 21 | -5 | 4,581 B |
| `/pages/orcamentos.html` | 89.9 | 73.4 | -16.5 | 3 | 3 | +0 | 3,190 B |
| `/pages/productDetails.html` | 229.3 | 224.3 | -5.0 | 10 | 10 | +0 | 19,983 B |
| `/pages/projetos3D.html` | 280.2 | 295.4 | +15.2 | 21 | 21 | +0 | 4,504 B |

## Observações
- Não foram removidas páginas HTML.
- Não foram removidos scripts usados em páginas.
- Limpeza focada em duplicatas reais por hash e assets sem referência textual/dinâmica mapeada.