/* ==========================================================================
   1. CAROUSEL E MENU (MANTIDOS ORIGINAIS)
   ========================================================================== */
const images = document.querySelectorAll(".carousel-item");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
let currentIndex = 0;

function showImage(index) {
  if (images.length === 0) return;
  images[currentIndex].classList.remove("active");
  currentIndex = (index + images.length) % images.length;
  images[currentIndex].classList.add("active");
}

if (nextBtn && prevBtn) {
  nextBtn.addEventListener("click", () => showImage(currentIndex + 1));
  prevBtn.addEventListener("click", () => showImage(currentIndex - 1));
}

setInterval(() => {
  showImage(currentIndex + 1);
}, 5000);

document.querySelectorAll(".has-dropdown").forEach((menuPai) => {
  menuPai.addEventListener("mouseenter", function () {
    const dropdown = this.querySelector(".dropdown-menu");
    if (dropdown) {
      dropdown.style.display = "block";
      setTimeout(() => {
        dropdown.style.opacity = "1";
      }, 10);
    }
  });
  menuPai.addEventListener("mouseleave", function () {
    const dropdown = this.querySelector(".dropdown-menu");
    if (dropdown) {
      dropdown.style.display = "none";
      dropdown.style.opacity = "0";
    }
  });
});

/* ==========================================================================
   2. ESTADO GLOBAL E FILTROS (Lógica Restaurada)
   ========================================================================== */
let produtos = [];
let listaFiltrada = [];
let paginaAtual = 1;
const itensPorPagina = 6;
const grid = document.getElementById("products-grid");

const searchInput = document.getElementById("search-input");
const searchCategoryTop = document.getElementById("search-category");
const sizeSelect = document.getElementById("size-select");
const inputMin = document.getElementById("price-min");
const inputMax = document.getElementById("price-max");
const sortSelect = document.getElementById("sort-products");

function removerAcentos(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function aplicarFiltros(filtroManual = null) {
  const termo = searchInput ? removerAcentos(searchInput.value.trim()) : "";
  const filtroTopo =
    filtroManual || (searchCategoryTop ? searchCategoryTop.value : "Todos");
  const tamanho = sizeSelect ? sizeSelect.value : "";
  const min = parseFloat(inputMin ? inputMin.value : 0) || 0;
  const max = parseFloat(inputMax ? inputMax.value : Infinity) || Infinity;

  listaFiltrada = produtos.filter((p) => {
    const nomeLimpo = removerAcentos(p.nome);
    let matchesNomeOuTag = nomeLimpo.includes(termo);

    if (!matchesNomeOuTag && p.tags) {
      matchesNomeOuTag = p.tags.some((tag) =>
        removerAcentos(tag).includes(termo),
      );
    }

    const categoriasDoProduto = Array.isArray(p.categoria)
      ? p.categoria
      : [p.categoria];
    const matchesCatOuNome =
      filtroTopo === "Todos" ||
      categoriasDoProduto.includes(filtroTopo) ||
      p.nome === filtroTopo;
    const matchesTam = tamanho === "" || p.tamanho === tamanho;
    const matchesPreco = p.preco >= min && p.preco <= max;

    return matchesNomeOuTag && matchesCatOuNome && matchesTam && matchesPreco;
  });

  const criterio = sortSelect ? sortSelect.value : "relevance";
  if (criterio === "price-asc") listaFiltrada.sort((a, b) => a.preco - b.preco);
  else if (criterio === "price-desc")
    listaFiltrada.sort((a, b) => b.preco - a.preco);
  else listaFiltrada.sort((a, b) => a.id - b.id);

  paginaAtual = 1;
  exibirPagina(listaFiltrada, 1);
}

/* ==========================================================================
   3. BUSCA DE DADOS E RENDERIZAÇÃO (Caminhos Dinâmicos)
   ========================================================================== */
async function carregarCatalogo() {
  try {
    const isPaginaInterna = window.location.pathname.includes("/pages/");
    const caminhoJson = isPaginaInterna
      ? "../dados/produtos.json"
      : "./dados/produtos.json";

    const resposta = await fetch(caminhoJson);
    if (!resposta.ok) throw new Error("Arquivo JSON não encontrado!");

    produtos = await resposta.json();
    aplicarFiltros();
  } catch (erro) {
    console.error("Falha ao carregar o catálogo:", erro);
  }
}

function renderizarProdutos(lista) {
  if (!grid) return;
  grid.innerHTML = "";
  if (lista.length === 0) {
    grid.innerHTML =
      "<p style='grid-column: 1/-1; text-align:center;'>Nenhum produto encontrado.</p>";
    return;
  }

  const isPaginaInterna = window.location.pathname.includes("/pages/");

  lista.forEach((prod) => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "product-card";
    const categoriaPrincipal = Array.isArray(prod.categoria)
      ? prod.categoria[0]
      : prod.categoria;

    const imgPath = isPaginaInterna ? prod.img.replace("./", "../") : prod.img;
    const cartIconPath = isPaginaInterna
      ? "../images/carrinho_card.jpg"
      : "./images/carrinho_card.jpg";

    cardDiv.innerHTML = `
        <div class="product-image-container">
          <span class="category-badge">${categoriaPrincipal.toUpperCase()}</span>
          <img src="${imgPath}" alt="${prod.nome}" class="product-img">
        </div>
        <div class="product-info">
          <h3>${prod.nome}</h3>
          <div class="product-footer">
            <div class="price-container">
              <span class="price-value">R$ ${prod.preco.toFixed(2).replace(".", ",")}</span>
              <button class="btn-add-cart" data-id="${prod.id}">
                <img class="carrinho_card" src="${cartIconPath}">
              </button>
            </div>
          </div>
        </div>`;

    cardDiv.addEventListener("click", (e) => {
      if (e.target.closest(".btn-add-cart")) return;
      const destino = isPaginaInterna
        ? "./productDetails.html"
        : "./pages/productDetails.html";
      window.location.href = `${destino}?id=${prod.id}`;
    });
    grid.appendChild(cardDiv);
  });
}

function exibirPagina(lista, pagina) {
  const container = document.querySelector(".page-numbers");
  const inicio = (pagina - 1) * itensPorPagina;
  renderizarProdutos(lista.slice(inicio, inicio + itensPorPagina));
  if (container) atualizarBotoesPaginacao(lista.length, pagina);
}

function atualizarBotoesPaginacao(totalItens, pagina) {
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  const container = document.querySelector(".page-numbers");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 1; i <= totalPaginas; i++) {
    const activeClass = i === pagina ? "active" : "";
    container.innerHTML += `<button class="page-num ${activeClass}" onclick="irParaPagina(${i})">${i}</button>`;
  }
}

window.irParaPagina = (n) => exibirPagina(listaFiltrada, n);

/* ==========================================================================
   4. CARRINHO E WHATSAPP
   ========================================================================== */
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function getCartItemKey(item) {
  if (item.cartKey) return item.cartKey;

  if (item.larguraOrcada) {
    return `${item.id}-${Number(item.larguraOrcada).toFixed(2)}`;
  }

  return String(item.id);
}

function addToCart(produto) {
  const quantidade = Math.max(1, parseInt(produto.quantidade, 10) || 1);
  const cart = getCart();
  const cartKey = getCartItemKey(produto);
  const existente = cart.find((item) => getCartItemKey(item) === cartKey);

  if (existente) {
    existente.quantidade += quantidade;
  } else {
    cart.push({ ...produto, cartKey, quantidade });
  }

  saveCart(cart);
  atualizarContadorCarrinho();

  mostrarAvisoCarrinho(produto.nome);
}

function atualizarContadorCarrinho() {
  const cart = getCart();
  const total = cart.reduce((acc, item) => acc + item.quantidade, 0);
  const contador = document.getElementById("cart-count");
  if (contador) contador.textContent = total;
}

function renderizarCarrinho() {
  const cartItemsContainer = document.getElementById("cart-items");
  const totalElement = document.getElementById("cart-total");
  const cart = getCart();
  if (!cartItemsContainer || !totalElement) return;

  cartItemsContainer.innerHTML = "";
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = "<p>Seu carrinho está vazio.</p>";
    totalElement.textContent = "R$ 0,00";
    return;
  }

  let total = 0;
  const isPaginaInterna = window.location.pathname.includes("/pages/");

  cart.forEach((item) => {
    total += item.preco * item.quantidade;
    const imgPath = isPaginaInterna ? item.img.replace("./", "../") : item.img;

    const larguraInfo = item.larguraOrcada
      ? `<p>Largura: ${Number(item.larguraOrcada).toFixed(2).replace(".", ",")}m</p>`
      : "";
    const corInfo = item.corOrcada ? `<p>Cor: ${item.corOrcada}</p>` : "";

    cartItemsContainer.innerHTML += `
      <div class="cart-item">
        <img src="${imgPath}" alt="${item.nome}">
        <div class="cart-item-info">
          <h4>${item.nome}</h4>
          ${corInfo}
          ${larguraInfo}
          <p>Qtd: ${item.quantidade}</p>
          <p>R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</p>
        </div>
        <button class="btn-remove-item" data-cart-key="${getCartItemKey(item)}" title="Remover item">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>`;
  });
  totalElement.textContent = "R$ " + total.toFixed(2).replace(".", ",");
}
function limparCarrinho() {
  if (confirm("Deseja realmente remover todos os itens do carrinho?")) {
    saveCart([]); // Salva um array vazio
    atualizarContadorCarrinho(); // Zera o contador visual
    renderizarCarrinho(); // Atualiza a lista na gaveta
  }
}

function finalizarPedidoWhatsApp() {
  const cart = getCart();
  if (cart.length === 0) {
    alert("Seu carrinho está vazio!");
    return;
  }

  const numeroWhatsApp = "5551996034579";
  let mensagem = "Olá! Gostaria de fazer um pedido:\n\n";
  let total = 0;

  cart.forEach((item) => {
    total += item.preco * item.quantidade;
    const larguraInfo = item.larguraOrcada
      ? `\n  Largura: ${Number(item.larguraOrcada).toFixed(2).replace(".", ",")}m`
      : "";
    const corInfo = item.corOrcada ? `\n  Cor: ${item.corOrcada}` : "";

    mensagem += `• *${item.nome}*\n  Qtd: ${item.quantidade} x R$ ${item.preco.toFixed(2).replace(".", ",")}${corInfo}${larguraInfo}\n\n`;
  });

  mensagem += `*Valor Total: R$ ${total.toFixed(2).replace(".", ",")}*`;
  window.open(
    `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`,
    "_blank",
  );
}

/* ==========================================================================
   FUNÇÃO DE SUGESTÕES
   ========================================================================== */
function exibirSugestoes(termo) {
  const container = document.getElementById("search-suggestions");
  if (!container) return;

  // Só mostra sugestões se houver pelo menos 2 letras
  if (termo.length < 2) {
    container.style.display = "none";
    return;
  }

  const termoLimpo = removerAcentos(termo);
  const isPaginaInterna = window.location.pathname.includes("/pages/");

  // Filtra as 5 primeiras correspondências
  const matches = produtos
    .filter((p) => {
      const nomeLimpo = removerAcentos(p.nome);
      const tagsMatch = p.tags
        ? p.tags.some((t) => removerAcentos(t).includes(termoLimpo))
        : false;
      return nomeLimpo.includes(termoLimpo) || tagsMatch;
    })
    .slice(0, 5);

  if (matches.length > 0) {
    container.innerHTML = matches
      .map((prod) => {
        // Ajusta o caminho da imagem se estiver em /pages/
        const imgPath = isPaginaInterna
          ? prod.img.replace("./", "../")
          : prod.img;
        const urlDestino = isPaginaInterna
          ? `./productDetails.html?id=${prod.id}`
          : `./pages/productDetails.html?id=${prod.id}`;

        return `
        <div class="suggestion-item" onclick="window.location.href='${urlDestino}'">
          <img src="${imgPath}" alt="${prod.nome}">
          <span>${prod.nome}</span>
        </div>
      `;
      })
      .join("");
    container.style.display = "block";
  } else {
    container.style.display = "none";
  }
}

// Fecha sugestões ao clicar fora da busca
document.addEventListener("click", (e) => {
  const container = document.getElementById("search-suggestions");
  if (container && !e.target.closest(".header-search")) {
    container.style.display = "none";
  }
});

function mostrarAvisoCarrinho(nomeProduto) {
  // Remove avisos antigos se o usuário clicar muito rápido
  const avisoAntigo = document.querySelector(".toast-notificacao");
  if (avisoAntigo) avisoAntigo.remove();

  const toast = document.createElement("div");
  toast.className = "toast-notificacao";
  toast.innerHTML = `
        <i class="fa-solid fa-circle-check"></i>
        <span><strong>${nomeProduto}</strong> adicionado ao carrinho!</span>
    `;

  document.body.appendChild(toast);

  // Remove do HTML após 3 segundos (tempo da animação do CSS)
  setTimeout(() => {
    if (toast) toast.remove();
  }, 3000);
}

/* ==========================================================================
   5. INICIALIZAÇÃO UNIFICADA
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const whatsappBtn = document.querySelector(".whatsapp-float");
  const cartFloating = document.querySelector(".cart-icon");

  atualizarContadorCarrinho();
  carregarCatalogo();

  // --- LÓGICA DO MENU DROPDOWN (MAIS VENDIDOS) ---
  document.querySelectorAll(".dropdown-menu a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault(); // Impede o pulo da página por ser um link

      const filtro = link.getAttribute("data-filter");

      if (filtro && searchCategoryTop) {
        // 1. Verifica se o filtro existe nas opções do select do topo
        const optionExists = [...searchCategoryTop.options].some(
          (o) => o.value === filtro,
        );

        if (optionExists) {
          searchCategoryTop.value = filtro;
          aplicarFiltros();
        } else {
          // 2. Se não estiver no select (ex: Armário Colmeia), filtra direto
          searchCategoryTop.value = "Todos";
          aplicarFiltros(filtro);
        }

        // 3. Rola a página até a vitrine de produtos
        const sectionProdutos = document.querySelector(".product-page");
        if (sectionProdutos) {
          window.scrollTo({
            top: sectionProdutos.offsetTop - 100,
            behavior: "smooth",
          });
        }
      }
    });
  });

  // Listeners do Carrinho (Abri/Fechar)
  const cartIcon = document.querySelector(".cart-icon");
  if (cartIcon) {
    cartIcon.addEventListener("click", () => {
      document.getElementById("cart-drawer").classList.add("active");
      document.getElementById("cart-overlay").classList.add("active");

      if (whatsappBtn) whatsappBtn.style.display = "none";
      if (cartFloating) cartFloating.style.display = "none";

      renderizarCarrinho();
    });
  }

  const closeCartBtn = document.getElementById("close-cart");
  if (closeCartBtn)
    closeCartBtn.addEventListener("click", () => {
      document.getElementById("cart-drawer").classList.remove("active");
      document.getElementById("cart-overlay").classList.remove("active");

      if (whatsappBtn) whatsappBtn.style.display = "flex";
      if (cartFloating) cartFloating.style.display = "flex";
    });

  const cartOverlay = document.getElementById("cart-overlay");
  if (cartOverlay)
    cartOverlay.addEventListener("click", () => {
      document.getElementById("cart-drawer").classList.remove("active");
      document.getElementById("cart-overlay").classList.remove("active");

      if (whatsappBtn) whatsappBtn.style.display = "flex";
      if (cartFloating) cartFloating.style.display = "flex";
    });

  const btnFinalizar = document.querySelector(".checkout-btn");
  if (btnFinalizar)
    btnFinalizar.addEventListener("click", finalizarPedidoWhatsApp);

  // --- RECONECTANDO SEUS FILTROS ORIGINAIS ---
  document
    .querySelectorAll(".filter-list li, .category-card")
    .forEach((item) => {
      item.addEventListener("click", () => {
        const cat =
          item.getAttribute("data-category") || item.textContent.trim();

        if (searchCategoryTop) {
          const optionExists = [...searchCategoryTop.options].some(
            (o) => o.value === cat,
          );

          if (optionExists) {
            searchCategoryTop.value = cat;
            aplicarFiltros();
          } else {
            searchCategoryTop.value = "Todos";
            aplicarFiltros(cat); // Filtro manual para categorias fora do select
          }

          // Rola suavemente até os produtos
          const destino =
            document.querySelector(".products-content") ||
            document.getElementById("products-grid");
          if (destino) {
            const y =
              destino.getBoundingClientRect().top + window.pageYOffset - 150;
            window.scrollTo({ top: y, behavior: "smooth" });
          }
        } else {
          aplicarFiltros(cat);
        }
      });
    });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      aplicarFiltros(); // Continua filtrando o grid de produtos lá embaixo
      exibirSugestoes(searchInput.value); // Chama a função para mostrar a lista de sugestões no topo
    });
  }
  if (searchCategoryTop)
    searchCategoryTop.addEventListener("change", () => aplicarFiltros());
  if (sizeSelect) sizeSelect.addEventListener("change", () => aplicarFiltros());
  if (sortSelect) sortSelect.addEventListener("change", () => aplicarFiltros());

  const btnFilterPrice = document.getElementById("btn-filter-price");
  if (btnFilterPrice)
    btnFilterPrice.addEventListener("click", () => aplicarFiltros());

  // --- LÓGICA DO BOTÃO LIMPAR FILTROS (SEM CHUTE) ---
  const btnClearFilters = document.getElementById("clear-filters");

  if (btnClearFilters) {
    btnClearFilters.addEventListener("click", () => {
      // 1. Resetando os campos de texto e números
      if (searchInput) searchInput.value = "";
      if (inputMin) inputMin.value = "";
      if (inputMax) inputMax.value = "";

      // 2. Resetando os selects para o valor inicial
      if (searchCategoryTop) searchCategoryTop.value = "Todos";
      if (sizeSelect) sizeSelect.value = "";
      if (sortSelect) sortSelect.value = "relevance";

      // 3. Aplicando os filtros vazios para atualizar a lista
      aplicarFiltros();

      // 4. Fechar sugestões de busca caso estejam abertas
      const containerSugestoes = document.getElementById("search-suggestions");
      if (containerSugestoes) containerSugestoes.style.display = "none";

      // 5. Feedback visual: levar o usuário de volta para o início dos produtos
      const gridProdutos = document.getElementById("products-grid");
      if (gridProdutos) {
        window.scrollTo({
          top: gridProdutos.offsetTop - 180,
          behavior: "smooth",
        });
      }
    });
  }

  const btnClear = document.querySelector(".btn-clear-cart");
  if (btnClear) {
    btnClear.addEventListener("click", limparCarrinho);
  }

  // Delegação para botões dinâmicos (Remover item e Add Cart)
  document.addEventListener("click", (e) => {
    const btnRemove = e.target.closest(".btn-remove-item");
    if (btnRemove) {
      const cartKey = btnRemove.dataset.cartKey;
      saveCart(getCart().filter((item) => getCartItemKey(item) !== cartKey));
      atualizarContadorCarrinho();
      renderizarCarrinho();
    }

    const btnAdd = e.target.closest(".btn-add-cart");
    if (btnAdd) {
      e.stopPropagation();
      const id = parseInt(btnAdd.dataset.id);
      const produto = produtos.find((p) => p.id === id);
      if (produto) addToCart(produto);
    }
  });
});

// Exportação global para o productDetails.js
window.addToCart = addToCart;
window.renderizarCarrinho = renderizarCarrinho;
window.atualizarContadorCarrinho = atualizarContadorCarrinho;
