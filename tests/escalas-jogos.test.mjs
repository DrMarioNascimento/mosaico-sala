// Escalas padronizadas (Mini-IPIP6) e jogos econômicos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTOS, pontuar, escoresValidos, resumoTurma, correlacao } from '../js/core/escalas.js';
import { JOGOS, decisaoValida, anel, resolverJogo } from '../js/core/jogos.js';

const I = INSTRUMENTOS['mini-ipip6'];
const rngFixo = () => { let s = 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

test('Mini-IPIP6: 24 itens, 4 por fator, 15 invertidos (como na chave do IPIP)', () => {
  assert.equal(I.itens.length, 24);
  for (const f of I.fatores) assert.equal(I.itens.filter(i => i.fator === f.id).length, 4);
  assert.equal(I.itens.filter(i => i.inv).length, 15);
  assert.ok(I.itens.filter(i => i.fator === 'H').every(i => i.inv));   // Honestidade-Humildade: os 4 invertidos
});

test('Pontuação inverte os itens invertidos e calcula a média por fator', () => {
  const tudo5 = Object.fromEntries(I.itens.map(i => [i.id, 5]));
  const r = pontuar('mini-ipip6', tudo5);
  assert.equal(r.E, 3);              // 2 diretos (5) + 2 invertidos (1) → 3
  assert.equal(r.H, 1);              // 4 invertidos → 1
  const consistente = Object.fromEntries(I.itens.map(i => [i.id, i.inv ? 1 : 5]));
  assert.deepEqual(pontuar('mini-ipip6', consistente), { E: 5, A: 5, C: 5, N: 5, O: 5, H: 5 });
});

test('Fator com menos de 3 dos 4 itens fica sem escore', () => {
  const r = pontuar('mini-ipip6', { i1: 5, i6: 1 });
  assert.equal(r.E, null);
  assert.equal(pontuar('mini-ipip6', { i1: 5, i6: 1, i11: 5 }).E, 5);
});

test('Escores enviados: só números de 1 a 5 por fator, nada mais', () => {
  assert.deepEqual(escoresValidos('mini-ipip6', { E: 3.5, A: 9, H: 2, X: 4, nome: 'Ana' }), { E: 3.5, A: null, C: null, N: null, O: null, H: 2 });
  assert.equal(escoresValidos('mini-ipip6', {}), null);
});

test('Média da turma só aparece com 5 ou mais respostas', () => {
  const um = { E: 3, A: 4, C: 2, N: 3, O: 5, H: 4 };
  assert.equal(resumoTurma('mini-ipip6', [um, um, um, um]).suprimido, true);
  const r = resumoTurma('mini-ipip6', [um, um, um, um, { ...um, E: 5 }]);
  assert.equal(r.suprimido, false);
  assert.equal(r.fatores.E.media, 3.4);
  assert.equal(r.fatores.E.faixas.reduce((a, b) => a + b, 0), 5);
});

test('Correlação de Pearson', () => {
  assert.equal(correlacao([1, 2, 3, 4], [2, 4, 6, 8]), 1);
  assert.equal(correlacao([1, 2, 3], [3, 2, 1]), -1);
  assert.equal(correlacao([1, 2], [1, 2]), null);
});

test('Decisões fora dos limites são corrigidas ou recusadas', () => {
  assert.deepEqual(decisaoValida({ formato: 'ditador', dotacao: 10 }, { dar: 14 }), { dar: 10 });
  assert.deepEqual(decisaoValida({ formato: 'confianca', dotacao: 10 }, { enviar: 3, devolver: 150 }), { enviar: 3, devolver: 100 });
  assert.equal(decisaoValida({ formato: 'ultimato', dotacao: 10 }, { oferta: 'x', minimo: 2 }), null);
});

test('Anel: cada um joga com exatamente um e recebe de exatamente um', () => {
  const p = anel(['a', 'b', 'c', 'd'], rngFixo());
  assert.equal(new Set(Object.values(p)).size, 4);
  for (const [x, y] of Object.entries(p)) assert.notEqual(x, y);
  assert.deepEqual(anel(['a']), {});
});

test('Ditador: os pontos se conservam (soma dos ganhos = turma × dotação)', () => {
  const r = resolverJogo({ formato: 'ditador', dotacao: 10 }, { a: { dar: 0 }, b: { dar: 5 }, c: { dar: 10 } }, {}, rngFixo());
  assert.equal(Object.values(r.porUid).reduce((s, x) => s + x.ganho, 0), 30);
  assert.equal(r.resumo.deuZero, 1);
  assert.deepEqual(r.resumo.distribuicao.filter(Boolean), [1, 1, 1]);
});

test('Ultimato: oferta abaixo do mínimo do parceiro é recusada', () => {
  const r = resolverJogo({ formato: 'ultimato', dotacao: 10 }, { a: { oferta: 1, minimo: 0 }, b: { oferta: 5, minimo: 4 } }, {}, rngFixo());
  // a→b: 1 < 4, recusada; b→a: 5 ≥ 0, aceita
  assert.equal(r.resumo.recusadas, 1);
  assert.equal(r.porUid.a.ganho, 5);
  assert.equal(r.porUid.b.ganho, 5);
});

test('Confiança: o que é enviado é multiplicado e parte volta', () => {
  const r = resolverJogo({ formato: 'confianca', dotacao: 10, multiplicador: 3 }, { a: { enviar: 10, devolver: 50 }, b: { enviar: 0, devolver: 0 } }, {}, rngFixo());
  // a envia os 10 a b, que recebe 30 e devolve 0% → a fica com 0. b não envia nada (fica com 10) e guarda os 30.
  assert.equal(r.porUid.a.ganho, 0);
  assert.equal(r.porUid.b.ganho, 40);
  const r2 = resolverJogo({ formato: 'confianca', dotacao: 10, multiplicador: 3 }, { a: { enviar: 10, devolver: 50 }, b: { enviar: 10, devolver: 50 } }, {}, rngFixo());
  assert.equal(r2.porUid.a.ganho, 30);   // envia 10 (recebe 15 de volta) e, ao receber 30, devolve 15: 0 + 15 + 15
});

test('Bens públicos: o fundo é multiplicado e dividido no grupo', () => {
  const r = resolverJogo({ formato: 'bens_publicos', dotacao: 10, fator: 2 }, { a: { contribuir: 10 }, b: { contribuir: 0 } }, { a: 'g1', b: 'g1' });
  assert.equal(r.resumo.grupos.g1.fundo, 10);
  assert.equal(r.porUid.a.ganho, 10);   // 10 − 10 + 10
  assert.equal(r.porUid.b.ganho, 20);   // 10 − 0 + 10 (o carona ganha mais: o dilema)
  assert.ok(Object.keys(JOGOS).length === 4);
});
