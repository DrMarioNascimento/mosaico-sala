/* MOSAICO · Arrastar etapas para mudar a ordem (lista de etapas do Planejamento)
   Pointer Events + setPointerCapture, como nos Cartões de arrastar: a API nativa de arrastar do HTML5
   não funciona no toque do iPhone. Só a alça (⠿) tem touch-action: none, então a lista continua rolando.
   No PC a lista é vertical; no celular ela vira uma faixa horizontal: o eixo é detectado pela posição
   dos itens. Enquanto arrasta, o item muda de lugar entre os vizinhos; ao soltar, devolve a nova ordem.
   As setas ↑ ↓ do editor de cada etapa continuam como alternativa sem arrastar. */

const BORDA = 48;   // px perto da borda que faz a lista ou a página rolar sozinha

/**
 * @param lista   elemento que contém os itens
 * @param o.item  seletor dos itens arrastáveis (cada um com data-id)
 * @param o.alca  seletor da alça dentro do item
 * @param o.aoSoltar (ids na nova ordem, idMovido) → void; só é chamado se a ordem mudou
 * @param o.rolavel  () → elemento que rola na vertical (ex.: a janela de diálogo); sem ele, rola a página
 */
export function ligarReordenacao(lista, { item = '[data-id]', alca = '.pega', aoSoltar = () => {}, rolavel = () => null } = {}) {
  for (const pega of lista.querySelectorAll(alca)) pega.addEventListener('pointerdown', ev => iniciar(ev, pega));

  function iniciar(ev, pega) {
    if (ev.button !== undefined && ev.button !== 0) return;
    const el = pega.closest(item); if (!el) return;
    ev.preventDefault();
    const itens = () => [...lista.querySelectorAll(item)];
    const antes = itens().map(x => x.dataset.id);
    const [p1, p2] = itens();
    const horizontal = !!(p1 && p2 && Math.abs(p1.getBoundingClientRect().top - p2.getBoundingClientRect().top) < 4);
    const eixo = ev => horizontal ? ev.clientX : ev.clientY;
    const ini = r => horizontal ? r.left : r.top;
    const tam = r => horizontal ? r.width : r.height;
    let pegada = eixo(ev) - ini(el.getBoundingClientRect());
    let ultimo = ev, rolando = null;
    try { pega.setPointerCapture(ev.pointerId); } catch {}
    el.classList.add('arrastando'); lista.classList.add('reordenando');

    const posicionar = () => {
      el.style.transform = '';
      const p = eixo(ultimo);
      const outros = itens().filter(x => x !== el);
      let alvo = outros.find(x => { const r = x.getBoundingClientRect(); return p < ini(r) + tam(r) / 2; });
      if (alvo) { if (el.nextElementSibling !== alvo) alvo.before(el); }
      else { const fim = outros.at(-1); if (fim && fim.nextElementSibling !== el) fim.after(el); }
      const base = ini(el.getBoundingClientRect());
      const d = p - pegada - base;
      el.style.transform = horizontal ? `translateX(${d}px)` : `translateY(${d}px)`;
    };
    const rolar = () => {
      const p = eixo(ultimo);
      let passo = 0;
      if (horizontal) {
        const r = lista.getBoundingClientRect();
        if (p < r.left + BORDA) passo = -12; else if (p > r.right - BORDA) passo = 12;
        if (passo) { lista.scrollLeft += passo; posicionar(); }
      } else {
        const caixa = rolavel(), r = caixa ? caixa.getBoundingClientRect() : { top: 0, bottom: innerHeight };
        if (p < r.top + BORDA) passo = -12; else if (p > r.bottom - BORDA) passo = 12;
        if (passo) { if (caixa) caixa.scrollTop += passo; else scrollBy(0, passo); posicionar(); }
      }
      rolando = passo ? requestAnimationFrame(rolar) : null;
    };
    const mover = ev => { ultimo = ev; posicionar(); if (!rolando) rolando = requestAnimationFrame(rolar); };
    const fim = () => {
      pega.removeEventListener('pointermove', mover); pega.removeEventListener('pointerup', fim); pega.removeEventListener('pointercancel', fim);
      if (rolando) cancelAnimationFrame(rolando);
      el.style.transform = ''; el.classList.remove('arrastando'); lista.classList.remove('reordenando');
      const depois = itens().map(x => x.dataset.id);
      if (depois.join() !== antes.join()) aoSoltar(depois, el.dataset.id);
    };
    pega.addEventListener('pointermove', mover);
    pega.addEventListener('pointerup', fim);
    pega.addEventListener('pointercancel', fim);
  }
}
