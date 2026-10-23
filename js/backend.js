/* MOSAICO · Escolha do backend
   - Normal: Firebase (projeto mosaico-sala, plano gratuito).
   - ?ensaio na URL: tudo fica neste navegador (localStorage), sem internet.
     Serve para ensaiar a aula sozinho abrindo várias abas. */

export const EM_ENSAIO = new URLSearchParams(location.search).has('ensaio');

let instancia = null;
export async function backend() {
  if (!instancia) instancia = EM_ENSAIO ? (await import('./cloud-local.js')).backend : (await import('./cloud-firebase.js')).backend;
  return instancia;
}

/** Mantém o modo ensaio ao montar links entre páginas. */
export function link(pagina, params = {}) {
  const base = location.protocol === 'file:' ? new URL(pagina, location.href) : new URL(pagina, location.origin + location.pathname.replace(/[^/]*$/, ''));
  for (const [k, v] of Object.entries(params)) base.searchParams.set(k, v);
  if (EM_ENSAIO) base.searchParams.set('ensaio', '1');
  return base.href;
}
