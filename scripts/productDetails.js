/* ==========================================================================
   LÓGICA DE DETALHES DO PRODUTO (CONSUMINDO JSON)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Lê a URL atual e extrai o ID (ex: productDetails.html?id=2)
  const urlParams = new URLSearchParams(window.location.search);
  const produtoId = urlParams.get('id');

  // Se não houver ID na URL, avisa o usuário e para o código
  if (!produtoId) {
    const titleElement = document.getElementById('product-title');
    if (titleElement) titleElement.innerText = 'Nenhum produto selecionado.';
    return;
  }

  try {
    // 2. Busca o arquivo JSON
    const resposta = await fetch('../dados/produtos.json');

    if (!resposta.ok) {
      throw new Error('Falha ao carregar o banco de dados de produtos.');
    }

    const produtos = await resposta.json();

    // 3. Procura o produto no array
    const produtoSelecionado = produtos.find((p) => p.id === parseInt(produtoId));

    // 4. Se encontrou o produto, injeta os dados no HTML
    if (produtoSelecionado) {
      const titleElement = document.getElementById('product-title');
      if (titleElement) titleElement.innerText = produtoSelecionado.nome;

      // Categoria
      const catElement = document.getElementById('product-category');
      if (catElement) {
        const categoriaParaMostrar = Array.isArray(produtoSelecionado.categoria)
          ? produtoSelecionado.categoria[0]
          : produtoSelecionado.categoria;

        catElement.innerText = categoriaParaMostrar.toUpperCase();
      }

      // Imagem principal
      const imgElement = document.getElementById('main-product-img');
      if (imgElement) {
        const imgCorrigida = produtoSelecionado.img.replace('./images/', '../images/');
        imgElement.src = imgCorrigida;
        imgElement.alt = produtoSelecionado.nome;
      }

      // Galeria de imagens extras
      const galleryElement = document.getElementById('product-gallery');
      if (galleryElement) {
        galleryElement.innerHTML = '';

        if (Array.isArray(produtoSelecionado.galeria) && produtoSelecionado.galeria.length > 0) {
          produtoSelecionado.galeria.forEach((imagem, index) => {
            const thumb = document.createElement('img');
            const imagemCorrigida = encodeURI(imagem.replace('./images/', '../images/'));

            thumb.src = imagemCorrigida;
            thumb.alt = `${produtoSelecionado.nome} - imagem ${index + 2}`;
            thumb.classList.add('gallery-thumb');

            thumb.addEventListener('click', () => {
              if (imgElement) {
                imgElement.src = imagemCorrigida;
              }
            });

            galleryElement.appendChild(thumb);
          });
        }
      }

      // Preço
      if (produtoSelecionado.preco) {
        const priceElement = document.getElementById('product-price');
        if (priceElement) {
          priceElement.innerText = produtoSelecionado.preco.toFixed(2).replace('.', ',');
        }
      }

      // Descrição
      const descElement = document.getElementById('product-desc');
      if (descElement) {
        descElement.innerText =
          produtoSelecionado.descricao || 'Descrição detalhada não disponível para este produto.';
      }

      // Breadcrumb
      const breadcrumbCurrent = document.querySelector('.breadcrumb-current');
      if (breadcrumbCurrent) {
        breadcrumbCurrent.innerText = produtoSelecionado.nome;
      }

      // Título da aba
      document.title = `Expositores Bueno | ${produtoSelecionado.nome}`;

      // WhatsApp
      const btnWhatsapp = document.getElementById('btn-whatsapp-product');
      if (btnWhatsapp) {
        const mensagem = `Olá! Gostaria de solicitar um orçamento para o produto: ${produtoSelecionado.nome}`;
        const mensagemCodificada = encodeURIComponent(mensagem);
        btnWhatsapp.href = `https://wa.me/5551996034579?text=${mensagemCodificada}`;
      }
    } else {
      // Se a URL tiver um ID que não existe no JSON
      const titleElement = document.getElementById('product-title');
      if (titleElement) titleElement.innerText = 'Produto não encontrado.';

      const imgElement = document.getElementById('main-product-img');
      if (imgElement) imgElement.style.display = 'none';
    }
  } catch (erro) {
    console.error('Erro ao carregar os detalhes do produto:', erro);
    const titleElement = document.getElementById('product-title');
    if (titleElement) titleElement.innerText = 'Erro ao carregar as informações.';
  }
});
