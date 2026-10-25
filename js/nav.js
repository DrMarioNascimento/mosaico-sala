/* MOSAICO · Navegação e ícones em todas as páginas.
   Põe os ícones próprios (js/icones.js) em [data-ico] / [data-ilu] e nos botões, e marca a página atual na barra de fluxo. */
import { aplicarIcones } from './icones.js';

function marcarNavegacao(){
 const pagina=location.pathname.split('/').pop().replace(/\.html$/, '')||'index';
 for(const a of document.querySelectorAll('.fluxo a[href]')){
  const href=a.getAttribute('href'),alvo=href.split('#')[0].split('?')[0].replace(/\.html$/, '');
  const ativo=alvo===pagina && (pagina!=='planejar'||href.includes('#revisao')===(location.hash==='#revisao'));
  if(ativo)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 }
}
marcarNavegacao();window.addEventListener('hashchange',marcarNavegacao);
aplicarIcones(document);
// A prévia abre em outra aba: “voltar” fecha esta aba e volta ao planejamento que a abriu.
for (const a of document.querySelectorAll('a[data-fechar]')) a.addEventListener('click', ev => { if (window.opener && !window.opener.closed) { ev.preventDefault(); window.close(); } });
// Dentro do “Ver como fica” e do Simulador as páginas rodam embutidas: sem barra de navegação (um toque não tira o celular simulado da sala).
if (window.top !== window) document.documentElement.classList.add('embutida');
// App instalável (manifest + service worker). Só na janela principal (não dentro da prévia ou do simulador).
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && window.top === window) navigator.serviceWorker.register('sw.js').catch(() => {});
