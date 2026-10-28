/* Mosaico Sala · Navegação e ícones em todas as páginas.
   Põe os ícones próprios (js/icones.js) em [data-ico] / [data-ilu] e nos botões, e marca a página atual na barra de fluxo. */
import { aplicarIcones } from './icones.js';
import { percursoDocente } from './percurso-docente.js';
import { link } from './backend.js';
for(const el of document.querySelectorAll('[data-percurso-docente]'))el.replaceChildren(percursoDocente(Number(el.dataset.percursoDocente)||1));

/* Barra do professor (mesma em todas as páginas de quem conduz). “Início” e “Minhas atividades” levam ao painel
   do professor, nunca à tela de login: quem vê esta barra já entrou. Mantém o modo ensaio/demonstração nos links. */
export function linkDocente(pagina, hash = '') {
  const atual = new URLSearchParams(location.search), q = new URLSearchParams();
  for (const k of ['ensaio', 'demonstracao']) if (atual.has(k)) q.set(k, atual.get(k) || '1');
  return pagina + (q.toString() ? '?' + q : '') + (hash ? '#' + hash : '');
}
const ITENS_FLUXO = [
  ['inicio', 'planejar.html', 'inicio', 'Início'],
  ['sair', '', 'sair', 'Sair'],
  ['criar', 'planejar.html', 'mais', 'Criar'],
  ['ajustar', 'planejar.html', 'planejar', 'Ajustar'],
  ['aplicar', 'planejar.html', 'conduzir', 'Aplicar'],
  ['manual', 'manual.html', 'manual', 'Manual']
];
for (const nav of document.querySelectorAll('nav.fluxo[data-fluxo-docente]')) {
  nav.replaceChildren(...ITENS_FLUXO.map(([hash, pag, ico, rot]) => {
    const el = hash === 'sair' ? document.createElement('button') : document.createElement('a');
    el.dataset.ico = ico; el.dataset.alvo = hash;
    if (hash === 'sair') {
      el.type = 'button';
      el.addEventListener('click', async () => {
        const { backend } = await import('./backend.js');
        const b = await backend();
        try { await b.sair?.(); } catch {}
        location.href = link('planejar.html');
      });
    } else if (hash === 'manual') {
      el.href = link('manual');
    } else {
      el.href = link(pag) + '#' + hash;
    }
    const r = document.createElement('span'); r.className = 'rot'; r.textContent = rot; el.append(r);
    return el;
  }));
}

function marcarNavegacao(){
 const pagina=location.pathname.split('/').pop().replace(/\.html$/, '')||'index';
 const hash=decodeURIComponent(location.hash.replace(/^#/, ''));
 for(const a of document.querySelectorAll('.fluxo a[href], .fluxo button')){
  const alvo=a.dataset.alvo;
  let ativo=false;
  if(pagina==='planejar'){
    const fase=['criar','ajustar','aplicar'].includes(hash)?hash:(hash==='minhas'?'ajustar':'inicio');
    ativo=alvo===fase && !document.body.classList.contains('planejando');
    if(document.body.classList.contains('planejando') && alvo==='ajustar') ativo=true;
  } else if(pagina==='manual') ativo=alvo==='manual';
  else if(alvo==='aplicar' && (pagina==='conduzir' || pagina==='telao')) ativo=true;
  if(ativo)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 }
}
marcarNavegacao();window.addEventListener('hashchange',marcarNavegacao);window.addEventListener('mosaico-navegacao',marcarNavegacao);
aplicarIcones(document);
// A prévia abre em outra aba: “voltar” fecha esta aba e volta ao planejamento que a abriu.
for (const a of document.querySelectorAll('a[data-fechar]')) a.addEventListener('click', ev => { if (window.opener && !window.opener.closed) { ev.preventDefault(); window.close(); } });
// Dentro da simulação (só no PC e com meu celular) as páginas rodam embutidas: sem barra de navegação (um toque não tira o celular simulado da sala).
if (window.top !== window) document.documentElement.classList.add('embutida');
// App instalável (manifest + service worker). Só na janela principal (não dentro da prévia ou do simulador).
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && window.top === window) navigator.serviceWorker.register('sw.js').catch(() => {});
