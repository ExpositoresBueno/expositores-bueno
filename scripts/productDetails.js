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
      document.getElementById('product-price').innerText = produtoSelecionado.preco.toFixed(2).replace('.', ',');
      document.getElementById('product-desc').innerText = produtoSelecionado.descricao || "Descrição não disponível.";
      
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

      /* ==========================================================================
         LÓGICA DO BOTÃO "ADICIONAR AO CARRINHO"
         ========================================================================== */
      const btnAddToCart = document.getElementById('add-to-cart-btn');
      if (btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
          // Chama as funções globais definidas no index.js
          if (typeof window.addToCart === 'function') {
            window.addToCart(produtoSelecionado);
            
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
