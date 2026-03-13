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


  const extrairMaiorValorNumerico = (trecho = '') => {
    const numeros = String(trecho)
      .split('/')
      .map((item) => parseFloat(item))
      .filter((item) => Number.isFinite(item) && item > 0);

    if (numeros.length === 0) return NaN;
    return Math.max(...numeros);
  const converterParaMetros = (valor, unidade = 'm') => {
    if (!Number.isFinite(valor) || valor <= 0) return null;

    const unidadeNormalizada = String(unidade || 'm').toLowerCase();
    if (unidadeNormalizada === 'mm') return valor / 1000;
    if (unidadeNormalizada === 'cm') return valor / 100;
    return valor;
  };

  const obterDimensaoEmMetros = (textoDimensoes = '', chaves = []) => {
    const texto = String(textoDimensoes).toLowerCase().replace(/,/g, '.');

    const patterns = chaves.flatMap((chave) => ([
      new RegExp(`x\\s*([\\d.]+)\\s*(m|cm|mm)\\s*${chave}`, 'i'),
      new RegExp(`([\\d.]+)\\s*(m|cm|mm)\\s*${chave}`, 'i'),
    ]));

    for (const regex of patterns) {
      const match = texto.match(regex);
      if (!match) continue;

      const valor = extrairMaiorValorNumerico(match[1]);
      const unidade = (match[2] || '').toLowerCase();

      const valorEmMetros = converterParaMetros(valor, unidade);
      if (!valorEmMetros) continue;
      return valorEmMetros;
    }

    return null;
  };

  const obterLarguraEmMetros = (textoDimensoes = '') => obterDimensaoEmMetros(textoDimensoes, ['largura', 'parte\\s*do\\s*l']);
  const obterAlturaEmMetros = (textoDimensoes = '') => obterDimensaoEmMetros(textoDimensoes, ['altura']);
  const obterProfundidadeEmMetros = (textoDimensoes = '') => obterDimensaoEmMetros(textoDimensoes, ['profundidade']);

  const formatadorMoedaBR = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatadorNumeroBR = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatarMoeda = (valor) => formatadorMoedaBR.format(Number(valor) || 0);

  const formatarNumero = (valor) => formatadorNumeroBR.format(Number(valor) || 0);

  const formatarMetros = (valor) => formatarNumero(valor);

  const obterLinkCompartilhamento = (idProduto) => {
    const urlAtual = new URL(window.location.href);
    if (idProduto) {
      urlAtual.searchParams.set('id', idProduto);
    }
    return urlAtual.toString();
  };

  const copiarTexto = async (texto) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = texto;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  };

  const calcularParcelamentoSemJuros = (valorTotal) => {
    const valor = Number(valorTotal);
    if (!Number.isFinite(valor) || valor <= 0) {
      return { parcelas: 1, valorParcela: 0 };
    }

    const parcelasMaximasPorValor = Math.floor(valor / 200);
    const parcelas = Math.min(12, Math.max(1, parcelasMaximasPorValor));
    const valorParcela = valor / parcelas;

    return { parcelas, valorParcela };
  };

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
      const installmentsValueElement = document.getElementById('installments-value');
      const installmentsPlanElement = document.getElementById('installments-plan');
      const inputQuantidade = document.getElementById('detail-quantity-input') || document.getElementById('quantity-input');
      const colorSection = document.getElementById('color-selector');
      const budgetSection = document.getElementById('budget-calculator');
      let valorAtualProduto = Number(produtoSelecionado.preco);
      const colorInputs = document.querySelectorAll('input[name="product-color"]');
      const permiteVariacaoCor = opcaoAtiva(produtoSelecionado.permiteVariacaoCor);
      const permiteOrcamentoMedida = opcaoAtiva(produtoSelecionado.permiteOrcamentoMedida);
      let corSelecionada = 'branco';

      const obterMultiplicadorCor = () => {
        if (!permiteVariacaoCor) return 1;
        return multiplicadoresCor[corSelecionada] || 1;
      };
      const calcularPrecoComCor = (precoBranco) => Number(precoBranco) * obterMultiplicadorCor();

      const obterQuantidadeAtual = () => {
        if (!inputQuantidade) return 1;
        return Math.max(1, parseInt(inputQuantidade.value, 10) || 1);
      };

      const atualizarParcelamento = (valorBase) => {
        if (!installmentsValueElement || !installmentsPlanElement) return;
        const { parcelas, valorParcela } = calcularParcelamentoSemJuros(valorBase);
        installmentsValueElement.innerText = `Valor ${formatarMoeda(Number(valorBase) || 0)}.`;
        installmentsPlanElement.innerText = `${parcelas}x de ${formatarMoeda(valorParcela)} sem juros`;
      };

      const atualizarPrecoExibicao = () => {
        if (!priceElement) return;
        const valorTotal = valorAtualProduto * obterQuantidadeAtual();
        priceElement.innerText = formatarNumero(valorTotal);
        atualizarParcelamento(valorTotal);
      };

      const atualizarPrecoPrincipal = () => {
        const precoComCor = calcularPrecoComCor(produtoSelecionado.preco);
        valorAtualProduto = precoComCor;
        atualizarPrecoExibicao();
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
                  ? `<video controls controlsList="nodownload nofullscreen noplaybackrate" disablePictureInPicture preload="metadata" playsinline oncontextmenu="return false;">
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

      // Calculadora de orçamento por medidas (largura, altura e profundidade)
      const btnCalcular = document.getElementById('calculate-budget-btn');
      const inputLargura = document.getElementById('desired-width');
      const inputAltura = document.getElementById('desired-height');
      const inputProfundidade = document.getElementById('desired-depth');
      const resultadoOrcamento = document.getElementById('budget-result');
      const botoesReset = document.querySelectorAll('[data-reset-dimension]');

      const dimensoesBase = {
        largura: obterLarguraEmMetros(produtoSelecionado.dimensoes),
        altura: obterAlturaEmMetros(produtoSelecionado.dimensoes),
        profundidade: obterProfundidadeEmMetros(produtoSelecionado.dimensoes),
      };

      const dimensoesConfig = [
        { chave: 'largura', nome: 'Largura', input: inputLargura, base: dimensoesBase.largura },
        { chave: 'altura', nome: 'Altura', input: inputAltura, base: dimensoesBase.altura },
        { chave: 'profundidade', nome: 'Profundidade', input: inputProfundidade, base: dimensoesBase.profundidade },
      ];

      const existeAlgumaBase = dimensoesConfig.some((dim) => Number.isFinite(dim.base) && dim.base > 0);

      const atualizarEstadoCamposMedidas = () => {
        dimensoesConfig.forEach((dim) => {
          const row = document.querySelector(`[data-dimension-row="${dim.chave}"]`);
          if (!dim.input || !row) return;

          const possuiBase = Number.isFinite(dim.base) && dim.base > 0;
          const botaoReset = row.querySelector('[data-reset-dimension]');

          if (!possuiBase) {
            row.classList.add('disabled');
            dim.input.disabled = true;
            dim.input.placeholder = 'Não disponível';
            if (botaoReset) botaoReset.disabled = true;
          } else {
            row.classList.remove('disabled');
            dim.input.disabled = false;
            dim.input.placeholder = `Padrão: ${formatarMetros(dim.base)}m`;
            if (botaoReset) botaoReset.disabled = false;
          }
        });
      };

      const obterValorMedidaDigitada = (valorTexto) => {
        const normalizado = String(valorTexto ?? '').trim().toLowerCase().replace(',', '.');
        if (!normalizado) return null;

        const match = normalizado.match(/^([\d.]+)\s*(mm|cm|m|milimetros?|milímetros?|centimetros?|centímetros?|metros?)?$/i);
        if (!match) return NaN;

        const valor = parseFloat(match[1]);
        if (!Number.isFinite(valor) || valor <= 0) return NaN;

        const unidadeInformada = (match[2] || 'm').toLowerCase();
        const unidade = unidadeInformada.startsWith('mil') ? 'mm' : unidadeInformada.startsWith('cent') ? 'cm' : unidadeInformada.startsWith('metro') ? 'm' : unidadeInformada;
        const valorEmMetros = converterParaMetros(valor, unidade);
        return valorEmMetros ?? NaN;
      };

      const todasMedidasNoPadrao = () => dimensoesConfig.every((dim) => {
        if (!Number.isFinite(dim.base) || dim.base <= 0) return true;
        const valorDigitado = obterValorMedidaDigitada(dim.input?.value);
        if (Number.isNaN(valorDigitado)) return false;
        if (valorDigitado === null) return true;
        return Math.abs(valorDigitado - dim.base) < 0.0001;
      });

      const calcularValor = () => {
        const precoBaseBranco = Number(produtoSelecionado.preco);
        let fatorMedidas = 1;
        const medidasAplicadas = [];

        for (const dim of dimensoesConfig) {
          if (!Number.isFinite(dim.base) || dim.base <= 0) continue;

          const valorDigitado = obterValorMedidaDigitada(dim.input?.value);
          if (Number.isNaN(valorDigitado)) {
            resultadoOrcamento.innerText = `Informe uma ${dim.chave} válida maior que zero.`;
            resultadoOrcamento.classList.add('error');
            valorAtualProduto = calcularPrecoComCor(produtoSelecionado.preco);
            atualizarPrecoExibicao();
            return;
          }

          const valorEfetivo = valorDigitado ?? dim.base;
          fatorMedidas *= (valorEfetivo / dim.base);
          medidasAplicadas.push(`${dim.nome}: ${formatarMetros(valorEfetivo)}m`);
        }

        const valorBrancoMedida = precoBaseBranco * fatorMedidas;
        const valorFinal = calcularPrecoComCor(valorBrancoMedida);

        resultadoOrcamento.classList.remove('error');
        if (todasMedidasNoPadrao()) {
          resultadoOrcamento.innerText = `Medidas no padrão (${nomeCor[corSelecionada]}): ${formatarMoeda(calcularPrecoComCor(precoBaseBranco))}.`;
          valorAtualProduto = calcularPrecoComCor(precoBaseBranco);
          atualizarPrecoExibicao();
          return;
        }

        resultadoOrcamento.innerText = `Valor estimado (${medidasAplicadas.join(' • ')}) (${nomeCor[corSelecionada]}): ${formatarMoeda(valorFinal)}. Este valor será usado ao adicionar no carrinho.`;
        valorAtualProduto = valorFinal;
        atualizarPrecoExibicao();
      };

      const calcularPrecoPorMedidas = () => {
        let fatorMedidas = 1;
        const medidasNome = [];
        const medidasOrcadas = {};

        for (const dim of dimensoesConfig) {
          if (!Number.isFinite(dim.base) || dim.base <= 0) continue;

          const valorDigitado = obterValorMedidaDigitada(dim.input?.value);
          if (Number.isNaN(valorDigitado)) {
            return { erro: `Informe uma ${dim.chave} válida maior que zero.` };
          }

          const valorEfetivo = Number.isFinite(valorDigitado) ? valorDigitado : dim.base;
          fatorMedidas *= (valorEfetivo / dim.base);
          medidasOrcadas[`${dim.chave}Orcada`] = Number(valorEfetivo.toFixed(2));
          medidasNome.push(`${dim.nome} ${formatarMetros(valorEfetivo)}m`);
        }

        const valorBranco = Number(produtoSelecionado.preco) * fatorMedidas;
        return {
          valorFinal: calcularPrecoComCor(valorBranco),
          medidasNome,
          medidasOrcadas,
        };
      };

      if (budgetSection && btnCalcular && inputLargura && inputAltura && inputProfundidade && resultadoOrcamento) {
        if (!permiteOrcamentoMedida || !existeAlgumaBase) {
          budgetSection.style.display = 'none';
        } else {
          atualizarEstadoCamposMedidas();

          btnCalcular.addEventListener('click', calcularValor);

          [inputLargura, inputAltura, inputProfundidade].forEach((input) => {
            input.addEventListener('keydown', (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                calcularValor();
              }
            });

            input.addEventListener('input', () => {
              if (todasMedidasNoPadrao()) {
                calcularValor();
              }
            });
          });

          botoesReset.forEach((botao) => {
            botao.addEventListener('click', () => {
              const chave = botao.dataset.resetDimension;
              const dim = dimensoesConfig.find((item) => item.chave === chave);
              if (!dim || !dim.input) return;
              dim.input.value = '';
              calcularValor();
            });
          });

          if (permiteVariacaoCor && colorInputs.length > 0) {
            colorInputs.forEach((input) => {
              input.addEventListener('change', () => {
                corSelecionada = input.value;
                atualizarPrecoPrincipal();
                calcularValor();
              });
            });
          }
        }
      }

      if (permiteVariacaoCor && colorInputs.length > 0 && (!budgetSection || !existeAlgumaBase || !permiteOrcamentoMedida)) {
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

      const btnShareToggle = document.getElementById('share-product-btn');
      const shareMenu = document.getElementById('share-inline-menu');
      const btnShareWhatsapp = document.getElementById('share-whatsapp-btn');
      const btnShareCopy = document.getElementById('share-copy-btn');
      const linkCompartilhamento = obterLinkCompartilhamento(produtoSelecionado.id);


      const fecharMenuCompartilhar = () => {
        if (!shareMenu) return;
        shareMenu.hidden = true;
      };

      if (btnShareToggle && shareMenu) {
        btnShareToggle.addEventListener('click', (event) => {
          event.stopPropagation();
          shareMenu.hidden = !shareMenu.hidden;
        });

        shareMenu.addEventListener('click', (event) => {
          event.stopPropagation();
        });

        document.addEventListener('click', fecharMenuCompartilhar);
      }

      if (btnShareWhatsapp) {
        btnShareWhatsapp.addEventListener('click', () => {
          const texto = `Olá! Confira este produto da Expositores Bueno: ${produtoSelecionado.nome} - ${linkCompartilhamento}`;
          const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(texto)}`;
          window.open(urlWhatsapp, '_blank', 'noopener,noreferrer');
          fecharMenuCompartilhar();
        });
      }

      if (btnShareCopy) {
        btnShareCopy.addEventListener('click', async () => {
          try {
            await copiarTexto(linkCompartilhamento);
            btnShareCopy.classList.add('copied');
            setTimeout(() => btnShareCopy.classList.remove('copied'), 800);
            fecharMenuCompartilhar();
          } catch (erroCopia) {
            console.error('Erro ao copiar link do produto:', erroCopia);
            btnShareCopy.classList.add('copy-error');
            setTimeout(() => btnShareCopy.classList.remove('copy-error'), 800);
          }
        });
      }

      const montarProdutoParaCarrinho = () => {
        const corNome = permiteVariacaoCor ? (nomeCor[corSelecionada] || 'Branco') : 'Branco';
        const corKey = permiteVariacaoCor ? (corSelecionada || 'branco') : 'branco';

        if (!existeAlgumaBase || !permiteOrcamentoMedida) {
          const precoSemMedida = calcularPrecoComCor(produtoSelecionado.preco);
          return {
            ...produtoSelecionado,
            preco: Number(precoSemMedida.toFixed(2)),
            ...(permiteVariacaoCor ? { corOrcada: corNome } : {}),
            cartKey: `${produtoSelecionado.id}-${corKey}`,
            nome: permiteVariacaoCor ? `${produtoSelecionado.nome} (${corNome})` : produtoSelecionado.nome
          };
        }

        const resultadoCalculo = calcularPrecoPorMedidas();
        if (resultadoCalculo.erro) {
          if (resultadoOrcamento) {
            resultadoOrcamento.innerText = resultadoCalculo.erro;
            resultadoOrcamento.classList.add('error');
          }
          return null;
        }

        const { valorFinal, medidasNome, medidasOrcadas } = resultadoCalculo;

        return {
          ...produtoSelecionado,
          preco: Number(valorFinal.toFixed(2)),
          ...medidasOrcadas,
          ...(permiteVariacaoCor ? { corOrcada: corNome } : {}),
          cartKey: `${produtoSelecionado.id}-${Object.values(medidasOrcadas).join('-')}-${corKey}`,
          nome: permiteVariacaoCor ? `${produtoSelecionado.nome} (${medidasNome.join(' | ')} - ${corNome})` : `${produtoSelecionado.nome} (${medidasNome.join(' | ')})`
        };
      };

      /* ==========================================================================
         LÓGICA DO BOTÃO "ADICIONAR AO CARRINHO"
         ========================================================================== */
      const btnAddToCart = document.getElementById('add-to-cart-btn');

      if (inputQuantidade) {
        inputQuantidade.addEventListener('input', () => {
          const valor = parseInt(inputQuantidade.value, 10);
          inputQuantidade.value = Number.isNaN(valor) || valor < 1 ? '1' : String(valor);
          atualizarPrecoExibicao();
        });
      }

      if (btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
          // Chama as funções globais definidas no index.js
          if (typeof window.addToCart === 'function') {
            const quantidade = inputQuantidade
              ? Math.max(1, parseInt(inputQuantidade.value, 10) || 1)
              : 1;

            const produtoBaseCarrinho = montarProdutoParaCarrinho();
            if (!produtoBaseCarrinho) return;

            const produtoParaCarrinho = {
              ...produtoBaseCarrinho,
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
