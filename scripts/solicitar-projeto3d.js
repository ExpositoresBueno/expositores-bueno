/**
 * solicitar-projeto3d.js
 * Expositores Bueno — Solicitação de Projeto 3D
 * Fluxo: Planta Baixa (SVG) → Dados → WhatsApp
 * Sem API externa, sem Cloudflare Worker, sem custo.
 */

const WHATSAPP_NUMBER = '5551996034579';

// Estado
const state = { points: [], isClosed: false };

// DOM
const svg         = document.getElementById('plant-svg');
const layerFill   = document.getElementById('layer-fill');
const layerLines  = document.getElementById('layer-lines');
const layerLabels = document.getElementById('layer-labels');
const layerPoints = document.getElementById('layer-points');
const previewLine = document.getElementById('preview-line');
const canvasHint  = document.getElementById('canvas-hint');
const canvasHint2 = document.getElementById('canvas-hint2');
const btnClose    = document.getElementById('btn-close');
const btnDownload = document.getElementById('btn-download');
const measSection = document.getElementById('measurements-section');
const measInputs  = document.getElementById('measurements-inputs');

// Utilitários SVG
function getSVGPoint(event) {
  const pt = svg.createSVGPoint();
  if (event.touches && event.touches.length > 0) {
    pt.x = event.touches[0].clientX;
    pt.y = event.touches[0].clientY;
  } else {
    pt.x = event.clientX;
    pt.y = event.clientY;
  }
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function distancia(a, b) {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

function pontoMedio(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

const WALL_COLORS = ['#1F6FA8','#F7941D','#16a34a','#9333ea','#dc2626','#0891b2','#ca8a04','#be185d'];

// Render
function render() {
  const pts = state.points;
  layerFill.innerHTML = layerLines.innerHTML = layerLabels.innerHTML = layerPoints.innerHTML = '';

  if (pts.length === 0) {
    canvasHint.style.display = canvasHint2.style.display = '';
    btnClose.disabled = btnDownload.disabled = true;
    measSection.classList.add('hidden');
    return;
  }

  canvasHint.style.display = canvasHint2.style.display = 'none';
  btnClose.disabled    = pts.length < 3 || state.isClosed;
  btnDownload.disabled = !state.isClosed;

  if (state.isClosed && pts.length >= 3) {
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    poly.setAttribute('d', d);
    poly.setAttribute('fill', 'rgba(31,111,168,.08)');
    poly.setAttribute('stroke', 'none');
    layerFill.appendChild(poly);
  }

  const segs = state.isClosed
    ? pts.map((p, i) => [p, pts[(i + 1) % pts.length]])
    : pts.slice(0, -1).map((p, i) => [p, pts[i + 1]]);

  segs.forEach(([a, b], i) => {
    const cor = WALL_COLORS[i % WALL_COLORS.length];
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
    line.setAttribute('stroke', cor);
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-linecap', 'round');
    layerLines.appendChild(line);

    const mid = pontoMedio(a, b);
    const dx  = b.x - a.x;
    const dy  = b.y - a.y;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const rot = ang > 90 || ang < -90 ? ang + 180 : ang;

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', mid.x - 14); bg.setAttribute('y', mid.y - 10);
    bg.setAttribute('width', 28); bg.setAttribute('height', 20);
    bg.setAttribute('rx', 4); bg.setAttribute('fill', cor);
    bg.setAttribute('transform', `rotate(${rot}, ${mid.x}, ${mid.y})`);

    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', mid.x); txt.setAttribute('y', mid.y + 4.5);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', '#fff');
    txt.setAttribute('font-family', 'Poppins, sans-serif');
    txt.setAttribute('font-size', '11');
    txt.setAttribute('font-weight', '700');
    txt.setAttribute('transform', `rotate(${rot}, ${mid.x}, ${mid.y})`);
    txt.textContent = `P${i + 1}`;

    layerLabels.appendChild(bg);
    layerLabels.appendChild(txt);
  });

  pts.forEach((p, i) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y);
    circle.setAttribute('r', i === 0 ? 8 : 6);
    circle.setAttribute('fill', i === 0 ? '#F7941D' : '#fff');
    circle.setAttribute('stroke', i === 0 ? '#F7941D' : '#1F6FA8');
    circle.setAttribute('stroke-width', '2.5');
    layerPoints.appendChild(circle);

    if (i === 0 && !state.isClosed && pts.length > 1) {
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', p.x); ring.setAttribute('cy', p.y);
      ring.setAttribute('r', 14); ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#F7941D'); ring.setAttribute('stroke-width', '1.5');
      ring.setAttribute('stroke-dasharray', '4,3'); ring.setAttribute('opacity', '0.7');
      layerPoints.appendChild(ring);
    }
  });

  if (state.isClosed) renderMeasurements(segs.length);
}

function renderMeasurements(count) {
  measSection.classList.remove('hidden');
  measInputs.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const cor = WALL_COLORS[i % WALL_COLORS.length];
    const div = document.createElement('div');
    div.className = 'eb-wall-input';
    div.innerHTML = `<label><span class="eb-wall-color" style="background:${cor}"></span>Parede ${i + 1}</label><input type="number" id="wall-${i}" min="0.5" max="500" step="0.5" placeholder="metros">`;
    measInputs.appendChild(div);
  }
}

// Eventos canvas
svg.addEventListener('click', (e) => {
  if (state.isClosed) return;
  const pt = getSVGPoint(e);
  if (state.points.length >= 3 && distancia(pt, state.points[0]) < 20) { closeRoom(); return; }
  state.points.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
  render();
});

svg.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });

svg.addEventListener('touchend', (e) => {
  if (state.isClosed) return;
  e.preventDefault();
  const touch = e.changedTouches[0];
  const pt = getSVGPoint({ clientX: touch.clientX, clientY: touch.clientY });
  if (state.points.length >= 3 && distancia(pt, state.points[0]) < 25) { closeRoom(); return; }
  state.points.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
  render();
}, { passive: false });

svg.addEventListener('mousemove', (e) => {
  if (state.isClosed || state.points.length === 0) { previewLine.setAttribute('opacity', '0'); return; }
  const pt   = getSVGPoint(e);
  const last = state.points[state.points.length - 1];
  previewLine.setAttribute('x1', last.x); previewLine.setAttribute('y1', last.y);
  previewLine.setAttribute('x2', pt.x);   previewLine.setAttribute('y2', pt.y);
  previewLine.setAttribute('opacity', '0.5');
});

svg.addEventListener('mouseleave', () => { previewLine.setAttribute('opacity', '0'); });

// Controles
function closeRoom() {
  if (state.points.length < 3) { toast('Adicione pelo menos 3 pontos para fechar a sala.', 'error'); return; }
  state.isClosed = true;
  previewLine.setAttribute('opacity', '0');
  render();
}

function undoLastPoint() {
  if (state.isClosed) { state.isClosed = false; measSection.classList.add('hidden'); }
  else state.points.pop();
  render();
}

function clearCanvas() {
  state.points = []; state.isClosed = false;
  previewLine.setAttribute('opacity', '0');
  render();
}

function downloadPlant() {
  if (!state.isClosed) { toast('Feche a sala antes de baixar a planta.', 'error'); return; }
  const clone = document.getElementById('plant-svg').cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const prev = clone.querySelector('#preview-line');
  if (prev) prev.remove();
  const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'planta-baixa-bueno.svg'; a.click();
  URL.revokeObjectURL(url);
  toast('Planta baixada! Envie pelo WhatsApp junto com a mensagem.', 'success');
}

// Navegação
function goToStep2() {
  document.getElementById('step-1').classList.add('hidden');
  document.getElementById('step-2').classList.remove('hidden');
  document.getElementById('dot-1').classList.remove('active');
  document.getElementById('dot-1').classList.add('done');
  document.getElementById('dot-2').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep1() {
  document.getElementById('step-2').classList.add('hidden');
  document.getElementById('step-1').classList.remove('hidden');
  document.getElementById('dot-2').classList.remove('active');
  document.getElementById('dot-1').classList.remove('done');
  document.getElementById('dot-1').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Coleta de dados
function getDimensoes() {
  if (state.isClosed && state.points.length >= 3) {
    const count = state.points.length;
    const linhas = [];
    for (let i = 0; i < count; i++) {
      const input = document.getElementById(`wall-${i}`);
      const val   = input ? parseFloat(input.value) : 0;
      linhas.push(`  Parede ${i + 1}: ${val > 0 ? val.toFixed(1) + ' metros' : '(não informado)'}`);
    }
    return `Planta desenhada (${count} paredes):
${linhas.join('\n')}`;
  }
  const larg = parseFloat(document.getElementById('dim-largura').value)    || 0;
  const comp = parseFloat(document.getElementById('dim-comprimento').value) || 0;
  if (larg > 0 && comp > 0) return `${larg} m × ${comp} m`;
  if (larg > 0) return `Largura: ${larg} m`;
  if (comp > 0) return `Comprimento: ${comp} m`;
  return 'Não informado';
}

// WhatsApp
function sendToWhatsApp() {
  const nomeLoja    = document.getElementById('nome-loja').value.trim();
  const produto     = document.getElementById('produto').value.trim();
  const estilo      = document.getElementById('estilo').value.trim();
  const orcamento   = document.getElementById('orcamento').value;
  const observacoes = document.getElementById('observacoes').value.trim();

  if (!nomeLoja)  { toast('Preencha seu nome.', 'error');                document.getElementById('nome-loja').focus(); return; }
  if (!produto)   { toast('Informe o segmento.', 'error');               document.getElementById('produto').focus();   return; }
  if (!estilo)    { toast('Informe seu telefone.', 'error');             document.getElementById('estilo').focus();    return; }
  if (!orcamento) { toast('Selecione o orçamento estimado.', 'error');   document.getElementById('orcamento').focus(); return; }

  const dimensoes = getDimensoes();
  const linhas = [
    `Olá! Gostaria de solicitar um *Projeto 3D* pela Expositores Bueno.`,
    ``,
    `👤 *Nome:* ${nomeLoja}`,
    `🏷️ *Segmento:* ${produto}`,
    `📞 *Telefone:* ${estilo}`,
    `💰 *Orçamento:* ${orcamento}`,
    `📐 *Dimensões do espaço:*`,
    dimensoes.includes('\n') ? dimensoes : `  ${dimensoes}`,
  ];

  if (observacoes) linhas.push(`📝 *Observações:* ${observacoes}`);
  if (state.isClosed) { linhas.push(``); linhas.push(`_(Planta baixa disponível para envio nesta conversa)_`); }
  linhas.push(``);
  linhas.push(`_Solicitação enviada pelo site expositoresbueno.com.br_`);

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(linhas.join('\n'))}`, '_blank');

  if (state.isClosed) setTimeout(() => toast('Lembre-se de enviar a planta baixa pelo WhatsApp também!', 'success'), 800);
}

// Toast
let toastTimer = null;
function toast(msg, tipo = '') {
  const existing = document.querySelector('.eb-toast');
  if (existing) existing.remove();
  if (toastTimer) clearTimeout(toastTimer);
  const el = document.createElement('div');
  el.className = `eb-toast ${tipo}`;
  el.textContent = msg;
  document.body.appendChild(el);
  toastTimer = setTimeout(() => el.remove(), 4000);
}

// Init
render();
