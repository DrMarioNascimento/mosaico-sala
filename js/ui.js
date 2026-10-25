/* MOSAICO · utilidades de interface compartilhadas */

export const $ = id => document.getElementById(id);

/** Cria elemento: h('div', {class:'x', onclick}, filhos...) — texto sempre como textContent (nunca HTML). */
export function h(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const [p, val] of Object.entries(v)) p.startsWith('--') ? e.style.setProperty(p, val) : (e.style[p] = val); }
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const f of filhos.flat(Infinity)) if (f !== null && f !== undefined && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return e;
}

/** Campo de arquivo em português: botão “Escolher arquivo”, nome do arquivo escolhido e arrastar e soltar.
 *  Recebe o <input type=file> já pronto (com o seu onchange) e devolve a zona que o envolve. */
export function campoArquivo(input, dica = 'ou arraste o arquivo para cá') {
  input.classList.add('arq-oculto');
  const nome = h('span', { class: 'arq-nome' }, dica);
  const zona = h('label', { class: 'arq-zona' }, h('span', { class: 'btn pequeno', 'aria-hidden': 'true' }, 'Escolher arquivo'), nome, input);
  input.addEventListener('change', () => { if (input.files?.[0]) nome.textContent = input.files[0].name; });
  zona.addEventListener('dragover', ev => { ev.preventDefault(); zona.classList.add('arrastando'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('arrastando'));
  zona.addEventListener('drop', ev => {
    ev.preventDefault(); zona.classList.remove('arrastando');
    if (!ev.dataTransfer?.files?.length) return;
    input.files = ev.dataTransfer.files;
    input.dispatchEvent(new Event('change'));
  });
  return zona;
}

export const limpar = (alvo, ...filhos) => { alvo.replaceChildren(...filhos.flat(Infinity).filter(Boolean)); return alvo; };

/** Identidade visual dos grupos: forma 3D + cor, na ordem de alocação.
 *  Genérica de propósito (serve a qualquer tema). As 4 primeiras repetem as cores do logo. */
export const VISUAL_GRUPOS = [
  { forma: 'circulo', nome: 'Círculo', cor: '#fa7309' },
  { forma: 'triangulo', nome: 'Triângulo', cor: '#14c5d6' },
  { forma: 'quadrado', nome: 'Quadrado', cor: '#a4ce2f' },
  { forma: 'losango', nome: 'Losango', cor: '#f83d87' },
  { forma: 'estrela', nome: 'Estrela', cor: '#f3bf0a' },
  { forma: 'hexagono', nome: 'Hexágono', cor: '#8855c3' },
  { forma: 'coracao', nome: 'Coração', cor: '#de1b1a' },
  { forma: 'gota', nome: 'Gota', cor: '#338dec' },
  { forma: 'lua', nome: 'Lua', cor: '#53a981' },
  { forma: 'raio', nome: 'Raio', cor: '#afafaf' }
];
export const CORES = VISUAL_GRUPOS.map(v => v.cor);

function visual(atividadeOuGrupos, grupoId) {
  const grupos = Array.isArray(atividadeOuGrupos) ? atividadeOuGrupos : atividadeOuGrupos.grupos;
  const ord = [...grupos].sort((a, b) => (a.ordemAlocacao ?? 0) - (b.ordemAlocacao ?? 0));
  const i = ord.findIndex(g => g.id === grupoId);
  return VISUAL_GRUPOS[(i < 0 ? 0 : i) % VISUAL_GRUPOS.length];
}
export const corDoGrupo = (g, id) => visual(g, id).cor;
export const formaDoGrupo = (g, id) => visual(g, id);
export const urlIcone = forma => `assets/icones/grupo-${forma}.webp`;

/** Ícone 3D do grupo (decorativo: o nome do grupo sempre aparece ao lado). */
export function iconeGrupo(g, id, tam = 26) {
  return h('img', { src: urlIcone(visual(g, id).forma), alt: '', width: tam, height: tam, class: 'icone-grupo', loading: 'lazy', decoding: 'async' });
}
/** Etiqueta do grupo: ícone + nome. */
export function chipGrupo(g, id, nome, tam = 26) {
  return h('span', { class: 'chip', style: { '--cor': corDoGrupo(g, id) } }, iconeGrupo(g, id, tam), nome);
}

export function aviso(alvo, texto, tipo = 'info') {
  alvo.textContent = texto || '';
  alvo.dataset.tipo = tipo; alvo.setAttribute('role',tipo==='erro'?'alert':'status'); alvo.setAttribute('aria-live',tipo==='erro'?'assertive':'polite');
  alvo.hidden = !texto;
}

/** Janela explicativa com botão "Entendi" — uma vez por chave nesta sessão. */
export function explicar(chave, titulo, texto) {
  if (window.MOSAICO_SEM_EXPLICACAO) return;   // piloto automático do simulador
  try { if (sessionStorage.getItem('mosaico-explicado:' + chave)) return; } catch {}
  const d = h('dialog', { class: 'explica', 'data-chave': chave },
    h('h2', {}, titulo),
    ...[].concat(texto).map(p => h('p', {}, p)),
    h('button', { class: 'btn primario', onclick: () => { d.close(); d.remove(); } }, 'Entendi'));
  // Uma explicação por vez: se já há uma aberta, esta espera ela fechar (antes ficavam empilhadas).
  const aberta = [...document.querySelectorAll('dialog.explica[open]')].pop();
  const mostrar = () => { if (!d.isConnected) return; d.showModal(); };
  document.body.append(d);
  if (aberta) aberta.addEventListener('close', mostrar, { once: true }); else mostrar();
  try { sessionStorage.setItem('mosaico-explicado:' + chave, '1'); } catch {}
}

export function contagemRegressiva(inicioMs, minutos, pausadoEm = null) {
  if (!inicioMs || !minutos) return '';
  const resta = Math.round((inicioMs + minutos * 60e3 - (pausadoEm || Date.now())) / 1000);
  if (resta <= 0) return 'Tempo sugerido esgotado';
  return `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, '0')}` + (pausadoEm ? ' · pausado' : '');
}

export function escalaVisual(n) {
  const rotulos = ['Começando', 'Avançando', 'Perto da meta', 'Na meta', 'Acima da meta'];
  return h('div', { class: 'escala', role: 'img', 'aria-label': 'Desempenho da turma: ' + rotulos[n ?? 0] },
    h('div', { class: 'escala-barras' }, [0, 1, 2, 3].map(i => h('span', { class: i < (n ?? 0) ? 'cheia' : '' }))),
    h('small', {}, rotulos[n ?? 0]));
}

/** Imagem em tela cheia para ler detalhes no celular: zoom em 1×, 2× e 3× e arraste para percorrer (rolagem nativa).
 *  Fecha no botão, no Esc ou no voltar do aparelho (é um <dialog>). */
export function ampliarImagem(src, alt = '') {
  if (!src) return;
  let zoom = 1;
  const img = h('img', { src, alt, draggable: 'false' });
  const area = h('div', { class: 'ampliar-area' }, img);
  const botoes = [1, 2, 3].map(z => h('button', { type: 'button', class: 'btn pequeno', 'data-sem-ico': '', 'aria-pressed': String(z === 1), onclick: () => definir(z) }, z + '×'));
  const fechar = h('button', { type: 'button', class: 'btn primario pequeno', 'data-sem-ico': '', onclick: () => d.close() }, 'Fechar');
  const d = h('dialog', { class: 'ampliar-imagem', 'aria-label': alt || 'Imagem ampliada' }, h('div', { class: 'ampliar-barra' }, h('span', { class: 'ampliar-zoom' }, botoes), fechar), area);
  function definir(z) {
    const cx = (area.scrollLeft + area.clientWidth / 2) / (area.scrollWidth || 1), cy = (area.scrollTop + area.clientHeight / 2) / (area.scrollHeight || 1);
    zoom = z; img.style.width = (100 * z) + '%';
    botoes.forEach((b, i) => b.setAttribute('aria-pressed', String(i + 1 === z)));
    requestAnimationFrame(() => { area.scrollLeft = cx * area.scrollWidth - area.clientWidth / 2; area.scrollTop = cy * area.scrollHeight - area.clientHeight / 2; });   // mantém o centro
  }
  img.addEventListener('dblclick', () => definir(zoom === 3 ? 1 : zoom + 1));
  d.addEventListener('close', () => d.remove());
  document.body.append(d); d.showModal();
}
/** Botão "Ampliar imagem" para quem não pode tocar na própria imagem (ali o toque já marca um ponto). */
export const botaoAmpliar = (src, alt) => h('button', { type: 'button', class: 'btn pequeno ampliar-botao', 'data-sem-ico': '', onclick: () => ampliarImagem(src, alt) }, '🔍 Ampliar imagem');
