const numeroWhatsApp = "5551996034579";
const DESCONTO_PAGAMENTO_AVISTA = 0.05;
const PAGAMENTOS_COM_DESCONTO = ["PIX", "DINHEIRO"];
const CAMPOS_PRECO_AVISTA = ["precoAvista", "preco_a_vista", "precoAVista"];
const PAGAMENTO_CREDITO = "CARTÃO DE CRÉDITO";

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

function calcularParcelamentoSemJuros(valorTotal) {
  const valor = Number(valorTotal);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { maxParcelas: 1, valorParcelaMinima: 0 };
  }

  const parcelasMaximasPorValor = Math.floor(valor / 200);
  const maxParcelas = Math.min(12, Math.max(1, parcelasMaximasPorValor));

  return {
    maxParcelas,
    valorParcelaMinima: valor / maxParcelas,
  };
}

function obterMetodoPagamentoSelecionado() {
  const metodo = document.getElementById("payment-method")?.value || "";
  return metodo.toUpperCase();
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
  const temDesconto = PAGAMENTOS_COM_DESCONTO.includes(metodoPagamento);

  let totalComDesconto = subtotal;
  if (temDesconto) {
    totalComDesconto = cart.reduce((acc, item) => {
      const precoAvistaItem = obterPrecoAvistaItem(item);
      const precoBase = Number(item.preco) || 0;
      const precoFinalItem = precoAvistaItem != null ? precoAvistaItem : precoBase * (1 - DESCONTO_PAGAMENTO_AVISTA);
      return acc + precoFinalItem * item.quantidade;
    }, 0);
  }

  const desconto = Math.max(0, subtotal - totalComDesconto);

  return {
    subtotal,
    desconto,
    totalComDesconto,
    metodoPagamento,
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
        <div>
          <strong>${item.nome}</strong>
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

  const metodoPagamento = obterMetodoPagamentoSelecionado();
  const permiteParcelamento = metodoPagamento === PAGAMENTO_CREDITO;

  selectParcelas.innerHTML = "";

  if (!permiteParcelamento) {
    const option = document.createElement("option");
    option.value = "1";
    option.textContent = `1x de ${formatarReal(totalComDesconto)} sem juros`;
    selectParcelas.appendChild(option);
    selectParcelas.disabled = true;
    return;
  }

  const { maxParcelas } = calcularParcelamentoSemJuros(totalComDesconto);
  for (let parcela = 1; parcela <= maxParcelas; parcela += 1) {
    const valorParcela = totalComDesconto / parcela;
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
  const parcelaEl = document.getElementById("installment-value");
  const parcelasEl = document.getElementById("installments");

  if (!subtotalEl || !descontoEl || !totalEl || !parcelaEl || !parcelasEl) return;

  const { subtotal, desconto, totalComDesconto } = calcularResumo(cart);
  const parcelas = Number(parcelasEl.value) || 1;

  subtotalEl.textContent = formatarReal(subtotal);
  descontoEl.textContent = desconto > 0 ? `- ${formatarReal(desconto)}` : formatarReal(0);
  totalEl.textContent = formatarReal(totalComDesconto);
  parcelaEl.textContent = formatarReal(totalComDesconto / parcelas);
}

function montarMensagem(cart) {
  const nome = document.getElementById("client-name")?.value.trim();
  const cidade = document.getElementById("client-city")?.value.trim();
  const pagamento = document.getElementById("payment-method")?.value;
  const parcelas = Number(document.getElementById("installments")?.value || 1);
  const { subtotal, desconto, totalComDesconto } = calcularResumo(cart);

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
  mensagem += `*Forma de pagamento:* ${pagamento}\n`;
  mensagem += `*Parcelamento:* ${parcelas}x de ${formatarReal(totalComDesconto / parcelas)} sem juros\n`;
  mensagem += `*Total do pedido:* ${formatarReal(totalComDesconto)}`;

  return mensagem;
}

function atualizarCheckout() {
  const cart = getCart();
  renderizarItens(cart);

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
