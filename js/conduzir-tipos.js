/* MOSAICO · Condução dos tipos novos (roda no celular de quem conduz, junto com conduzir.js)
   Pares na memória · Corrida · Palavras cruzadas · Quiz que faz pensar · Análise de imagem (perguntas e observar)
   (Os pares para ligar e a marcação na imagem usam o quadro dos cartões, em conduzir.js.)
   Como nos outros tipos: o gabarito fica aqui; os celulares mandam a jogada e recebem o resultado. */

import { h, contagemRegressiva } from './ui.js';
import { prepararMemoria, estadoMemoria, estadoMemoriaTelao, tabuleiroVisivel } from './core/pares.js';
import { itensCorrida, prepararCorrida, estadoCorrida, itemDoJogador, alternativaParaTirar, POWER_UPS } from './core/corrida.js';
import { montarGrade, prepararCruzadas, estadoCruzadas, gradeVisivel } from './core/cruzadas.js';
import { estadoEquipe, distribuicaoIndividual, estadoRamificado } from './core/pensar.js';
import { respostaCerta } from './core/desafios.js';
import { estadoSequencia, termosQueDerrubaram } from './core/sequencia.js';
import { INSTRUMENTOS, escoresValidos, resumoTurma, correlacao, MINIMO_TURMA } from './core/escalas.js';
import { JOGOS, decisaoValida, resolverJogo } from './core/jogos.js';

const limpo = x => JSON.parse(JSON.stringify(x ?? null));          // o Firestore não aceita undefined
const DIR = { sobe: '↑', desce: '↓', igual: '=' };
/** Grade em texto (o Firestore não guarda lista dentro de lista): "#" bloqueio, "." vazia, letra resolvida. */
export const gradeEmTexto = v => ({ linhas: v.linhas, colunas: v.colunas, letras: v.letras.map(l => l.map(x => x === null ? '#' : x || '.').join('')),
  numeros: v.numeros.flatMap((l, r) => l.map((n, c) => n ? { r, c, n } : null)).filter(Boolean) });

export function criarTipos(ctx) {
  const { E, b } = ctx, A = ctx.A;
  const resp = e => A().docente?.respostas?.[e.id] || {};
  const tipoDe = e => {
    if (!e) return null;
    const c = e.config || {};
    if (e.typeId === 'pares' && c.formato === 'memoria') return e.participacao.organizacao === 'representantes' ? 'memoriaTelao' : 'memoria';
    if (e.typeId === 'corrida') return 'corrida';
    if (e.typeId === 'cruzadas') return 'cruzadas';
    if (e.typeId === 'sequencia') return 'sequencia';
    if (e.typeId === 'escala_padronizada') return 'escala';
    if (e.typeId === 'jogo_economico') return 'jogo';
    if (e.typeId === 'quiz_pensar') return c.formato === 'equipe' ? 'equipe' : c.formato === 'ramificado' ? 'ramos' : 'corrida';
    if (e.typeId === 'analise_imagem') return c.tarefa === 'perguntas' ? 'corrida' : c.tarefa === 'observar' ? 'observar' : null;
    return null;
  };
  const membrosDe = g => E.sala?.composicao?.[g] || [];
  const gruposComGente = () => A().grupos.filter(g => membrosDe(g.id).length).map(g => g.id);
  const env = e => ctx.tentativas(e.id);
  const proxN = (e, quem, letra) => E.envios.filter(x => x.etapaId === e.id && x.id.startsWith(`${e.id}__${quem}__${letra}`)).length + 1;
  const pub = {};
  async function gravar(dest, pk) { const k = JSON.stringify(limpo(pk)); if (pub[dest] === k) return; pub[dest] = k; await b.gravarPacote(E.codigo, dest, JSON.parse(k)); }
  let jogoPub = null;
  async function publicarJogo(j) { const k = JSON.stringify(limpo(j)); if (jogoPub === k) return; jogoPub = k; await b.atualizarSala(E.codigo, { jogo: JSON.parse(k) }); }
  const enviarComo = (e, id, autor, grupoId, dados) => b.enviar(E.codigo, id, { etapaId: e.id, escopo: 'tentativa', grupoId: grupoId ?? null, autor, dados, contingencia: false }).catch(() => {});
  const um = l => l[Math.floor(Math.random() * l.length)];

  // ---------------- corrida (também: metacognição e perguntas sobre a imagem) ----------------
  function cfgCorrida(e) {
    const c = e.config;
    if (e.typeId === 'quiz_pensar') return { formato: 'quiz', perguntas: c.perguntas, confianca: true, pontuarConfianca: c.pontuarConfianca !== false, segundos: 0, embaralhar: true, powerUps: [] };
    if (e.typeId === 'analise_imagem') return { formato: 'quiz', perguntas: c.perguntas, segundos: 0, embaralhar: false, powerUps: [] };
    return c;
  }
  const porGrupoJogador = e => e.participacao.organizacao !== 'individual';
  function estadoC(e) {
    const j = E.jogo[e.id]; if (!j?.prep) return null;
    return estadoCorrida(j.cfg, j.itens, j.prep, env(e), j.inicio);
  }
  async function publicarCorrida(e) {
    const j = E.jogo[e.id], est = estadoC(e); if (!est) return;
    const nomes = Object.fromEntries(A().grupos.map(g => [g.id, g.nome]));
    for (const [id, S] of Object.entries(est.jogadores)) {
      const P = j.prep.jogadores[id], G = est.grupos[S.grupo];
      const item = S.terminou ? null : itemDoJogador(j.itens, P, S.pos);
      const ult = S.ultimo ? { ...S.ultimo, explicacao: j.itens[S.ultimo.item]?.explicacao || '', certaTexto: S.ultimo.certo ? '' : textoCerto(j.itens[S.ultimo.item]) } : null;
      await gravar(id, {
        tipo: 'corrida', etapaId: e.id, titulo: e.titulo, instrucao: e.instrucao || '', formato: j.cfg.formato, confianca: !!j.cfg.confianca, jogador: id, porGrupo: porGrupoJogador(e),
        pos: S.pos, total: P.ordem.length, item, inicioItem: S.inicioItem, segundos: S.semTempo ? 0 : (Number(j.cfg.segundos) || 0),
        pontos: S.pontos, sequencia: S.sequencia, inventario: S.inventario, escudo: S.escudo,
        tirar: S.ajuda && S.ajuda.pos === S.pos ? alternativaParaTirar(j.itens, P, S.pos) : null,
        ultimo: ult, terminou: S.terminou, posicao: S.posicao ?? null, congeladoAte: G.congeladoAte, embaralhado: G.embaralhado,
        proxima: { t: S.maxT + 1, u: S.maxU + 1 }, sequenciaPU: j.cfg.sequencia ?? 3, powerUps: j.cfg.powerUps || [],
        colegas: !porGrupoJogador(e) ? Object.entries(est.jogadores).filter(([o, X]) => o !== id && X.grupo === S.grupo).map(([o]) => ({ id: o, nome: ctx.nomeDe(o) })) : []
      });
    }
    await publicarJogo({ tipo: 'corrida', etapaId: e.id, formato: j.cfg.formato, placar: Object.fromEntries(Object.entries(est.grupos).map(([g, G]) => [g, G.total])),
      feed: est.feed.map(f => ({ grupo: f.grupo, usar: f.usar, alvo: f.alvo && est.grupos[f.alvo] ? f.alvo : null, bloqueado: !!f.bloqueado, nome: POWER_UPS[f.usar]?.nome || f.usar, quem: porGrupoJogador(e) ? nomes[f.grupo] : ctx.nomeDe(f.quem) })),
      congelados: Object.fromEntries(Object.entries(est.grupos).filter(([, G]) => G.congeladoAte > Date.now()).map(([g, G]) => [g, G.congeladoAte])),
      terminaram: Object.values(est.jogadores).filter(S => S.terminou).length, jogadores: Object.keys(est.jogadores).length });
  }
  const textoCerto = it => !it ? '' : it.tipo === 'mc' ? (it.alternativas.find(a => a.id === it.certa)?.texto || '') : it.variaveis.map(v => `${v.nome} ${DIR[it.certas[v.id]] || '?'}`).join(' · ');

  // ---------------- memória ----------------
  function estadoM(e) {
    const j = E.jogo[e.id]; if (!j?.prep) return null;
    return j.telao ? estadoMemoriaTelao(e.config, j.prep, env(e), j.inicio) : estadoMemoria(e.config, j.prep, env(e));
  }
  async function publicarMemoria(e) {
    const j = E.jogo[e.id], est = estadoM(e); if (!est) return;
    const base = { tipo: 'memoria', etapaId: e.id, titulo: e.titulo, instrucao: e.instrucao || '', enunciado: e.config.enunciado || '' };
    if (j.telao) {
      await publicarJogo({ ...base, telao: true, cartas: tabuleiroVisivel(e.config, j.prep, est), vez: est.vez, vezDesde: est.vezDesde, segundos: e.config.segundos ?? 30, placar: est.placar,
        ultima: est.ultima ? { cartas: est.ultima.cartas, acertou: est.ultima.acertou, quem: est.ultima.quem } : null, concluido: est.concluido, jogadas: est.jogadas, proxima: proxN(e, est.vez, 'r'), total: est.total, achados: Object.keys(est.achados).length });
      return;
    }
    for (const [g, S] of Object.entries(est)) await gravar(g, { ...base, cartas: tabuleiroVisivel(e.config, j.prep, S).map(x => x.por ? { ...x, por: ctx.nomeDe(x.por) } : x), tentativas: S.tentativas, achados: Object.keys(S.achados).length, total: S.total,
      ultima: S.ultima ? { cartas: S.ultima.cartas, acertou: S.ultima.acertou, quem: ctx.nomeDe(S.ultima.quem) } : null, concluido: S.concluido, posicao: S.posicao ?? null });
  }

  // ---------------- cruzadas ----------------
  function estadoX(e) { const j = E.jogo[e.id]; return j?.prep ? estadoCruzadas(e.config, j.grade, j.prep, env(e)) : null; }
  const conjPacote = (e, conj) => conj === 'turma' ? 'individual' : conj;
  async function publicarCruzadas(e) {
    const j = E.jogo[e.id], est = estadoX(e); if (!est) return;
    for (const [conj, S] of Object.entries(est)) {
      const Q = j.prep.quadros[conj], donos = {};
      for (const [u, is] of Object.entries(Q.deUid)) for (const i of is) (donos[i] ||= []).push(ctx.nomeDe(u));
      const grade = { tipo: 'cruzadas', etapaId: e.id, titulo: e.titulo, conjunto: conj, grade: gradeEmTexto(gradeVisivel(j.grade, S.resolvidas)),
        palavras: j.grade.palavras.map((p, i) => ({ i, numero: p.numero, dir: p.dir, tamanho: p.resposta.length, resolvida: !!S.resolvidas[i], por: S.resolvidas[i] ? ctx.nomeDe(S.resolvidas[i].uid) : null, com: donos[i] || [] })),
        acertos: S.acertos, total: S.total, concluido: S.concluido, posicao: S.posicao ?? null };
      await gravar(conjPacote(e, conj), grade);
      if (conj === 'turma') await publicarJogo({ tipo: 'cruzadas', etapaId: e.id, turma: true, grade: grade.grade, acertos: S.acertos, total: S.total });
      for (const u of Q.membros) await gravar(u, { tipo: 'cruzadas-dicas', etapaId: e.id, conjunto: conj, pacoteGrade: conjPacote(e, conj),
        minhas: (Q.deUid[u] || []).map(i => { const p = j.grade.palavras[i]; return { i, numero: p.numero, dir: p.dir, tamanho: p.resposta.length, dica: p.dica }; }),
        ultimo: S.porUid[u]?.ultimo || null, proxima: proxN(e, u, 'w') });
    }
  }

  // ---------------- sequência (Genius) ----------------
  // Cada celular joga sozinho; aqui só se juntam os resultados (quem entra depois também joga).
  const jogadoresSeq = () => gruposComGente().flatMap(g => membrosDe(g).map(u => ({ id: u, grupo: g })));
  function estadoS(e) { return E.jogo[e.id] ? estadoSequencia(e.config, jogadoresSeq(), env(e)) : null; }
  const placarS = est => Object.fromEntries(Object.entries(est.grupos).map(([g, G]) => [g, G.total]));
  const rankingS = (est, n) => est.ranking.filter(r => r.recorde > 0).slice(0, n).map(r => ({ nome: ctx.nomeDe(r.id), grupo: r.grupo, recorde: r.recorde }));
  async function publicarSequencia(e) {
    const est = estadoS(e); if (!est) return;
    const c = e.config, termos = (c.termos || []).map(t => ({ id: t.id, termo: t.termo, definicao: t.definicao || '' }));
    for (const [id, S] of Object.entries(est.jogadores)) await gravar(id, {
      tipo: 'sequencia', etapaId: e.id, titulo: e.titulo, instrucao: e.instrucao || '', termos, botoes: Number(c.botoes ?? 4), velocidade: c.velocidade || 'classica',
      partidas: Number(c.partidas) || 0, feitas: S.partidas, recorde: S.recorde, ultima: S.ultima?.pontos ?? null, posicao: S.posicao ?? null, jogadores: Object.keys(est.jogadores).length,
      podeJogar: est.podeJogar(id), proxima: S.partidas + 1, recordeGrupo: est.grupos[S.grupo]?.melhor ?? 0
    });
    await publicarJogo({ tipo: 'sequencia', etapaId: e.id, placar: placarS(est), media: c.placar === 'media', ranking: rankingS(est, 8), partidas: est.partidas,
      jogaram: est.ranking.length, jogadores: Object.keys(est.jogadores).length, botoes: Number(c.botoes ?? 4) });
  }

  // ---------------- quiz em equipe (TBL) ----------------
  function estadoQ(e) { const j = E.jogo[e.id]; return j ? estadoEquipe(e.config, resp(e), j.grupos, j.fases, env(e), 2500) : null; }
  const faseAtual = j => { const f = j.fases[j.q]; return !f ? 'espera' : f.r !== undefined ? 'revelada' : f.g !== undefined ? 'grupo' : 'individual'; };
  async function publicarEquipe(e) {
    const j = E.jogo[e.id], est = estadoQ(e); if (!est) return;
    const c = e.config, q = j.q, fase = faseAtual(j), P = c.perguntas[q], X = est.perguntas[q];
    const rev = fase === 'revelada' ? respostaCerta(P, resp(e)) : null, certaId = fase === 'revelada' ? resp(e).perguntas?.[P.id]?.corretaId : null;
    for (const [g, ms] of Object.entries(j.grupos)) await gravar(g, {
      tipo: 'equipe', etapaId: e.id, titulo: e.titulo, instrucao: e.instrucao || '', q, total: c.perguntas.length, fase, consenso: c.consenso || 'lider',
      pergunta: P && fase !== 'espera' ? { enunciado: P.enunciado, alternativas: P.alternativas } : null,
      respondidos: X ? ms.filter(u => X.individuais[u]).map(u => ctx.nomeDe(u)) : [], membros: ms.length,
      individuais: X && fase !== 'individual' && c.mostrarIndividuais !== false ? distribuicaoIndividual(est, q, ms) : null,
      votos: X && c.consenso === 'todos' ? Object.fromEntries(ms.filter(u => X.votos[u]).map(u => [ctx.nomeDe(u), X.votos[u]])) : null,
      doGrupo: X?.grupo[g]?.alternativaId || null, certaId, revelacao: rev, placar: est.placar[g], proximaG: proxN(e, g, 'g')
    });
    await publicarJogo({ tipo: 'equipe', etapaId: e.id, q, total: c.perguntas.length, fase, pergunta: P && fase !== 'espera' ? { enunciado: P.enunciado, alternativas: P.alternativas } : null,
      respondidos: Object.fromEntries(Object.entries(j.grupos).map(([g, ms]) => [g, { n: X ? ms.filter(u => X.individuais[u]).length : 0, de: ms.length, grupo: !!X?.grupo[g] }])),
      placar: Object.fromEntries(Object.entries(est.placar).map(([g, p]) => [g, p.pontos])),
      respostasGrupos: fase === 'revelada' ? Object.fromEntries(Object.entries(X.grupo).map(([g, r]) => [g, r.alternativaId])) : null, certaId, revelacao: rev });
  }

  // ---------------- tomada de decisão ----------------
  function estadoR(e) { const j = E.jogo[e.id]; return j ? estadoRamificado(e.config, j.grupos, env(e)) : null; }
  async function publicarRamos(e) {
    const est = estadoR(e); if (!est) return;
    const cs = e.config.cenarios, porId = Object.fromEntries(cs.map(c => [c.id, c]));
    for (const [g, S] of Object.entries(est)) {
      const c = porId[S.atual], ult = S.caminho.at(-1);
      await gravar(g, { tipo: 'ramos', etapaId: e.id, titulo: e.titulo, instrucao: e.instrucao || '', cenario: c ? { id: c.id, texto: c.texto, final: !!c.final, desfecho: c.desfecho || null, opcoes: c.final ? [] : c.opcoes.map(o => ({ id: o.id, texto: o.texto })) } : null,
        feedback: ult?.feedback || '', escolhaAnterior: ult ? porId[ult.cenario]?.opcoes.find(o => o.id === ult.opcao)?.texto || '' : '', passos: S.caminho.length, final: S.final, desfecho: S.desfecho, proxima: proxN(e, g, 'd') });
    }
  }

  // ---------------- observar e descrever ----------------
  function estadoO(e) {
    const out = {};
    for (const x of [...env(e)].sort((p, q) => p.t - q.t)) if (/__o\d+$/.test(x.id) && x.grupoId) out[x.grupoId] = { texto: String(x.dados?.texto || '').slice(0, 400), t: x.t };
    return out;
  }
  async function publicarObservar(e) {
    const est = estadoO(e);
    for (const g of E.jogo[e.id]?.grupos || []) await gravar(g, { tipo: 'observar', etapaId: e.id, titulo: e.titulo, instrucao: e.instrucao || '', enunciado: e.config.enunciado || '', minha: est[g]?.texto || '', proxima: proxN(e, g, 'o') });
  }

  // ---------------- escala padronizada e jogo econômico ----------------
  // Quem conduz só conta respostas: o perfil de cada um vai só para o próprio celular, e o telão vê médias.
  const participantes = () => gruposComGente().flatMap(membrosDe);
  /** Última resposta válida de cada aluno nesta etapa (o envio mais recente vale). */
  function ultimas(e, validar) {
    const out = {};
    for (const x of [...env(e)].sort((a, b) => a.t - b.t)) { const v = validar(x.dados); if (v) out[x.autor] = v; }
    return out;
  }
  const escoresDe = e => ultimas(e, d => escoresValidos(e.config.formato, d?.escores));
  const decisoesDe = e => ultimas(e, d => decisaoValida(e.config, d));
  async function publicarEscala(e) {
    const esc = escoresDe(e);
    await publicarJogo({ tipo: 'escala', etapaId: e.id, instrumento: e.config.formato, respondidos: Object.keys(esc).length, total: participantes().length });
    for (const [u, x] of Object.entries(esc)) await gravar(u, { tipo: 'escala', etapaId: e.id, escores: x });
  }
  /** Relação anônima entre a Honestidade-Humildade (escala anterior) e a decisão no jogo; só com 5 ou mais pessoas. */
  function relacaoComEscala(e, valores) {
    const alvo = e.config.relacionarCom && ctx.etapa(e.config.relacionarCom); if (!alvo) return null;
    const esc = escoresDe(alvo), pontos = Object.keys(valores).filter(u => Number.isFinite(esc[u]?.H)).map(u => ({ h: esc[u].H, v: valores[u] }));
    if (pontos.length < MINIMO_TURMA) return { n: pontos.length, suprimido: true };
    pontos.sort(() => Math.random() - 0.5);   // a ordem não deve dizer nada sobre quem é quem
    return { n: pontos.length, r: correlacao(pontos.map(p => p.h), pontos.map(p => p.v)), pontos, escala: alvo.titulo };
  }
  function revelarJogo(e) {
    const j = E.jogo[e.id]; if (!j || j.revelado) return;
    const dec = decisoesDe(e), grupoDe = Object.fromEntries(gruposComGente().flatMap(g => membrosDe(g).map(u => [u, g])));
    const r = resolverJogo(e.config, dec, grupoDe);
    Object.assign(j, { revelado: true, porUid: r.porUid, resumo: r.resumo, relacao: relacaoComEscala(e, r.valores), decisoes: dec });
    ctx.salvar();
  }
  async function publicarJogoEconomico(e) {
    const j = E.jogo[e.id], c = e.config, dec = j.revelado ? j.decisoes : decisoesDe(e);
    await publicarJogo(limpo({ tipo: 'jogo', etapaId: e.id, formato: c.formato, dotacao: c.dotacao ?? 10, multiplicador: c.multiplicador ?? 3, fator: c.fator ?? 2,
      respondidos: Object.keys(dec).length, total: participantes().length, revelado: !!j.revelado, ...(j.revelado ? { resumo: j.resumo, relacao: j.relacao } : {}) }));
    for (const [u, d] of Object.entries(dec)) await gravar(u, limpo({ tipo: 'jogo', etapaId: e.id, minha: d, resultado: j.revelado ? j.porUid[u] || null : null }));
  }

  // ---------------- interface comum ----------------
  const api = {
    tem: e => !!tipoDe(e),
    temMidia: e => e?.typeId === 'analise_imagem',
    async gravarMidia(e) {
      const c = e.config;
      await b.gravarPacote(E.codigo, 'revelacao', limpo({ etapaId: e.id, tipo: 'midia', midia: c.midia, enunciado: c.enunciado || '', imagem: c.midia === 'modelo3d' ? null : c.imagem, modelo: c.midia === 'modelo3d' ? c.modelo : null }));
    },
    async preparar(e) {
      Object.keys(pub).forEach(k => delete pub[k]); jogoPub = null;
      const t = tipoDe(e), s = E.sala, grupos = gruposComGente();
      if (t === 'corrida') {
        const cfg = cfgCorrida(e), itens = itensCorrida(cfg, resp(e));
        const jogadores = porGrupoJogador(e) ? grupos.map(g => ({ id: g, grupo: g })) : grupos.flatMap(g => membrosDe(g).map(u => ({ id: u, grupo: g })));
        E.jogo[e.id] = { tipo: 'corrida', cfg: { ...cfg, perguntas: undefined, elos: undefined, rodadas: undefined }, itens, prep: prepararCorrida(cfg, itens, jogadores), inicio: Date.now() };
      }
      if (t === 'memoria' || t === 'memoriaTelao') {
        const conjuntos = grupos.map(g => ({ id: g, uids: t === 'memoriaTelao' ? [ctx.lider(g)].filter(Boolean) : membrosDe(g), grupos: [g] }));
        E.jogo[e.id] = { tipo: 'memoria', telao: t === 'memoriaTelao', prep: prepararMemoria(e.config, conjuntos), inicio: Date.now(), passou: {} };
      }
      if (t === 'cruzadas') {
        const grade = montarGrade(e.config.palavras), turma = e.config.grade === 'turma';
        const grupoDoUid = Object.fromEntries(grupos.flatMap(g => membrosDe(g).map(u => [u, g])));
        const conjuntos = turma ? [{ id: 'turma', uids: grupos.flatMap(membrosDe) }] : grupos.map(g => ({ id: g, uids: membrosDe(g) }));
        E.jogo[e.id] = { tipo: 'cruzadas', grade, prep: prepararCruzadas(e.config, grade, conjuntos, grupoDoUid) };
      }
      if (t === 'sequencia') E.jogo[e.id] = { tipo: 'sequencia', inicio: Date.now() };
      if (t === 'equipe') E.jogo[e.id] = { tipo: 'equipe', grupos: Object.fromEntries(grupos.map(g => [g, [...membrosDe(g)]])), fases: {}, q: 0 };
      if (t === 'ramos') E.jogo[e.id] = { tipo: 'ramos', grupos };
      if (t === 'observar') E.jogo[e.id] = { tipo: 'observar', grupos };
      if (t === 'escala') E.jogo[e.id] = { tipo: 'escala' };
      if (t === 'jogo') E.jogo[e.id] = { tipo: 'jogo', revelado: false };
      ctx.salvar();
    },
    jogoInicial: e => null,
    async publicar(e) {
      const t = tipoDe(e); if (!E.jogo[e.id]) return;
      if (t === 'corrida') return publicarCorrida(e);
      if (t === 'memoria' || t === 'memoriaTelao') return publicarMemoria(e);
      if (t === 'cruzadas') return publicarCruzadas(e);
      if (t === 'sequencia') return publicarSequencia(e);
      if (t === 'equipe') return publicarEquipe(e);
      if (t === 'ramos') return publicarRamos(e);
      if (t === 'observar') return publicarObservar(e);
      if (t === 'escala') return publicarEscala(e);
      if (t === 'jogo') return publicarJogoEconomico(e);
    },
    progresso(e) {
      const t = tipoDe(e), j = E.jogo[e.id]; if (!j) return null;
      if (t === 'corrida') { const est = estadoC(e); return est && { novo: t, enviados: Object.values(est.jogadores).filter(S => S.terminou).length, esperados: Object.keys(est.jogadores).length }; }
      if (t === 'memoria') { const est = estadoM(e); return { novo: t, porGrupo: Object.fromEntries(Object.entries(est).map(([g, S]) => [g, { achados: Object.keys(S.achados).length, total: S.total, tentativas: S.tentativas, concluido: S.concluido, posicao: S.posicao ?? null }])) }; }
      if (t === 'memoriaTelao') return { novo: t };
      if (t === 'cruzadas') { const est = estadoX(e); return { novo: t, porGrupo: Object.fromEntries(Object.entries(est).map(([g, S]) => [g, { acertos: S.acertos, total: S.total, concluido: S.concluido, posicao: S.posicao ?? null }])) }; }
      if (t === 'equipe') return { novo: t };
      if (t === 'sequencia') { const est = estadoS(e); return { novo: t, enviados: est.ranking.length, esperados: Object.keys(est.jogadores).length }; }
      if (t === 'ramos') { const est = estadoR(e); return { novo: t, porGrupo: Object.fromEntries(Object.entries(est).map(([g, S]) => [g, { passos: S.caminho.length, final: S.final, desfecho: S.desfecho }])) }; }
      if (t === 'observar') { const est = estadoO(e); return { novo: t, porGrupo: Object.fromEntries((j.grupos || []).map(g => [g, { enviou: !!est[g] }])) }; }
      if (t === 'escala') return { novo: t, enviados: Object.keys(escoresDe(e)).length, esperados: participantes().length };
      if (t === 'jogo') return { novo: t, enviados: Object.keys(j.revelado ? j.decisoes : decisoesDe(e)).length, esperados: participantes().length };
      return null;
    },
    painel(e, caixa) {
      const t = tipoDe(e), j = E.jogo[e.id], s = E.sala;
      const relogio = h('p', {}, h('strong', { id: 'relogioConducao' }, contagemRegressiva(s.etapaInfo?.inicio, s.etapaInfo?.tempoMin)));
      caixa.append(relogio);
      const linha = (g, txt, ok) => h('li', { class: ok ? 'info' : 'aviso' }, ctx.chip(g), ' ', h('span', { class: 'estado ' + (ok ? 'ok' : 'pend') }, txt));
      if (t === 'corrida') {
        const est = estadoC(e);
        if (est) {
          caixa.append(h('p', { class: 'sutil' }, `${Object.values(est.jogadores).filter(S => S.terminou).length} de ${Object.keys(est.jogadores).length} terminaram. Placar: ` + Object.entries(est.grupos).sort((x, y) => y[1].total - x[1].total).map(([g, G]) => `${ctx.nomeGrupo(g)} ${G.total}`).join(' · ')));
          caixa.append(h('details', {}, h('summary', {}, 'Cada jogador — só você vê'), h('ul', { class: 'diag' }, Object.entries(est.jogadores).map(([id, S]) =>
            h('li', { class: 'info' }, ctx.chip(S.grupo), ' ', porGrupoJogador(e) ? '' : ctx.nomeDe(id) + ': ', `${S.pos} de ${j.prep.jogadores[id].ordem.length} · ${S.acertos} acerto(s) · ${S.pontos} pts` + (S.inventario.length ? ` · power-ups: ${S.inventario.map(p => POWER_UPS[p]?.nome).join(', ')}` : ''))))));
        }
      }
      if (t === 'memoria') { const est = estadoM(e); caixa.append(h('ul', { class: 'diag' }, Object.entries(est).map(([g, S]) => linha(g, S.concluido ? `completou (${S.posicao}º) em ${S.tentativas} jogadas` : `${Object.keys(S.achados).length} de ${S.total} pares · ${S.tentativas} jogadas`, S.concluido)))); }
      if (t === 'memoriaTelao') {
        const est = estadoM(e);
        caixa.append(h('p', {}, est.concluido ? 'Todos os pares foram achados.' : ['Vez de ', ctx.chip(est.vez), ` · ${Object.keys(est.achados).length} de ${est.total} pares`]),
          h('p', { class: 'sutil' }, 'Placar: ' + Object.entries(est.placar).map(([g, n]) => `${ctx.nomeGrupo(g)} ${n}`).join(' · ')),
          !est.concluido && h('button', { class: 'btn bloco', onclick: () => ctx.emSerie(() => passarVez(e, est)) }, 'Passar a vez'));
      }
      if (t === 'cruzadas') { const est = estadoX(e); caixa.append(h('ul', { class: 'diag' }, Object.entries(est).map(([g, S]) => g === 'turma' ? h('li', { class: 'info' }, h('strong', {}, 'Turma: '), `${S.acertos} de ${S.total} palavras`) : linha(g, S.concluido ? `completou (${S.posicao}º)` : `${S.acertos} de ${S.total} palavras`, S.concluido)))); }
      if (t === 'ramos') {
        const est = estadoR(e);
        caixa.append(h('ul', { class: 'diag' }, Object.entries(est).map(([g, S]) => linha(g, S.final ? `chegou ao final ${({ bom: 'bom', neutro: 'neutro', ruim: 'ruim' })[S.desfecho]} em ${S.caminho.length} escolhas` : `${S.caminho.length} escolha(s) feitas`, S.final))));
      }
      if (t === 'observar') { const est = estadoO(e); caixa.append(h('ul', { class: 'diag' }, (j.grupos || []).map(g => linha(g, est[g] ? 'escreveu' : 'pensando', !!est[g])))); }
      if (t === 'sequencia') {
        const est = estadoS(e), dr = termosQueDerrubaram(est, e.config.termos || [], 5);
        caixa.append(h('p', { class: 'sutil' }, `${est.ranking.length} de ${Object.keys(est.jogadores).length} já jogaram · ${est.partidas} partida(s). Placar${e.config.placar === 'media' ? ' (média dos recordes)' : ' (soma dos recordes)'}: ` + Object.entries(est.grupos).sort((x, y) => y[1].total - x[1].total).map(([g, G]) => `${ctx.nomeGrupo(g)} ${G.total}`).join(' · ')),
          h('details', {}, h('summary', {}, 'Recorde de cada aluno'), h('ul', { class: 'diag' }, Object.entries(est.jogadores).sort((x, y) => y[1].recorde - x[1].recorde).map(([id, S]) =>
            h('li', { class: S.partidas ? 'info' : 'aviso' }, ctx.chip(S.grupo), ' ', ctx.nomeDe(id) + ': ', S.partidas ? `recorde ${S.recorde} · ${S.partidas} partida(s) · última ${S.ultima.pontos}` : 'ainda não jogou')))),
          dr.length > 0 && h('p', { class: 'sutil' }, 'Termos que mais derrubaram: ' + dr.map(x => `${x.termo} (${x.vezes})`).join(' · ')));
      }
      if (t === 'equipe') return painelEquipe(e, caixa);
      if (t === 'escala') caixa.append(h('p', {}, `${Object.keys(escoresDe(e)).length} de ${participantes().length} responderam.`),
        h('p', { class: 'sutil' }, 'Por privacidade, você não vê o perfil de ninguém: cada aluno vê o próprio, e o telão mostra a média da turma ao encerrar (com 5 ou mais respostas).'));
      if (t === 'jogo') {
        const n = Object.keys(j.revelado ? j.decisoes : decisoesDe(e)).length;
        caixa.append(h('p', {}, `${JOGOS[e.config.formato]?.nome}: ${n} de ${participantes().length} decidiram.`));
        if (!j.revelado) caixa.append(h('button', { class: 'btn bloco', disabled: n < 2, onclick: () => { revelarJogo(e); ctx.emSerie(() => publicarJogoEconomico(e)); ctx.renderConducao(); } }, n < 2 ? 'Revelar resultados (precisa de 2 decisões)' : 'Revelar resultados'),
          h('p', { class: 'sutil' }, 'Ao revelar, os pares são sorteados, cada celular mostra o próprio ganho e o telão mostra a distribuição. Quem decidir depois não entra no cálculo.'));
        else caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, `Resultados revelados · média: ${j.resumo.media} ${JOGOS[e.config.formato].rotulo} · ganho médio: ${j.resumo.ganhoMedio}`));
      }
      caixa.append(h('button', { class: 'btn primario bloco', onclick: ctx.encerrarEtapa }, 'Encerrar etapa'));
      return caixa;
    },
    resumo(e) {
      const t = tipoDe(e), j = E.jogo[e.id]; if (!j || E.sala.etapaAtual === e.id) return h('span');
      if (t === 'corrida') { const est = estadoC(e); return est ? h('p', { class: 'sutil' }, 'Placar: ' + Object.entries(est.grupos).sort((x, y) => y[1].total - x[1].total).map(([g, G]) => `${ctx.nomeGrupo(g)} ${G.total}`).join(' · ')) : h('span'); }
      if (t === 'memoria' || t === 'cruzadas') { const est = t === 'memoria' ? estadoM(e) : estadoX(e); return h('p', { class: 'sutil' }, Object.entries(est).map(([g, S]) => `${g === 'turma' ? 'Turma' : ctx.nomeGrupo(g)}: ${t === 'memoria' ? Object.keys(S.achados).length : S.acertos}/${S.total}`).join(' · ')); }
      if (t === 'memoriaTelao') { const est = estadoM(e); return h('p', { class: 'sutil' }, 'Placar: ' + Object.entries(est.placar).map(([g, n]) => `${ctx.nomeGrupo(g)} ${n}`).join(' · ')); }
      if (t === 'equipe') { const est = estadoQ(e); return h('p', { class: 'sutil' }, 'Placar: ' + Object.entries(est.placar).map(([g, p]) => `${ctx.nomeGrupo(g)} ${p.pontos}`).join(' · ')); }
      if (t === 'ramos') { const est = estadoR(e); return h('p', { class: 'sutil' }, Object.entries(est).map(([g, S]) => `${ctx.nomeGrupo(g)}: ${S.final ? 'final ' + S.desfecho : 'não terminou'}`).join(' · ')); }
      if (t === 'sequencia') { const est = estadoS(e); return h('p', { class: 'sutil' }, 'Placar: ' + Object.entries(est.grupos).sort((x, y) => y[1].total - x[1].total).map(([g, G]) => `${ctx.nomeGrupo(g)} ${G.total}`).join(' · ') + (est.ranking[0] ? ` · maior sequência: ${est.ranking[0].recorde} (${ctx.nomeDe(est.ranking[0].id)})` : '')); }
      if (t === 'escala') return h('p', { class: 'sutil' }, `${Object.keys(escoresDe(e)).length} resposta(s).`);
      if (t === 'jogo') return h('p', { class: 'sutil' }, j.revelado ? `${j.resumo.n} decisões · média ${j.resumo.media} ${JOGOS[e.config.formato].rotulo}` : `${Object.keys(decisoesDe(e)).length} decisões`);
      if (t === 'observar') { const est = estadoO(e); return h('details', {}, h('summary', {}, 'O que cada grupo escreveu'), h('ul', {}, Object.entries(est).map(([g, x]) => h('li', {}, h('strong', {}, ctx.nomeGrupo(g) + ': '), x.texto)))); }
      return h('span');
    },
    async encerrar(e) { if (tipoDe(e) === 'jogo') { revelarJogo(e); await publicarJogoEconomico(e); } if (tipoDe(e) === 'equipe') { const j = E.jogo[e.id]; if (j.fases[j.q] && j.fases[j.q].r === undefined) { j.fases[j.q].r = Date.now(); ctx.salvar(); } } },
    jogoFinal(e) {
      const t = tipoDe(e), j = E.jogo[e.id]; if (!j) return null;
      const pares = (e.config.pares || []).map(p => ({ a: p.a, b: p.b }));
      if (t === 'corrida') {
        const est = estadoC(e);
        return limpo({ tipo: 'corrida', etapaId: e.id, final: true, formato: j.cfg.formato, placar: Object.fromEntries(Object.entries(est.grupos).map(([g, G]) => [g, G.total])),
          ...(j.cfg.confianca && e.config.mostrarCalibracao !== false ? { calibracao: est.calibracao } : {}),
          destaques: Object.entries(est.jogadores).sort((x, y) => y[1].pontos - x[1].pontos).slice(0, porGrupoJogador(e) ? 0 : 3).map(([id, S]) => ({ nome: ctx.nomeDe(id), grupo: S.grupo, pontos: S.pontos, melhor: S.melhor })),
          ...(e.typeId === 'corrida' && e.config.formato === 'corrente' ? { corrente: [e.config.gatilho, ...e.config.elos.map(x => x.consequencia)] } : {}) });
      }
      if (t === 'memoria') { const est = estadoM(e); return { tipo: 'memoria', etapaId: e.id, final: true, porGrupo: Object.fromEntries(Object.entries(est).map(([g, S]) => [g, { achados: Object.keys(S.achados).length, total: S.total, tentativas: S.tentativas, posicao: S.posicao ?? null }])), pares: e.config.revelarAoEncerrar !== false ? pares : null }; }
      if (t === 'memoriaTelao') { const est = estadoM(e); return { tipo: 'memoria', etapaId: e.id, final: true, telao: true, placar: est.placar, pares: e.config.revelarAoEncerrar !== false ? pares : null }; }
      if (t === 'cruzadas') {
        const est = estadoX(e), cheia = gradeEmTexto({ linhas: j.grade.linhas, colunas: j.grade.colunas, letras: j.grade.celulas, numeros: j.grade.numeros });
        return { tipo: 'cruzadas', etapaId: e.id, final: true, grade: cheia, porGrupo: Object.fromEntries(Object.entries(est).map(([g, S]) => [g, { acertos: S.acertos, total: S.total, posicao: S.posicao ?? null }])), dicas: j.grade.palavras.map(p => ({ numero: p.numero, dir: p.dir, dica: p.dica, palavra: p.palavra })) };
      }
      if (t === 'sequencia') {
        const est = estadoS(e);
        return limpo({ tipo: 'sequencia', etapaId: e.id, final: true, placar: placarS(est), media: e.config.placar === 'media', ranking: rankingS(est, 5), partidas: est.partidas, derrubaram: termosQueDerrubaram(est, e.config.termos || [], 3) });
      }
      if (t === 'equipe') { const est = estadoQ(e); return { tipo: 'equipe', etapaId: e.id, final: true, placar: Object.fromEntries(Object.entries(est.placar).map(([g, p]) => [g, p.pontos])), detalhe: est.placar }; }
      if (t === 'ramos') {
        const est = estadoR(e), porId = Object.fromEntries(e.config.cenarios.map(c => [c.id, c]));
        return limpo({ tipo: 'ramos', etapaId: e.id, final: true, caminhos: Object.fromEntries(Object.entries(est).map(([g, S]) => [g, { desfecho: S.desfecho, final: S.final, textoFinal: S.final ? porId[S.atual]?.texto : '', escolhas: S.caminho.map(p => porId[p.cenario]?.opcoes.find(o => o.id === p.opcao)?.texto || '') }])) });
      }
      if (t === 'observar') { const est = estadoO(e); return { tipo: 'observar', etapaId: e.id, final: true, respostas: Object.entries(est).map(([g, x]) => ({ grupo: g, texto: x.texto })) }; }
      if (t === 'escala') return limpo({ tipo: 'escala', etapaId: e.id, final: true, instrumento: e.config.formato, mostrar: e.config.mostrarTurma !== false,
        resumo: e.config.mostrarTurma !== false ? resumoTurma(e.config.formato, Object.values(escoresDe(e))) : null });
      if (t === 'jogo') return limpo({ tipo: 'jogo', etapaId: e.id, final: true, formato: e.config.formato, dotacao: e.config.dotacao ?? 10, revelado: true, resumo: j.resumo, relacao: j.relacao });
      return null;
    },
    resultados(e) {
      const t = tipoDe(e), out = [], R = (g, acertou) => ({ etapaId: e.id, grupoId: g, participanteId: null, autoria: { tipo: 'grupo', grupoId: g }, dados: { acertou }, tentativa: 1 });
      if (t === 'corrida') { const est = estadoC(e); if (est) for (const [id, S] of Object.entries(est.jogadores)) for (const x of S.historico) out.push({ ...R(S.grupo, x.certo), participanteId: porGrupoJogador(e) ? null : id }); }
      if (t === 'memoria') for (const [g, S] of Object.entries(estadoM(e) || {})) out.push(R(g, S.concluido));
      if (t === 'cruzadas') for (const [g, S] of Object.entries(estadoX(e) || {})) out.push(R(g === 'turma' ? null : g, S.concluido));
      if (t === 'equipe') { const est = estadoQ(e), ps = e.config.perguntas, j = E.jogo[e.id]; ps.forEach((p, q) => { if (j.fases[q]?.r === undefined) return; for (const g of Object.keys(j.grupos)) out.push(R(g, est.perguntas[q].grupo[g]?.alternativaId === resp(e).perguntas?.[p.id]?.corretaId)); }); }
      if (t === 'ramos') for (const [g, S] of Object.entries(estadoR(e) || {})) out.push(R(g, S.desfecho === 'bom'));
      if (t === 'sequencia') { const est = estadoS(e), meta = Number(e.config.meta ?? 6); if (est) for (const [id, S] of Object.entries(est.jogadores)) if (S.partidas) out.push({ ...R(S.grupo, S.recorde >= meta), participanteId: id }); }
      return out;
    },
    respostaTexto(e) {
      const c = e.config, r = resp(e);
      if (e.typeId === 'pares') return (c.pares || []).map(p => `${p.a} ↔ ${p.b}`).join(' · ');
      if (e.typeId === 'cruzadas') return (c.palavras || []).map(p => p.palavra).join(', ');
      if (e.typeId === 'sequencia') return `Memória: vale o recorde de cada aluno (meta: ${c.meta ?? 6} passos). Banco: ${(c.termos || []).length} termos.`;
      if (e.typeId === 'corrida' && c.formato === 'corrente') return [c.gatilho, ...(c.elos || []).map(x => x.consequencia)].join(' → ');
      if (e.typeId === 'corrida' && c.formato === 'direcao') return (c.rodadas || []).map(rd => `${rd.estimulo}: ` + rd.variaveis.map(v => `${v.nome} ${DIR[r.direcoes?.[v.id]] || '?'}`).join(', ')).join(' · ');
      if (e.typeId === 'quiz_pensar' && c.formato === 'ramificado') return 'Final bom: ' + (c.cenarios || []).filter(x => x.final && x.desfecho === 'bom').map(x => x.texto).join(' / ');
      if (e.typeId === 'analise_imagem' && c.tarefa === 'marcar') return (c.marcadores || []).map(m => m.rotulo).join(', ') + ' (posições no gabarito)';
      if (e.typeId === 'analise_imagem' && c.tarefa === 'observar') return 'Descrição livre de cada grupo';
      if (e.typeId === 'escala_padronizada') return 'Sem resposta certa: cada aluno vê o próprio perfil; o telão, a média da turma.';
      if (e.typeId === 'jogo_economico') return `Sem resposta certa: ${JOGOS[c.formato]?.nome || 'jogo'} para discutir as escolhas da turma.`;
      if (c.perguntas) return c.perguntas.map((q, i) => `${i + 1}. ${respostaCerta(q, r).texto}`).join(' · ');
      return '';
    },
    async piloto(e) {
      const t = tipoDe(e), j = E.jogo[e.id]; if (!j) return;
      const sim = u => String(u || '').startsWith('sim-');
      if (t === 'corrida') {
        const est = estadoC(e);
        for (const [id, S] of Object.entries(est.jogadores)) {
          const quem = porGrupoJogador(e) ? ctx.lider(id) : id;
          if (!sim(quem) || S.terminou) continue;
          if (S.inventario.length && Math.random() < 0.5) await enviarComo(e, `${e.id}__${id}__u${S.maxU + 1}`, quem, S.grupo, { usar: S.inventario[0] });
          const it = itemDoJogador(j.itens, j.prep.jogadores[id], S.pos);
          const dados = it.tipo === 'mc' ? { pos: S.pos, alternativaId: um(it.alternativas).id } : { pos: S.pos, direcoes: Object.fromEntries(it.variaveis.map(v => [v.id, um(['sobe', 'desce', 'igual'])])) };
          if (j.cfg.confianca) dados.confianca = um(['certeza', 'duvida', 'chute']);
          await enviarComo(e, `${e.id}__${id}__t${S.maxT + 1}`, quem, S.grupo, dados);
        }
      }
      if (t === 'memoria') {
        const est = estadoM(e);
        for (const [g, S] of Object.entries(est)) {
          const u = membrosDe(g).find(sim); if (!u || S.concluido) continue;
          const fechadas = j.prep.cartas.map((c, i) => [c, i]).filter(([c]) => !S.achados[c.par]).map(([, i]) => i);
          const a = um(fechadas), b2 = um(fechadas.filter(x => x !== a));
          await enviarComo(e, `${e.id}__${u}__j${proxN(e, u, 'j')}`, u, g, { cartas: [a, b2] });
        }
      }
      if (t === 'memoriaTelao') {
        const est = estadoM(e), u = ctx.lider(est.vez); if (!sim(u) || est.concluido) return;
        const fechadas = j.prep.cartas.map((c, i) => [c, i]).filter(([c]) => !est.achados[c.par]).map(([, i]) => i), a = um(fechadas);
        await enviarComo(e, `${e.id}__${est.vez}__r${proxN(e, est.vez, 'r')}`, u, est.vez, { cartas: [a, um(fechadas.filter(x => x !== a))] });
      }
      if (t === 'cruzadas') {
        const est = estadoX(e);
        for (const [conj, Q] of Object.entries(j.prep.quadros)) for (const u of Q.membros.filter(sim)) {
          const livre = (Q.deUid[u] || []).find(i => !est[conj].resolvidas[i]); if (livre === undefined) continue;
          const p = j.grade.palavras[livre];
          await enviarComo(e, `${e.id}__${u}__w${proxN(e, u, 'w')}`, u, ctx.grupoDoUid(u), { palavra: livre, texto: Math.random() < 0.6 ? p.palavra : 'chute' });
        }
      }
      if (t === 'equipe') {
        const f = faseAtual(j), P = e.config.perguntas[j.q]; if (!P) return;
        for (const [g, ms] of Object.entries(j.grupos)) {
          if (f === 'individual') for (const u of ms.filter(sim)) await enviarComo(e, `${e.id}__${u}__t${proxN(e, u, 't')}`, u, g, { q: j.q, alternativaId: um(P.alternativas).id });
          if (f === 'grupo') {
            if (e.config.consenso === 'todos') { const alt = um(P.alternativas).id; for (const u of ms.filter(sim)) await enviarComo(e, `${e.id}__${u}__v${proxN(e, u, 'v')}`, u, g, { q: j.q, alternativaId: alt }); }
            else if (sim(ctx.lider(g))) await enviarComo(e, `${e.id}__${g}__g${proxN(e, g, 'g')}`, ctx.lider(g), g, { q: j.q, alternativaId: um(P.alternativas).id });
          }
        }
      }
      if (t === 'ramos') {
        const est = estadoR(e), porId = Object.fromEntries(e.config.cenarios.map(c => [c.id, c]));
        for (const [g, S] of Object.entries(est)) { const u = ctx.lider(g); if (!sim(u) || S.final) continue; const c = porId[S.atual];
          await enviarComo(e, `${e.id}__${g}__d${proxN(e, g, 'd')}`, u, g, { cenario: c.id, opcao: um(c.opcoes).id }); }
      }
      if (t === 'sequencia') {
        const est = estadoS(e), ts = e.config.termos || [];
        for (const [id, S] of Object.entries(est.jogadores)) {
          if (!sim(id) || !est.podeJogar(id) || Math.random() > 0.35) continue;
          const p = Math.max(0, Math.round(3 + Math.random() * 7 + (Math.random() < 0.15 ? 6 : 0)));
          await enviarComo(e, `${e.id}__${id}__s${S.partidas + 1}`, id, S.grupo, { partida: S.partidas + 1, pontos: p, termos: [], erro: ts.length ? { esperado: um(ts).id, tocado: null } : null });
        }
      }
      if (t === 'escala') for (const u of participantes().filter(sim)) if (!escoresDe(e)[u]) await enviarComo(e, `${e.id}__${u}__r1`, u, ctx.grupoDoUid(u), { escores: Object.fromEntries(INSTRUMENTOS[e.config.formato].fatores.map(f => [f.id, Math.round((1.5 + Math.random() * 3) * 100) / 100])) });
      if (t === 'jogo' && !j.revelado) { const D = e.config.dotacao ?? 10, n = () => Math.floor(Math.random() * (D + 1)); for (const u of participantes().filter(sim)) if (!decisoesDe(e)[u]) await enviarComo(e, `${e.id}__${u}__d1`, u, ctx.grupoDoUid(u), { dar: n(), oferta: n(), minimo: n(), enviar: n(), devolver: 10 * Math.floor(Math.random() * 11), contribuir: n() }); }
      if (t === 'observar') for (const g of j.grupos) { const u = ctx.lider(g); if (sim(u)) await enviarComo(e, `${e.id}__${g}__o${proxN(e, g, 'o')}`, u, g, { texto: 'Observação simulada: vemos as estruturas indicadas na imagem.' }); }
    },
    tique() {
      const s = E.sala; if (!s || s.fase !== 'etapa') return;
      const e = ctx.etapa(s.etapaAtual), t = tipoDe(e);
      if (t === 'memoriaTelao') {
        const est = estadoM(e); if (!est || est.concluido || !est.vez) return;
        if (Date.now() > est.vezDesde + (e.config.segundos ?? 30) * 1000 + 2000) ctx.emSerie(() => passarVez(e, est));
      }
      if (t === 'corrida' && (Number(E.jogo[e.id]?.cfg?.segundos) || 0) > 0) {
        // republica de tempos em tempos para os relógios e o congelamento acompanharem
        if (!api._ultimo || Date.now() - api._ultimo > 5000) { api._ultimo = Date.now(); ctx.emSerie(() => publicarCorrida(e)); }
      }
    }
  };

  async function passarVez(e, est) {
    const j = E.jogo[e.id], chave = est.jogadas;
    if (j.passou[chave]) return;
    j.passou[chave] = true;
    await enviarComo(e, `${e.id}__conducao__p${chave + 1}`, E.conta.uid, null, { passar: true, vez: est.vez, jogada: est.jogadas });
  }

  function painelEquipe(e, caixa) {
    const j = E.jogo[e.id], c = e.config, f = faseAtual(j), P = c.perguntas[j.q], est = estadoQ(e), X = est.perguntas[j.q];
    const avancar = fn => ctx.emSerie(async () => { fn(); ctx.salvar(); await publicarEquipe(e); ctx.renderConducao(); });
    caixa.append(h('p', {}, h('strong', {}, `Pergunta ${j.q + 1} de ${c.perguntas.length}`), ' · ', { espera: 'ainda não aberta', individual: 'cada um responde sozinho', grupo: 'o grupo decide junto', revelada: 'resposta revelada' }[f]));
    if (P) caixa.append(h('p', {}, P.enunciado), h('p', { class: 'sutil' }, 'Resposta: ' + respostaCerta(P, resp(e)).texto + ' — só você vê'));
    if (X && f !== 'espera') caixa.append(h('ul', { class: 'diag' }, Object.entries(j.grupos).map(([g, ms]) => h('li', { class: 'info' }, ctx.chip(g), ` ${ms.filter(u => X.individuais[u]).length} de ${ms.length} responderam sozinhos` + (X.grupo[g] ? ' · grupo respondeu' : '')))));
    if (f === 'espera') caixa.append(h('button', { class: 'btn primario bloco', onclick: () => avancar(() => { j.fases[j.q] = { i: Date.now() }; }) }, 'Abrir a pergunta (cada um responde sozinho)'));
    if (f === 'individual') caixa.append(h('button', { class: 'btn primario bloco', onclick: () => avancar(() => { j.fases[j.q].g = Date.now(); }) }, 'Passar para o grupo'));
    if (f === 'grupo') caixa.append(h('button', { class: 'btn primario bloco', onclick: () => avancar(() => { j.fases[j.q].r = Date.now(); }) }, 'Revelar a resposta'));
    if (f === 'revelada' && j.q < c.perguntas.length - 1) caixa.append(h('button', { class: 'btn primario bloco', onclick: () => avancar(() => { j.q++; }) }, 'Próxima pergunta'));
    caixa.append(h('p', { class: 'sutil' }, 'Placar: ' + Object.entries(est.placar).map(([g, p]) => `${ctx.nomeGrupo(g)} ${p.pontos}`).join(' · ')));
    caixa.append(h('button', { class: 'btn bloco', onclick: ctx.encerrarEtapa }, 'Encerrar etapa'));
    return caixa;
  }

  return api;
}
