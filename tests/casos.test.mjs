// Os modelos prontos (pasta casos/) precisam abrir sem erros e estar na lista de js/casos.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validarAtividade } from '../js/core/validacao.js';
import { CASOS } from '../js/casos.js';

const pasta = new URL('../casos/', import.meta.url);
const arquivos = readdirSync(pasta).filter(f => f.endsWith('.json'));

for (const f of arquivos) {
  test(`Modelo ${f} passa na validação sem erros`, () => {
    const a = JSON.parse(readFileSync(new URL(f, pasta), 'utf8'));
    const erros = validarAtividade(a).filter(d => d.severidade === 'erro');
    assert.deepEqual(erros, []);
    assert.equal(a.id + '.json', f);
  });
}

test('Todo modelo da pasta casos/ aparece na lista e vice-versa', () => {
  assert.deepEqual(CASOS.map(c => c.id + '.json').sort(), [...arquivos].sort());
});

// "O que derrubou a corredora no km 38?" é um mistério: cada fato de que a dedução depende precisa ter
// duas fontes, em grupos diferentes, para a aula fechar mesmo quando um grupo fica vazio (turma pequena).
test('Mistério do km 38: todo fato essencial sobrevive à falta de qualquer grupo', () => {
  const a = JSON.parse(readFileSync(new URL('maratona-km38.json', pasta), 'utf8'));
  const fatos = {
    'peso na largada': ['p_pi_peso', 'p_eq_peso'],
    'peso na tenda': ['p_po_balanca', 'p_te_balanca'],
    'dia frio': ['p_pi_frio', 'p_po_frio'],
    'bebeu em todos os postos': ['p_po_copos', 'p_eq_plano'],
    'mãos inchadas': ['p_pi_anel', 'p_te_maos'],
    'urinou na prova': ['p_po_banheiro', 'p_eq_rastreador'],
    'açúcar normal': ['p_pi_acucar', 'p_te_sinais'],
    'recusou o gel': ['p_po_gel', 'p_eq_gel'],
    'recusou a garrafa': ['p_pi_bruna', 'p_po_garrafa']
  };
  const grupoDe = Object.fromEntries(a.pecas.map(p => [p.id, p.destinatarios[0]]));
  for (const ausente of a.grupos.map(g => g.id))
    for (const [fato, pecas] of Object.entries(fatos)) {
      assert.ok(pecas.every(id => grupoDe[id]), `peça de "${fato}" não existe`);
      assert.ok(pecas.some(id => grupoDe[id] !== ausente), `sem o grupo ${ausente}, ninguém sabe: ${fato}`);
    }
  // Nada de revelação antes do tablet da tenda (etapa 3)
  const cedo = [a.introducao, a.perguntaCentral, ...a.pecas.map(p => p.conteudo), ...a.grupos.map(g => g.nome + ' ' + g.funcao),
    ...a.etapas.filter(e => e.ordem <= 2).flatMap(e => [e.titulo, e.instrucao, e.config.pergunta, ...e.config.hipotesesCandidatas.map(h => h.texto)])].join(' ').toLowerCase();
  for (const palavra of ['sódio', 'hiponatrem', 'diluí', '1,8']) assert.ok(!cedo.includes(palavra), `"${palavra}" aparece antes da hora`);
});
