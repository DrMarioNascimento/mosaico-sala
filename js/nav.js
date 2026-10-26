/* MOSAICO · Navegação e ícones em todas as páginas.
   Põe os ícones próprios (js/icones.js) em [data-ico] / [data-ilu] e nos botões, e marca a página atual na barra de fluxo. */
import { aplicarIcones } from './icones.js';
import { percursoDocente } from './percurso-docente.js';
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
  ['minhas', 'planejar.html', 'biblioteca', 'Minhas atividades'],
  ['revisao', 'planejar.html', 'revisao', 'Revisar'],
  ['', 'simulador.html', 'simulador', 'Simular'],
  ['', 'conduzir.html', 'conduzir', 'Aplicar em sala'],
  ['', 'telao.html', 'telao', 'Telão'],
  ['', 'manual.html', 'atividade', 'Manual']
];
for (const nav of document.querySelectorAll('nav.fluxo[data-fluxo-docente]')) {
  nav.replaceChildren(...ITENS_FLUXO.flatMap(([hash, pag, ico, rot], i) => {
    const a = document.createElement('a');
    a.href = linkDocente(pag, hash); a.dataset.ico = ico; a.dataset.alvo = hash || pag.replace('.html', '');
    if (i === 0) { a.className = 'inicio'; a.title = 'Início: painel do professor'; }
    const r = document.createElement('span'); if (i === 0) r.className = 'rot'; r.textContent = rot; a.append(r);
    if (i !== 0) return [a];
    const sep = document.createElement('span'); sep.className = 'sep'; sep.setAttribute('aria-hidden', 'true'); sep.textContent = '›';
    return [a, sep];
  }));
}

function marcarNavegacao(){
 const pagina=location.pathname.split('/').pop().replace(/\.html$/, '')||'index';
 for(const a of document.querySelectorAll('.fluxo a[href]')){
  const href=a.getAttribute('href'),alvo=href.split('#')[0].split('?')[0].replace(/\.html$/, '');
  // No planejamento: “Revisar” acende na revisão; “Minhas atividades” no painel (sem atividade aberta).
  const ativo=alvo===pagina && (pagina!=='planejar' || (a.dataset.alvo==='revisao' ? location.hash==='#revisao' : a.dataset.alvo==='minhas' && !document.body.classList.contains('planejando')));
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
