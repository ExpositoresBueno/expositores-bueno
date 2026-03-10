/* ==========================================================================
   LÓGICA DE DETALHES DO PRODUTO (CORRIGIDO)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  const extensoesVideo = ['.mp4', '.webm', '.ogg', '.mov'];

  const normalizarItemGaleria = (item, fallbackAlt) => {
    if (!item) return null;

    if (typeof item === 'string') {
      return {
        src: item,
        tipo: null,
        alt: fallbackAlt,
      };
    }

    if (typeof item === 'object' && item.src) {
      return {
        src: item.src,
        tipo: item.tipo || null,
        alt: item.alt || fallbackAlt,
      };
    }

    return null;
  };


  const obterLarguraEmMetros = (textoDimensoes = '') => {
    const texto = String(textoDimensoes).toLowerCase().replace(/,/g, '.');

    const patterns = [
      /x\s*([\d.]+)\s*(m|cm)\s*largura/i,
      /([\d.]+)\s*(m|cm)\s*largura/i,
      /x\s*([\d.]+)\s*(m|cm)\s*parte\s*do\s*l/i,
      /([\d.]+)\s*(m|cm)\s*parte\s*do\s*l/i,
    ];

    for (const regex of patterns) {
      const match = texto.match(regex);
      if (!match) continue;

      const valor = parseFloat(match[1]);
      const unidade = (match[2] || '').toLowerCase();

      if (!Number.isFinite(valor) || valor <= 0) continue;
      return unidade === 'cm' ? valor / 100 : valor;
    }

    return null;
  };

  const formatarMoeda = (valor) => valor.toFixed(2).replace('.', ',');

  const formatarMetros = (valor) => Number(valor).toFixed(2).replace('.', ',');

  const multiplicadoresCor = {
    branco: 1,
    preto: 1.3,
    madeirado: 1.35,
  };

  const nomeCor = {
    branco: 'Branco',
    preto: 'Preto',
    madeirado: 'Madeirado',
  };

  const opcaoAtiva = (valor) => String(valor ?? 'sim').toLowerCase() !== 'nao';

  const detectarTipoMidia = (item) => {
    if (item.tipo === 'video') return 'video';
    if (item.tipo === 'imagem') return 'imagem';

    const srcLimpo = item.src.split('?')[0].toLowerCase();
    return extensoesVideo.some((ext) => srcLimpo.endsWith(ext)) ? 'video' : 'imagem';
  };
  
  // 1. Extrai o ID do produto da URL (ex: ?id=1)
  const urlParams = new URLSearchParams(window.location.search);
  const produtoId = urlParams.get('id');

  // Se não houver ID, exibe mensagem de erro
  if (!produtoId) {
    const titleElement = document.getElementById('product-title');
    if (titleElement) titleElement.innerText = "Nenhum produto selecionado.";
    return;
  }

  try {
    // 2. Busca o banco de dados de produtos
    const resposta = await fetch('../dados/produtos.json');
    if (!resposta.ok) throw new Error('Falha ao carregar o banco de dados.');

    const produtos = await resposta.json();

    // 3. Procura o produto correspondente ao ID
    const produtoSelecionado = produtos.find(p => p.id === parseInt(produtoId));

    // 4. Se o produto existir, preenche a página e configura o botão
    if (produtoSelecionado) {
      
      // Injeta Nome, Preço e Descrição
      document.getElementById('product-title').innerText = produtoSelecionado.nome;
      document.getElementById('product-desc').innerText = produtoSelecionado.descricao || "Descrição não disponível.";

      const priceElement = document.getElementById('product-price');
      const colorSection = document.getElementById('color-selector');
      const budgetSection = document.getElementById('budget-calculator');
      const colorInputs = document.querySelectorAll('input[name="product-color"]');
      const permiteVariacaoCor = opcaoAtiva(produtoSelecionado.permiteVariacaoCor);
      const permiteOrcamentoMedida = opcaoAtiva(produtoSelecionado.permiteOrcamentoMedida);
      let corSelecionada = 'branco';

      const obterMultiplicadorCor = () => {
        if (!permiteVariacaoCor) return 1;
        return multiplicadoresCor[corSelecionada] || 1;
      };
      const calcularPrecoComCor = (precoBranco) => Number(precoBranco) * obterMultiplicadorCor();

      const atualizarPrecoPrincipal = () => {
        if (!priceElement) return;
        const precoComCor = calcularPrecoComCor(produtoSelecionado.preco);
        priceElement.innerText = formatarMoeda(precoComCor);
      };

      atualizarPrecoPrincipal();

      // Monta galeria horizontal (com arraste e botões)
      const galleryTrack = document.getElementById('product-gallery-track');
      const btnPrev = document.getElementById('gallery-prev');
      const btnNext = document.getElementById('gallery-next');

      const itensGaleria = [produtoSelecionado.img, ...(produtoSelecionado.galeria || [])]
        .map((item, index) => normalizarItemGaleria(item, `${produtoSelecionado.nome} - mídia ${index + 1}`))
        .filter(Boolean)
        .map((item) => ({
          ...item,
          src: item.src.replace('./', '../'),
          tipoMidia: detectarTipoMidia(item),
        }));

      if (galleryTrack && itensGaleria.length > 0) {
        const midiasUnicas = [];
        const sources = new Set();

        itensGaleria.forEach((item) => {
          if (sources.has(item.src)) return;
          sources.add(item.src);
          midiasUnicas.push(item);
        });

        galleryTrack.innerHTML = midiasUnicas
          .map((item, index) => `
            <div class="product-gallery-slide">
              <div class="product-gallery-media">
                ${item.tipoMidia === 'video'
                  ? `<video controls preload="metadata" playsinline>
                       <source src="${item.src}" type="video/mp4">
                       Seu navegador não suporta vídeo.
                     </video>`
                  : `<img src="${item.src}" alt="${item.alt || `${produtoSelecionado.nome} - foto ${index + 1}`}" loading="lazy">`
                }
              </div>
            </div>
          `)
          .join('');

        let slideAtual = 0;
        const totalSlides = midiasUnicas.length;

        const atualizarControles = () => {
          if (btnPrev) btnPrev.disabled = slideAtual === 0;
          if (btnNext) btnNext.disabled = slideAtual === totalSlides - 1;
        };

        const irParaSlide = (indice) => {
          const slides = galleryTrack.querySelectorAll('.product-gallery-slide');
          if (!slides[indice]) return;

          slideAtual = indice;
          galleryTrack.scrollTo({
            left: slides[indice].offsetLeft,
            behavior: 'smooth'
          });
          atualizarControles();
        };

        if (btnPrev) {
          btnPrev.addEventListener('click', () => {
            if (slideAtual > 0) irParaSlide(slideAtual - 1);
          });
        }

        if (btnNext) {
          btnNext.addEventListener('click', () => {
            if (slideAtual < totalSlides - 1) irParaSlide(slideAtual + 1);
          });
        }

        galleryTrack.addEventListener('scroll', () => {
          const larguraSlide = galleryTrack.clientWidth;
          if (!larguraSlide) return;
          const novoIndice = Math.round(galleryTrack.scrollLeft / larguraSlide);
          if (novoIndice !== slideAtual) {
            slideAtual = novoIndice;
            atualizarControles();
          }
        }, { passive: true });

        atualizarControles();
      }

      // Calculadora de orçamento por largura
      const btnCalcular = document.getElementById('calculate-budget-btn');
      const inputLargura = document.getElementById('desired-width');
      const resultadoOrcamento = document.getElementById('budget-result');
      const larguraBase = obterLarguraEmMetros(produtoSelecionado.dimensoes);

      if (budgetSection && btnCalcular && inputLargura && resultadoOrcamento) {
        if (!larguraBase || !permiteOrcamentoMedida) {
          budgetSection.style.display = 'none';
        } else {
          const precoBaseBranco = Number(produtoSelecionado.preco);

          const calcularValor = () => {
            const larguraDesejada = parseFloat(String(inputLargura.value).replace(',', '.'));

            if (!Number.isFinite(larguraDesejada) || larguraDesejada <= 0) {
              resultadoOrcamento.innerText = 'Informe uma largura válida maior que zero.';
              resultadoOrcamento.classList.add('error');
              return;
            }

            const valorPorMetro = precoBaseBranco / larguraBase;
            const valorBrancoMedida = valorPorMetro * larguraDesejada;
            const valorFinal = calcularPrecoComCor(valorBrancoMedida);

            resultadoOrcamento.classList.remove('error');
            resultadoOrcamento.innerText = `Valor estimado para ${formatarMetros(larguraDesejada)}m (${nomeCor[corSelecionada]}): R$ ${formatarMoeda(valorFinal)}. Este valor será usado ao adicionar no carrinho.`;
          };

          btnCalcular.addEventListener('click', calcularValor);
          inputLargura.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              calcularValor();
            }
          });

          if (permiteVariacaoCor && colorInputs.length > 0) {
            colorInputs.forEach((input) => {
              input.addEventListener('change', () => {
                corSelecionada = input.value;
                atualizarPrecoPrincipal();
                if (inputLargura.value) calcularValor();
              });
            });
          }
        }
      }

      if (permiteVariacaoCor && colorInputs.length > 0 && (!budgetSection || !larguraBase || !permiteOrcamentoMedida)) {
        colorInputs.forEach((input) => {
          input.addEventListener('change', () => {
            corSelecionada = input.value;
            atualizarPrecoPrincipal();
          });
        });
      }

      if (!permiteVariacaoCor && colorSection) {
        colorSection.style.display = 'none';
      }

      // Ajusta a categoria no badge
      const catElement = document.getElementById('product-category');
      if (catElement) {
        const cat = Array.isArray(produtoSelecionado.categoria) ? produtoSelecionado.categoria[0] : produtoSelecionado.categoria;
        catElement.innerText = cat.toUpperCase();
      }

      // Atualiza o Breadcrumb e o Título da Aba
      const breadcrumb = document.querySelector('.breadcrumb-current');
      if (breadcrumb) breadcrumb.innerText = produtoSelecionado.nome;
      document.title = `Expositores Bueno | ${produtoSelecionado.nome}`;

      const montarProdutoParaCarrinho = () => {
        const corNome = permiteVariacaoCor ? (nomeCor[corSelecionada] || 'Branco') : 'Branco';
        const corKey = permiteVariacaoCor ? (corSelecionada || 'branco') : 'branco';

        if (!larguraBase || !permiteOrcamentoMedida) {
          const precoSemMedida = calcularPrecoComCor(produtoSelecionado.preco);
          return {
            ...produtoSelecionado,
            preco: Number(precoSemMedida.toFixed(2)),
            ...(permiteVariacaoCor ? { corOrcada: corNome } : {}),
            cartKey: `${produtoSelecionado.id}-${corKey}`,
            nome: permiteVariacaoCor ? `${produtoSelecionado.nome} (${corNome})` : produtoSelecionado.nome
          };
        }

        const larguraDigitada = parseFloat(String(inputLargura?.value || '').replace(',', '.'));

        if (!Number.isFinite(larguraDigitada) || larguraDigitada <= 0) {
          const precoSemMedida = calcularPrecoComCor(produtoSelecionado.preco);
          return {
            ...produtoSelecionado,
            preco: Number(precoSemMedida.toFixed(2)),
            ...(permiteVariacaoCor ? { corOrcada: corNome } : {}),
            cartKey: `${produtoSelecionado.id}-${corKey}`,
            nome: permiteVariacaoCor ? `${produtoSelecionado.nome} (${corNome})` : produtoSelecionado.nome
          };
        }

        const valorPorMetro = Number(produtoSelecionado.preco) / larguraBase;
        const valorBranco = valorPorMetro * larguraDigitada;
        const valorFinal = calcularPrecoComCor(valorBranco);
        const larguraFormatada = formatarMetros(larguraDigitada);

        return {
          ...produtoSelecionado,
          preco: Number(valorFinal.toFixed(2)),
          larguraOrcada: Number(larguraDigitada.toFixed(2)),
          ...(permiteVariacaoCor ? { corOrcada: corNome } : {}),
          cartKey: `${produtoSelecionado.id}-${Number(larguraDigitada).toFixed(2)}-${corKey}`,
          nome: permiteVariacaoCor ? `${produtoSelecionado.nome} (${larguraFormatada}m - ${corNome})` : `${produtoSelecionado.nome} (${larguraFormatada}m)`
        };
      };

      /* ==========================================================================
         LÓGICA DO BOTÃO "ADICIONAR AO CARRINHO"
         ========================================================================== */
      const btnAddToCart = document.getElementById('add-to-cart-btn');
      const inputQuantidade = document.getElementById('quantity-input');

      if (inputQuantidade) {
        inputQuantidade.addEventListener('input', () => {
          const valor = parseInt(inputQuantidade.value, 10);
          inputQuantidade.value = Number.isNaN(valor) || valor < 1 ? '1' : String(valor);
        });
      }

      if (btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
          // Chama as funções globais definidas no index.js
          if (typeof window.addToCart === 'function') {
            const quantidade = inputQuantidade
              ? Math.max(1, parseInt(inputQuantidade.value, 10) || 1)
              : 1;

            const produtoParaCarrinho = {
              ...montarProdutoParaCarrinho(),
              quantidade,
            };

            window.addToCart(produtoParaCarrinho);
            
            // Abre visualmente a gaveta do carrinho lateral
            const drawer = document.getElementById('cart-drawer');
            const overlay = document.getElementById('cart-overlay');
            if (drawer && overlay) {
              drawer.classList.add('active');
              overlay.classList.add('active');
              window.renderizarCarrinho(); // Atualiza a lista de itens no HTML
            }
          } else {
            console.error("Erro: A função addToCart não foi encontrada no escopo global.");
          }
        });
      }

    } else {
      // Caso o ID na URL não exista no JSON
      document.getElementById('product-title').innerText = "Produto não encontrado.";
      const imgSection = document.querySelector('.product-image-section');
      if (imgSection) imgSection.style.display = 'none';
    }

  } catch (erro) {
    console.error("Erro ao carregar detalhes do produto:", erro);
    const titleElement = document.getElementById('product-title');
    if (titleElement) titleElement.innerText = "Erro ao carregar informações.";
  }
});
