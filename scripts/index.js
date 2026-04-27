import { supabase } from './supabase-client.js';
import {
  addItemToDb,
  clearCartInDb,
  loadCartFromDb,
  removeItemFromDb,
  buildCartKey,
} from './cart-db.js';
import {
  enriquecerProdutoComPromocao,
  obterPrecoPromocionalPorId,
  obterPromocoesCarrossel,
} from './promo-pricing.js';

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
  const dropdown = menuPai.querySelector(".dropdown-menu");
  const toggle = menuPai.querySelector(".nav-dropdown-toggle");

  const abrirDropdown = () => {
    if (!dropdown) return;
    dropdown.style.display = "block";
    window.setTimeout(() => {
      dropdown.style.opacity = "1";
    }, 10);
    if (toggle) toggle.setAttribute("aria-expanded", "true");
  };

  const fecharDropdown = () => {
    if (!dropdown) return;
    dropdown.style.display = "none";
    dropdown.style.opacity = "0";
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  };

  menuPai.addEventListener("mouseenter", function () {
    abrirDropdown();
  });
  menuPai.addEventListener("mouseleave", function () {
    fecharDropdown();
  });

  if (toggle) {
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      if (expanded) fecharDropdown();
      else abrirDropdown();
    });
    toggle.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        fecharDropdown();
        toggle.focus();
      }
    });
  }

  menuPai.addEventListener("focusout", (event) => {
    if (!menuPai.contains(event.relatedTarget)) {
      fecharDropdown();
    }
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".has-dropdown").forEach((menuPai) => {
    const dropdown = menuPai.querySelector(".dropdown-menu");
    const toggle = menuPai.querySelector(".nav-dropdown-toggle");
    if (dropdown) {
      dropdown.style.display = "none";
      dropdown.style.opacity = "0";
    }
    if (toggle) toggle.setAttribute("aria-expanded", "false");
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
const typeSelect = document.getElementById("type-select");
const heightSelect = document.getElementById("height-select");
const widthSelect = document.getElementById("width-select");
const materialSelect = document.getElementById("material-select");
const inputMin = document.getElementById("price-min");
const inputMax = document.getElementById("price-max");
const sortSelect = document.getElementById("sort-products");
const possuiGridProdutos = Boolean(document.getElementById("products-grid"));
const categoriasBase = [
  "Promoções",
  "Balcões",
  "Armários Vestiários",
  "Expositores",
  "Araras",
  "Vitrines",
  "Caixas",
  "Colmeias",
  "Gôndolas",
  "Painel Canaletado",
  "Mesa de Manicure",
  "Kits",
];

function inicializarCategoriasDaInterface() {
  const searchCategory = document.getElementById("search-category");
  if (searchCategory) {
    searchCategory.innerHTML = [
      '<option value="Todos">Todos os produtos</option>',
      ...categoriasBase.map((categoria) => `<option value="${categoria}">${categoria}</option>`),
    ].join("");
  }

  const categoryFilters = document.getElementById("category-filters");
  if (categoryFilters) {
    categoryFilters.innerHTML = categoriasBase
      .map((categoria) => `<li class="filter-item" role="button" tabindex="0" data-category="${categoria}">${categoria}</li>`)
      .join("");
  }

  const navProdutos = document.getElementById("nav-produtos-menu");
  if (navProdutos) {
    navProdutos.innerHTML = categoriasBase
      .map((categoria) => `<li><a href="#" data-filter="${categoria}">${categoria}</a></li>`)
      .join("");
  }

  const segmentTrack = document.getElementById("segment-track");
  if (segmentTrack) {
    const icones = {
      Promoções: "fa-tags",
      Balcões: "fa-table",
      "Armários Vestiários": "fa-door-closed",
      Kits: "fa-cubes",
      Araras: "fa-shirt",
      Gôndolas: "fa-shop",
      "Painel Canaletado": "fa-grip-lines",
    };
    segmentTrack.innerHTML = categoriasBase
      .filter((categoria) => icones[categoria])
      .map((categoria) => `
        <button class="segment-item" type="button" data-category="${categoria}">
          <span class="segment-icon"><i class="fa-solid ${icones[categoria]}" aria-hidden="true"></i></span>
          <span class="segment-label">${categoria}</span>
        </button>
      `)
      .join("");
  }
}

const ORDEM_PADRAO_CATEGORIAS = [
  "Balcões",
  "Armários",
  "Armários Vestiários",
  "Vestiários",
  "Vestiário",
  "Expositores",
  "Araras",
  "Vitrines",
  "Caixas",
  "Colmeias",
  "Gôndolas",
  "Painel Canaletado",
  "Mesa de Manicure",
  "Kits",
  "Móveis de Apoio",
  "Móveis de Centro",
  "Móveis para Vitrine",
  "Moveis",
  "Movel",
  "Móvel",
  "Recepção",
  "Farmácia",
  "Prateleiras",
];

function removerAcentos(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function stringsEquivalentes(a, b) {
  return removerAcentos(String(a || "")) === removerAcentos(String(b || ""));
}

function obterPrioridadeCategoria(produto) {
  const categorias = Array.isArray(produto.categoria) ? produto.categoria : [produto.categoria];
  const categoriaPrincipal = categorias[0];
  const indice = ORDEM_PADRAO_CATEGORIAS.findIndex((categoriaBase) =>
    stringsEquivalentes(categoriaBase, categoriaPrincipal),
  );

  return indice === -1 ? Number.MAX_SAFE_INTEGER : indice;
}

function ordenarPorSequenciaPadrao(a, b) {
  const prioridadeA = obterPrioridadeCategoria(a);
  const prioridadeB = obterPrioridadeCategoria(b);

  if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
  return a.id - b.id;
}

const formatadorMoedaBR = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatadorNumeroBR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CAMPOS_PRECO_AVISTA = ["precoAvista", "preco_a_vista", "precoAVista"];
const DESCONTO_PAGAMENTO_AVISTA = 0.05;

function formatarMoedaBR(valor) {
  return formatadorMoedaBR.format(Number(valor) || 0);
}

function formatarNumeroBR(valor) {
  return formatadorNumeroBR.format(Number(valor) || 0);
}

function obterPrecoAvistaProduto(produto) {
  if (!produto || typeof produto !== "object") return null;

  const precoPromocional = Number(produto.precoPromocional);
  if (Number.isFinite(precoPromocional) && precoPromocional > 0) {
    return precoPromocional;
  }

  const produtoComPromocao = enriquecerProdutoComPromocao(produto);
  const precoPromocionalMapeado = Number(produtoComPromocao?.precoPromocional);
  if (Number.isFinite(precoPromocionalMapeado) && precoPromocionalMapeado > 0) {
    return precoPromocionalMapeado;
  }

  for (const campo of CAMPOS_PRECO_AVISTA) {
    const valorCampo = Number(produto[campo]);
    if (Number.isFinite(valorCampo) && valorCampo > 0) {
      return valorCampo;
    }
  }

  const precoBase = Number(produto.preco);
  if (!Number.isFinite(precoBase) || precoBase <= 0) return null;

  return precoBase * (1 - DESCONTO_PAGAMENTO_AVISTA);
}

function formatarMedidaCm(valorEmMetros) {
  const valor = Number(valorEmMetros);
  if (!Number.isFinite(valor) || valor <= 0) return "";
  return `${formatarNumeroBR(valor * 100)}cm`;
}

function calcularParcelamentoSemJuros(valorTotal, limiteParcelas = 12) {
  const valor = Number(valorTotal);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { parcelas: 1, valorParcela: 0 };
  }

  const parcelasMaximasPorValor = Math.floor(valor / 200);
  const parcelas = Math.min(limiteParcelas, Math.max(1, parcelasMaximasPorValor));
  const valorParcela = valor / parcelas;

  return { parcelas, valorParcela };
}

function extrairDimensoes(dimensoes = "") {
  const alturaMatch = dimensoes.match(/([\d.,]+)m\s*Altura/i);
  const larguraMatch = dimensoes.match(/([\d.,]+)cm\s*Largura/i);
  const material = /mdf/i.test(dimensoes)
    ? "MDF"
    : /metal|ferro|aço/i.test(dimensoes)
      ? "Metal"
      : "Misto";

  return {
    altura: alturaMatch ? `${alturaMatch[1]}m` : "",
    largura: larguraMatch ? `${larguraMatch[1]}cm` : "",
    material,
  };
}

function preencherSelectFiltro(selectEl, valores = [], placeholder = "Todos") {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;
  [...new Set(valores.filter(Boolean))]
    .sort((a, b) => removerAcentos(a).localeCompare(removerAcentos(b)))
    .forEach((valor) => {
      const option = document.createElement("option");
      option.value = valor;
      option.textContent = valor;
      selectEl.appendChild(option);
    });
}

function inicializarFiltrosAvancados() {
  const tipos = [];
  const alturas = [];
  const larguras = [];
  const materiais = [];

  produtos.forEach((produto) => {
    const categorias = Array.isArray(produto.categoria)
      ? produto.categoria
      : [produto.categoria];
    tipos.push(...categorias);

    const { altura, largura, material } = extrairDimensoes(produto.dimensoes);
    if (altura) alturas.push(altura);
    if (largura) larguras.push(largura);
    materiais.push(material);
  });

  preencherSelectFiltro(typeSelect, tipos, "Todos os tipos");
  preencherSelectFiltro(heightSelect, alturas, "Todas as alturas");
  preencherSelectFiltro(widthSelect, larguras, "Todas as larguras");
  preencherSelectFiltro(materialSelect, materiais, "Todos os materiais");
}

function aplicarFiltros(filtroManual = null) {
  const termo = searchInput ? removerAcentos(searchInput.value.trim()) : "";
  const filtroTopo =
    filtroManual || (searchCategoryTop ? searchCategoryTop.value : "Todos");
  const tamanho = sizeSelect ? sizeSelect.value : "";
  const tipo = typeSelect ? typeSelect.value : "";
  const altura = heightSelect ? heightSelect.value : "";
  const largura = widthSelect ? widthSelect.value : "";
  const material = materialSelect ? materialSelect.value : "";
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
    const categoriasNormalizadas = categoriasDoProduto.map((categoria) =>
      removerAcentos(categoria),
    );
    const filtroTopoNormalizado = removerAcentos(filtroTopo);
    const filtroPromocoes = stringsEquivalentes(filtroTopo, "Promoções");
    const produtoEmPromocao = Number.isFinite(Number(obterPrecoPromocionalPorId(p.id)));

    const matchesCatOuNome =
      filtroTopo === "Todos" ||
      (filtroPromocoes && produtoEmPromocao) ||
      categoriasNormalizadas.includes(filtroTopoNormalizado) ||
      stringsEquivalentes(p.nome, filtroTopo);
    const matchesTam = tamanho === "" || p.tamanho === tamanho;
    const matchesPreco = p.preco >= min && p.preco <= max;
    const infoDimensao = extrairDimensoes(p.dimensoes);
    const matchesTipo =
      tipo === "" || categoriasDoProduto.some((cat) => stringsEquivalentes(cat, tipo));
    const matchesAltura = altura === "" || infoDimensao.altura === altura;
    const matchesLargura = largura === "" || infoDimensao.largura === largura;
    const matchesMaterial = material === "" || infoDimensao.material === material;

    return matchesNomeOuTag && matchesCatOuNome && matchesTam && matchesPreco
      && matchesTipo && matchesAltura && matchesLargura && matchesMaterial;
  });

  const criterio = sortSelect ? sortSelect.value : "relevance";
  if (criterio === "price-asc") listaFiltrada.sort((a, b) => a.preco - b.preco);
  else if (criterio === "price-desc")
    listaFiltrada.sort((a, b) => b.preco - a.preco);
  else listaFiltrada.sort(ordenarPorSequenciaPadrao);

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
    renderizarPromocoes(produtos);
    inicializarFiltrosAvancados();
    aplicarFiltros();
  } catch (erro) {
    console.error("Falha ao carregar o catálogo:", erro);
  }
}

function renderizarPromocoes(listaProdutos) {
  const promoTrack = document.getElementById("promo-track");
  if (!promoTrack || !Array.isArray(listaProdutos) || listaProdutos.length === 0) return;

  const isPaginaInterna = window.location.pathname.includes("/pages/");
  const destinoDetalheBase = isPaginaInterna
    ? "./productDetails.html"
    : "./pages/productDetails.html";

  const promocoesConfiguradas = obterPromocoesCarrossel();

  const produtosPorId = new Map(listaProdutos.map((produto) => [produto.id, produto]));
  const promocoes = promocoesConfiguradas
    .map((config) => {
      const produto = produtosPorId.get(config.id);
      if (!produto) return null;

      return {
        ...produto,
        precoOriginal: Number(produto.preco) || 0,
        precoPromocional: Number(config.precoPromocional) || 0,
      };
    })
    .filter(Boolean);

  const cardsHtml = promocoes
    .map((prod) => {
      const imgPath = isPaginaInterna ? prod.img.replace("./", "../") : prod.img;
      const precoOriginal = Number(prod.precoOriginal) || 0;
      const precoPromocional = Number(prod.precoPromocional) || 0;
      const nomeProduto = prod.nome || "Produto";
      const nomeCurto = nomeProduto.slice(0, 58);

      return `
        <a class="promo-card" href="${destinoDetalheBase}?id=${prod.id}" aria-label="Ver promoção de ${nomeProduto}">
          <img src="${imgPath}" alt="${nomeProduto}" loading="lazy" decoding="async">
          <h3>${nomeCurto}</h3>
          <p class="promo-price-from">de ${formatarMoedaBR(precoOriginal)}</p>
          <p class="promo-price">${formatarMoedaBR(precoPromocional || precoOriginal)}</p>
        </a>
      `;
    })
    .join("");
  promoTrack.innerHTML = cardsHtml;
  if (promocoes.length > 1) {
    promoTrack.innerHTML += cardsHtml;
  }

  const podeFazerLoop = promocoes.length > 1 && promoTrack.scrollWidth > promoTrack.clientWidth;
  const larguraLoop = podeFazerLoop ? promoTrack.scrollWidth / 2 : promoTrack.scrollWidth;
  const velocidadePxPorSegundo = 38;
  let pausado = false;
  let ultimoFrame = 0;
  let timeoutInteracao = null;

  if (promoTrack._promoRafId) {
    window.cancelAnimationFrame(promoTrack._promoRafId);
  }

  const normalizarScrollLoop = () => {
    if (!podeFazerLoop || larguraLoop <= 0) return;
    if (promoTrack.scrollLeft >= larguraLoop) {
      promoTrack.scrollLeft -= larguraLoop;
    } else if (promoTrack.scrollLeft < 0) {
      promoTrack.scrollLeft += larguraLoop;
    }
  };

  const pausarTemporariamente = (duracaoMs = 850) => {
    pausado = true;
    if (timeoutInteracao) {
      window.clearTimeout(timeoutInteracao);
    }
    timeoutInteracao = window.setTimeout(() => {
      pausado = false;
    }, duracaoMs);
  };

  const animar = (timestamp) => {
    if (!ultimoFrame) ultimoFrame = timestamp;
    const deltaMs = timestamp - ultimoFrame;
    ultimoFrame = timestamp;

    if (!pausado && podeFazerLoop) {
      const deslocamento = (velocidadePxPorSegundo * deltaMs) / 1000;
      promoTrack.scrollLeft += deslocamento;
      normalizarScrollLoop();
    }

    promoTrack._promoRafId = window.requestAnimationFrame(animar);
  };

  const prevBtn = document.querySelector(".promo-prev");
  const nextBtn = document.querySelector(".promo-next");
  const scrollAmount = 260;

  const moverManual = (direcao) => {
    pausarTemporariamente();
    promoTrack.scrollBy({ left: direcao * scrollAmount, behavior: "smooth" });
    window.setTimeout(normalizarScrollLoop, 420);
  };

  if (prevBtn) {
    prevBtn.addEventListener("click", () => moverManual(-1));
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => moverManual(1));
  }

  promoTrack.scrollLeft = 0;
  promoTrack.addEventListener("mouseenter", () => {
    pausado = true;
  });
  promoTrack.addEventListener("mouseleave", () => {
    pausado = false;
  });

  promoTrack._promoRafId = window.requestAnimationFrame(animar);
}

function inicializarCarrosselSegmentos() {
  const segmentTrack = document.querySelector(".segment-track");
  const prevBtn = document.querySelector(".segment-prev");
  const nextBtn = document.querySelector(".segment-next");

  if (!segmentTrack) return;

  const scrollAmount = 260;

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      segmentTrack.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      segmentTrack.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
  }
}

function renderizarProdutos(lista) {
  if (!grid) return;
  grid.innerHTML = "";
  if (lista.length === 0) {
    grid.innerHTML =
      "<p class='products-empty-state'>Nenhum produto encontrado.</p>";
    return;
  }

  const isPaginaInterna = window.location.pathname.includes("/pages/");
  const destinoDetalheBase = isPaginaInterna
    ? "./productDetails.html"
    : "./pages/productDetails.html";

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

    const destinoDetalhe = `${destinoDetalheBase}?id=${prod.id}`;
    const precoPromocional = obterPrecoPromocionalPorId(prod.id);
    const precoAtual = Number.isFinite(precoPromocional) && precoPromocional > 0
      ? precoPromocional
      : Number(prod.preco);
    const temPromocao = Number.isFinite(precoPromocional) && precoPromocional > 0 && precoPromocional < Number(prod.preco);
    const precoAvista = obterPrecoAvistaProduto({
      ...prod,
      preco: precoAtual,
    });

    cardDiv.innerHTML = `
      <a href="${destinoDetalhe}" class="product-card-link" aria-label="Abrir produto ${prod.nome}">
        <div class="product-image-container">
          <span class="category-badge">${categoriaPrincipal.toUpperCase()}</span>
          <img src="${imgPath}" alt="${prod.nome}" class="product-img" loading="lazy" decoding="async">
        </div>
        <div class="product-info">
          <h3>${prod.nome}</h3>
          <div class="product-footer">
            <div class="price-container">
              <div class="price-stack">
                ${temPromocao ? `<span class="card-price-from">de ${formatarMoedaBR(prod.preco)}</span>` : ""}
                <span class="price-value">${formatarMoedaBR(precoAtual)}</span>
              </div>
              <button class="btn-add-cart" data-id="${prod.id}">
                <img class="carrinho_card" src="${cartIconPath}" alt="Adicionar ao carrinho" loading="lazy" decoding="async">
              </button>
            </div>
            <p class="installment-preview">${(() => {
              const limiteParcelas = Number(prod.maxParcelasSemJuros);
              const parcelamento = calcularParcelamentoSemJuros(
                precoAtual,
                Number.isFinite(limiteParcelas) && limiteParcelas > 0 ? limiteParcelas : 12,
              );
              return `${parcelamento.parcelas}x de ${formatarMoedaBR(parcelamento.valorParcela)} sem juros`;
            })()}</p>
            ${precoAvista != null ? `<p class="cash-price">A vista ${formatarMoedaBR(precoAvista)}</p>` : ""}
            <ul class="product-trust-list">
              <li><i class="fa-solid fa-check"></i><span>Parcelamento sem juros</span></li>
              <li><i class="fa-solid fa-check"></i><span>Entrega em todo RS</span></li>
              <li><i class="fa-solid fa-check"></i><span>Produção própria</span></li>
            </ul>
          </div>
        </div>
      </a>`;

    cardDiv.addEventListener("click", (e) => {
      if (e.target.closest(".btn-add-cart")) return;
      window.location.href = destinoDetalhe;
    });
    grid.appendChild(cardDiv);
  });
}

function rolarParaTopoDosProdutos() {
  if (!grid) return;
  const topoDaGrade = grid.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: Math.max(0, topoDaGrade - 24), behavior: "smooth" });
}

function exibirPagina(lista, pagina, { rolarParaTopo = false } = {}) {
  const container = document.querySelector(".page-numbers");
  const totalPaginas = Math.max(1, Math.ceil(lista.length / itensPorPagina));
  paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  renderizarProdutos(lista.slice(inicio, inicio + itensPorPagina));
  if (rolarParaTopo) rolarParaTopoDosProdutos();
  if (container) atualizarBotoesPaginacao(lista.length, paginaAtual);
}

function atualizarBotoesPaginacao(totalItens, pagina) {
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  const container = document.querySelector(".page-numbers");
  if (!container) return;

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const limitePaginas = isMobile ? 3 : totalPaginas;

  container.innerHTML = "";
  for (let i = 1; i <= Math.min(totalPaginas, limitePaginas); i++) {
    const activeClass = i === pagina ? "active" : "";
    container.innerHTML += `<button class="page-num ${activeClass}" type="button" data-page=\"${i}\">${i}</button>`;
  }
}

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
  return buildCartKey(item);
}

async function usuarioLogado() {
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data?.session?.user);
  } catch {
    return false;
  }
}

function addToCart(produto) {
  const produtoComPromocao = enriquecerProdutoComPromocao(produto);
  const quantidade = Math.max(1, parseInt(produto.quantidade, 10) || 1);
  const cart = getCart();
  const cartKey = getCartItemKey(produtoComPromocao);
  const existente = cart.find((item) => getCartItemKey(item) === cartKey);

  if (existente) {
    existente.quantidade += quantidade;
  } else {
    cart.push({ ...produtoComPromocao, cartKey, quantidade });
  }

  saveCart(cart);
  atualizarContadorCarrinho();

  usuarioLogado().then((logado) => {
    if (logado) {
      addItemToDb({ ...produtoComPromocao, cartKey, quantidade }).catch(() => {});
    }
  });

  try {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_cart', {
        currency: 'BRL',
        value: produto.preco,
        items: [{
          item_id: String(produto.id),
          item_name: produto.nome,
          price: produto.preco,
          quantity: produto.quantidade || 1,
        }],
      });
    }
  } catch {
    // Falha silenciosa de analytics.
  }

  try {
    if (typeof fbq !== 'undefined') {
      fbq('track', 'AddToCart', {
        value: produto.preco,
        currency: 'BRL',
        content_ids: [String(produto.id)],
        content_type: 'product',
        content_name: produto.nome,
      });
    }
  } catch {
    // Falha silenciosa de analytics.
  }

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
      ? `<p>Largura: ${formatarMedidaCm(item.larguraOrcada)}</p>`
      : "";
    const corInfo = item.corOrcada ? `<p>Cor: ${item.corOrcada}</p>` : "";
    const alturaInfo = item.alturaOrcada
      ? `<p>Altura: ${formatarMedidaCm(item.alturaOrcada)}</p>`
      : "";
    const profundidadeInfo = item.profundidadeOrcada
      ? `<p>Profundidade: ${formatarMedidaCm(item.profundidadeOrcada)}</p>`
      : "";

    cartItemsContainer.innerHTML += `
      <div class="cart-item">
        <img src="${imgPath}" alt="${item.nome}">
        <div class="cart-item-info">
          <h4>${item.nome}</h4>
          ${corInfo}
          ${larguraInfo}
          ${alturaInfo}
          ${profundidadeInfo}
          <p>Qtd: ${item.quantidade}</p>
          <p>${formatarMoedaBR(item.preco * item.quantidade)}</p>
        </div>
        <button class="btn-remove-item" data-cart-key="${getCartItemKey(item)}" title="Remover item">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>`;
  });
  totalElement.textContent = formatarMoedaBR(total);
}

function abrirCarrinhoDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  const whatsappBtn = document.querySelector(".whatsapp-float");
  const cartFloating = document.querySelector(".cart-icon");
  if (!drawer || !overlay) return;

  drawer.classList.add("active");
  drawer.setAttribute("aria-hidden", "false");
  overlay.classList.add("active");
  if (whatsappBtn) whatsappBtn.style.display = "none";
  if (cartFloating) cartFloating.style.display = "none";
  renderizarCarrinho();
}

function fecharCarrinhoDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  const whatsappBtn = document.querySelector(".whatsapp-float");
  const cartFloating = document.querySelector(".cart-icon");
  if (!drawer || !overlay) return;

  drawer.classList.remove("active");
  drawer.setAttribute("aria-hidden", "true");
  overlay.classList.remove("active");
  if (whatsappBtn) whatsappBtn.style.display = "flex";
  if (cartFloating) cartFloating.style.display = "flex";
}

function limparCarrinho() {
  if (confirm("Deseja realmente remover todos os itens do carrinho?")) {
    saveCart([]); // Salva um array vazio
    atualizarContadorCarrinho(); // Zera o contador visual
    renderizarCarrinho(); // Atualiza a lista na gaveta

    usuarioLogado().then((logado) => {
      if (logado) {
        clearCartInDb().catch(() => {});
      }
    });
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
      ? `\n  Largura: ${formatarMedidaCm(item.larguraOrcada)}`
      : "";
    const corInfo = item.corOrcada ? `\n  Cor: ${item.corOrcada}` : "";
    const alturaInfo = item.alturaOrcada
      ? `\n  Altura: ${formatarMedidaCm(item.alturaOrcada)}`
      : "";
    const profundidadeInfo = item.profundidadeOrcada
      ? `\n  Profundidade: ${formatarMedidaCm(item.profundidadeOrcada)}`
      : "";

    mensagem += `• *${item.nome}*\n  Qtd: ${item.quantidade} x ${formatarMoedaBR(item.preco)}${corInfo}${larguraInfo}${alturaInfo}${profundidadeInfo}\n\n`;
  });

  mensagem += `*Valor Total: ${formatarMoedaBR(total)}*`;
  window.open(
    `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`,
    "_blank",
  );
}

function irParaFinalizacao() {
  const cart = getCart();
  if (cart.length === 0) {
    alert("Seu carrinho está vazio!");
    return;
  }

  const isPaginaInterna = window.location.pathname.includes("/pages/");
  const destino = isPaginaInterna
    ? "./checkout.html"
    : "./pages/checkout.html";

  window.location.href = destino;
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
        <a class="suggestion-item" href="${urlDestino}" aria-label="Abrir produto ${prod.nome}">
          <img src="${imgPath}" alt="${prod.nome}">
          <span>${prod.nome}</span>
        </a>
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

if (searchInput) {
  searchInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    executarBuscaTopo();
  });
}

const searchBtn = document.getElementById("search-btn");
if (searchBtn) {
  searchBtn.addEventListener("click", () => executarBuscaTopo());
}

function executarBuscaTopo() {
  if (possuiGridProdutos) {
    aplicarFiltros();
    return;
  }

  const termo = encodeURIComponent(searchInput ? searchInput.value.trim() : "");
  const categoria = encodeURIComponent(
    searchCategoryTop ? searchCategoryTop.value : "Todos",
  );

  const destinoBase = window.location.pathname.includes("/pages/")
    ? "../index.html"
    : "./index.html";

  window.location.href = `${destinoBase}?busca=${termo}&categoria=${categoria}`;
}

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
document.addEventListener("DOMContentLoaded", async () => {
  inicializarCategoriasDaInterface();
  try {
    const { data, error } = await supabase.auth.getSession();
    const isLoggedIn = Boolean(data?.session?.user) && !error;

    if (isLoggedIn) {
      await loadCartFromDb();
    }
  } catch (error) {
    console.error('[index] Erro ao restaurar carrinho:', error);
  }

  atualizarContadorCarrinho();

  const parametrosUrl = new URLSearchParams(window.location.search);
  const buscaUrl = parametrosUrl.get("busca");
  const categoriaUrl = parametrosUrl.get("categoria");

  if (searchInput && buscaUrl) {
    searchInput.value = buscaUrl;
  }

  if (searchCategoryTop && categoriaUrl) {
    const optionExists = [...searchCategoryTop.options].some(
      (opcao) => opcao.value === categoriaUrl,
    );
    searchCategoryTop.value = optionExists ? categoriaUrl : "Todos";
  }

  carregarCatalogo();
  inicializarCarrosselSegmentos();

  // --- LÓGICA DO MENU DROPDOWN (MAIS VENDIDOS) ---
  document.querySelectorAll(".dropdown-menu a").forEach((link) => {
    link.addEventListener("click", (e) => {
      const filtro = link.getAttribute("data-filter");

      if (!filtro) return;
      e.preventDefault(); // Mantém na página apenas para links de filtro

      if (searchCategoryTop) {
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
      abrirCarrinhoDrawer();
    });
  }

  const closeCartBtn = document.getElementById("close-cart");
  if (closeCartBtn)
    closeCartBtn.addEventListener("click", () => {
      fecharCarrinhoDrawer();
    });

  const cartOverlay = document.getElementById("cart-overlay");
  if (cartOverlay)
    cartOverlay.addEventListener("click", () => {
      fecharCarrinhoDrawer();
    });

  const abrirCarrinhoPorHash = () => {
    if (window.location.hash === "#carrinho") {
      abrirCarrinhoDrawer();
    }
  };

  abrirCarrinhoPorHash();
  window.addEventListener("hashchange", abrirCarrinhoPorHash);

  const btnFinalizar = document.querySelector(".checkout-btn");
  if (btnFinalizar)
    btnFinalizar.addEventListener("click", irParaFinalizacao);

  const paginationPrev = document.getElementById("pagination-prev");
  const paginationNext = document.getElementById("pagination-next");
  const pageNumbers = document.querySelector(".page-numbers");

  if (paginationPrev) {
    paginationPrev.addEventListener("click", () => {
      exibirPagina(listaFiltrada, paginaAtual - 1, { rolarParaTopo: true });
    });
  }
  if (paginationNext) {
    paginationNext.addEventListener("click", () => {
      exibirPagina(listaFiltrada, paginaAtual + 1, { rolarParaTopo: true });
    });
  }
  if (pageNumbers) {
    pageNumbers.addEventListener("click", (event) => {
      const botao = event.target.closest(".page-num[data-page]");
      if (!botao) return;
      const pagina = Number(botao.getAttribute("data-page"));
      exibirPagina(listaFiltrada, pagina, { rolarParaTopo: true });
    });
  }

  // --- RECONECTANDO SEUS FILTROS ORIGINAIS ---
  document
    .querySelectorAll(".filter-list li, .category-card, .segment-item[data-category]")
    .forEach((item) => {
      const processarItemCategoria = () => {
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
      };
      item.addEventListener("click", processarItemCategoria);
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          processarItemCategoria();
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
  if (typeSelect) typeSelect.addEventListener("change", () => aplicarFiltros());
  if (heightSelect) heightSelect.addEventListener("change", () => aplicarFiltros());
  if (widthSelect) widthSelect.addEventListener("change", () => aplicarFiltros());
  if (materialSelect) materialSelect.addEventListener("change", () => aplicarFiltros());
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
      if (typeSelect) typeSelect.value = "";
      if (heightSelect) heightSelect.value = "";
      if (widthSelect) widthSelect.value = "";
      if (materialSelect) materialSelect.value = "";
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

      usuarioLogado().then((logado) => {
        if (logado) {
          removeItemFromDb(cartKey).catch(() => {});
        }
      });
    }

    const btnAdd = e.target.closest(".btn-add-cart");
    if (btnAdd) {
      e.stopPropagation();
      const id = parseInt(btnAdd.dataset.id);
      const produto = produtos.find((p) => p.id === id);
      if (produto) addToCart({ ...produto, quantidade: 1 });
    }
  });
});

// Exportação global para o productDetails.js
window.addToCart = addToCart;
window.renderizarCarrinho = renderizarCarrinho;
window.atualizarContadorCarrinho = atualizarContadorCarrinho;
