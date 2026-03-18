const form = document.getElementById('request-3d-form');
const finalButton = document.getElementById('final-whatsapp-btn');
const ramoInput = form?.querySelector('input[name="ramo"]');

function applySegmentPrefill() {
  if (!ramoInput) return;

  const params = new URLSearchParams(window.location.search);
  const segmento = params.get('segmento');

  if (!segmento || ramoInput.value.trim()) return;

  ramoInput.value = segmento;
}

function buildWhatsappLink() {
  if (!form || !finalButton) return;

  const data = new FormData(form);
  const campos = [
    ['Nome', data.get('nome') || 'Não informado'],
    ['WhatsApp', data.get('telefone') || 'Não informado'],
    ['Cidade/Estado', data.get('cidade') || 'Não informado'],
    ['Ramo', data.get('ramo') || 'Não informado'],
    ['Objetivo', data.get('objetivo') || 'Não informado'],
    ['Tipo de projeto', data.get('tipoProjeto') || 'Não informado'],
    ['Planta/Desenho', data.get('planta') || 'Não informado'],
    ['Medidas (opcional)', data.get('medidas') || 'Não informado'],
    ['Materiais disponíveis', data.get('materiais') || 'Não informado'],
    ['Quando pretende inaugurar', data.get('prazo') || 'Não informado'],
    ['Faixa de investimento', data.get('orcamento') || 'Não informado']
  ];

  const mensagem = [
    'Olá! Preenchi o formulário de solicitação de Projeto 3D:',
    '',
    ...campos.map(([titulo, valor]) => `• ${titulo}: ${valor}`)
  ].join('\n');

  finalButton.href = `https://wa.me/5551996034579?text=${encodeURIComponent(mensagem)}`;
}

if (form && finalButton) {
  applySegmentPrefill();
  form.addEventListener('input', buildWhatsappLink);
  form.addEventListener('change', buildWhatsappLink);
  finalButton.addEventListener('click', buildWhatsappLink);
  buildWhatsappLink();
}
