/* MOSAICO · Peças de quebra-cabeça (navegador)
   Desenha cada peça em SVG com saliências/recortes que indicam o encaixe, e
   prepara as peças de uma etapa de montagem (texto ou recorte de imagem). */
import { pecasDeTexto, gradeDoCorte, retangulos, bordas as sortearBordas, quantidadePecas } from './core/montagem.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
let seq = 0;

/** Caminho da peça: corpo W×H com lados lisos (0), saliência (1) ou recorte (-1). */
export function caminhoPeca(W, H, b, T) {
  const lado = (x0, y0, x1, y1, nx, ny, k) => {
    if (!k) return `L${x1},${y1}`;
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, h = T * 0.92 * k;
    const at = (t, o) => `${(x0 + ux * t * L + nx * o).toFixed(2)},${(y0 + uy * t * L + ny * o).toFixed(2)}`;
    return `L${at(0.36, 0)} C${at(0.40, h * 0.30)} ${at(0.27, h)} ${at(0.5, h)} C${at(0.73, h)} ${at(0.60, h * 0.30)} ${at(0.64, 0)} L${x1},${y1}`;
  };
  return `M0,0 ${lado(0, 0, W, 0, 0, -1, b.topo)} ${lado(W, 0, W, H, 1, 0, b.direita)} ${lado(W, H, 0, H, 0, 1, b.base)} ${lado(0, H, 0, 0, -1, 0, b.esquerda)} Z`;
}

/** Tamanho da saliência para um corpo W×H. */
export const tamanhoAba = (W, H) => 0.2 * Math.min(W, H);

/**
 * SVG da peça.
 * peca: { bordas, aspecto (altura/largura do corpo), texto? , imagem?: {src, ext:{esq,topo,dir,base}} }
 */
export function svgPeca(peca, { cor = '#ff8a3d' } = {}) {
  const W = 100, H = 100 * (peca.aspecto || 1.25), T = tamanhoAba(W, H), b = peca.bordas || { topo: 0, direita: 0, base: 0, esquerda: 0 };
  const svg = el('svg', { viewBox: `${-T} ${-T} ${W + 2 * T} ${H + 2 * T}`, class: 'peca-qc', role: 'img', 'aria-label': peca.texto ? 'Peça: ' + peca.texto : 'Peça de imagem' });
  const id = 'qc' + (++seq) + Math.random().toString(36).slice(2, 6);
  const d = caminhoPeca(W, H, b, T);
  const defs = el('defs');
  const clip = el('clipPath', { id: id + 'c' }); clip.append(el('path', { d })); defs.append(clip);
  const grad = el('linearGradient', { id: id + 'g', x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.append(el('stop', { offset: '0', 'stop-color': '#fffaf0' }), el('stop', { offset: '1', 'stop-color': '#efe4cf' }));
  defs.append(grad); svg.append(defs);
  svg.append(el('path', { d, fill: 'rgba(0,0,0,.35)', transform: 'translate(1.6,2.4)' }));   // sombra (profundidade)
  if (peca.imagem) {
    const g = el('g', { 'clip-path': `url(#${id}c)` });
    const e = peca.imagem.ext || { esq: 0, topo: 0, dir: 0, base: 0 };
    g.append(el('rect', { x: -T, y: -T, width: W + 2 * T, height: H + 2 * T, fill: '#fff' }));
    const img = el('image', { href: peca.imagem.src, x: -e.esq * W, y: -e.topo * H, width: W * (1 + e.esq + e.dir), height: H * (1 + e.topo + e.base), preserveAspectRatio: 'none' });
    g.append(img); svg.append(g);
  } else {
    svg.append(el('path', { d, fill: `url(#${id}g)` }));
    // área do texto afastada das saliências/recortes, para nada ficar cortado
    const mx = T * 0.95, my = T * 0.55;
    const fo = el('foreignObject', { x: mx, y: my, width: W - 2 * mx, height: H - 2 * my });
    const div = document.createElement('div');
    div.className = 'peca-qc-texto';
    div.textContent = peca.texto || '';
    const n = (peca.texto || '').length;
    div.style.fontSize = (n <= 4 ? 24 : n <= 8 ? 17 : n <= 14 ? 12 : n <= 24 ? 9.5 : n <= 45 ? 7.5 : 6) + 'px';
    fo.append(div); svg.append(fo);
  }
  svg.append(el('path', { d, fill: 'none', stroke: cor, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }));
  return svg;
}

/** Reduz e comprime a imagem enviada (leve o bastante para ir na atividade e na planilha). */
export async function comprimirImagem(arquivo, { lado = 1400, limite = 150000 } = {}) {
  if (!arquivo || !/^(image\/|$)/.test(arquivo.type) || !/\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(arquivo.name || '')) throw new Error('Escolha uma imagem PNG, JPG, WebP, GIF, BMP ou AVIF. Converta HEIC/HEIF para JPG antes de enviar.');
  if (arquivo.size > 20 * 1024 * 1024) throw new Error('A imagem ultrapassa 20 MB. Reduza o arquivo antes de enviar.');
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await carregar(url);
    let escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight)), qualidade = 0.82, dados = '';
    for (let t = 0; t < 8; t++) {
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * escala); c.height = Math.round(img.naturalHeight * escala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      dados = c.toDataURL('image/webp', qualidade);
      if (!dados.startsWith('data:image/webp')) dados = c.toDataURL('image/jpeg', qualidade);
      if (dados.length <= limite) return { dados, nome: arquivo.name, largura: c.width, altura: c.height, reduzida: escala < 1 || t > 0 };
      if (qualidade > 0.6) qualidade -= 0.1; else escala *= 0.8;
    }
    throw new Error('Não foi possível deixar a imagem leve o bastante. Tente uma imagem menor.');
  } finally { URL.revokeObjectURL(url); }
}
const carregar = src => new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('Imagem inválida.')); i.src = src; });

/**
 * Peças da etapa na ORDEM CERTA, prontas para desenhar/enviar.
 * @param config etapa.config da montagem; nCelulares para o modo "uma por celular"
 */
export async function montarPecasEtapa(config, nCelulares, aleatorio = Math.random) {
  if (config.modo === 'texto') {
    const textos = pecasDeTexto(config, nCelulares);
    const bs = sortearBordas({ linhas: 1, colunas: textos.length }, aleatorio);
    return textos.map((texto, i) => ({ texto, bordas: bs[i], aspecto: 1.25 }));
  }
  const n = quantidadePecas(config, nCelulares);
  const grade = gradeDoCorte(config.corte?.tipo || 'colunas', n, config.corte?.colunas);
  const rects = retangulos(grade), bs = sortearBordas(grade, aleatorio);
  const img = await carregar(config.imagem.dados);
  const IW = img.naturalWidth, IH = img.naturalHeight;
  return rects.map((r, i) => {
    const pw = r.w * IW, ph = r.h * IH;
    const W = 100, H = 100 * ph / pw, T = tamanhoAba(W, H);
    const b = bs[i];
    // a peça leva um pouco da imagem vizinha nas saliências (ajuda a perceber a continuidade)
    const ext = { esq: b.esquerda ? T / W : 0, dir: b.direita ? T / W : 0, topo: b.topo ? T / H : 0, base: b.base ? T / H : 0 };
    const sx = (r.x * IW) - ext.esq * pw, sy = (r.y * IH) - ext.topo * ph;
    const sw = pw * (1 + ext.esq + ext.dir), sh = ph * (1 + ext.topo + ext.base);
    const escala = Math.min(1, 640 / Math.max(sw, sh));
    const c = document.createElement('canvas'); c.width = Math.round(sw * escala); c.height = Math.round(sh * escala);
    c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    let src = c.toDataURL('image/webp', 0.8); if (!src.startsWith('data:image/webp')) src = c.toDataURL('image/jpeg', 0.8);
    return { bordas: b, aspecto: ph / pw, imagem: { src, ext } };
  });
}
