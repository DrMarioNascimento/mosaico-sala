import { gradeDoCorte } from './montagem.js';
/* Montagem local: regras puras. A posição global do bloco não faz parte do jogo. */
export function gradeLocal(quantidade = 3, aspecto = 1) {
  if (![2, 3, 4].includes(quantidade)) throw new RangeError('Escolha 2, 3 ou 4 peças por celular.');
  if (quantidade === 4) return { linhas: 2, colunas: 2 };
  return aspecto >= 1 ? { linhas: quantidade, colunas: 1 } : { linhas: 1, colunas: quantidade };
}
export function moverFragmento(posicoes, id, destino) {
  if (!id || !Number.isInteger(destino) || destino < 0 || destino >= posicoes.length) return [...posicoes];
  const p = [...posicoes], origem = p.indexOf(id), anterior = p[destino];
  if (origem === destino) return p;
  if (origem >= 0) p[origem] = anterior || null;
  p[destino] = id;
  return p;
}
export const blocoCompleto = (ordem, posicoes) => ordem.length >= 2 && ordem.length === posicoes.length && ordem.every((id,i)=>posicoes[i]===id);
export function restaurarPosicoes(ordem, guardadas) {
  if (!Array.isArray(guardadas) || guardadas.length !== ordem.length) return ordem.map(()=>null);
  const vistos = new Set();
  return guardadas.map(id=>{if(!ordem.includes(id)||vistos.has(id))return null;vistos.add(id);return id;});
}

export function gradeDosBlocos(celulares, colunas) {
  const n = Math.max(1,Math.round(Number(celulares)||1));
  return n === 1 ? {linhas:1,colunas:1} : gradeDoCorte('grade',n,colunas);
}
