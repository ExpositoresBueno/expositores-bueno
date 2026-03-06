/* ==========================================================================
   LÓGICA DE DETALHES DO PRODUTO (CORRIGIDO)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  
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
      
      // Ajusta o caminho da imagem (de ./ para ../)
      const imgElement = document.getElementById('main-product-img');
      if (imgElement) {
        imgElement.src = produtoSelecionado.img.replace('./', '../');
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