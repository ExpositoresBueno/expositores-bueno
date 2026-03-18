const numeroWhatsApp = "5551996034579";
const DESCONTO_PAGAMENTO_AVISTA = 0.05;
const PAGAMENTOS_COM_DESCONTO = ["PIX", "DINHEIRO"];
const CAMPOS_PRECO_AVISTA = ["precoAvista", "preco_a_vista", "precoAVista"];
const PAGAMENTO_CREDITO = "CARTÃO DE CRÉDITO";
const NOMES_KITS_SEM_DESCONTO_AVISTA = ["KIT LOJA", "KIT LOJA DE ROUPAS"];
const MAX_PARCELAS_PADRAO = 12;
const MAX_PARCELAS_KIT = 4;

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
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
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}


function getCartItemKey(item) {
  if (item.cartKey) return item.cartKey;

  const partes = [
    item.id != null ? String(item.id) : item.nome || "",
    item.corOrcada || "",
    item.larguraOrcada != null ? String(item.larguraOrcada) : "",
    item.alturaOrcada != null ? String(item.alturaOrcada) : "",
    item.profundidadeOrcada != null ? String(item.profundidadeOrcada) : "",
  ];
  return partes.join("|");
}

function formatarReal(valor) {
  return formatadorMoedaBR.format(Number(valor) || 0);
}

function formatarNumeroBR(valor) {
  return formatadorNumeroBR.format(Number(valor) || 0);
}

function formatarMedidaCm(valorEmMetros) {
  const valor = Number(valorEmMetros);
  if (!Number.isFinite(valor) || valor <= 0) return "";
  return `${formatarNumeroBR(valor * 100)}cm`;
}

function normalizarTexto(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function itemSemDescontoAvista(item) {
  if (!item) return false;

  if (item.naoAplicarDescontoAvista === true) return true;

  const nomeNormalizado = normalizarTexto(item.nome);
  return NOMES_KITS_SEM_DESCONTO_AVISTA.some(
    (nomeKit) => normalizarTexto(nomeKit) === nomeNormalizado,
  );
}

function obterLimiteParcelasItem(item) {
  const limiteConfigurado = Number(item?.maxParcelasSemJuros);
  if (Number.isFinite(limiteConfigurado) && limiteConfigurado > 0) {
    return limiteConfigurado;
  }

  if (itemSemDescontoAvista(item)) return MAX_PARCELAS_KIT;
  return MAX_PARCELAS_PADRAO;
}

function calcularParcelamentoSemJuros(valorTotal, limiteParcelas = MAX_PARCELAS_PADRAO) {
  const valor = Number(valorTotal);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { maxParcelas: 1, valorParcelaMinima: 0 };
  }

  const parcelasMaximasPorValor = Math.floor(valor / 200);
  const maxParcelas = Math.min(limiteParcelas, Math.max(1, parcelasMaximasPorValor));

  return {
    maxParcelas,
    valorParcelaMinima: valor / maxParcelas,
  };
}

function obterMetodoPagamentoSelecionado() {
  const metodo = document.getElementById("payment-method")?.value || "";
  return metodo.toUpperCase();
}

function obterSegundoMetodoPagamentoSelecionado() {
  const metodo = document.getElementById("second-payment-method")?.value || "NENHUM";
  return metodo.toUpperCase();
}

function obterValorPrimeiroPagamento(totalComDesconto) {
  const input = document.getElementById("first-payment-amount");
  const valorDigitado = Number(input?.value || 0);
  if (!Number.isFinite(valorDigitado) || valorDigitado <= 0) return 0;
  return Math.min(valorDigitado, Number(totalComDesconto) || 0);
}

function sincronizarCamposPagamento(totalComDesconto) {
  const segundoPagamentoEl = document.getElementById("second-payment-method");
  const primeiroPagamentoEl = document.getElementById("first-payment-amount");
  if (!segundoPagamentoEl || !primeiroPagamentoEl) return;

  const possuiSegundaFormaSelecionada = segundoPagamentoEl.value !== "NENHUM";
  const totalNormalizado = Number(totalComDesconto) || 0;

  if (!possuiSegundaFormaSelecionada) {
    primeiroPagamentoEl.disabled = true;
    primeiroPagamentoEl.value = totalNormalizado > 0 ? totalNormalizado.toFixed(2) : "";
    primeiroPagamentoEl.dataset.autoFill = "true";
    return;
  }

  const estavaAutopreenchido = primeiroPagamentoEl.dataset.autoFill === "true";
  primeiroPagamentoEl.disabled = false;
  if (estavaAutopreenchido) {
    primeiroPagamentoEl.value = "";
  }
  primeiroPagamentoEl.dataset.autoFill = "false";
}

function obterPrecoAvistaItem(item) {
  for (const campo of CAMPOS_PRECO_AVISTA) {
    const valor = Number(item?.[campo]);
    if (Number.isFinite(valor) && valor > 0) return valor;
  }
  return null;
}

function calcularResumo(cart) {
  const subtotal = cart.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  const metodoPagamento = obterMetodoPagamentoSelecionado();
  const segundoMetodoPagamento = obterSegundoMetodoPagamentoSelecionado();
  const segundaFormaSelecionada = segundoMetodoPagamento !== "NENHUM";
  const temDesconto = !segundaFormaSelecionada && PAGAMENTOS_COM_DESCONTO.includes(metodoPagamento);

  let totalComDesconto = subtotal;
  if (temDesconto) {
    totalComDesconto = cart.reduce((acc, item) => {
      if (itemSemDescontoAvista(item)) {
        return acc + (Number(item.preco) || 0) * item.quantidade;
      }

      const precoAvistaItem = obterPrecoAvistaItem(item);
      const precoBase = Number(item.preco) || 0;
      const precoFinalItem = precoAvistaItem != null ? precoAvistaItem : precoBase * (1 - DESCONTO_PAGAMENTO_AVISTA);
      return acc + precoFinalItem * item.quantidade;
    }, 0);
  }

  const desconto = Math.max(0, subtotal - totalComDesconto);
  const primeiroPagamento = segundaFormaSelecionada
    ? obterValorPrimeiroPagamento(totalComDesconto)
    : totalComDesconto;
  const saldoSegundaForma = segundaFormaSelecionada
    ? Math.max(0, totalComDesconto - primeiroPagamento)
    : 0;
  const possuiSegundoPagamento = segundaFormaSelecionada && saldoSegundaForma > 0;

  return {
    subtotal,
    desconto,
    totalComDesconto,
    metodoPagamento,
    segundoMetodoPagamento,
    primeiroPagamento,
    saldoSegundaForma,
    possuiSegundoPagamento,
  };
}


function atualizarQuantidadeItem(cartKey, delta) {
  const cart = getCart();
  const itemIndex = cart.findIndex((item) => getCartItemKey(item) === cartKey);
  if (itemIndex < 0) return;

  const novaQuantidade = (Number(cart[itemIndex].quantidade) || 0) + delta;
  if (novaQuantidade <= 0) {
    cart.splice(itemIndex, 1);
  } else {
    cart[itemIndex].quantidade = novaQuantidade;
  }

  saveCart(cart);
  atualizarCheckout();
}

function renderizarItens(cart) {
  const container = document.getElementById("checkout-items");
  if (!container) return;

  container.innerHTML = "";

  if (!cart.length) {
    container.innerHTML = '<p class="empty-state">Seu carrinho está vazio.</p>';
    return;
  }

  cart.forEach((item) => {
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

    container.innerHTML += `
      <article class="checkout-item">
        <img src="../${item.img.replace("./", "")}" alt="${item.nome}">
        <div class="checkout-item-info">
          <a class="checkout-item-title" href="./productDetails.html?id=${item.id}">${item.nome}</a>
          ${corInfo}
          ${larguraInfo}
          ${alturaInfo}
          ${profundidadeInfo}
          <div class="quantity-control">
            <span>Quantidade:</span>
            <button type="button" class="qty-btn" data-cart-key="${getCartItemKey(item)}" data-delta="-1">−</button>
            <strong>${item.quantidade}</strong>
            <button type="button" class="qty-btn" data-cart-key="${getCartItemKey(item)}" data-delta="1">+</button>
          </div>
          <p>Subtotal: ${formatarReal(item.preco * item.quantidade)}</p>
          <a class="customize-product-btn" href="./productDetails.html?id=${item.id}">Personalizar este produto</a>
        </div>
      </article>
    `;
  });

  container.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cartKey = btn.getAttribute("data-cart-key");
      const delta = Number(btn.getAttribute("data-delta") || 0);
      atualizarQuantidadeItem(cartKey, delta);
    });
  });
}

function preencherParcelas(totalComDesconto) {
  const selectParcelas = document.getElementById("installments");
  if (!selectParcelas) return;

  const { saldoSegundaForma, possuiSegundoPagamento, segundoMetodoPagamento, metodoPagamento } = calcularResumo(getCart());
  const metodoParcelamento = possuiSegundoPagamento ? segundoMetodoPagamento : metodoPagamento;
  const baseParcelamento = possuiSegundoPagamento ? saldoSegundaForma : totalComDesconto;
  const permiteParcelamento = metodoParcelamento === PAGAMENTO_CREDITO;

  selectParcelas.innerHTML = "";

  if (!permiteParcelamento) {
    const option = document.createElement("option");
    option.value = "1";
    option.textContent = `1x de ${formatarReal(baseParcelamento)} sem juros`;
    selectParcelas.appendChild(option);
    selectParcelas.disabled = true;
    return;
  }

  const cart = getCart();
  const limiteParcelasCarrinho = cart.reduce(
    (menorLimite, item) => Math.min(menorLimite, obterLimiteParcelasItem(item)),
    MAX_PARCELAS_PADRAO,
  );

  const { maxParcelas } = calcularParcelamentoSemJuros(
    baseParcelamento,
    limiteParcelasCarrinho,
  );
  for (let parcela = 1; parcela <= maxParcelas; parcela += 1) {
    const valorParcela = baseParcelamento / parcela;
    const option = document.createElement("option");
    option.value = parcela;
    option.textContent = `${parcela}x de ${formatarReal(valorParcela)} sem juros`;
    selectParcelas.appendChild(option);
  }

  selectParcelas.disabled = false;
}


function atualizarResumo(cart) {
  const subtotalEl = document.getElementById("checkout-subtotal");
  const descontoEl = document.getElementById("checkout-discount");
  const totalEl = document.getElementById("checkout-total");
  const primeiroPagamentoEl = document.getElementById("first-payment-total");
  const saldoSegundaFormaEl = document.getElementById("second-payment-total");
  const parcelaEl = document.getElementById("installment-value");
  const parcelasEl = document.getElementById("installments");
  const valorSegundaFormaInput = document.getElementById("second-payment-amount");

  if (!subtotalEl || !descontoEl || !totalEl || !parcelaEl || !parcelasEl || !primeiroPagamentoEl || !saldoSegundaFormaEl) return;

  const {
    subtotal,
    desconto,
    totalComDesconto,
    metodoPagamento,
    segundoMetodoPagamento,
    primeiroPagamento,
    saldoSegundaForma,
    possuiSegundoPagamento,
  } = calcularResumo(cart);
  const parcelas = Number(parcelasEl.value) || 1;

  const baseParcelamento = possuiSegundoPagamento ? saldoSegundaForma : totalComDesconto;
  const metodoParcelamento = possuiSegundoPagamento ? segundoMetodoPagamento : metodoPagamento;

  subtotalEl.textContent = formatarReal(subtotal);
  descontoEl.textContent = desconto > 0 ? `- ${formatarReal(desconto)}` : formatarReal(0);
  primeiroPagamentoEl.textContent = formatarReal(primeiroPagamento);
  saldoSegundaFormaEl.textContent = formatarReal(saldoSegundaForma);
  if (valorSegundaFormaInput) {
    valorSegundaFormaInput.value = formatarReal(saldoSegundaForma);
  }
  totalEl.textContent = formatarReal(totalComDesconto);
  parcelaEl.textContent = metodoParcelamento === PAGAMENTO_CREDITO
    ? formatarReal(baseParcelamento / parcelas)
    : formatarReal(baseParcelamento);
}


function montarMensagem(cart) {
  const nome = document.getElementById("client-name")?.value.trim();
  const cidade = document.getElementById("client-city")?.value.trim();
  const pagamento = document.getElementById("payment-method")?.value;
  const parcelas = Number(document.getElementById("installments")?.value || 1);
  const {
    subtotal,
    desconto,
    totalComDesconto,
    segundoMetodoPagamento,
    primeiroPagamento,
    saldoSegundaForma,
    possuiSegundoPagamento,
  } = calcularResumo(cart);

  if (!nome || !cidade) {
    alert("Por favor, informe nome e cidade para finalizar.");
    return null;
  }

  let mensagem = "Olá! Gostaria de finalizar meu pedido:\n\n";
  mensagem += `*Cliente:* ${nome}\n`;
  mensagem += `*Cidade:* ${cidade}\n\n`;

  cart.forEach((item) => {
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

    mensagem += `• *${item.nome}*\n  Qtd: ${item.quantidade} x ${formatarReal(item.preco)}${corInfo}${larguraInfo}${alturaInfo}${profundidadeInfo}\n  Subtotal: ${formatarReal(item.preco * item.quantidade)}\n\n`;
  });

  mensagem += `*Subtotal:* ${formatarReal(subtotal)}\n`;
  if (desconto > 0) {
    mensagem += `*Desconto/ajuste à vista:* -${formatarReal(desconto)}\n`;
  }
  mensagem += `*Forma de pagamento principal:* ${pagamento}
`;
  if (possuiSegundoPagamento) {
    mensagem += `*1º pagamento:* ${formatarReal(primeiroPagamento)} (${pagamento})
`;
    mensagem += `*2º pagamento:* ${formatarReal(saldoSegundaForma)} (${segundoMetodoPagamento})
`;
    if (segundoMetodoPagamento === PAGAMENTO_CREDITO) {
      mensagem += `*Parcelamento do saldo:* ${parcelas}x de ${formatarReal(saldoSegundaForma / parcelas)} sem juros
`;
    }
  } else {
    mensagem += `*Parcelamento:* ${parcelas}x de ${formatarReal(totalComDesconto / parcelas)} sem juros
`;
  }
  mensagem += `*Total do pedido:* ${formatarReal(totalComDesconto)}`;

  return mensagem;
}

function atualizarCheckout() {
  const cart = getCart();
  renderizarItens(cart);

  const resumoInicial = calcularResumo(cart);
  sincronizarCamposPagamento(resumoInicial.totalComDesconto);

  const { totalComDesconto } = calcularResumo(cart);
  preencherParcelas(totalComDesconto);
  atualizarResumo(cart);

  const enviarBtn = document.getElementById("send-whatsapp");
  if (enviarBtn) {
    enviarBtn.disabled = cart.length === 0;
  }
}

function inicializarCheckout() {
  atualizarCheckout();

  const parcelasEl = document.getElementById("installments");
  if (parcelasEl) {
    parcelasEl.addEventListener("change", () => {
      const cart = getCart();
      atualizarResumo(cart);
    });
  }

  const pagamentoEl = document.getElementById("payment-method");
  if (pagamentoEl) {
    pagamentoEl.addEventListener("change", () => {
      atualizarCheckout();
    });
  }

  const segundoPagamentoEl = document.getElementById("second-payment-method");
  if (segundoPagamentoEl) {
    segundoPagamentoEl.addEventListener("change", () => {
      atualizarCheckout();
    });
  }

  const primeiroPagamentoEl = document.getElementById("first-payment-amount");
  if (primeiroPagamentoEl) {
    primeiroPagamentoEl.addEventListener("input", () => {
      atualizarCheckout();
    });
  }

  const enviarBtn = document.getElementById("send-whatsapp");
  if (enviarBtn) {
    enviarBtn.addEventListener("click", () => {
      const cart = getCart();
      if (!cart.length) {
        alert("Seu carrinho está vazio.");
        return;
      }

      const mensagem = montarMensagem(cart);
      if (!mensagem) return;

      window.open(
        `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`,
        "_blank",
      );
    });
  }
}

document.addEventListener("DOMContentLoaded", inicializarCheckout);
