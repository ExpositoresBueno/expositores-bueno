const numeroWhatsApp = "5551996034579";

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

function formatarReal(valor) {
  return formatadorMoedaBR.format(Number(valor) || 0);
}

function formatarNumeroBR(valor) {
  return formatadorNumeroBR.format(Number(valor) || 0);
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
      ? `<p>Largura: ${formatarNumeroBR(item.larguraOrcada)}m</p>`
      : "";
    const corInfo = item.corOrcada ? `<p>Cor: ${item.corOrcada}</p>` : "";

    container.innerHTML += `
      <article class="checkout-item">
        <img src="../${item.img.replace("./", "")}" alt="${item.nome}">
        <div>
          <strong>${item.nome}</strong>
          ${corInfo}
          ${larguraInfo}
          <p>Quantidade: ${item.quantidade}</p>
          <p>Subtotal: ${formatarReal(item.preco * item.quantidade)}</p>
        </div>
      </article>
    `;
  });
}

function preencherParcelas(total) {
  const selectParcelas = document.getElementById("installments");
  if (!selectParcelas) return;

  const { maxParcelas } = calcularParcelamentoSemJuros(total);
  selectParcelas.innerHTML = "";

  for (let parcela = 1; parcela <= maxParcelas; parcela += 1) {
    const valorParcela = total / parcela;
    const option = document.createElement("option");
    option.value = parcela;
    option.textContent = `${parcela}x de ${formatarReal(valorParcela)} sem juros`;
    selectParcelas.appendChild(option);
  }
}

function atualizarResumo(total) {
  const totalEl = document.getElementById("checkout-total");
  const parcelaEl = document.getElementById("installment-value");
  const parcelasEl = document.getElementById("installments");

  if (!totalEl || !parcelaEl || !parcelasEl) return;

  const parcelas = Number(parcelasEl.value) || 1;
  totalEl.textContent = formatarReal(total);
  parcelaEl.textContent = formatarReal(total / parcelas);
}

function montarMensagem(cart, total) {
  const nome = document.getElementById("client-name")?.value.trim();
  const cidade = document.getElementById("client-city")?.value.trim();
  const pagamento = document.getElementById("payment-method")?.value;
  const parcelas = Number(document.getElementById("installments")?.value || 1);

  if (!nome || !cidade) {
    alert("Por favor, informe nome e cidade para finalizar.");
    return null;
  }

  let mensagem = "Olá! Gostaria de finalizar meu pedido:\n\n";
  mensagem += `*Cliente:* ${nome}\n`;
  mensagem += `*Cidade:* ${cidade}\n\n`;

  cart.forEach((item) => {
    const larguraInfo = item.larguraOrcada
      ? `\n  Largura: ${formatarNumeroBR(item.larguraOrcada)}m`
      : "";
    const corInfo = item.corOrcada ? `\n  Cor: ${item.corOrcada}` : "";

    mensagem += `• *${item.nome}*\n  Qtd: ${item.quantidade} x ${formatarReal(item.preco)}${corInfo}${larguraInfo}\n  Subtotal: ${formatarReal(item.preco * item.quantidade)}\n\n`;
  });

  mensagem += `*Forma de pagamento:* ${pagamento}\n`;
  mensagem += `*Parcelamento:* ${parcelas}x de ${formatarReal(total / parcelas)} sem juros\n`;
  mensagem += `*Total do pedido:* ${formatarReal(total)}`;

  return mensagem;
}

function inicializarCheckout() {
  const cart = getCart();
  renderizarItens(cart);

  const total = cart.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  preencherParcelas(total);
  atualizarResumo(total);

  const parcelasEl = document.getElementById("installments");
  if (parcelasEl) {
    parcelasEl.addEventListener("change", () => atualizarResumo(total));
  }

  const enviarBtn = document.getElementById("send-whatsapp");
  if (enviarBtn) {
    enviarBtn.addEventListener("click", () => {
      if (!cart.length) {
        alert("Seu carrinho está vazio.");
        return;
      }

      const mensagem = montarMensagem(cart, total);
      if (!mensagem) return;

      window.open(
        `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`,
        "_blank",
      );
    });
  }
}

document.addEventListener("DOMContentLoaded", inicializarCheckout);
