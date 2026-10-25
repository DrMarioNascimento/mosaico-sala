// Prévia ao vivo do Planejamento: abre a etapa em edição mesmo com campos em branco.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { atividadeParaPrevia } from '../js/core/previa-ao-vivo.js';

const pasta = new URL('../casos/', import.meta.url);
const modelos = readdirSync(pasta).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(new URL(f, pasta), 'utf8')));

test('Toda etapa de todo modelo pronto abre na prévia, sem tocar na atividade original', () => {
  for (const a of modelos) {
    const antes = JSON.stringify(a);
    for (const e of a.etapas) {
      const r = atividadeParaPrevia(a, e.id);
      assert.deepEqual(r.problemas, [], `${a.id} / ${e.id}`);
      assert.ok(r.atividade.etapas.some(x => x.id === e.id));
    }
    assert.equal(JSON.stringify(a), antes);
  }
});

test('A comparação leva junto a investigação de que depende', () => {
  const a = modelos.find(x => x.id === 'maratona-km38');
  const r = atividadeParaPrevia(a, 'e_juntar');
  assert.deepEqual(r.atividade.etapas.map(e => e.id), ['e_pistas', 'e_juntar']);
  assert.equal(r.atividade.conexoes.length, 1);
});

test('Etapas recém-criadas, ainda em branco, já aparecem (com "…")', () => {
  const g = [1, 2].map(i => ({ id: 'g' + i, nome: 'Grupo ' + i, ordemAlocacao: i }));
  const base = { schemaVersion: 'mosaico-atividade-0.1', id: 'x', titulo: '', publico: '', duracaoMin: 50, regime: 'simulacao', perguntaCentral: '', objetivos: [], introducao: '', fontes: [], grupos: g, pecas: [], conexoes: [], pendencias: [], meta: { ativa: false, etapas: [], limiar: 0.5 }, docente: { respostas: {}, guia: [], pontosDeDiscussao: [] } };
  const vazias = {
    questao_individual: { organizacao: 'individual', config: { enunciado: '', alternativas: ['a', 'b', 'c', 'd'].map(id => ({ id, texto: '' })) } },
    quiz_grupos: { config: { perguntas: [{ id: 'p1', enunciado: '', alternativas: ['a', 'b', 'c', 'd'].map(id => ({ id, texto: '' })) }], aoErrar: 'repassar', segundos: 60 } },
    cadeado_grupo: { config: { regra: 'acertos', perguntas: [{ id: 'p1', enunciado: '', alternativas: ['a', 'b'].map(id => ({ id, texto: '' })) }], distribuicao: 'diferente', minAcertos: 0, espera: 30 } },
    cartoes_arrastar: { config: { formato: 'ordenar', cartoes: ['c1', 'c2', 'c3'].map(id => ({ id, texto: '' })), distribuicao: 'todos', tentativas: 'repetir', espera: 30 } },
    pares: { config: { formato: 'ligar', pares: [1, 2, 3].map(i => ({ id: 'p' + i, a: '', b: '' })), distribuicao: 'todos', tentativas: 'repetir', espera: 15 } }
  };
  for (const [typeId, v] of Object.entries(vazias)) {
    const e = { id: 'e1', ordem: 1, titulo: '', typeId, typeVersion: '1.0.0', tempoMin: 5, instrucao: '', participacao: { organizacao: v.organizacao || 'grupos', envio: v.organizacao === 'individual' || typeId === 'cadeado_grupo' ? 'individual' : 'representante', competicao: 'desligada' }, config: v.config };
    const r = atividadeParaPrevia({ ...base, etapas: [e] }, 'e1');
    assert.deepEqual(r.problemas, [], typeId);
    assert.ok(JSON.stringify(r.atividade.etapas[0].config).includes('…'), typeId);
  }
});

test('Sem etapas, a prévia explica o que falta', () => {
  assert.match(atividadeParaPrevia({ etapas: [] }).problemas[0], /Adicione uma etapa/);
});
