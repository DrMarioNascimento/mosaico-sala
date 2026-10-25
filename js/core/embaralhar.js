/* MOSAICO · Ordem sorteada das alternativas — lógica pura, testada
   Quem escreve uma lista de alternativas escreve a verdade primeiro; mostrar na ordem do autor entrega a resposta.
   A ordem é sorteada na hora de desenhar, com uma semente estável: o mesmo aluno vê sempre a mesma ordem
   (a tela redesenha a cada mudança da sala), e alunos diferentes veem ordens diferentes.
   Onde o telão mostra a lista com letras, a semente é da sala, para telão e celulares baterem. */

/** Texto → inteiro de 32 bits (FNV-1a). */
export function hashTexto(texto) {
  let h = 0x811c9dc5;
  for (const c of String(texto)) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Gerador determinístico (mulberry32) a partir de um texto. */
export function geradorDe(texto) {
  let s = hashTexto(texto);
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cópia da lista em ordem sorteada pela semente (Fisher-Yates). A lista original não muda. */
export function embaralharPor(lista, semente) {
  const out = [...(lista || [])], rng = geradorDe(semente);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
