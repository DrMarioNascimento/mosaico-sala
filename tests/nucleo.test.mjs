// Testes do núcleo do MOSAICO · node --test tests/
// Critérios de aceitação da especificação v2 (seção 22) cobertos aqui.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularVagas, distribuir, geradorComSemente, diagnosticarComposicao, grupoParaEntradaTardia, moverParticipante } from '../js/core/distribuicao.js';
import { validarAtividade, temErros, lerJsonImportado } from '../js/core/validacao.js';
import { sugerirEquilibrio, avisoGramatica, elementosDaGramatica } from '../js/core/equilibrio.js';
import { conferirColecao, origensEsperadas, prontidaoEtapa, projecaoGrupo, versaoPublica, avaliar, calcularMeta, registrarContingencia, montarResultado } from '../js/core/motor.js';

const caso = () => JSON.parse(readFileSync(new URL('../casos/ciclista-altitude.json', import.meta.url), 'utf8'));
const grupos = n => Array.from({ length: n }, (_, i) => ({ id: 'g' + (i + 1), ordemAlocacao: i + 1 }));
const pessoas = n => Array.from({ length: n }, (_, i) => 'p' + (i + 1));
const tamanhos = (g, n) => calcularVagas(grupos(g), n).map(v => v.vagas);
const erros = d => d.filter(x => x.severidade === 'erro');

// ---------- Distribuição (seção 9, GRP) ----------
test('GRP-01: 20 alunos, 10 grupos → 2 em cada', () => assert.deepEqual(tamanhos(10, 20), Array(10).fill(2)));
test('GRP-02: 23 alunos, 10 grupos → 3 nos grupos 1–3', () => assert.deepEqual(tamanhos(10, 23), [3, 3, 3, 2, 2, 2, 2, 2, 2, 2]));
test('GRP-03: 29 alunos, 10 grupos → 3 nos grupos 1–9', () => assert.deepEqual(tamanhos(10, 29), [3, 3, 3, 3, 3, 3, 3, 3, 3, 2]));
test('Tabela 9.2: 30/10, 28/5, 32/5', () => {
  assert.deepEqual(tamanhos(10, 30), Array(10).fill(3));
  assert.deepEqual(tamanhos(5, 28), [6, 6, 6, 5, 5]);
  assert.deepEqual(tamanhos(5, 32), [7, 7, 6, 6, 6]);
});
test('Excedentes seguem ordemAlocacao, não a ordem da lista', () => {
  const gs = [{ id: 'z', ordemAlocacao: 3 }, { id: 'a', ordemAlocacao: 1 }, { id: 'm', ordemAlocacao: 2 }];
  const v = calcularVagas(gs, 4);
  assert.deepEqual(v, [{ grupoId: 'a', vagas: 2 }, { grupoId: 'm', vagas: 1 }, { grupoId: 'z', vagas: 1 }]);
});
test('GRP-04: sorteios diferentes mudam pessoas, não tamanhos nem grupos', () => {
  const gs = grupos(10), ps = pessoas(23);
  const r1 = distribuir(gs, ps, geradorComSemente(1)), r2 = distribuir(gs, ps, geradorComSemente(2));
  assert.notDeepEqual(r1.composicao, r2.composicao);
  for (const r of [r1, r2]) {
    assert.deepEqual(gs.map(g => r.composicao[g.id].length), [3, 3, 3, 2, 2, 2, 2, 2, 2, 2]);
    const todos = Object.values(r.composicao).flat();
    assert.equal(new Set(todos).size, 23);
    assert.deepEqual(Object.keys(r.composicao).sort(), gs.map(g => g.id).sort());
  }
});
test('Invariantes da distribuição para N de 0 a 60 e G de 1 a 12', () => {
  for (let g = 1; g <= 12; g++) for (let n = 0; n <= 60; n++) {
    const r = distribuir(grupos(g), pessoas(n), geradorComSemente(n * 31 + g));
    const t = Object.values(r.composicao).map(x => x.length);
    assert.equal(t.reduce((a, b) => a + b, 0), n);
    assert.ok(Math.max(...t) - Math.min(...t) <= 1);
    assert.equal(Object.keys(r.composicao).length, g);
  }
});
test('GRP-05: menos participantes que grupos → grupos vazios sinalizados, nada removido', () => {
  const r = distribuir(grupos(5), pessoas(3), geradorComSemente(7));
  assert.deepEqual(r.gruposVazios, ['g4', 'g5']);
  assert.equal(Object.keys(r.composicao).length, 5);
});
test('Participante duplicado é recusado', () => assert.throws(() => distribuir(grupos(2), ['p1', 'p1'])));
test('Entrada tardia vai para o menor grupo, desempate pela ordem', () => {
  const gs = grupos(3);
  assert.equal(grupoParaEntradaTardia(gs, { g1: ['a', 'b'], g2: ['c'], g3: ['d'] }), 'g2');
});
test('Ajuste manual: diagnóstico mostra desequilíbrio sem corrigir', () => {
  const gs = grupos(3);
  const nova = moverParticipante({ g1: ['a', 'b'], g2: ['c', 'd'], g3: ['e'] }, 'd', 'g1');
  const diag = diagnosticarComposicao(gs, nova);
  assert.equal(diag.equilibrada, false);
  assert.equal(diag.diferenca, 2);
  assert.deepEqual(nova.g1, ['a', 'b', 'd']);
});

// ---------- Validação (AUT, TYP, ADR) ----------
test('Caso piloto passa na validação sem erros', () => {
  const d = validarAtividade(caso());
  assert.deepEqual(erros(d), []);
});
test('AUT-03: JSON com cerca de código é lido; JSON quebrado gera diagnóstico', () => {
  assert.ok(lerJsonImportado('```json\n{"a":1}\n```').atividade);
  assert.equal(lerJsonImportado('{a:').diagnosticos[0].severidade, 'erro');
});
test('TYP-02: tipo ou versão desconhecida → erro localizado, sem substituição', () => {
  const a = caso();
  a.etapas[0].typeVersion = '9.0.0';
  a.etapas[2].typeId = 'tipo_inventado';
  const d = erros(validarAtividade(a));
  assert.ok(d.some(x => x.local === 'etapas[0].typeId' && /não está disponível/.test(x.mensagem)));
  assert.ok(d.some(x => x.local === 'etapas[2].typeId' && /não existe/.test(x.mensagem)));
});
test('TYP-01: participação incompatível com o tipo é recusada', () => {
  const a = caso();
  a.etapas[1].participacao.organizacao = 'individual';
  assert.ok(temErros(validarAtividade(a)));
});
test('TYP-03: conexão para porta que não aceita aquela saída', () => {
  const a = caso();
  a.conexoes[0].para.portId = 'porta_inexistente';
  assert.ok(erros(validarAtividade(a)).some(x => /não é aceita/.test(x.mensagem)));
});
test('Dependência para trás (bloqueio) é detectada', () => {
  const a = caso();
  a.etapas[1].ordem = 0;
  assert.ok(erros(validarAtividade(a)).some(x => /bloqueio/.test(x.mensagem)));
});
test('Entrada obrigatória sem produtor é detectada', () => {
  const a = caso();
  a.conexoes = [];
  assert.ok(erros(validarAtividade(a)).some(x => /precisa receber/.test(x.mensagem)));
});
test('Gabarito dentro das etapas é recusado (separação docente)', () => {
  const a = caso();
  a.etapas[2].config.alternativas[0].correta = true;
  assert.ok(erros(validarAtividade(a)).some(x => /gabarito/i.test(x.mensagem)));
});
test('Conteúdo sintético no regime fiel é recusado', () => {
  const a = caso();
  a.regime = 'fiel';
  assert.ok(erros(validarAtividade(a)).some(x => /sintético/.test(x.mensagem)));
});
test('ADR: plano com pessoas dentro dos grupos é recusado', () => {
  const a = caso();
  a.grupos[0].membros = ['alguém'];
  assert.ok(erros(validarAtividade(a)).some(x => /ADR-001/.test(x.mensagem)));
});
test('ADR-01: renomear grupo não altera nada além do nome', () => {
  const a = caso(), b = caso();
  b.grupos[0].nome = 'Hematologia';
  assert.deepEqual(erros(validarAtividade(b)), []);
  assert.deepEqual(projecaoGrupo(a, 'e_investigacao', 'g_sangue').pecas, projecaoGrupo(b, 'e_investigacao', 'g_sangue').pecas);
});
test('Numeração visível em peça gera aviso (anti-decoreba)', () => {
  const a = caso();
  a.pecas[0].conteudo = 'Pista 3: ' + a.pecas[0].conteudo;
  assert.ok(validarAtividade(a).some(x => x.severidade === 'aviso' && /numeração/.test(x.mensagem)));
});

// ---------- Equilíbrio (7.3, EQU) ----------
test('EQU-01: três etapas seguidas do mesmo tipo geram sugestão com posição e motivo', () => {
  const a = caso();
  a.etapas.push({ ...a.etapas[3], id: 'e_t3', ordem: 5, titulo: 'Mais uma' });
  const s = sugerirEquilibrio(a);
  const rep = s.find(x => x.id.startsWith('repeticao:'));
  assert.ok(rep && rep.posicao && /três etapas seguidas/.test(rep.mensagem));
});
test('EQU-02: sugestão dispensada não reaparece', () => {
  const a = caso();
  a.etapas.push({ ...a.etapas[3], id: 'e_t3', ordem: 5, titulo: 'Mais uma' });
  const id = sugerirEquilibrio(a).find(x => x.id.startsWith('repeticao:')).id;
  assert.ok(!sugerirEquilibrio(a, { dispensadas: new Set([id]) }).some(x => x.id === id));
});
test('EQU-03: atividade sem interdependência recebe aviso, mas segue válida', () => {
  const a = caso();
  a.etapas = a.etapas.filter(e => e.id !== 'e_comparacao');
  a.conexoes = [];
  delete a.docente.respostas.e_comparacao;
  assert.deepEqual(erros(validarAtividade(a)), []);
  assert.ok(avisoGramatica(a).faltam.includes('interdependencia'));
  assert.ok(sugerirEquilibrio(a).some(x => x.id === 'ausente:interdependencia'));
});
test('Caso piloto tem todos os elementos da gramática', () => {
  assert.deepEqual(Object.values(elementosDaGramatica(caso())), [true, true, true, true, true]);
});
test('Sugestões limitadas a 3', () => {
  const a = caso();
  a.meta.ativa = false;
  a.conexoes = [];
  for (let i = 5; i < 12; i++) a.etapas.push({ ...a.etapas[3], id: 'x' + i, ordem: i, titulo: 'Q' + i });
  assert.ok(sugerirEquilibrio(a).length <= 3);
});

// ---------- Motor da sessão (VAR, TYP-04/06, ADR-02/03) ----------
const hip = (g, h = 'h_ferro') => montarResultado({ etapaId: 'e_investigacao', grupoPlanejadoId: g, autoria: { tipo: 'grupo', grupoId: g }, dados: { hipoteseId: h, evidencias: [] } });
test('TYP-04: coleção com origem repetida e um grupo faltante não é completa', () => {
  const a = caso();
  const esperadas = origensEsperadas(a, 'e_comparacao');
  const recebidos = [hip('g_sangue'), hip('g_sangue'), hip('g_medula'), hip('g_ar'), hip('g_desempenho')];
  const c = conferirColecao(esperadas, recebidos);
  assert.equal(recebidos.length, esperadas.length);
  assert.equal(c.completa, false);
  assert.deepEqual(c.faltantes.map(f => f.grupoId), ['g_massa']);
  assert.equal(c.duplicadas.length, 1);
});
test('ADR-02: grupo vazio com saída obrigatória → consumidor aguarda', () => {
  const a = caso();
  const r = prontidaoEtapa(a, 'e_comparacao', ['g_sangue', 'g_medula', 'g_ar', 'g_desempenho'].map(g => hip(g)));
  assert.equal(r.pronta, false);
  assert.match(r.motivo, /Aguardando 1/);
});
test('ADR-03: outro grupo executa a tarefa do vazio — autoria real registrada', () => {
  const a = caso();
  const cont = registrarContingencia({ etapaId: 'e_investigacao', grupoPlanejadoId: 'g_massa', tipo: 'executor_adicional', executadoPor: 'g_sangue' });
  const res = [...['g_sangue', 'g_medula', 'g_ar', 'g_desempenho'].map(g => hip(g)),
    montarResultado({ etapaId: 'e_investigacao', grupoPlanejadoId: 'g_massa', autoria: { tipo: 'grupo', grupoId: 'g_sangue', contingencia: true }, dados: { hipoteseId: 'h_tardio', evidencias: [] } })];
  const r = prontidaoEtapa(a, 'e_comparacao', res, [cont]);
  assert.equal(r.pronta, true);
  const contrib = projecaoGrupo(a, 'e_comparacao', 'g_ar', res).contribuicoes.find(c => c.grupoId === 'g_massa');
  assert.equal(contrib.autoria.grupoId, 'g_sangue');
});
test('VAR-03 / TYP-06: hipótese inicial incorreta é repassada como foi enviada, não o gabarito', () => {
  const a = caso();
  const res = ['g_sangue', 'g_medula', 'g_ar', 'g_desempenho', 'g_massa'].map(g => hip(g, g === 'g_sangue' ? 'h_tardio' : 'h_ferro'));
  const proj = projecaoGrupo(a, 'e_comparacao', 'g_medula', res);
  assert.equal(proj.contribuicoes.find(c => c.grupoId === 'g_sangue').hipoteseId, 'h_tardio');
  assert.equal(avaliar(a, 'e_investigacao', { hipoteseId: 'h_tardio' }).avaliada, false); // investigação não é nota
});
test('SEG: projeção do grupo só tem as peças dele e nada docente', () => {
  const a = caso();
  const proj = projecaoGrupo(a, 'e_investigacao', 'g_ar');
  assert.ok(proj.pecas.length === 3 && proj.pecas.every(p => p.id.startsWith('p_ar_')));
  const texto = JSON.stringify(proj);
  assert.ok(!/corretaId|explicacao|docente/.test(texto));
  assert.ok(!('docente' in versaoPublica(a)));
});
test('Meta coletiva: ausências não contam como acerto', () => {
  const a = caso();
  const r = (e, alt) => montarResultado({ etapaId: e, participanteId: 'x', autoria: { tipo: 'participante' }, dados: { alternativaId: alt } });
  const m = calcularMeta(a, [r('e_transferencia_1', 'a'), r('e_transferencia_1', 'b'), r('e_transferencia_2', 'a'), r('e_transferencia_2', 'a')]);
  assert.deepEqual([m.acertos, m.total, m.atingida], [3, 4, true]);
  assert.equal(calcularMeta(a, []).atingida, false);
});

test('Máximo de 10 grupos (um ícone distinto por grupo)', () => {
  const a = caso();
  for (let i = 6; i <= 11; i++) a.grupos.push({ id: 'g_extra' + i, nome: 'Extra ' + i, ordemAlocacao: i });
  assert.ok(erros(validarAtividade(a)).some(x => /máximo é 10/.test(x.mensagem)));
});

// ---------- Planilha (modo aberto) ----------
import { atividadeParaAbas, abasParaAtividade } from '../js/core/planilha.js';
const semIdConexao = a => ({ ...a, conexoes: a.conexoes.map(({ id, ...c }) => c) });
test('Planilha: atividade → abas → atividade preserva tudo (exceto id interno da conexão)', () => {
  const a = caso();
  const { atividade: b, problemas } = abasParaAtividade(atividadeParaAbas(a));
  assert.deepEqual(problemas, []);
  assert.deepEqual(erros(validarAtividade(b)), []);
  assert.deepEqual(semIdConexao(b), semIdConexao(a));
});
test('Planilha: nomes de aba/coluna com acento e maiúsculas são aceitos; "60%" vira 0.6', () => {
  const abas = atividadeParaAbas(caso());
  const renomeada = {};
  for (const [n, linhas] of Object.entries(abas)) renomeada[n.toUpperCase()] = linhas.map(l => Object.fromEntries(Object.entries(l).map(([k, v]) => [k === 'funcao' ? 'Função' : k.toUpperCase(), v])));
  const { atividade } = abasParaAtividade(renomeada);
  assert.equal(atividade.meta.limiar, 0.6);
  assert.equal(atividade.grupos[0].funcao, caso().grupos[0].funcao);
});
test('Planilha: tipo desconhecido e aba faltando viram problemas legíveis', () => {
  const abas = atividadeParaAbas(caso());
  abas.Etapas[0].tipo = 'inventado';
  delete abas.Grupos;
  const { problemas } = abasParaAtividade(abas);
  assert.ok(problemas.some(p => /inventado/.test(p)));
  assert.ok(problemas.some(p => /Grupos/.test(p)));
});
test('LGPD: CPF, e-mail e telefone em peças geram aviso (não erro)', () => {
  const a = caso();
  a.pecas[0].conteudo += ' Contato: joana@exemplo.com';
  a.pecas[1].conteudo += ' CPF 123.456.789-09';
  a.pecas[2].conteudo += ' Tel (48) 99123-4567';
  const d = validarAtividade(a);
  assert.deepEqual(erros(d), []);
  assert.equal(d.filter(x => /fictícios/.test(x.mensagem)).length, 3);
});

// ---------- Montagem em peças ----------
import { unidadesDoTexto, sugerirCortes, dividirEmN, gradeDoCorte, retangulos, bordas, distribuirPecas, pecasDeTexto, embaralharSemOrdemCerta } from '../js/core/montagem.js';
const VO2 = 'VO₂ − = − 0,1 × velocidade − + 3,5 − = − 0,1 × 100 m/min + 3,5 − = − 13,5 mL·kg⁻¹·min⁻¹';
test('Montagem: o texto do professor vira peças pelos cortes " − " e "|"', () => {
  assert.deepEqual(unidadesDoTexto(VO2), ['VO₂', '=', '0,1 × velocidade', '+ 3,5', '=', '0,1 × 100 m/min + 3,5', '=', '13,5 mL·kg⁻¹·min⁻¹']);
  assert.deepEqual(unidadesDoTexto('a | b\nc | d'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(unidadesDoTexto('5 - 3 | = 2'), ['5 - 3', '= 2']);   // hífen não corta
});
test('Montagem: sugestão de corte por sinais e por palavras', () => {
  assert.equal(sugerirCortes('a = b + c', 'sinais'), 'a | = b | + c');
  assert.equal(sugerirCortes('um dois três', 'palavras'), 'um | dois | três');
});
test('Montagem: dividir em N preserva a ordem e equilibra', () => {
  const u = unidadesDoTexto(VO2);
  for (let n = 1; n <= u.length; n++) {
    const p = dividirEmN(u, n);
    assert.equal(p.length, n);
    assert.equal(p.join(' '), u.join(' '));
  }
  assert.equal(pecasDeTexto({ texto: VO2, quantidade: 'celulares' }, 3).length, 3);
  assert.equal(pecasDeTexto({ texto: VO2, quantidade: 'fixa' }, 3).length, 8);
});
test('Montagem: cortes de imagem e bordas complementares', () => {
  assert.deepEqual(gradeDoCorte('colunas', 4), { linhas: 1, colunas: 4 });
  assert.deepEqual(gradeDoCorte('linhas', 3), { linhas: 3, colunas: 1 });
  assert.deepEqual(gradeDoCorte('grade', 6, 3), { linhas: 2, colunas: 3 });
  const g = { linhas: 3, colunas: 4 }, b = bordas(g, geradorComSemente(5)), r = retangulos(g);
  assert.equal(b.length, 12);
  for (let i = 0; i < 12; i++) {
    const { l, c } = r[i];
    if (c < 3) assert.equal(b[i].direita, -b[i + 1].esquerda);
    if (l < 2) assert.equal(b[i].base, -b[i + 4].topo);
    if (l === 0) assert.equal(b[i].topo, 0);
    if (c === 0) assert.equal(b[i].esquerda, 0);
    for (const lado of ['topo', 'direita', 'base', 'esquerda']) if (!((l === 0 && lado === 'topo') || (l === 2 && lado === 'base') || (c === 0 && lado === 'esquerda') || (c === 3 && lado === 'direita'))) assert.notEqual(b[i][lado], 0);
  }
});
test('Montagem: distribuição cobre todas as peças, sem repetir; nunca entrega na ordem certa', () => {
  const m = distribuirPecas(8, ['a', 'b', 'c'], geradorComSemente(3));
  const todas = [...m.values()].flat().sort((x, y) => x - y);
  assert.deepEqual(todas, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.ok([...m.values()].every(v => v.length >= 2));
  const m2 = distribuirPecas(2, ['a', 'b', 'c', 'd'], geradorComSemente(1));
  assert.equal([...m2.values()].filter(v => v.length === 0).length, 2);
  for (let s = 0; s < 50; s++) assert.notDeepEqual(embaralharSemOrdemCerta([1, 2, 3], geradorComSemente(s)), [1, 2, 3]);
});
test('Montagem: validação do tipo (texto sem corte e imagem sem arquivo dão erro)', () => {
  const a = caso();
  a.etapas.push({ id: 'e_mont', ordem: 5, titulo: 'Montagem', typeId: 'montagem_pecas', typeVersion: '1.0.0', tempoMin: 5, participacao: { organizacao: 'representantes', envio: 'nenhum', competicao: 'meta' }, config: { modo: 'texto', texto: 'sem cortes', quantidade: 'fixa' } });
  assert.ok(erros(validarAtividade(a)).some(x => /corte/.test(x.mensagem)));
  a.etapas.at(-1).config = { modo: 'texto', texto: VO2, quantidade: 'fixa' };
  assert.deepEqual(erros(validarAtividade(a)), []);
  a.etapas.at(-1).config = { modo: 'imagem', corte: { tipo: 'colunas', n: 4 }, quantidade: 'fixa' };
  assert.ok(erros(validarAtividade(a)).some(x => /imagem/.test(x.mensagem)));
});
test('Planilha: etapa de montagem (texto e imagem em partes) ida e volta', () => {
  const a = caso();
  const dados = 'data:image/webp;base64,' + 'A'.repeat(70000);
  a.etapas.push({ id: 'e_m1', ordem: 5, titulo: 'Conta', typeId: 'montagem_pecas', typeVersion: '1.0.0', tempoMin: 5, instrucao: '', participacao: { organizacao: 'representantes', envio: 'nenhum', competicao: 'meta' }, config: { modo: 'texto', texto: VO2, quantidade: 'celulares', ocultarAoFim: true, revelarAoEncerrar: true } });
  a.etapas.push({ id: 'e_m2', ordem: 6, titulo: 'Diagrama', typeId: 'montagem_pecas', typeVersion: '1.0.0', tempoMin: 5, instrucao: '', participacao: { organizacao: 'grupos', envio: 'nenhum', competicao: 'meta' }, config: { modo: 'imagem', imagem: { dados, largura: 800, altura: 600 }, corte: { tipo: 'grade', n: 6, colunas: 3 }, quantidade: 'fixa', ocultarAoFim: false, revelarAoEncerrar: false } });
  const abas = atividadeParaAbas(a);
  assert.equal(abas.Imagens.length, 3);
  const { atividade: b, problemas } = abasParaAtividade(abas);
  assert.deepEqual(problemas, []);
  assert.deepEqual(b.etapas.find(e => e.id === 'e_m1').config, a.etapas.find(e => e.id === 'e_m1').config);
  assert.deepEqual(b.etapas.find(e => e.id === 'e_m2').config, a.etapas.find(e => e.id === 'e_m2').config);
  assert.deepEqual(erros(validarAtividade(b)), []);
});

// ---------- Cadeado do grupo e Quiz entre grupos ----------
import { prepararCadeado, estadoCadeado, normalizarCodigo, codigoConfere, sortearGrupo, necessarios } from '../js/core/desafios.js';
const perg = (id, certa = 'a') => ({ id, enunciado: 'Pergunta ' + id, alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }, { id: 'c', texto: 'C' }], _certa: certa });
const limpaP = ps => ps.map(({ _certa, ...p }) => p);
const gabDe = (ps, extra = {}) => ({ perguntas: Object.fromEntries(ps.map(p => [p.id, { corretaId: p._certa }])), ...extra });
const etapaCadeado = (config, id = 'e_cad') => ({ id, ordem: 5, titulo: 'Cadeado', typeId: 'cadeado_grupo', typeVersion: '1.0.0', tempoMin: 10, instrucao: '', participacao: { organizacao: 'grupos', envio: 'individual', competicao: 'entre_grupos' }, config });

test('Cadeado: código normalizado (vírgula/ponto, espaços, maiúsculas, alternativas com ;)', () => {
  assert.equal(normalizarCodigo(' 13,50 '), '13.5');
  assert.ok(codigoConfere('13.5', '13,5'));
  assert.ok(codigoConfere('Hipóxia ', 'hipóxia'));
  assert.ok(codigoConfere('945', '0,95; 945'));
  assert.ok(!codigoConfere('', '13,5'));
  assert.ok(!codigoConfere('14', '13,5'));
});

test('Cadeado (acertos): cada aluno uma pergunta; destrava com X acertos; espera depois do erro', () => {
  const ps = [perg('p1'), perg('p2', 'b'), perg('p3', 'c')];
  const config = { regra: 'acertos', perguntas: limpaP(ps), distribuicao: 'diferente', minAcertos: 2, espera: 30 };
  const prep = prepararCadeado(config, [{ id: 'g1', uids: ['u1', 'u2', 'u3'] }], geradorComSemente(4));
  const P = prep.g1;
  assert.equal(P.tarefas.length, 3);
  assert.equal(new Set(P.tarefas.map(t => t.perguntaId)).size, 3);          // perguntas diferentes
  const certa = u => gabDe(ps).perguntas[P.tarefas[P.deUid[u][0]].perguntaId].corretaId;
  const errada = u => ['a', 'b', 'c'].find(x => x !== certa(u));
  const env = (n, u, alt, t) => ({ id: 'e_cad__' + u + '__t' + n, autor: u, grupoId: 'g1', t, dados: { tarefa: P.deUid[u][0], alternativaId: alt } });
  let es = [env(1, 'u1', errada('u1'), 1000), env(2, 'u1', certa('u1'), 5000)];        // dentro da espera: ignorado
  let G = estadoCadeado(config, gabDe(ps), prep, es).g1;
  assert.equal(G.porUid.u1[0].estado, 'espera');
  assert.equal(G.porUid.u1[0].liberaEm, 31000);
  es.push(env(3, 'u1', certa('u1'), 32000), env(1, 'u2', certa('u2'), 40000));
  G = estadoCadeado(config, gabDe(ps), prep, es).g1;
  assert.equal(G.acertos, 2);
  assert.ok(G.destravado);
  assert.equal(G.destravadoEm, 40000);
  assert.equal(necessarios({ minAcertos: 0 }, 4), 4);
  assert.equal(necessarios({ minAcertos: 9 }, 3), 3);
});

test('Cadeado (fragmentos): acerto revela o pedaço; só o código certo abre; pedaços cobrem grupo pequeno e grande', () => {
  const ps = [perg('p1'), perg('p2', 'b'), perg('p3', 'c'), perg('p4')];
  const config = { regra: 'fragmentos', perguntas: limpaP(ps), distribuicao: 'diferente', fragmentos: ['0,1', '× velocidade', '+ 3,5', '100 m/min'], espera: 10 };
  const prep = prepararCadeado(config, [{ id: 'g1', uids: ['u1', 'u2'] }, { id: 'g2', uids: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] }], geradorComSemente(2));
  // grupo de 2: cada um leva 2 pedaços; grupo de 6: todos os pedaços, alguns repetidos
  assert.deepEqual(Object.values(prep.g1.deUid).flat().sort(), [0, 1, 2, 3]);
  assert.deepEqual([...new Set(Object.values(prep.g2.deUid).flat())].sort(), [0, 1, 2, 3]);
  assert.ok(Object.values(prep.g2.deUid).every(l => l.length === 1));
  const gab = gabDe(ps, { codigo: '13,5' });
  const resp = (u, i, n, t) => ({ id: `e__${u}__t${n}`, autor: u, grupoId: 'g1', t, dados: { tarefa: i, alternativaId: gab.perguntas[prep.g1.tarefas[i].perguntaId].corretaId } });
  const es = Object.entries(prep.g1.deUid).flatMap(([u, l]) => l.map((i, k) => resp(u, i, k + 1, 1000 + i)));
  let G = estadoCadeado(config, gab, prep, es).g1;
  assert.deepEqual(G.revelados, [0, 1, 2, 3]);
  assert.ok(!G.destravado);
  es.push({ id: 'e__g1__c1', autor: 'u1', grupoId: 'g1', t: 9000, dados: { codigo: '14' } });
  es.push({ id: 'e__g1__c2', autor: 'u1', grupoId: 'g1', t: 12000, dados: { codigo: '13,5' } });   // ainda na espera: ignorado
  G = estadoCadeado(config, gab, prep, es).g1;
  assert.ok(!G.destravado);
  assert.equal(G.codigo.liberaEm, 19000);
  es.push({ id: 'e__g1__c3', autor: 'u1', grupoId: 'g1', t: 20000, dados: { codigo: '13.50' } });
  G = estadoCadeado(config, gab, prep, es).g1;
  assert.ok(G.destravado);
  assert.equal(G.posicao, 1);
});

test('Cadeado: validação (regra, pedaços, código e gabarito de cada pergunta) e planilha ida e volta', () => {
  const ps = [perg('p1'), perg('p2', 'b')];
  const a = caso();
  a.etapas.push(etapaCadeado({ regra: 'fragmentos', perguntas: limpaP(ps), distribuicao: 'diferente', fragmentos: ['0,1', '+ 3,5', '100'], espera: 30, mensagem: 'Abriu! A próxima pista está no envelope.' }));
  let d = erros(validarAtividade(a));
  assert.ok(d.some(x => /alternativa correta/.test(x.mensagem)));
  assert.ok(d.some(x => /código/.test(x.mensagem)));
  a.docente.respostas.e_cad = gabDe(ps, { codigo: '13,5' });
  assert.deepEqual(erros(validarAtividade(a)), []);
  a.etapas.at(-1).config.perguntas[0].corretaId = 'a';
  assert.ok(erros(validarAtividade(a)).some(x => /gabarito/.test(x.mensagem)));    // gabarito nunca dentro da etapa
  delete a.etapas.at(-1).config.perguntas[0].corretaId;
  a.etapas.push({ id: 'e_quiz', ordem: 6, titulo: 'Quiz', typeId: 'quiz_grupos', typeVersion: '1.0.0', tempoMin: 10, instrucao: '', participacao: { organizacao: 'grupos', envio: 'representante', competicao: 'entre_grupos' }, config: { perguntas: limpaP(ps), aoErrar: 'repassar', segundos: 45, mostrarNoTelao: false, mostrarResposta: true } });
  a.docente.respostas.e_quiz = gabDe(ps);
  assert.deepEqual(erros(validarAtividade(a)), []);
  const { atividade: b, problemas } = abasParaAtividade(atividadeParaAbas(a));
  assert.deepEqual(problemas, []);
  assert.deepEqual(b.etapas.find(e => e.id === 'e_cad').config, a.etapas.find(e => e.id === 'e_cad').config);
  assert.deepEqual(b.etapas.find(e => e.id === 'e_quiz').config, a.etapas.find(e => e.id === 'e_quiz').config);
  assert.deepEqual(b.docente.respostas.e_cad, a.docente.respostas.e_cad);
  assert.deepEqual(erros(validarAtividade(b)), []);
  assert.ok(elementosDaGramatica(a).cooperacao && elementosDaGramatica(a).fracionamento);
});

test('Quiz: sorteio sem repetir até todos jogarem; repasse exclui quem já tentou', () => {
  const gs = ['g1', 'g2', 'g3'];
  let fila = [], vistos = [];
  for (let i = 0; i < 3; i++) { const r = sortearGrupo(fila, gs, [], geradorComSemente(i + 7)); fila = r.fila; vistos.push(r.grupo); }
  assert.deepEqual([...vistos].sort(), gs);
  const r = sortearGrupo(['g2', 'g3'], gs, ['g2', 'g3'], geradorComSemente(1));
  assert.equal(r.grupo, 'g1');
  assert.equal(sortearGrupo([], ['g1'], ['g1']).grupo, null);
  assert.ok(avaliar(caso(), 'qualquer', { acertou: true }).correta);
});

// ---------- Cartões de arrastar ----------
import { prepararCartoes, aplicarMovimento, conferirQuadro, estadoCartoes, quadroVazio, quadroCompleto, distribuicaoTermometro, cartoesDoTexto } from '../js/core/cartoes.js';
const CART = ['ren', 'ang1', 'ang2', 'vaso', 'pa'];
const cfgOrd = (extra = {}) => ({ formato: 'ordenar', cartoes: CART.map(id => ({ id, texto: id.toUpperCase() })), distribuicao: 'todos', tentativas: 'uma', espera: 30, conferencia: 'posicao', revelarAoEncerrar: true, ...extra });
const etapaCartoes = (config, extra = {}) => ({ id: 'e_cart', ordem: 7, titulo: 'Cascata', typeId: 'cartoes_arrastar', typeVersion: '1.0.0', tempoMin: 8, instrucao: '', participacao: { organizacao: 'grupos', envio: 'representante', competicao: 'meta' }, config, ...extra });
const mov = (t, autor, cartao, para, n) => ({ id: `e_cart__${autor}__m${n ?? t}`, autor, grupoId: null, dados: { cartao, para }, t });
const conf = (t, grupoId, n = 1) => ({ id: `e_cart__${grupoId}__f${n}`, autor: 'x', grupoId, dados: { confirmar: true }, t });

test('Cartões: cartões colados um por linha (numeração e marcadores somem)', () => {
  assert.deepEqual(cartoesDoTexto('1) Renina\n- Angiotensina I\n\n• Angiotensina II\n  Vasoconstrição  '), ['Renina', 'Angiotensina I', 'Angiotensina II', 'Vasoconstrição']);
});
test('Cartões: movimentos (ordenar troca de lugar; classificar só em coluna válida; termômetro de 0 a 100)', () => {
  const c = cfgOrd();
  let q = quadroVazio(CART);
  q = aplicarMovimento(c, q, 'ren', 0); q = aplicarMovimento(c, q, 'pa', 1);
  q = aplicarMovimento(c, q, 'ang1', 1);                         // ocupa o lugar de 'pa', que volta para a mão
  assert.equal(q.ang1, 1); assert.equal(q.pa, null);
  q = aplicarMovimento(c, q, 'ren', 1);                          // troca: ren ↔ ang1
  assert.equal(q.ren, 1); assert.equal(q.ang1, 0);
  assert.equal(aplicarMovimento(c, q, 'ren', 9), q);             // posição inexistente: nada muda
  assert.equal(aplicarMovimento(c, q, 'ren', null).ren, null);
  const k = { formato: 'classificar', colunas: [{ id: 'simp', titulo: 'Simpático' }, { id: 'para', titulo: 'Parassimpático' }] };
  const qk = quadroVazio(['a', 'b']);
  assert.equal(aplicarMovimento(k, qk, 'a', 'simp').a, 'simp');
  assert.equal(aplicarMovimento(k, qk, 'a', 'outra'), qk);
  const t = { formato: 'termometro' };
  assert.equal(aplicarMovimento(t, qk, 'a', 140).a, 100);
  assert.equal(aplicarMovimento(t, qk, 'a', 33.6).a, 34);
  assert.equal(aplicarMovimento(t, qk, 'zzz', 10), qk);
});
test('Cartões: conferência (posição exata, pares vizinhos, colunas, termômetro com margem e só debate)', () => {
  const gab = { ordem: CART };
  const deslocado = { pa: 0, ren: 1, ang1: 2, ang2: 3, vaso: 4 };   // a cadeia certa, mas começando no lugar errado
  assert.deepEqual(conferirQuadro(cfgOrd(), gab, deslocado), { acertos: 0, total: 5, certo: false });
  assert.deepEqual(conferirQuadro(cfgOrd({ conferencia: 'vizinhos' }), gab, deslocado), { acertos: 3, total: 4, certo: false });
  const certo = { ren: 0, ang1: 1, ang2: 2, vaso: 3, pa: 4 };
  assert.ok(conferirQuadro(cfgOrd(), gab, certo).certo && conferirQuadro(cfgOrd({ conferencia: 'vizinhos' }), gab, certo).certo);
  const k = { formato: 'classificar' };
  assert.deepEqual(conferirQuadro(k, { colunaDe: { a: 'x', b: 'y' } }, { a: 'x', b: 'x' }), { acertos: 1, total: 2, certo: false });
  const t = { formato: 'termometro' };
  assert.deepEqual(conferirQuadro(t, { posicao: { a: 10, b: 90 }, margem: 15 }, { a: 20, b: 60 }), { acertos: 1, total: 2, certo: false });
  assert.equal(conferirQuadro(t, { posicao: {} }, { a: 20, b: 60 }).semGabarito, true);
  assert.equal(conferirQuadro(t, { posicao: { a: 50 } }, { a: 50, b: 0 }).total, 1);  // só os cartões com posição esperada contam
});
test('Cartões: preparo fracionado dá um dono a cada cartão e nunca mostra na ordem certa', () => {
  for (let s = 1; s <= 30; s++) {
    const p = prepararCartoes(cfgOrd({ distribuicao: 'fracionado' }), [{ id: 'g1', uids: ['u1', 'u2'], grupos: ['g1'] }, { id: 'g2', uids: [], grupos: ['g2'] }], geradorComSemente(s));
    assert.deepEqual(Object.keys(p.quadros), ['g1']);              // grupo vazio não tem quadro
    const q = p.quadros.g1;
    assert.notDeepEqual(q.ordem, CART);
    assert.deepEqual([...q.ordem].sort(), [...CART].sort());
    assert.ok(CART.every(id => ['u1', 'u2'].includes(q.dono[id])));
    const n1 = CART.filter(id => q.dono[id] === 'u1').length;
    assert.ok(n1 === 2 || n1 === 3);                               // divididos por igual
  }
  const r = prepararCartoes(cfgOrd(), [{ id: 'representantes', uids: ['a', 'b'], grupos: ['g1', 'g2'] }], geradorComSemente(3));
  assert.equal(r.conjDoGrupo.g2, 'representantes');
  assert.deepEqual(r.quadros.representantes.dono, {});
});
test('Cartões: estado do quadro (ordem dos envios, dono no fracionado, repetir com espera, travar, posição)', () => {
  const c = cfgOrd({ distribuicao: 'fracionado', tentativas: 'repetir', espera: 30 });
  const prep = { quadros: { g1: { membros: ['u1', 'u2'], ordem: CART, dono: { ren: 'u1', ang1: 'u1', ang2: 'u2', vaso: 'u2', pa: 'u2' } }, g2: { membros: ['v1'], ordem: CART, dono: {} } }, conjDoUid: { u1: 'g1', u2: 'g1', v1: 'g2' }, conjDoGrupo: { g1: 'g1', g2: 'g2' } };
  const gab = { ordem: CART };
  const envios = [
    mov(1000, 'u2', 'ren', 0, 1),                                  // u2 não tem 'ren': ignorado
    mov(1100, 'u1', 'ren', 0, 1), mov(1200, 'u1', 'ang1', 2, 2), mov(1300, 'u2', 'ang2', 1, 2), mov(1400, 'u2', 'vaso', 3, 3), mov(1500, 'u2', 'pa', 4, 4),
    conf(2000, 'g1', 1),                                           // errado (ang1 e ang2 trocados) → espera 30 s
    conf(5000, 'g1', 2),                                           // antes da espera acabar: ignorado
    mov(6000, 'u1', 'ang1', 1, 3),                                 // troca ang1 ↔ ang2
    ...CART.map((id, i) => mov(7000 + i, 'v1', id, i, i + 1)), conf(8000, 'g2', 1),   // g2 acerta primeiro
    conf(40000, 'g1', 3),                                          // g1 acerta depois da espera
    mov(41000, 'u1', 'ren', null, 4)                               // depois de travado: ignorado
  ];
  const E = estadoCartoes(c, gab, prep, envios);
  assert.equal(E.g1.ultimoMov.u2, 4); assert.equal(E.g1.ultimoMov.u1, 4);
  assert.equal(E.g1.confirmacoes, 2);
  assert.ok(E.g1.concluido && E.g1.travado && E.g1.ultimo.certo);
  assert.equal(E.g1.quadro.ren, 0);
  assert.equal(E.g2.posicao, 1); assert.equal(E.g1.posicao, 2);
  assert.equal(E.g1.colocados, 5);
  const so1 = estadoCartoes(c, gab, prep, envios.slice(0, 7));
  assert.equal(so1.g1.liberaEm, 32000); assert.ok(!so1.g1.travado);
  assert.deepEqual([so1.g1.ultimo.acertos, so1.g1.ultimo.total], [3, 5]);
  // tentativa única: o primeiro envio vale, mesmo errado
  const uma = estadoCartoes({ ...c, tentativas: 'uma' }, gab, prep, envios);
  assert.ok(uma.g1.travado && !uma.g1.concluido && uma.g1.confirmacoes === 1);
  assert.ok(quadroCompleto(uma.g1.quadro));
});
test('Cartões: termômetro mostra onde cada grupo pôs cada caso, da maior divergência para a menor', () => {
  const c = { formato: 'termometro', cartoes: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }] };
  const E = { g1: { quadro: { a: 10, b: 50 } }, g2: { quadro: { a: 90, b: 55 } }, g3: { quadro: { a: null, b: 60 } } };
  const d = distribuicaoTermometro(c, { posicao: { b: 50 } }, E);
  assert.deepEqual(d.map(x => [x.id, x.divergencia]), [['a', 80], ['b', 10]]);
  assert.equal(d[0].pontos.length, 2); assert.equal(d[1].esperado, 50); assert.ok(!('esperado' in d[0]));
});
test('Cartões: validação (formato, ordem, colunas, polos; termômetro sem posição não conta para a meta) e planilha ida e volta', () => {
  const a = caso();
  a.etapas.push(etapaCartoes(cfgOrd()));
  assert.ok(erros(validarAtividade(a)).some(x => /ordem certa/.test(x.mensagem)));
  a.docente.respostas.e_cart = { ordem: CART, explicacao: 'Cascata do SRAA.' };
  assert.deepEqual(erros(validarAtividade(a)), []);
  a.etapas.push(etapaCartoes({ formato: 'classificar', cartoes: [{ id: 'fc', texto: '↑ FC' }, { id: 'mio', texto: 'Miose' }, { id: 'bronc', texto: 'Broncodilatação' }], colunas: [{ id: 'simp', titulo: 'Simpático' }, { id: 'paras', titulo: 'Parassimpático' }], distribuicao: 'fracionado', tentativas: 'repetir', espera: 15, revelarAoEncerrar: true }, { id: 'e_class', ordem: 8, titulo: 'Simpático × parassimpático' }));
  assert.ok(erros(validarAtividade(a)).some(x => /coluna certa de 3 cartões/.test(x.mensagem)));
  a.docente.respostas.e_class = { colunaDe: { fc: 'simp', mio: 'paras', bronc: 'simp' } };
  a.etapas.push(etapaCartoes({ formato: 'termometro', cartoes: [{ id: 'c1', texto: 'Omitir um erro' }, { id: 'c2', texto: 'Pedir consentimento' }], polos: { esquerda: 'Totalmente antiético', direita: '' }, distribuicao: 'todos', tentativas: 'uma', espera: 30, revelarAoEncerrar: true }, { id: 'e_term', ordem: 9, titulo: 'Termômetro ético' }));
  assert.ok(erros(validarAtividade(a)).some(x => /dois polos/.test(x.mensagem)));
  a.etapas.at(-1).config.polos.direita = 'Totalmente ético';
  assert.deepEqual(erros(validarAtividade(a)), []);                // termômetro só de debate é válido
  a.meta.etapas = [...a.meta.etapas, 'e_term'];
  assert.ok(erros(validarAtividade(a)).some(x => /só de debate/.test(x.mensagem)));
  a.docente.respostas.e_term = { posicao: { c1: 15, c2: 90 }, margem: 20 };
  assert.deepEqual(erros(validarAtividade(a)), []);
  const { atividade: b, problemas } = abasParaAtividade(atividadeParaAbas(a));
  assert.deepEqual(problemas, []);
  for (const id of ['e_cart', 'e_class', 'e_term']) {
    assert.deepEqual(b.etapas.find(e => e.id === id).config, a.etapas.find(e => e.id === id).config, id);
    assert.deepEqual(b.docente.respostas[id], a.docente.respostas[id], id);
  }
  assert.deepEqual(erros(validarAtividade(b)), []);
  assert.ok(elementosDaGramatica(a).cooperacao);
  // nenhum gabarito dentro das etapas
  assert.ok(!/"(colunaDe|posicao)"\s*:|"ordem"\s*:\s*\[/.test(JSON.stringify(a.etapas)));
});

// ---------- Pares ----------
import { ligarComoCartoes, prepararMemoria, estadoMemoria, estadoMemoriaTelao, tabuleiroVisivel } from '../js/core/pares.js';
const PARES = [{ id: 'p1', a: 'Hemossiderina', b: 'Fígado' }, { id: 'p2', a: 'EPO', b: 'Rim' }, { id: 'p3', a: 'Insulina', b: 'Pâncreas' }];
test('Pares (ligar): vira um quadro de cartões com o lado A nos lugares e o gabarito separado', () => {
  const { cfg, gab } = ligarComoCartoes({ formato: 'ligar', pares: PARES }, geradorComSemente(4));
  assert.equal(cfg.formato, 'ordenar');
  assert.deepEqual(cfg.cartoes.map(c => c.texto), ['Fígado', 'Rim', 'Pâncreas']);
  assert.deepEqual(cfg.rotulos, gab.ordem.map(id => PARES.find(p => p.id === id).a));
  const q = Object.fromEntries(gab.ordem.map((id, i) => [id, i]));
  assert.ok(conferirQuadro(cfg, gab, q).certo);
});
test('Pares (memória): cada grupo acha os pares; erro não abre carta; texto só sai quando a carta é virada', () => {
  const prep = prepararMemoria({ pares: PARES }, [{ id: 'g1', uids: ['u1', 'u2'], grupos: ['g1'] }], geradorComSemente(2));
  const pos = par => prep.cartas.map((c, i) => [c, i]).filter(([c]) => c.par === par).map(([, i]) => i);
  const errado = [pos('p1')[0], pos('p2')[0]];
  const envs = [{ id: 'e__u1__j1', autor: 'u1', dados: { cartas: errado }, t: 1 }, { id: 'e__u2__j1', autor: 'u2', dados: { cartas: pos('p1') }, t: 2 },
    { id: 'e__u2__j2', autor: 'u2', dados: { cartas: pos('p1') }, t: 3 }];                    // repetir par já achado: ignorado
  let S = estadoMemoria({ pares: PARES }, prep, envs).g1;
  assert.equal(S.tentativas, 2); assert.ok(S.achados.p1); assert.ok(!S.concluido);
  const vis = tabuleiroVisivel({ pares: PARES }, prep, S);
  assert.equal(vis.filter(x => x.aberta).length, 2);
  assert.ok(vis.every(x => x.aberta || !('texto' in x)));
  S = estadoMemoria({ pares: PARES }, prep, [...envs, { id: 'e__u1__j2', autor: 'u1', dados: { cartas: pos('p2') }, t: 4 }, { id: 'e__u1__j3', autor: 'u1', dados: { cartas: pos('p3') }, t: 5 }]).g1;
  assert.ok(S.concluido); assert.equal(S.posicao, 1);
});
test('Pares (memória no telão): acertou joga de novo; errou ou estourou o tempo, passa a vez', () => {
  const prep = prepararMemoria({ pares: PARES }, [{ id: 'g1', uids: ['a'] }, { id: 'g2', uids: ['b'] }], geradorComSemente(9));
  const [g1, g2] = prep.ordemGrupos, pos = par => prep.cartas.map((c, i) => [c, i]).filter(([c]) => c.par === par).map(([, i]) => i);
  const envs = [
    { id: 'e__x__r1', grupoId: g2, dados: { cartas: pos('p1') }, t: 1 },            // não é a vez: ignorado
    { id: 'e__x__r2', grupoId: g1, dados: { cartas: pos('p1') }, t: 2 },            // acerta: continua
    { id: 'e__x__r3', grupoId: g1, dados: { cartas: [pos('p2')[0], pos('p3')[0]] }, t: 3 },  // erra: passa
    { id: 'e__c__p1', grupoId: null, dados: { passar: true, vez: g2, jogada: 2 }, t: 4 },    // tempo de g2: passa
    { id: 'e__x__r4', grupoId: g1, dados: { cartas: pos('p2') }, t: 5 }];
  const S = estadoMemoriaTelao({ pares: PARES }, prep, envs);
  assert.equal(S.placar[g1], 2); assert.equal(S.placar[g2], 0); assert.equal(S.vez, g1);
});

// ---------- Corrida ----------
import { itensCorrida, prepararCorrida, estadoCorrida, itemDoJogador, alternativaParaTirar } from '../js/core/corrida.js';
const perguntasQ = ['q1', 'q2', 'q3', 'q4'].map(id => ({ id, enunciado: 'Pergunta ' + id, alternativas: ['a', 'b', 'c'].map(l => ({ id: l, texto: id + l })) }));
const gabQ = { perguntas: Object.fromEntries(perguntasQ.map(q => [q.id, { corretaId: 'b' }])) };
const resp = (quem, n, pos, alt, t, extra = {}) => ({ id: `e__${quem}__t${n}`, autor: quem, dados: { pos, alternativaId: alt, ...extra }, t });
const certaDo = (itens, P, pos) => { const it = itemDoJogador(itens, P, pos); return it.alternativas.find(a => a.texto.endsWith('b')).id; };
test('Corrida (quiz): próprio ritmo, alternativas renumeradas, pontos somam no grupo, tempo esgotado conta como erro', () => {
  const cfg = { formato: 'quiz', perguntas: perguntasQ, segundos: 10, powerUps: [] };
  const itens = itensCorrida(cfg, gabQ);
  const prep = prepararCorrida(cfg, itens, [{ id: 'u1', grupo: 'g1' }, { id: 'u2', grupo: 'g1' }, { id: 'v1', grupo: 'g2' }], geradorComSemente(5));
  const P = prep.jogadores.u1;
  assert.deepEqual([...P.ordem].sort(), [0, 1, 2, 3]);
  const envs = [resp('u1', 1, 0, certaDo(itens, P, 0), 1000), resp('u1', 2, 1, certaDo(itens, P, 1), 2000), resp('u1', 3, 1, 'a', 2500),   // pos repetida: ignorada
    resp('u1', 4, 2, certaDo(itens, P, 2), 40000),                                                                   // 38 s depois: estourou
    resp('u2', 1, 0, certaDo(itens, prep.jogadores.u2, 0), 3000)];
  const E = estadoCorrida(cfg, itens, prep, envs, 0);
  assert.equal(E.jogadores.u1.acertos, 2); assert.equal(E.jogadores.u1.erros, 1); assert.equal(E.jogadores.u1.pos, 3);
  assert.ok(E.jogadores.u1.historico[2].tempo);
  assert.equal(E.grupos.g1.total, 300); assert.equal(E.grupos.g2.total, 0);
});
test('Corrida: power-ups (ganho por sequência, dobrar, escudo, roubar do líder, bloqueio)', () => {
  const cfg = { formato: 'quiz', perguntas: perguntasQ, segundos: 0, powerUps: ['dobrar', 'escudo', 'roubar', 'bloquear'], sequencia: 2, embaralhar: false };
  const itens = itensCorrida(cfg, gabQ);
  const prep = prepararCorrida(cfg, itens, [{ id: 'u1', grupo: 'g1' }, { id: 'v1', grupo: 'g2' }], geradorComSemente(1));
  const c = (q, p) => certaDo(itens, prep.jogadores[q], p);
  const usar = (q, n, p, t) => ({ id: `e__${q}__u${n}`, autor: q, dados: { usar: p }, t });
  const envs = [
    resp('v1', 1, 0, c('v1', 0), 1), resp('v1', 2, 1, c('v1', 1), 2),        // v1 ganha "dobrar"; g2 = 200
    resp('u1', 1, 0, c('u1', 0), 3), resp('u1', 2, 1, c('u1', 1), 4),        // u1 ganha "dobrar"
    usar('u1', 1, 'dobrar', 5), resp('u1', 3, 2, c('u1', 2), 6),              // 100 × 2 = 200 → g1 = 400
    resp('u1', 4, 3, c('u1', 3), 7),                                          // 4 seguidos → ganha "escudo"
    usar('v1', 1, 'dobrar', 8), resp('v1', 3, 2, c('v1', 2), 9), resp('v1', 4, 3, c('v1', 3), 10)  // v1: +200 +200 = 600; ganha "escudo"
  ];
  let E = estadoCorrida(cfg, itens, prep, envs);
  assert.equal(E.grupos.g1.total, 600); assert.equal(E.grupos.g2.total, 600);
  assert.deepEqual(E.jogadores.u1.inventario, ['escudo']);
  assert.ok(E.jogadores.u1.terminou && E.jogadores.v1.terminou);
  assert.equal(E.feed.length, 2);
  // roubar: tira até 100 do grupo líder (o outro); bloqueio anula o próximo power-up do alvo
  const cfg2 = { ...cfg, powerUps: ['roubar', 'bloquear'] };
  const prep2 = prepararCorrida(cfg2, itens, [{ id: 'u1', grupo: 'g1' }, { id: 'v1', grupo: 'g2' }], geradorComSemente(1));
  const c2 = (q, p) => certaDo(itens, prep2.jogadores[q], p);
  const E2 = estadoCorrida(cfg2, itens, prep2, [
    resp('v1', 1, 0, c2('v1', 0), 1), resp('v1', 2, 1, c2('v1', 1), 2),       // v1 ganha "roubar"
    resp('u1', 1, 0, c2('u1', 0), 3), resp('u1', 2, 1, c2('u1', 1), 4),       // u1 ganha "roubar"
    resp('u1', 3, 2, c2('u1', 2), 5), resp('u1', 4, 3, c2('u1', 3), 6),       // u1 ganha "bloquear"; g1 = 400
    usar('u1', 1, 'bloquear', 7),                                             // bloqueia o líder rival (g2)
    usar('v1', 1, 'roubar', 8),                                               // anulado pelo bloqueio
    usar('u1', 2, 'roubar', 9)]);                                             // g1 rouba 100 de g2
  assert.equal(E2.grupos.g1.total, 500); assert.equal(E2.grupos.g2.total, 100);
  assert.ok(E2.feed.some(f => f.bloqueado));
});
test('Corrida (corrente): na ordem; um erro com "recomeçar" volta ao início; escudo segura a sequência', () => {
  const cfg = { formato: 'corrente', gatilho: 'Sobe para 3.000 m', aoQuebrar: 'recomecar', segundos: 0, elos: [
    { id: 'e1', consequencia: '↓ PO₂ arterial', distratores: ['↑ PO₂', '= PO₂'] }, { id: 'e2', consequencia: '↑ EPO renal', distratores: ['↓ EPO', '↑ insulina'] }, { id: 'e3', consequencia: '↑ hemácias', distratores: ['↓ hemácias', '= hemácias'] }] };
  const itens = itensCorrida(cfg, {});
  assert.equal(itens[1].enunciado, '↓ PO₂ arterial');
  const prep = prepararCorrida(cfg, itens, [{ id: 'u1', grupo: 'g1' }], geradorComSemente(3));
  assert.deepEqual(prep.jogadores.u1.ordem, [0, 1, 2]);
  const certo = p => itemDoJogador(itens, prep.jogadores.u1, p).alternativas.find(a => !/[↑=]/.test(a.texto) || /EPO renal|↑ hemácias/.test(a.texto)).id;
  const errado = p => itemDoJogador(itens, prep.jogadores.u1, p).alternativas.find(a => a.id !== certo(p)).id;
  const E = estadoCorrida(cfg, itens, prep, [resp('u1', 1, 0, certo(0), 1), resp('u1', 2, 1, errado(1), 2)]);
  assert.equal(E.jogadores.u1.pos, 0); assert.equal(E.jogadores.u1.sequencia, 0);
  assert.ok(alternativaParaTirar(itens, prep.jogadores.u1, 1) !== certo(1));
});
test('Corrida (direção): pontos proporcionais às variáveis certas; metacognição pontua pela certeza e calibra', () => {
  const cfg = { formato: 'direcao', segundos: 0, embaralhar: false, rodadas: [{ id: 'r1', estimulo: 'Exercício intenso', variaveis: [{ id: 'fc', nome: 'FC' }, { id: 'vs', nome: 'Volume sistólico' }, { id: 'rvp', nome: 'RVP' }] }] };
  const itens = itensCorrida(cfg, { direcoes: { fc: 'sobe', vs: 'sobe', rvp: 'desce' } });
  const prep = prepararCorrida(cfg, itens, [{ id: 'u1', grupo: 'g1' }]);
  const E = estadoCorrida(cfg, itens, prep, [{ id: 'e__u1__t1', autor: 'u1', dados: { pos: 0, direcoes: { fc: 'sobe', vs: 'sobe', rvp: 'sobe' } }, t: 1 }]);
  assert.equal(E.jogadores.u1.pontos, 67); assert.equal(E.jogadores.u1.acertos, 0);
  const cm = { formato: 'quiz', perguntas: perguntasQ.slice(0, 2), confianca: true, segundos: 0, embaralhar: false };
  const it2 = itensCorrida(cm, gabQ), p2 = prepararCorrida(cm, it2, [{ id: 'u1', grupo: 'g1' }], geradorComSemente(2));
  const E2 = estadoCorrida(cm, it2, p2, [resp('u1', 1, 0, certaDo(it2, p2.jogadores.u1, 0), 1, { confianca: 'certeza' }), resp('u1', 2, 1, 'z', 2, { confianca: 'certeza' })]);
  assert.equal(E2.jogadores.u1.pontos, 1);                  // +3 −2
  assert.deepEqual(E2.calibracao.certeza, [2, 1]);
});

// ---------- Palavras cruzadas ----------
import { montarGrade, normalizarPalavra, prepararCruzadas, estadoCruzadas, gradeVisivel, celulasDa } from '../js/core/cruzadas.js';
const PALAVRAS = [['HEMÁCIA', 'Célula que leva oxigênio'], ['RIM', 'Produz EPO'], ['ERITROPOETINA', 'Hormônio da altitude'], ['MEDULA', 'Onde nascem as células do sangue'], ['FERRO', 'Vai no centro do heme'], ['OXIGÊNIO', 'O que a hemoglobina carrega']].map(([palavra, dica], i) => ({ id: 'w' + (i + 1), palavra, dica }));
test('Cruzadas: a grade se monta sozinha, as palavras cruzam em letras iguais e cabem em 15 × 15', () => {
  const g = montarGrade(PALAVRAS);
  assert.ok(g.palavras.length >= 5);
  assert.ok(g.linhas <= 15 && g.colunas <= 15);
  for (const p of g.palavras) celulasDa(p).forEach(([r, c], i) => assert.equal(g.celulas[r][c], p.resposta[i]));
  assert.equal(normalizarPalavra('Hemácia '), 'HEMACIA');
  assert.equal(g.palavras.length + g.naoCouberam.length, PALAVRAS.length);
});
test('Cruzadas: dicas fracionadas (por grupo e na grade da turma); só vale a dica que a pessoa tem; acento não importa', () => {
  const g = montarGrade(PALAVRAS), n = g.palavras.length;
  const prep = prepararCruzadas({ dicas: 'fracionadas' }, g, [{ id: 'g1', uids: ['a', 'b'] }], {}, geradorComSemente(3));
  const da = prep.quadros.g1.deUid;
  assert.deepEqual([...da.a, ...da.b].sort((x, y) => x - y), [...Array(n).keys()]);
  const i = da.a[0], j = da.b[0], pa = g.palavras[i];
  const envs = [{ id: 'e__b__w1', autor: 'b', dados: { palavra: i, texto: pa.palavra }, t: 1 },        // dica que b não tem
    { id: 'e__a__w1', autor: 'a', dados: { palavra: i, texto: 'errada' }, t: 2 },
    { id: 'e__a__w2', autor: 'a', dados: { palavra: i, texto: pa.palavra.toLowerCase() + ' ' }, t: 3 }];
  const S = estadoCruzadas({}, g, prep, envs).g1;
  assert.ok(S.resolvidas[i] && !S.resolvidas[j]); assert.equal(S.erros, 1);
  const vis = gradeVisivel(g, S.resolvidas);
  assert.equal(vis.letras[pa.row][pa.col], pa.resposta[0]);
  const turma = prepararCruzadas({ dicas: 'fracionadas' }, g, [{ id: 'turma', uids: ['a', 'b', 'c', 'd'] }], { a: 'g1', b: 'g1', c: 'g2', d: 'g2' }, geradorComSemente(1));
  const t = turma.quadros.turma.deUid;
  assert.deepEqual([...t.a, ...t.b, ...t.c, ...t.d].sort((x, y) => x - y), [...Array(n).keys()]);
});

// ---------- Quiz que faz pensar ----------
import { estadoEquipe, distribuicaoIndividual, estadoRamificado, problemasRamos } from '../js/core/pensar.js';
test('Quiz em equipe (TBL): individual só na fase individual; resposta do grupo pelo líder ou por consenso; conta só depois de revelar', () => {
  const cfg = { formato: 'equipe', perguntas: perguntasQ.slice(0, 1), consenso: 'lider' };
  const grupos = { g1: ['u1', 'u2'], g2: ['v1'] };
  const fases = { 0: { i: 0, g: 100, r: 200 } };
  const envs = [{ id: 'e__u1__t1', dados: { q: 0, alternativaId: 'b' }, t: 10 }, { id: 'e__u2__t1', dados: { q: 0, alternativaId: 'a' }, t: 20 },
    { id: 'e__v1__t1', dados: { q: 0, alternativaId: 'b' }, t: 150 },                // fora da fase individual
    { id: 'e__g1__g1', dados: { q: 0, alternativaId: 'b' }, t: 120 }, { id: 'e__g2__g1', dados: { q: 0, alternativaId: 'c' }, t: 130 }];
  const E = estadoEquipe(cfg, gabQ, grupos, fases, envs);
  assert.deepEqual(distribuicaoIndividual(E, 0, grupos.g1), { b: 1, a: 1 });
  assert.deepEqual(E.placar.g1, { individual: 1, grupo: 1, pontos: 300 }); assert.equal(E.placar.g2.pontos, 0);
  assert.equal(estadoEquipe(cfg, gabQ, grupos, { 0: { i: 0, g: 100 } }, envs).placar.g1.pontos, 0);   // antes de revelar
  const C = estadoEquipe({ ...cfg, consenso: 'todos' }, gabQ, grupos, fases, [{ id: 'e__u1__v1', dados: { q: 0, alternativaId: 'b' }, t: 110 }, { id: 'e__u2__v1', dados: { q: 0, alternativaId: 'b' }, t: 115 }]);
  assert.equal(C.perguntas[0].grupo.g1.alternativaId, 'b');
});
test('Tomada de decisão: cada escolha leva a um cenário, até um final; a árvore é conferida', () => {
  const cs = [{ id: 'c0', texto: 'O paciente recusa o exame.', final: false, opcoes: [{ id: 'o1', texto: 'Insistir', destino: 'f1', feedback: 'Fere a autonomia' }, { id: 'o2', texto: 'Explicar e ouvir', destino: 'c1', feedback: '' }] },
    { id: 'c1', texto: 'Ele pede um tempo.', final: false, opcoes: [{ id: 'o3', texto: 'Respeitar', destino: 'f2', feedback: '' }, { id: 'o4', texto: 'Voltar a insistir', destino: 'f1', feedback: '' }] },
    { id: 'f1', texto: 'Quebra de confiança.', final: true, desfecho: 'ruim', opcoes: [] }, { id: 'f2', texto: 'Decisão compartilhada.', final: true, desfecho: 'bom', opcoes: [] }];
  assert.deepEqual(problemasRamos(cs), []);
  assert.ok(problemasRamos([cs[0], cs[1]]).length > 0);
  const E = estadoRamificado({ cenarios: cs }, ['g1', 'g2'], [
    { id: 'x', grupoId: 'g1', dados: { cenario: 'c0', opcao: 'o2' }, t: 1 }, { id: 'y', grupoId: 'g1', dados: { cenario: 'c0', opcao: 'o1' }, t: 2 },   // cenário já passou: ignorado
    { id: 'z', grupoId: 'g1', dados: { cenario: 'c1', opcao: 'o3' }, t: 3 }, { id: 'w', grupoId: 'g2', dados: { cenario: 'c0', opcao: 'o1' }, t: 4 }]);
  assert.equal(E.g1.desfecho, 'bom'); assert.equal(E.g1.caminho.length, 2);
  assert.equal(E.g2.desfecho, 'ruim'); assert.equal(E.g2.caminho[0].feedback, 'Fere a autonomia');
});

// ---------- Análise de imagem (marcar) ----------
test('Análise de imagem (marcar): posições em %, tolerância com a proporção da imagem', () => {
  const cfg = { formato: 'imagem', tolerancia: 8, imagem: { largura: 200, altura: 100 } };
  let q = quadroVazio(['nucleo', 'membrana']);
  q = aplicarMovimento(cfg, q, 'nucleo', { x: 52, y: 51 });
  q = aplicarMovimento(cfg, q, 'membrana', { x: 10, y: 120 });
  assert.deepEqual(q.membrana, { x: 10, y: 100 });
  const r = conferirQuadro(cfg, { posicoes: { nucleo: { x: 50, y: 50 }, membrana: { x: 10, y: 80 } } }, q);
  assert.deepEqual([r.acertos, r.total], [1, 2]);             // 20 % da altura = 10 % da largura numa imagem 2:1
});
test('Novos tipos: validação mínima e gabarito fora das etapas', () => {
  const a = caso();
  const base = (id, ordem, typeId, config, org = 'grupos') => ({ id, ordem, titulo: typeId, typeId, typeVersion: '1.0.0', tempoMin: 5, instrucao: '', participacao: { organizacao: org, envio: org === 'individual' ? 'individual' : 'representante', competicao: 'meta' }, config });
  a.etapas.push(base('n1', 11, 'pares', { formato: 'memoria', pares: PARES }));
  a.etapas.push(base('n2', 12, 'corrida', { formato: 'quiz', perguntas: perguntasQ, segundos: 20, powerUps: ['dobrar'], sequencia: 3 }, 'individual'));
  a.etapas.push(base('n3', 13, 'cruzadas', { palavras: PALAVRAS, dicas: 'fracionadas', grade: 'por_grupo' }));
  a.etapas.push(base('n4', 14, 'quiz_pensar', { formato: 'equipe', perguntas: perguntasQ.slice(0, 2), consenso: 'lider' }));
  a.etapas.push(base('n5', 15, 'analise_imagem', { midia: 'foto', imagem: { dados: 'data:image/webp;base64,AAAA', largura: 10, altura: 10 }, enunciado: 'Marque', tarefa: 'marcar', marcadores: [{ id: 'm1', rotulo: 'Núcleo' }], tolerancia: 8 }));
  const msgs = erros(validarAtividade(a)).map(x => x.mensagem).join(' | ');
  assert.ok(/alternativa correta/.test(msgs) && /Marque na imagem/.test(msgs), msgs);
  a.docente.respostas.n2 = gabQ; a.docente.respostas.n4 = { perguntas: { q1: { corretaId: 'b' }, q2: { corretaId: 'a' } } };
  a.docente.respostas.n5 = { posicoes: { m1: { x: 40, y: 40 } } };
  assert.deepEqual(erros(validarAtividade(a)), []);
});
test('Planilha: os novos tipos vão e voltam (pares, corrida nos 3 formatos, cruzadas, quiz que faz pensar, análise de imagem)', () => {
  const a = caso();
  const base = (id, ordem, typeId, config, org = 'grupos') => ({ id, ordem, titulo: typeId + ' ' + id, typeId, typeVersion: '1.0.0', tempoMin: 5, instrucao: 'Faça.', participacao: { organizacao: org, envio: org === 'individual' ? 'individual' : 'representante', competicao: 'meta' }, config });
  const cs = [{ id: 'c0', texto: 'Início', final: false, opcoes: [{ id: 'o1', texto: 'A', destino: 'f1', feedback: 'x' }, { id: 'o2', texto: 'B', destino: 'f2', feedback: '' }] }, { id: 'f1', texto: 'Ruim', final: true, desfecho: 'ruim', opcoes: [] }, { id: 'f2', texto: 'Bom', final: true, desfecho: 'bom', opcoes: [] }];
  a.etapas.push(base('n1', 11, 'pares', { formato: 'ligar', pares: PARES, distribuicao: 'fracionado', tentativas: 'repetir', espera: 15, revelarAoEncerrar: true }));
  a.etapas.push(base('n2', 12, 'corrida', { formato: 'quiz', perguntas: perguntasQ, segundos: 20, embaralhar: true, powerUps: ['dobrar', 'roubar'], sequencia: 3 }, 'individual'));
  a.etapas.push(base('n3', 13, 'corrida', { formato: 'corrente', gatilho: 'Altitude', elos: [{ id: 'e1', consequencia: '↓ PO₂', distratores: ['↑ PO₂', '= PO₂'] }, { id: 'e2', consequencia: '↑ EPO', distratores: ['↓ EPO', '= EPO', '↑ insulina'] }], aoQuebrar: 'continuar', segundos: 0, embaralhar: true, powerUps: [], sequencia: 3 }, 'individual'));
  a.etapas.push(base('n4', 14, 'corrida', { formato: 'direcao', rodadas: [{ id: 'r1', estimulo: 'Exercício', variaveis: [{ id: 'r1_v1', nome: 'FC' }, { id: 'r1_v2', nome: 'RVP' }] }], segundos: 30, embaralhar: false, powerUps: [], sequencia: 3 }, 'individual'));
  a.etapas.push(base('n5', 15, 'cruzadas', { palavras: PALAVRAS, dicas: 'todas', grade: 'turma' }));
  a.etapas.push(base('n6', 16, 'quiz_pensar', { formato: 'ramificado', cenarios: cs }));
  a.etapas.push(base('n7', 17, 'quiz_pensar', { formato: 'metacognicao', perguntas: perguntasQ.slice(0, 2), pontuarConfianca: true, mostrarCalibracao: false }, 'individual'));
  a.etapas.push(base('n8', 18, 'analise_imagem', { midia: 'grafico', enunciado: 'Marque', tarefa: 'marcar', marcadores: [{ id: 'm1', rotulo: 'Limiar' }], tolerancia: 6, distribuicao: 'todos', tentativas: 'repetir', imagem: { dados: 'data:image/webp;base64,' + 'A'.repeat(40000), largura: 300, altura: 200 } }));
  Object.assign(a.docente.respostas, { n1: {}, n2: gabQ, n3: {}, n4: { direcoes: { r1_v1: 'sobe', r1_v2: 'desce' } }, n5: {}, n6: {}, n7: { perguntas: { q1: { corretaId: 'b' }, q2: { corretaId: 'c' } } }, n8: { posicoes: { m1: { x: 40, y: 60 } } } });
  assert.deepEqual(erros(validarAtividade(a)), []);
  const { atividade: b, problemas } = abasParaAtividade(atividadeParaAbas(a));
  assert.deepEqual(problemas, []);
  for (const id of ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8']) {
    assert.deepEqual(b.etapas.find(e => e.id === id).config, a.etapas.find(e => e.id === id).config, id);
    assert.deepEqual(b.docente.respostas[id], a.docente.respostas[id], id);
  }
  assert.deepEqual(erros(validarAtividade(b)), []);
});

// ---------- Sequência (Genius) ----------
import { lerTermos, sortearPainel, conferirToque, estadoSequencia, termosQueDerrubaram, duracaoTom, frequencias } from '../js/core/sequencia.js';
import { BANCO_FISIOLOGIA } from '../js/planejar-tipos.js';
test('Sequência: banco colado, painel sorteado sem repetir, tempos e notas do Genius original', () => {
  const ts = lerTermos('Fígado | Órgão\nRenina\n- Néfron | Unidade do rim\nfigado\n\nMiosina\tMotor');
  assert.deepEqual(ts.map(t => t.termo), ['Fígado', 'Renina', 'Néfron', 'Miosina']);   // "figado" repetido (sem acento) fica de fora
  assert.equal(ts[0].definicao, 'Órgão'); assert.equal(ts[3].definicao, 'Motor'); assert.equal(ts[1].definicao, '');
  assert.deepEqual(lerTermos('Renina\nActina', ts).map(t => [t.id, t.termo]), [['t5', 'Actina']]);
  const p = sortearPainel(lerTermos(BANCO_FISIOLOGIA), 6, geradorComSemente(3));
  assert.equal(p.length, 6); assert.equal(new Set(p.map(t => t.id)).size, 6);
  assert.equal(lerTermos(BANCO_FISIOLOGIA).length, 30);
  assert.ok(lerTermos(BANCO_FISIOLOGIA).every(t => t.termo.length <= 40 && t.definicao.length <= 200));
  assert.deepEqual([duracaoTom(1), duracaoTom(5), duracaoTom(6), duracaoTom(13), duracaoTom(14), duracaoTom(30)], [420, 420, 320, 320, 220, 220]);
  assert.deepEqual(frequencias(4), [415.3, 310, 252, 209]);
  assert.equal(frequencias(6).length, 6);
  assert.equal(conferirToque([2, 0, 1], 0, 2), 'certo');
  assert.equal(conferirToque([2, 0, 1], 2, 1), 'rodada');
  assert.equal(conferirToque([2, 0, 1], 1, 1), 'erro');
});
test('Sequência: vale o recorde, limite de partidas, placar soma/média, ranking e termos que derrubaram', () => {
  const jog = [{ id: 'u1', grupo: 'g1' }, { id: 'u2', grupo: 'g1' }, { id: 'u3', grupo: 'g2' }];
  const env = (quem, n, pontos, t, esperado) => ({ id: `e9__${quem}__s${n}`, t, dados: { partida: n, pontos, erro: esperado ? { esperado, tocado: null } : null } });
  const envios = [env('u1', 1, 5, 10, 't1'), env('u1', 2, 9, 20, 't2'), env('u1', 3, 12, 30, 't1'), env('u2', 1, 4, 15, 't1'), env('u3', 1, 9, 12, 't3'), env('ux', 1, 50, 1),
    { id: 'e9__u3__s2', t: 40, dados: { pontos: 1.5 } }, { id: 'e9__u3__t1', t: 41, dados: { pontos: 30 } }];
  const s = estadoSequencia({ partidas: 2 }, jog, envios);
  assert.equal(s.jogadores.u1.partidas, 2); assert.equal(s.jogadores.u1.recorde, 9);       // a 3ª partida passou do limite
  assert.equal(s.jogadores.u3.recorde, 9); assert.equal(s.jogadores.u3.partidas, 1);       // pontos inválidos e outro tipo de envio são ignorados
  assert.equal(s.grupos.g1.total, 13); assert.equal(s.grupos.g2.total, 9);
  assert.deepEqual(s.ranking.map(r => [r.id, r.recorde]), [['u3', 9], ['u1', 9], ['u2', 4]]);   // empate: quem chegou antes
  assert.equal(s.podeJogar('u1'), false); assert.equal(s.podeJogar('u2'), true);
  const m = estadoSequencia({ placar: 'media' }, jog, envios);
  assert.equal(m.jogadores.u1.recorde, 12); assert.equal(m.grupos.g1.total, 8);
  const d = termosQueDerrubaram(m, [{ id: 't1', termo: 'Renina' }, { id: 't2', termo: 'Néfron' }], 2);
  assert.deepEqual(d.map(x => [x.termo, x.vezes]), [['Renina', 3], ['Néfron', 1]]);
});
test('Sequência: validação e planilha ida e volta', () => {
  const a = caso();
  const et = config => ({ id: 'sq', ordem: 20, titulo: 'Genius da Fisiologia', typeId: 'sequencia', typeVersion: '1.0.0', tempoMin: 8, instrucao: 'Memorize.', participacao: { organizacao: 'individual', envio: 'individual', competicao: 'entre_grupos' }, config });
  a.etapas.push(et({ termos: lerTermos('Renina\nNéfron\nMiosina'), botoes: 4, velocidade: 'classica', partidas: 0, placar: 'soma', meta: 6 }));
  assert.ok(erros(validarAtividade(a)).some(x => /4 a 300 termos/.test(x.mensagem)));
  a.etapas.at(-1).config.termos = lerTermos(BANCO_FISIOLOGIA).slice(0, 10);
  a.etapas.at(-1).config.botoes = 5;
  assert.ok(erros(validarAtividade(a)).some(x => /4 ou 6 botões/.test(x.mensagem)));
  a.etapas.at(-1).config.botoes = 6; a.etapas.at(-1).config.velocidade = 'calma'; a.etapas.at(-1).config.partidas = 3; a.etapas.at(-1).config.placar = 'media';
  a.docente.respostas.sq = {};
  assert.deepEqual(erros(validarAtividade(a)), []);
  const { atividade: b, problemas } = abasParaAtividade(atividadeParaAbas(a));
  assert.deepEqual(problemas, []);
  assert.deepEqual(b.etapas.find(e => e.id === 'sq').config, a.etapas.find(e => e.id === 'sq').config);
  assert.deepEqual(erros(validarAtividade(b)), []);
});

test('Importação aceita a resposta da IA com texto em volta e cerca ```json', async () => {
  const { lerJsonImportado } = await import('../js/core/validacao.js');
  const r = lerJsonImportado('Claro! Aqui está:\n\n```json\n{"titulo": "X"}\n```\n\nRevise antes de usar.');
  assert.deepEqual(r.diagnosticos, []);
  assert.equal(r.atividade.titulo, 'X');
  assert.equal(lerJsonImportado('Segue: {"a": 1} fim').atividade.a, 1);
  assert.match(lerJsonImportado('sem json aqui').diagnosticos[0].mensagem, /JSON inválido/);
});

test('Revisão avisa quando a resposta certa é sempre a mesma letra', async () => {
  const { validarAtividade } = await import('../js/core/validacao.js');
  const q = id => ({ id, enunciado: 'Pergunta ' + id, alternativas: [{ id: 'a', texto: 'Um' }, { id: 'b', texto: 'Dois' }] });
  const a = {
    schemaVersion: 'mosaico-atividade-0.1', id: 'x', titulo: 'X', publico: '', duracaoMin: 10, regime: 'simulacao', perguntaCentral: 'P', objetivos: [], introducao: '', fontes: [],
    grupos: [{ id: 'g1', nome: 'G1', ordemAlocacao: 1 }], pecas: [], conexoes: [], pendencias: [], meta: { ativa: false, etapas: [], limiar: 0.5 },
    etapas: [{ id: 'e1', ordem: 1, titulo: 'Quiz', typeId: 'quiz_grupos', typeVersion: '1.0.0', tempoMin: 5, instrucao: '', participacao: { organizacao: 'grupos', envio: 'representante', competicao: 'entre_grupos' },
      config: { perguntas: [q('p1'), q('p2'), q('p3')], aoErrar: 'repassar', segundos: 60 } }],
    docente: { respostas: { e1: { perguntas: { p1: { corretaId: 'a' }, p2: { corretaId: 'a' }, p3: { corretaId: 'a' } } } }, guia: [], pontosDeDiscussao: [] }
  };
  const msg = d => d.some(x => /sempre a alternativa A/.test(x.mensagem));
  assert.ok(msg(validarAtividade(a)));
  a.docente.respostas.e1.perguntas.p2.corretaId = 'b';
  assert.ok(!msg(validarAtividade(a)));
});

// append() nativo escreve "false"/"null" na tela; condicionais ali precisam de ternário (h() e cartao() já filtram).
test('Nenhum caixa.append nativo recebe condicional com &&', () => {
  const fonte = readFileSync(new URL('../js/participar.js', import.meta.url), 'utf8');
  const ruins = fonte.split('\n').filter(l => /^\s*caixa\.append\(/.test(l) && /&& h\(/.test(l) && !/\? h\(/.test(l) && !/filter\(Boolean\)/.test(l));
  assert.deepEqual(ruins, []);
});
