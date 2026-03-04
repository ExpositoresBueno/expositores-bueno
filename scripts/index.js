/* ==========================================================================
   CAROUSEL E MENU (MANTIDOS)
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

// Dropdown Logic
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
   ESTADO GLOBAL DO APLICATIVO
   ========================================================================== */
let produtos = [];
let listaFiltrada = [];
let paginaAtual = 1;
const itensPorPagina = 6;
const grid = document.getElementById("products-grid");

// Elementos de Filtro
const searchInput = document.getElementById("search-input");
const searchCategoryTop = document.getElementById("search-category");
const sizeSelect = document.getElementById("size-select");
const inputMin = document.getElementById("price-min");
const inputMax = document.getElementById("price-max");
const sortSelect = document.getElementById("sort-products");

/* ==========================================================================
   CENTRAL DE FILTROS (TURBINADA COM TAGS E SEM ACENTOS)
   ========================================================================== */

// Função auxiliar para remover acentos (ex: transforma "Móvel" em "movel")
function removerAcentos(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function aplicarFiltros(filtroManual = null) {
  // Pega o que o usuário digitou e já tira os acentos
  const termo = searchInput ? removerAcentos(searchInput.value.trim()) : "";

  const filtroTopo =
    filtroManual || (searchCategoryTop ? searchCategoryTop.value : "Todos");
  const tamanho = sizeSelect ? sizeSelect.value : "";
  const min = parseFloat(inputMin ? inputMin.value : 0) || 0;
  const max = parseFloat(inputMax ? inputMax.value : Infinity) || Infinity;

  listaFiltrada = produtos.filter((p) => {
    // 1. Tira os acentos do nome do produto para comparar de forma justa
    const nomeLimpo = removerAcentos(p.nome);

    // 2. Verifica se o termo digitado está no NOME ou dentro das TAGS (se existirem)
    let matchesNomeOuTag = nomeLimpo.includes(termo);

    // Se não achou no nome, procura nas tags ocultas
    if (!matchesNomeOuTag && p.tags) {
      matchesNomeOuTag = p.tags.some((tag) =>
        removerAcentos(tag).includes(termo),
      );
    }

    // O resto continua igual
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

  // Ordenação
  const criterio = sortSelect ? sortSelect.value : "relevance";
  if (criterio === "price-asc") listaFiltrada.sort((a, b) => a.preco - b.preco);
  else if (criterio === "price-desc")
    listaFiltrada.sort((a, b) => b.preco - a.preco);
  else listaFiltrada.sort((a, b) => a.id - b.id);

  paginaAtual = 1;
  exibirPagina(listaFiltrada, 1);
}

/* ==========================================================================
   BUSCA DE DADOS
   ========================================================================== */
async function carregarCatalogo() {
  try {
    const resposta = await fetch("./dados/produtos.json");
    if (!resposta.ok) throw new Error("Arquivo JSON não encontrado!");

    produtos = await resposta.json();
    aplicarFiltros();
  } catch (erro) {
    console.error("Falha ao carregar o catálogo:", erro);
    if (grid) grid.innerHTML = "<p>Carregando produtos...</p>";
  }
}

/* ==========================================================================
   RENDERIZAÇÃO
   ========================================================================== */
function renderizarProdutos(lista) {
  if (!grid) return;
  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML =
      "<p style='grid-column: 1/-1; text-align:center;'>Nenhum produto encontrado com esses filtros.</p>";
    return;
  }

  lista.forEach((prod) => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "product-card";
    cardDiv.style.cursor = "pointer";

    // Pega apenas a primeira categoria para mostrar no badge (se for lista)
    const categoriaPrincipal = Array.isArray(prod.categoria)
      ? prod.categoria[0]
      : prod.categoria;

    cardDiv.innerHTML = `
        <div class="product-image-container">
          <span class="category-badge">${categoriaPrincipal.toUpperCase()}</span>
          <img src="${prod.img}" alt="${prod.nome}" class="product-img">
        </div>
        <div class="product-info">
          <h3>${prod.nome}</h3>
          <div class="product-footer">
            <div class="price-container">
              <span class="price-label">A partir de</span>
              <span class="price-value">R$ ${prod.preco.toFixed(2).replace(".", ",")}</span>
<button class="btn-add-cart" data-id="${prod.id}">
  <img class="carrinho_card" src="../images/carrinho_card.jpg">
</button>
            </div>
          </div>
        </div>
    `;
    cardDiv.addEventListener("click", (e) => {
      if (e.target.closest(".btn-add-cart")) return;

      window.location.href = `../pages/productDetails.html?id=${prod.id}`;
    });
    grid.appendChild(cardDiv);
  });
}

function exibirPagina(lista, pagina) {
  const container = document.querySelector(".page-numbers");
  if (!container && lista.length > 0) {
    renderizarProdutos(lista);
    return;
  }

  const inicio = (pagina - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const produtosDaPagina = lista.slice(inicio, fim);

  renderizarProdutos(produtosDaPagina);
  atualizarBotoesPaginacao(lista.length, pagina);
}

function atualizarBotoesPaginacao(totalItens, pagina) {
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  const container = document.querySelector(".page-numbers");
  const btnAnterior = document.querySelector(".btn-prev");
  const btnProximo = document.querySelector(".btn-next");

  if (!container) return;
  container.innerHTML = "";

  for (let i = 1; i <= totalPaginas; i++) {
    const activeClass = i === pagina ? "active" : "";
    container.innerHTML += `<button class="page-num ${activeClass}" onclick="irParaPagina(${i})">${i}</button>`;
  }

  if (btnAnterior) {
    btnAnterior.disabled = pagina === 1;
    btnAnterior.style.opacity = pagina === 1 ? "0.5" : "1";
  }
  if (btnProximo) {
    btnProximo.disabled = pagina === totalPaginas || totalPaginas === 0;
    btnProximo.style.opacity =
      pagina === totalPaginas || totalPaginas === 0 ? "0.5" : "1";
  }

  paginaAtual = pagina;
}

window.irParaPagina = (n) => exibirPagina(listaFiltrada, n);
window.proximaPagina = () => {
  if (paginaAtual * itensPorPagina < listaFiltrada.length)
    exibirPagina(listaFiltrada, paginaAtual + 1);
};
window.paginaAnterior = () => {
  if (paginaAtual > 1) exibirPagina(listaFiltrada, paginaAtual - 1);
};

/* ==========================================================================
   CARRINHO
   ========================================================================== */

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart(produto) {
  const cart = getCart();

  const existente = cart.find((item) => item.id === produto.id);

  if (existente) {
    existente.quantidade += 1;
  } else {
    cart.push({ ...produto, quantidade: 1 });
  }

  saveCart(cart);
  atualizarContadorCarrinho();
}

function atualizarContadorCarrinho() {
  const cart = getCart();
  const total = cart.reduce((acc, item) => acc + item.quantidade, 0);

  const contador = document.getElementById("cart-count");
  if (contador) contador.textContent = total;
}

const cartDrawer = document.getElementById("cart-drawer");
const cartOverlay = document.getElementById("cart-overlay");
const closeCartBtn = document.getElementById("close-cart");
const cartIcon = document.querySelector(".cart-icon");

if (cartIcon) {
  cartIcon.addEventListener("click", () => {
    cartDrawer.classList.add("active");
    cartOverlay.classList.add("active");
    renderizarCarrinho();
  });
}

if (closeCartBtn) {
  closeCartBtn.addEventListener("click", fecharCarrinho);
}

if (cartOverlay) {
  cartOverlay.addEventListener("click", fecharCarrinho);
}

function fecharCarrinho() {
  cartDrawer.classList.remove("active");
  cartOverlay.classList.remove("active");
}

function renderizarCarrinho() {
  const cartItemsContainer = document.getElementById("cart-items");
  const totalElement = document.getElementById("cart-total");
  const cart = getCart();

  if (!cartItemsContainer) return;

  cartItemsContainer.innerHTML = "";

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = "<p>Seu carrinho está vazio.</p>";
    totalElement.textContent = "R$ 0,00";
    return;
  }

  let total = 0;

  cart.forEach((item) => {
    total += item.preco * item.quantidade;

    cartItemsContainer.innerHTML += `
      <div class="cart-item">
        <img src="${item.img}" alt="${item.nome}">
        <div>
          <h4>${item.nome}</h4>
          <p>Qtd: ${item.quantidade}</p>
          <p>R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</p>
        </div>
      </div>
    `;
  });

  totalElement.textContent = "R$ " + total.toFixed(2).replace(".", ",");
}

/* ==========================================================================
   EVENTOS
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  atualizarContadorCarrinho();
  carregarCatalogo();

  // CLIQUE NOS CARDS COLORIDOS E SIDEBAR
  document
    .querySelectorAll(".filter-list li, .category-card")
    .forEach((item) => {
      item.addEventListener("click", (e) => {
        const cat =
          item.getAttribute("data-category") || item.textContent.trim();

        // Tenta setar no select visualmente se a opção existir
        if (searchCategoryTop) {
          const optionExists = [...searchCategoryTop.options].some(
            (o) => o.value === cat,
          );
          if (optionExists) {
            searchCategoryTop.value = cat;
            aplicarFiltros();
          } else {
            searchCategoryTop.value = "Todos";
            aplicarFiltros(cat);
          }

          // Rola a página automaticamente após clicar no card
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
  // LÓGICA DO MENU SUPERIOR (DROPDOWN)
  document
    .querySelectorAll(".dropdown-menu a, .menu-trigger")
    .forEach((link) => {
      link.addEventListener("click", (e) => {
        // Impede que o link recarregue a página (exceto se for link normal)
        if (
          link.getAttribute("href") === "#" ||
          link.getAttribute("href").includes("javascript")
        ) {
          e.preventDefault();
        }

        const termoFiltro = link.getAttribute("data-filter");

        if (termoFiltro) {
          // 1. Atualiza o campo de busca com o termo específico (ex: "Arara de Parede")
          // Isso aproveita sua busca por texto que já filtra por nome!
          if (searchInput) {
            searchInput.value = termoFiltro;
          }

          // 2. Reseta a categoria para "Todos" para não conflitar (ex: buscar "Arara" na categoria "Balcões")
          if (searchCategoryTop) {
            searchCategoryTop.value = "Todos";
          }

          // 3. Aplica o filtro
          aplicarFiltros();

          // 4. Rola suavemente até os produtos
          const destino =
            document.querySelector(".products-content") ||
            document.getElementById("products-grid");
          if (destino) {
            const y =
              destino.getBoundingClientRect().top + window.pageYOffset - 150;
            window.scrollTo({ top: y, behavior: "smooth" });
          }
        }
      });
    });
  if (searchInput)
    searchInput.addEventListener("input", () => aplicarFiltros());

  // EVENTO DE MUDANÇA NO SELECT DO TOPO (COM ROLAGEM SUAVE)
  if (searchCategoryTop) {
    searchCategoryTop.addEventListener("change", () => {
      aplicarFiltros(); // Aplica o filtro primeiro

      // Encontra a área dos produtos e rola até lá
      const destino =
        document.querySelector(".products-content") ||
        document.getElementById("products-grid");
      if (destino) {
        const y =
          destino.getBoundingClientRect().top + window.pageYOffset - 150;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    });
  }

  if (sizeSelect) sizeSelect.addEventListener("change", () => aplicarFiltros());
  if (sortSelect) sortSelect.addEventListener("change", () => aplicarFiltros());

  const btnFilterPrice = document.getElementById("btn-filter-price");
  if (btnFilterPrice)
    btnFilterPrice.addEventListener("click", () => aplicarFiltros());

  const btnClear = document.querySelector(".btn-clear");
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (searchCategoryTop) searchCategoryTop.value = "Todos";
      if (sizeSelect) sizeSelect.value = "";
      if (inputMin) inputMin.value = "";
      if (inputMax) inputMax.value = "";
      if (sortSelect) sortSelect.value = "relevance";
      aplicarFiltros();
    });
  }
  // Clique no botão de adicionar ao carrinho
  document.addEventListener("click", function (e) {
    const botao = e.target.closest(".btn-add-cart");
    if (!botao) return;

    e.stopPropagation();

    const id = parseInt(botao.dataset.id);
    const produto = produtos.find((p) => p.id === id);

    if (produto) {
      addToCart(produto);
      alert("Produto adicionado ao carrinho!");
    }
  });
});

/* ==========================================================================
   BUSCA GLOBAL: REDIRECIONA OU ROLA A TELA (ENTER E LUPA)
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const inputBusca = document.getElementById("search-input");
  const botaoBusca = document.getElementById("search-btn");

  // Verifica se o usuário está em uma página interna (dentro da pasta /pages/)
  const isPaginaInterna = window.location.pathname.includes("/pages/");

  function acionarBusca() {
    if (isPaginaInterna) {
      // Se não estiver no Início, redireciona levando o termo digitado na URL
      const termo = inputBusca ? inputBusca.value : "";
      window.location.href = `../index.html?busca=${encodeURIComponent(termo)}`;
    } else {
      // Se já estiver no Início, apenas faz a rolagem suave
      const areaAlvo =
        document.querySelector(".content-container") ||
        document.querySelector("main");
      if (areaAlvo) {
        const posicao = areaAlvo.getBoundingClientRect().top + window.scrollY;
        const ajusteDePixels = 900; // Mantive o seu ajuste perfeito de 900 aqui!
        window.scrollTo({ top: posicao + ajusteDePixels, behavior: "smooth" });
      }
    }
  }

  // Aciona ao apertar Enter
  if (inputBusca) {
    inputBusca.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setTimeout(acionarBusca, 300);
      }
    });
  }

  // Aciona ao clicar na lupa
  if (botaoBusca) {
    botaoBusca.addEventListener("click", (e) => {
      e.preventDefault();
      setTimeout(acionarBusca, 300);
    });
  }

  // LÓGICA MÁGICA: Se voltou para o Início com uma busca salva, preenche o campo e filtra
  const urlParams = new URLSearchParams(window.location.search);
  const buscaSalva = urlParams.get("busca");

  if (!isPaginaInterna && buscaSalva && inputBusca) {
    inputBusca.value = buscaSalva; // Preenche o texto

    // Simula a digitação para o seu filtro atual entender e esconder os outros produtos
    const eventoDigitacao = new Event("input");
    inputBusca.dispatchEvent(eventoDigitacao);

    // Rola a tela automaticamente para mostrar o resultado
    setTimeout(acionarBusca, 500);
  }
});
