/* MOSAICO · utilidades de interface compartilhadas */

export const $ = id => document.getElementById(id);

/** Cria elemento: h('div', {class:'x', onclick}, filhos...) — texto sempre como textContent (nunca HTML). */
export function h(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const f of filhos.flat(Infinity)) if (f !== null && f !== undefined && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return e;
}

export const limpar = (alvo, ...filhos) => { alvo.replaceChildren(...filhos.flat(Infinity).filter(Boolean)); return alvo; };

/** Cores dos grupos por posição na ordem de alocação (contraste alto em fundo escuro). */
export const CORES = ['#ff8a3d', '#3ddcff', '#c6ff45', '#ff5fa8', '#b18cff', '#ffd23d', '#4dffb0', '#ff6b6b', '#7aa2ff', '#e8e8e8', '#ffa8e0', '#9be15d'];
export function corDoGrupo(atividadeOuGrupos, grupoId) {
  const grupos = Array.isArray(atividadeOuGrupos) ? atividadeOuGrupos : atividadeOuGrupos.grupos;
  const ord = [...grupos].sort((a, b) => (a.ordemAlocacao ?? 0) - (b.ordemAlocacao ?? 0));
  const i = ord.findIndex(g => g.id === grupoId);
  return CORES[(i < 0 ? 0 : i) % CORES.length];
}

export function aviso(alvo, texto, tipo = 'info') {
  alvo.textContent = texto || '';
  alvo.dataset.tipo = tipo;
  alvo.hidden = !texto;
}

/** Janela explicativa com botão "Entendi" — uma vez por chave nesta sessão. */
export function explicar(chave, titulo, texto) {
  try { if (sessionStorage.getItem('mosaico-explicado:' + chave)) return; } catch {}
  const d = h('dialog', { class: 'explica' },
    h('h2', {}, titulo),
    ...[].concat(texto).map(p => h('p', {}, p)),
    h('button', { class: 'btn primario', onclick: () => { d.close(); d.remove(); } }, 'Entendi'));
  document.body.append(d);
  d.showModal();
  try { sessionStorage.setItem('mosaico-explicado:' + chave, '1'); } catch {}
}

export function contagemRegressiva(inicioMs, minutos) {
  if (!inicioMs || !minutos) return '';
  const resta = Math.round((inicioMs + minutos * 60e3 - Date.now()) / 1000);
  if (resta <= 0) return 'Tempo sugerido esgotado';
  return `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, '0')}`;
}

export function escalaVisual(n) {
  const rotulos = ['Começando', 'Avançando', 'Perto da meta', 'Na meta', 'Acima da meta'];
  return h('div', { class: 'escala', role: 'img', 'aria-label': 'Desempenho da turma: ' + rotulos[n ?? 0] },
    h('div', { class: 'escala-barras' }, [0, 1, 2, 3].map(i => h('span', { class: i < (n ?? 0) ? 'cheia' : '' }))),
    h('small', {}, rotulos[n ?? 0]));
}
