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
