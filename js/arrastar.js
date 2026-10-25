/* MOSAICO · Quadro de cartões de arrastar (celular do participante)
   Arrastar com Pointer Events (pointerdown/move/up + setPointerCapture): a API nativa de
   arrastar do HTML5 não funciona no toque do iPhone. Alternativa sempre disponível:
   toque no cartão e depois toque no lugar (acessibilidade e quem tem dificuldade de arrastar).
   touch-action: none só nos cartões que a pessoa pode mover: o resto da página continua rolando. */

import { h, botaoAmpliar } from './ui.js';

let arraste = null;                 // arraste em andamento (não redesenhar no meio)
let selecionado = null;             // {chave, id}: cartão escolhido no modo "toque, depois toque"
let aoSoltar = () => {};
export const arrastando = () => !!arraste;
export function definirAoSoltar(fn) { aoSoltar = fn; }

/**
 * @param o.pk       pacote do quadro (formato, cartoes, colunas, polos, dono, travado…)
 * @param o.quadro   posições atuais (já com os movimentos locais ainda não conferidos)
 * @param o.uid      quem está jogando
 * @param o.nomes    {uid: nome}
 * @param o.mover    (cartaoId, para) → void
 */
export function quadroCartoes(o) {
  const { pk, quadro, uid, nomes, mover } = o;
  const chave = pk.etapaId + '#' + pk.conjunto;
  const pode = id => !pk.travado && (!pk.dono?.[id] || pk.dono[id] === uid);
  if (selecionado && (selecionado.chave !== chave || !pode(selecionado.id))) selecionado = null;
  const raiz = h('div', { class: 'quadro-cartoes', 'data-formato': pk.formato });
  const texto = Object.fromEntries(pk.cartoes.map(c => [c.id, c.texto]));
  const ordem = pk.cartoes.map(c => c.id);

  const cartao = id => {
    const meu = pode(id), dono = pk.dono?.[id];
    const el = h('div', {
      class: 'cartao-arr' + (meu ? ' movel' : ' preso') + (dono === uid ? ' meu' : '') + (selecionado?.id === id ? ' selecionado' : ''),
      'data-id': id, tabindex: meu ? '0' : null, role: meu ? 'button' : null,
      'aria-label': texto[id] + (meu ? '' : dono ? ` (com ${nomes[dono] || 'um colega'})` : '')
    }, h('span', {}, texto[id]), dono && dono !== uid && h('small', { class: 'dono' }, 'com ' + (nomes[dono] || 'colega')));
    if (meu) ligarArraste(el, id);
    return el;
  };

  // ---------- termômetro: uma linha por caso, com marcador arrastável ----------
  if (pk.formato === 'termometro') {
    raiz.append(h('div', { class: 'termo-polos' }, h('span', {}, '◀ ' + (pk.polos?.esquerda || '')), h('span', {}, (pk.polos?.direita || '') + ' ▶')));
    for (const id of ordem) {
      const v = quadro[id], meu = pode(id), dono = pk.dono?.[id];
      const marcador = h('div', { class: 'termo-marcador', style: { left: (v ?? 50) + '%' }, hidden: v === null || v === undefined });
      const trilha = h('div', {
        class: 'termo-trilha' + (meu ? ' movel' : ''), role: 'slider', tabindex: meu ? '0' : null, 'aria-label': texto[id],
        'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': v ?? null, 'aria-valuetext': v === null || v === undefined ? 'não posicionado' : v + ' de 100'
      }, h('div', { class: 'termo-faixa' }), marcador);
      if (meu) ligarTrilha(trilha, marcador, id, v);
      raiz.append(h('div', { class: 'termo-linha' + (v === null || v === undefined ? ' vazia' : '') },
        h('div', { class: 'termo-rotulo' }, h('span', {}, texto[id]), dono && h('small', { class: 'dono' }, dono === uid ? 'seu' : 'com ' + (nomes[dono] || 'colega'))),
        trilha, meu && (v === null || v === undefined) && h('small', { class: 'sutil termo-dica' }, 'Toque ou arraste na linha para posicionar')));
    }
    return raiz;

    function ligarTrilha(trilha, marcador, id, v0) {
      let ativo = false, valor = v0;
      const pct = ev => { const r = trilha.getBoundingClientRect(); return Math.max(0, Math.min(100, Math.round(((ev.clientX - r.left) / r.width) * 100))); };
      const mostrar = x => { valor = x; marcador.hidden = false; marcador.style.left = x + '%'; trilha.setAttribute('aria-valuenow', x); };
      trilha.style.touchAction = 'none';
      trilha.addEventListener('pointerdown', ev => { ativo = true; arraste = { tipo: 'termo' }; trilha.setPointerCapture(ev.pointerId); mostrar(pct(ev)); ev.preventDefault(); });
      trilha.addEventListener('pointermove', ev => { if (ativo) mostrar(pct(ev)); });
      const fim = () => { if (!ativo) return; ativo = false; arraste = null; if (valor !== null && valor !== undefined && valor !== v0) mover(id, valor); aoSoltar(); };
      trilha.addEventListener('pointerup', fim); trilha.addEventListener('pointercancel', fim);
      let tempo = null;
      trilha.addEventListener('keydown', ev => {
        const passo = ev.shiftKey ? 10 : 5;
        const novo = ev.key === 'ArrowRight' || ev.key === 'ArrowUp' ? (valor ?? 50) + passo : ev.key === 'ArrowLeft' || ev.key === 'ArrowDown' ? (valor ?? 50) - passo : ev.key === 'Home' ? 0 : ev.key === 'End' ? 100 : null;
        if (novo === null) return;
        ev.preventDefault(); mostrar(Math.max(0, Math.min(100, novo)));
        clearTimeout(tempo); tempo = setTimeout(() => mover(id, valor), 450);
      });
    }
  }

  // ---------- marcar na imagem: escolha o item e toque na imagem; o ponto pode ser arrastado ----------
  if (pk.formato === 'imagem') {
    const esc = selecionado?.id || ordem.find(id => pode(id) && !quadro[id]) || null;
    const foto = h('div', { class: 'marcar-foto', style: { aspectRatio: pk.imagem?.largura && pk.imagem?.altura ? `${pk.imagem.largura} / ${pk.imagem.altura}` : null } },
      o.imagemDados ? h('img', { src: o.imagemDados, alt: pk.enunciado || 'Imagem para marcar', draggable: 'false' }) : h('p', { class: 'sutil' }, 'Carregando a imagem…'));
    const pontoDe = ev => { const r = foto.getBoundingClientRect(); return { x: Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100)), y: Math.max(0, Math.min(100, ((ev.clientY - r.top) / r.height) * 100)) }; };
    ordem.forEach((id, k) => {
      const v = quadro[id]; if (!v) return;
      const pino = h('div', { class: 'marcar-pino' + (pode(id) ? ' movel' : '') + (esc === id ? ' selecionado' : ''), style: { left: v.x + '%', top: v.y + '%' }, title: texto[id] }, h('span', {}, k + 1));
      if (pode(id)) {
        pino.style.touchAction = 'none';
        let ativo = false, ult = v;
        pino.addEventListener('pointerdown', ev => { ativo = true; arraste = { tipo: 'pino' }; pino.setPointerCapture(ev.pointerId); ev.stopPropagation(); ev.preventDefault(); });
        pino.addEventListener('pointermove', ev => { if (!ativo) return; ult = pontoDe(ev); pino.style.left = ult.x + '%'; pino.style.top = ult.y + '%'; });
        const fim = () => { if (!ativo) return; ativo = false; arraste = null; if (ult !== v) mover(id, ult); else { selecionado = { chave, id }; aoSoltar(); } };
        pino.addEventListener('pointerup', fim); pino.addEventListener('pointercancel', fim);
      }
      foto.append(pino);
    });
    foto.addEventListener('click', ev => { if (!esc || !pode(esc) || ev.target.closest('.marcar-pino')) return; const p = pontoDe(ev); selecionado = null; mover(esc, p); });
    raiz.append(h('p', { class: 'sutil' }, esc ? `Toque na imagem onde fica: ` : 'Todos os itens foram marcados. Arraste um ponto para corrigir.', esc && h('strong', {}, texto[esc])),
      h('div', { class: 'marcar-itens' }, ordem.map((id, k) => {
        const dono = pk.dono?.[id], b = h('button', { type: 'button', class: 'marcar-item' + (esc === id ? ' ativo' : '') + (quadro[id] ? ' feito' : ''), disabled: !pode(id) },
          h('span', { class: 'n' }, k + 1), texto[id], dono && dono !== uid && h('small', {}, ' com ' + (nomes[dono] || 'colega')));
        b.onclick = () => { selecionado = { chave, id }; aoSoltar(); };
        return b;
      })), foto, o.imagemDados && botaoAmpliar(o.imagemDados, pk.enunciado || 'Imagem para marcar'));
    return raiz;
  }

  // ---------- ordenar e classificar: mão + lugares ----------
  const naMao = ordem.filter(id => quadro[id] === null || quadro[id] === undefined);
  raiz.append(h('div', { class: 'cartoes-mao', 'data-alvo': 'mao' },
    h('div', { class: 'cartoes-rotulo' }, naMao.length ? `Cartões para colocar (${naMao.length})` : 'Todos os cartões estão no quadro'),
    h('div', { class: 'cartoes-lista' }, naMao.map(cartao))));
  if (pk.formato === 'ordenar') {
    raiz.append(h('ol', { class: 'cartoes-trilha' }, ordem.map((_, i) => {
      const id = ordem.find(x => quadro[x] === i);
      const rotulo = pk.rotulos?.[i];                    // pares para ligar: o lugar mostra o outro lado do par
      return h('li', { class: 'cartoes-slot' + (id ? ' cheio' : '') + (rotulo ? ' com-rotulo' : ''), 'data-alvo': String(i) }, rotulo ? h('span', { class: 'rotulo-par' }, rotulo, h('i', {}, '↔')) : h('span', { class: 'num' }, i + 1), id ? cartao(id) : h('span', { class: 'vazio' }, 'solte aqui'));
    })));
  } else {
    raiz.append(h('div', { class: 'cartoes-colunas', style: { '--n': (pk.colunas || []).length } }, (pk.colunas || []).map(col =>
      h('div', { class: 'cartoes-coluna', 'data-alvo': 'col:' + col.id }, h('h4', {}, col.titulo),
        h('div', { class: 'cartoes-lista' }, ordem.filter(id => quadro[id] === col.id).map(cartao), h('span', { class: 'vazio' }, 'solte aqui'))))));
  }
  // toque num lugar com um cartão escolhido → move para lá
  raiz.addEventListener('click', ev => {
    if (!selecionado || ev.target.closest('.cartao-arr.movel')) return;
    const alvo = ev.target.closest('[data-alvo]'); if (!alvo) return;
    const id = selecionado.id; selecionado = null;
    mover(id, alvoParaValor(alvo.dataset.alvo));
  });
  return raiz;

  function alvoParaValor(a) { return a === 'mao' ? null : a.startsWith('col:') ? a.slice(4) : Number(a); }

  function ligarArraste(el, id) {
    el.style.touchAction = 'none';
    let ini = null, fantasma = null, sobre = null, rolagem = 0, ultimoY = 0;
    el.addEventListener('pointerdown', ev => {
      if (ev.button > 0) return;
      ini = { x: ev.clientX, y: ev.clientY, dx: ev.clientX - el.getBoundingClientRect().left, dy: ev.clientY - el.getBoundingClientRect().top };
      el.setPointerCapture(ev.pointerId);
    });
    el.addEventListener('pointermove', ev => {
      if (!ini) return;
      if (!fantasma && Math.hypot(ev.clientX - ini.x, ev.clientY - ini.y) < 8) return;
      if (!fantasma) {
        arraste = { id }; selecionado = null;
        const r = el.getBoundingClientRect();
        fantasma = el.cloneNode(true); fantasma.classList.add('fantasma'); fantasma.style.width = r.width + 'px';
        document.body.append(fantasma); el.classList.add('origem');
        rolar();
      }
      ultimoY = ev.clientY;
      fantasma.style.transform = `translate(${ev.clientX - ini.dx}px, ${ev.clientY - ini.dy}px) rotate(-2deg)`;
      const alvo = alvoEm(ev.clientX, ev.clientY);
      if (alvo !== sobre) { sobre?.classList.remove('sobre'); sobre = alvo; sobre?.classList.add('sobre'); }
    });
    const fim = ev => {
      if (!ini) return;
      const arrastou = !!fantasma;
      ini = null; cancelAnimationFrame(rolagem);
      if (arrastou) {
        fantasma.remove(); fantasma = null; el.classList.remove('origem'); sobre?.classList.remove('sobre');
        const alvo = ev.type === 'pointercancel' ? null : alvoEm(ev.clientX, ev.clientY);
        sobre = null; arraste = null;
        if (alvo) mover(id, alvoParaValor(alvo.dataset.alvo)); else aoSoltar();
        return;
      }
      if (ev.type === 'pointercancel') return;
      // toque simples: escolhe / troca / devolve
      const ondeEsta = el.closest('[data-alvo]');
      if (selecionado && selecionado.id !== id && ondeEsta && ondeEsta.dataset.alvo !== 'mao') { const s = selecionado.id; selecionado = null; mover(s, alvoParaValor(ondeEsta.dataset.alvo)); return; }
      selecionado = selecionado?.id === id ? null : { chave, id };
      aoSoltar();
    };
    el.addEventListener('pointerup', fim); el.addEventListener('pointercancel', fim);
    el.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selecionado = selecionado?.id === id ? null : { chave, id }; aoSoltar(); } });

    function rolar() {   // rolagem automática perto das bordas, enquanto arrasta
      const borda = 56;   // só bem perto da borda, e devagar: dá tempo de mirar
      if (ultimoY && ultimoY < borda) window.scrollBy(0, -Math.ceil((borda - ultimoY) / 10));
      else if (ultimoY && ultimoY > innerHeight - borda) window.scrollBy(0, Math.ceil((ultimoY - innerHeight + borda) / 10));
      rolagem = requestAnimationFrame(rolar);
    }
  }
  function alvoEm(x, y) {
    const el = document.elementFromPoint(x, y);
    const a = el?.closest?.('[data-alvo]');
    return a && raiz.contains(a) ? a : null;
  }
}

/** Para o piloto automático do simulador: um lugar livre ao acaso. */
export function lugarAoAcaso(pk, quadro) {
  if (pk.formato === 'termometro') return Math.round(Math.random() * 100);
  if (pk.formato === 'imagem') return { x: Math.random() * 100, y: Math.random() * 100 };
  if (pk.formato === 'classificar') return pk.colunas[Math.floor(Math.random() * pk.colunas.length)].id;
  const ocupados = new Set(Object.values(quadro).filter(v => v !== null && v !== undefined));
  const livres = pk.cartoes.map((_, i) => i).filter(i => !ocupados.has(i));
  return livres.length ? livres[Math.floor(Math.random() * livres.length)] : Math.floor(Math.random() * pk.cartoes.length);
}
