import { supabase } from "./supabase-client.js";
import { getProfile, getUser } from "./auth.js";
import { getAddresses } from "./profile.js";
import { obterPrecoPromocionalPorId } from "./promo-pricing.js";

const numeroWhatsApp = "5551996034579";
const DESCONTO_PAGAMENTO_AVISTA = 0.05;
const PAGAMENTOS_COM_DESCONTO = ["PIX", "DINHEIRO"];
const CAMPOS_PRECO_AVISTA = ["precoAvista", "preco_a_vista", "precoAVista"];
const PAGAMENTO_CREDITO = "CARTÃO DE CRÉDITO";
const NOMES_KITS_SEM_DESCONTO_AVISTA = ["KIT LOJA", "KIT LOJA DE ROUPAS"];
const MAX_PARCELAS_PADRAO = 12;
const MAX_PARCELAS_KIT = 4;
let enderecosSalvos = [];

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

function limparTituloProduto(nome = "") {
  return String(nome || "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+-\s+[^-()]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extrairDimensoesDoNome(nome = "") {
  const texto = String(nome || "");
  const match = texto.match(/Largura\s*([0-9.,]+)\s*m.*Altura\s*([0-9.,]+)\s*m.*Profundidade\s*([0-9.,]+)\s*m/i);
  if (!match) return null;
  return {
    largura: `${match[1]}m`,
    altura: `${match[2]}m`,
    profundidade: `${match[3]}m`,
  };
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
  const precoPromocionalNoItem = Number(item?.precoPromocional);
  if (Number.isFinite(precoPromocionalNoItem) && precoPromocionalNoItem > 0) {
    return precoPromocionalNoItem;
  }

  const precoPromocionalPorId = obterPrecoPromocionalPorId(item?.id);
  if (precoPromocionalPorId != null) {
    return precoPromocionalPorId;
  }

  for (const campo of CAMPOS_PRECO_AVISTA) {
    const valor = Number(item?.[campo]);
    if (Number.isFinite(valor) && valor > 0) return valor;
  }
  return null;
}

function obterFreteValorAplicado() {
  const resumoFrete = obterResumoFreteSelecionado();
  if (!resumoFrete) return 0;

  const assinaturaAtual = gerarAssinaturaCarrinho(getCart());
  if (resumoFrete.assinaturaCarrinho !== assinaturaAtual) return 0;

  const valor = Number(resumoFrete.valor) || 0;
  return Math.max(0, valor);
}

function gerarAssinaturaCarrinho(cart = []) {
  return cart
    .map((item) => `${item.id}:${item.quantidade}:${Number(item.preco) || 0}`)
    .sort()
    .join("|");
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

  const frete = obterFreteValorAplicado();
  const totalGeral = totalComDesconto + frete;
  const desconto = Math.max(0, subtotal - totalComDesconto);
  const primeiroPagamento = segundaFormaSelecionada
    ? obterValorPrimeiroPagamento(totalGeral)
    : totalGeral;
  const saldoSegundaForma = segundaFormaSelecionada
    ? Math.max(0, totalGeral - primeiroPagamento)
    : 0;
  const possuiSegundoPagamento = segundaFormaSelecionada && saldoSegundaForma > 0;

  return {
    subtotal,
    desconto,
    frete,
    totalGeral,
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
    const tituloLimpo = limparTituloProduto(item.nome);
    const corTexto = item.corOrcada
      ? item.corOrcada
      : (item.nome?.match(/-\s*([^)]+)\)\s*$/)?.[1] || "").trim();
    const dimensoesNome = extrairDimensoesDoNome(item.nome);
    const larguraTexto = item.larguraOrcada
      ? `${formatarNumeroBR(item.larguraOrcada)}m`
      : (dimensoesNome?.largura || "");
    const alturaTexto = item.alturaOrcada
      ? `${formatarNumeroBR(item.alturaOrcada)}m`
      : (dimensoesNome?.altura || "");
    const profundidadeTexto = item.profundidadeOrcada
      ? `${formatarNumeroBR(item.profundidadeOrcada)}m`
      : (dimensoesNome?.profundidade || "");

    const specs = [];
    if (corTexto) specs.push(`Cor: ${corTexto}`);
    if (larguraTexto || alturaTexto || profundidadeTexto) {
      specs.push(`Dimensões: ${larguraTexto || "-"} (L) x ${alturaTexto || "-"} (A) x ${profundidadeTexto || "-"} (P)`);
    }
    const specsHtml = specs.map((linha) => `<p>${linha}</p>`).join("");

    container.innerHTML += `
      <article class="checkout-item">
        <img src="../${item.img.replace("./", "")}" alt="${item.nome}">
        <div class="checkout-item-info">
          <a class="checkout-item-title" href="./productDetails.html?id=${item.id}">${tituloLimpo || item.nome}</a>
          ${specsHtml}
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
  const freteEl = document.getElementById("checkout-frete");
  const totalEl = document.getElementById("checkout-total");
  const primeiroPagamentoEl = document.getElementById("first-payment-total");
  const saldoSegundaFormaEl = document.getElementById("second-payment-total");
  const parcelaEl = document.getElementById("installment-value");
  const parcelasEl = document.getElementById("installments");
  const valorSegundaFormaInput = document.getElementById("second-payment-amount");

  if (!subtotalEl || !descontoEl || !freteEl || !totalEl || !parcelaEl || !parcelasEl || !primeiroPagamentoEl || !saldoSegundaFormaEl) return;

  const {
    subtotal,
    desconto,
    frete,
    totalGeral,
    totalComDesconto,
    metodoPagamento,
    segundoMetodoPagamento,
    primeiroPagamento,
    saldoSegundaForma,
    possuiSegundoPagamento,
  } = calcularResumo(cart);
  const parcelas = Number(parcelasEl.value) || 1;

  const baseParcelamento = possuiSegundoPagamento ? saldoSegundaForma : totalGeral;
  const metodoParcelamento = possuiSegundoPagamento ? segundoMetodoPagamento : metodoPagamento;

  subtotalEl.textContent = formatarReal(subtotal);
  descontoEl.textContent = desconto > 0 ? `- ${formatarReal(desconto)}` : formatarReal(0);
  freteEl.textContent = formatarReal(frete);
  primeiroPagamentoEl.textContent = formatarReal(primeiroPagamento);
  saldoSegundaFormaEl.textContent = formatarReal(saldoSegundaForma);
  if (valorSegundaFormaInput) {
    valorSegundaFormaInput.value = formatarReal(saldoSegundaForma);
  }
  totalEl.textContent = formatarReal(totalGeral);
  parcelaEl.textContent = metodoParcelamento === PAGAMENTO_CREDITO
    ? formatarReal(baseParcelamento / parcelas)
    : formatarReal(baseParcelamento);
}

function obterResumoFreteSelecionado() {
  const resultado = document.getElementById("frete-checkout-resultado");
  if (!resultado) return null;

  const tipo = resultado.dataset.freteTipo || "";
  const valor = Number(resultado.dataset.freteValor || 0);
  const prazo = Number(resultado.dataset.fretePrazo || 0);
  const observacao = resultado.dataset.freteObservacao || "";
  const assinaturaCarrinho = resultado.dataset.freteCartSignature || "";

  if (!tipo) return null;
  return { tipo, valor, prazo, observacao, assinaturaCarrinho };
}


function montarMensagem(cart) {
  const nome = document.getElementById("client-name")?.value.trim();
  const cidade = document.getElementById("client-city")?.value.trim();
  const pagamento = document.getElementById("payment-method")?.value;
  const parcelas = Number(document.getElementById("installments")?.value || 1);
  const {
    subtotal,
    desconto,
    frete,
    totalGeral,
    totalComDesconto,
    segundoMetodoPagamento,
    primeiroPagamento,
    saldoSegundaForma,
    possuiSegundoPagamento,
  } = calcularResumo(cart);
  const freteSelecionado = obterResumoFreteSelecionado();

  if (!nome || !cidade) {
    alert("Por favor, informe nome e cidade para finalizar.");
    return null;
  }

  if (!freteSelecionado) {
    alert("Selecione e calcule uma opção de frete antes de finalizar o pedido.");
    return null;
  }

  const assinaturaAtualCarrinho = gerarAssinaturaCarrinho(cart);
  if (freteSelecionado.assinaturaCarrinho !== assinaturaAtualCarrinho) {
    alert("Seu carrinho mudou após o cálculo de frete. Clique em 'Calcular Frete' novamente.");
    return null;
  }

  let mensagem = "Olá! Gostaria de finalizar meu pedido:\n\n";
  mensagem += `*Cliente:* ${nome}\n`;
  mensagem += `*Cidade:* ${cidade}\n\n`;

  const enderecoSelecionado = obterEnderecoSelecionado();
  if (enderecoSelecionado) {
    const logradouro = enderecoSelecionado.logradouro || "";
    const numero = enderecoSelecionado.numero || "s/n";
    const complemento = enderecoSelecionado.complemento || "";
    const bairro = enderecoSelecionado.bairro || "";
    const cidadeEndereco = enderecoSelecionado.cidade || cidade;
    const estado = enderecoSelecionado.estado || "";
    mensagem += `*Endereço de entrega:* ${logradouro}, ${numero} ${complemento} - ${bairro}, ${cidadeEndereco}/${estado}\n\n`;
  }

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
    mensagem += `*Parcelamento:* ${parcelas}x de ${formatarReal(totalGeral / parcelas)} sem juros
`;
  }
  mensagem += `*Frete:* ${formatarReal(frete)}\n`;
  mensagem += `*Total do pedido:* ${formatarReal(totalGeral)}`;
  if (freteSelecionado) {
    mensagem += `\n*Frete escolhido:* ${freteSelecionado.tipo}`;
    mensagem += `\n*Valor do frete:* ${formatarReal(freteSelecionado.valor)}`;
    if (freteSelecionado.prazo > 0) {
      mensagem += `\n*Prazo de entrega:* ${freteSelecionado.prazo} dia(s) úteis`;
    }
    if (freteSelecionado.observacao) {
      mensagem += `\n*Observação frete:* ${freteSelecionado.observacao}`;
    }
  }

  return mensagem;
}

function exibirFeedbackPedidoSalvo() {
  const feedback = document.getElementById("order-save-feedback");
  if (!feedback) return;

  feedback.textContent = "✓ Pedido salvo no seu histórico";
  feedback.style.display = "block";
  clearTimeout(exibirFeedbackPedidoSalvo.timeoutId);
  exibirFeedbackPedidoSalvo.timeoutId = setTimeout(() => {
    feedback.style.display = "none";
    feedback.textContent = "";
  }, 3000);
}

async function saveOrderToSupabase(cart, resumo) {
  try {
    const user = await getUser();
    if (!user) return null;

    const profile = await getProfile();
    const enderecoSelecionado = obterEnderecoSelecionado();
    const enderecoEntrega = enderecoSelecionado || profile?.endereco_padrao || null;

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        subtotal: Number(resumo.subtotal) || 0,
        desconto: Number(resumo.desconto) || 0,
        total: Number(resumo.totalGeral ?? resumo.totalComDesconto) || 0,
        forma_pagamento: resumo.metodoPagamento || "",
        parcelas: Number(document.getElementById("installments")?.value || 1),
        status: "enviado_whatsapp",
        endereco_entrega: enderecoEntrega,
      })
      .select("id")
      .single();

    if (orderError || !orderData?.id) return null;

    const itensPedido = cart.map((item) => ({
      order_id: orderData.id,
      produto_id: item.id,
      nome: item.nome,
      preco_unitario: Number(item.preco) || 0,
      quantidade: Math.max(1, Number(item.quantidade) || 1),
      img: item.img || "",
      cor_orcada: item.corOrcada || null,
      largura_orcada: Number(item.larguraOrcada) || 0,
      altura_orcada: Number(item.alturaOrcada) || 0,
      profundidade_orcada: Number(item.profundidadeOrcada) || 0,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itensPedido);

    if (itemsError) return null;

    try {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'purchase', {
          transaction_id: orderData.id,
          value: resumo.totalGeral ?? resumo.totalComDesconto,
          currency: 'BRL',
          items: cart.map((item) => ({
            item_id: String(item.id),
            item_name: item.nome,
            price: item.preco,
            quantity: item.quantidade,
          })),
        });
      }
    } catch {
      // Falha silenciosa de analytics.
    }

    try {
      if (typeof fbq !== 'undefined') {
        fbq('track', 'Purchase', {
          value: resumo.totalGeral ?? resumo.totalComDesconto,
          currency: 'BRL',
          content_ids: cart.map((item) => String(item.id)),
          content_type: 'product',
          num_items: cart.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0),
        });
      }
    } catch {
      // Falha silenciosa de analytics.
    }

    return orderData.id;
  } catch {
    return null;
  }
}

function formatarEnderecoOpcao(endereco = {}, indice = 0) {
  const logradouro = endereco.logradouro || "Endereço";
  const numero = endereco.numero || "s/n";
  const bairro = endereco.bairro || "";
  const cidade = endereco.cidade || "";
  const estado = endereco.estado || "";
  return `${indice + 1}. ${logradouro}, ${numero} - ${bairro} ${cidade}/${estado}`.trim();
}

function obterEnderecoSelecionado() {
  const select = document.getElementById("saved-addresses");
  if (!select) return null;
  const valor = select.value;
  if (!valor || valor === "novo") return null;
  const indice = Number(valor);
  if (!Number.isFinite(indice) || indice < 0) return null;
  return enderecosSalvos[indice] || null;
}

function aplicarEnderecoNoFormulario(endereco) {
  const cidadeInput = document.getElementById("client-city");
  if (!cidadeInput) return;
  if (!endereco) {
    cidadeInput.value = "";
    return;
  }
  const cidade = endereco.cidade || "";
  const estado = endereco.estado || "";
  cidadeInput.value = estado ? `${cidade}/${estado}` : cidade;
}

async function inicializarEnderecosSalvos() {
  const section = document.getElementById("saved-address-section");
  const select = document.getElementById("saved-addresses");
  if (!section || !select) return;

  const user = await getUser();
  if (!user) {
    section.hidden = true;
    return;
  }

  const enderecos = await getAddresses();
  enderecosSalvos = (enderecos || []).filter(Boolean);
  if (!enderecosSalvos.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  select.innerHTML = '<option value="novo">Digitar novo endereço</option>';
  enderecosSalvos.forEach((endereco, indice) => {
    const option = document.createElement("option");
    option.value = String(indice);
    option.textContent = formatarEnderecoOpcao(endereco, indice);
    select.appendChild(option);
  });

  if (enderecosSalvos.length > 0) {
    const indicePadrao = enderecosSalvos.findIndex((endereco) => Boolean(endereco.is_default));
    const indiceInicial = indicePadrao >= 0 ? indicePadrao : 0;
    select.value = String(indiceInicial);
    aplicarEnderecoNoFormulario(enderecosSalvos[indiceInicial]);
  }

  select.addEventListener("change", () => {
    aplicarEnderecoNoFormulario(obterEnderecoSelecionado());
  });
}

async function preencherDadosClienteLogado() {
  const user = await getUser();
  if (!user) return;

  const nomeInput = document.getElementById("client-name");
  const cidadeInput = document.getElementById("client-city");
  const feedback = document.getElementById("checkout-account-prefill-note");

  const profile = await getProfile();
  if (nomeInput && profile?.nome) {
    nomeInput.value = profile.nome;
  }

  const enderecos = await getAddresses();
  const enderecoPadrao = (enderecos || []).find((endereco) => Boolean(endereco.is_default));
  if (cidadeInput && enderecoPadrao) {
    const cidade = enderecoPadrao.cidade || "";
    const estado = enderecoPadrao.estado || "";
    cidadeInput.value = estado ? `${cidade}/${estado}` : cidade;
  }

  if (feedback && ((profile?.nome && nomeInput) || enderecoPadrao)) {
    feedback.hidden = false;
  }
}

function atualizarCheckout() {
  const cart = getCart();
  renderizarItens(cart);

  const resumoInicial = calcularResumo(cart);
  sincronizarCamposPagamento(resumoInicial.totalGeral);

  const { totalGeral } = calcularResumo(cart);
  preencherParcelas(totalGeral);
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
    enviarBtn.addEventListener("click", async () => {
      const cart = getCart();
      if (!cart.length) {
        alert("Seu carrinho está vazio.");
        return;
      }

      const resumo = calcularResumo(cart);
      const mensagem = montarMensagem(cart);
      if (!mensagem) return;

      const orderId = await saveOrderToSupabase(cart, resumo);
      if (orderId) {
        exibirFeedbackPedidoSalvo();
      } else {
        console.log("Não foi possível salvar pedido no histórico.");
      }

      window.open(
        `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`,
        "_blank",
      );
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await preencherDadosClienteLogado();
  await inicializarEnderecosSalvos();
  inicializarCheckout();
  document.addEventListener("frete:atualizado", () => {
    atualizarCheckout();
  });
});
