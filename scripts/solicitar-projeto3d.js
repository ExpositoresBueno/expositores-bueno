/**
 * solicitar-projeto3d.js
 * Expositores Bueno — Solicitação de Projeto 3D
 * Fluxo: Planta Baixa (SVG) → Dados → WhatsApp
 * Sem API externa, sem Cloudflare Worker, sem custo.
 */

const WHATSAPP_NUMBER = '5551996034579';

// Estado
const state = { points: [], isClosed: false, wallMeasurements: [] };

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
    btnClose.disabled = true;
    measSection.classList.add('hidden');
    state.wallMeasurements = [];
    return;
  }

  canvasHint.style.display = canvasHint2.style.display = 'none';
  btnClose.disabled    = pts.length < 3 || state.isClosed;

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
    const wallInput = document.getElementById(`wall-${i}`);
    const wallValue = wallInput ? parseFloat(wallInput.value) : NaN;
    txt.textContent = Number.isFinite(wallValue) && wallValue > 0
      ? `${wallValue.toFixed(1).replace('.', ',')}m`
      : `P${i + 1}`;

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
  if (state.wallMeasurements.length !== count) {
    state.wallMeasurements = Array.from({ length: count }, (_, i) => state.wallMeasurements[i] || '');
  }

  for (let i = 0; i < count; i++) {
    const cor = WALL_COLORS[i % WALL_COLORS.length];
    const div = document.createElement('div');
    div.className = 'eb-wall-input';
    div.innerHTML = `<label><span class="eb-wall-color" style="background:${cor}"></span>Parede ${i + 1}</label><input type="number" id="wall-${i}" min="0.5" max="500" step="0.5" placeholder="metros">`;
    const input = div.querySelector('input');
    input.value = state.wallMeasurements[i];
    input.addEventListener('input', () => {
      state.wallMeasurements[i] = input.value;
      render();
    });
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
  state.wallMeasurements = [];
  previewLine.setAttribute('opacity', '0');
  render();
}

async function generatePlantPngBlob() {
  if (!state.isClosed) return null;
  const clone = document.getElementById('plant-svg').cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '800');
  clone.setAttribute('height', '480');
  const prev = clone.querySelector('#preview-line');
  if (prev) prev.remove();
  const svgBlob = new Blob([clone.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1);
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

// Navegação
function goToStep2() {
  if (!state.isClosed) {
    toast('Finalize o desenho da planta antes de avançar.', 'error');
    return;
  }
  if (!state.wallMeasurements.length || state.wallMeasurements.some((value) => !parseFloat(value))) {
    toast('Preencha a medida de todas as paredes antes de avançar.', 'error');
    return;
  }

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

// WhatsApp
async function sendToWhatsApp() {
  const nomeLoja    = document.getElementById('nome-loja').value.trim();
  const produto     = document.getElementById('produto').value.trim();
  const estilo      = document.getElementById('estilo').value.trim();
  const orcamento   = document.getElementById('orcamento').value;
  const observacoes = document.getElementById('observacoes').value.trim();

  if (!nomeLoja)  { toast('Preencha seu nome.', 'error');                document.getElementById('nome-loja').focus(); return; }
  if (!produto)   { toast('Informe o segmento.', 'error');               document.getElementById('produto').focus();   return; }
  if (!estilo)    { toast('Informe seu telefone.', 'error');             document.getElementById('estilo').focus();    return; }
  if (!orcamento) { toast('Selecione o orçamento estimado.', 'error');   document.getElementById('orcamento').focus(); return; }
  if (!state.isClosed) { toast('Finalize o desenho da planta antes de enviar.', 'error'); return; }
  if (!state.wallMeasurements.length || state.wallMeasurements.some((value) => !parseFloat(value))) {
    toast('Preencha a medida de todas as paredes antes de enviar.', 'error');
    return;
  }

  const linhas = [
    `Olá! Gostaria de solicitar um *Projeto 3D* pela Expositores Bueno.`,
    ``,
    `👤 *Nome:* ${nomeLoja}`,
    `🏷️ *Segmento:* ${produto}`,
    `📞 *Telefone:* ${estilo}`,
    `💰 *Orçamento:* ${orcamento}`,
    observacoes ? `📝 *Observações:* ${observacoes}` : `📝 *Observações:* Não informado`,
    ``,
    `Estou enviando a planta em PNG junto com esta mensagem.`,
  ];
  linhas.push(``);
  linhas.push(`_Solicitação enviada pelo site expositoresbueno.com.br_`);

  const message = linhas.join('\n');
  const pngBlob = await generatePlantPngBlob();

  const canShareFile =
    typeof navigator !== 'undefined'
    && typeof navigator.share === 'function'
    && typeof navigator.canShare === 'function'
    && pngBlob;

  if (canShareFile) {
    const file = new File([pngBlob], 'planta-baixa-bueno.png', { type: 'image/png' });
    const shareData = { text: message, files: [file], title: 'Planta baixa - Projeto 3D' };
    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast('Planta PNG e mensagem preparadas para envio.', 'success');
        return;
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Falha ao compartilhar arquivo da planta:', err);
        }
      }
    }
  }

  if (pngBlob) {
    const pngUrl = URL.createObjectURL(pngBlob);
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = 'planta-baixa-bueno.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(pngUrl), 2000);
  }

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  setTimeout(() => toast('A planta foi gerada em PNG para anexar ao WhatsApp.', 'success'), 700);
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
