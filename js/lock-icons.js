import { h } from './ui.js';

/** Cadeado 3D; o chamador mantém o estado e o texto acessível. */
export function cadeadoIcone(aberto = false, cor = 'white') {
  return h('img', {src: new URL(`../assets/icons/locks/${aberto ? 'open' : 'closed'}-${cor}.png`, import.meta.url).href, alt: '', 'aria-hidden': 'true', style: {width: '1.8em', height: '1.8em', objectFit: 'contain', verticalAlign: 'middle', flexShrink: 0}});
}
