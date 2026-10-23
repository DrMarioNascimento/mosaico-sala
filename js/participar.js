/* MOSAICO · Tela de quem participa (celular) */
import { backend } from './backend.js';
import { $, h, limpar, aviso, corDoGrupo, explicar, escalaVisual } from './ui.js';

const b = await backend();
const params = new URLSearchParams(location.search);
// Simulador de aula: ?perfil=N cria um participante independente; &auto liga o piloto automático.
const PERFIL = params.get('perfil');
const SESSAO = 'mosaico-participante' + (PERFIL ? '-' + PERFIL : '');
let auto = !!PERFIL && params.has('auto');
let uid = null, codigo = null, sala = null, meuNome = '';
const pacotes = {}, inscricoes = {};
const rascunhos = {};
let chaveRenderizada = '', autoTimer = null;

$('codigo').value = params.get('sala') || '';

if (PERFIL) {
  const barra = h('div', { class: 'aviso', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', margin: '8px 0' } },
    h('strong', {}, 'Simulado ' + PERFIL),
    h('label', { style: { margin: 0, display: 'flex', gap: '6px', alignItems: 'center' } },
      h('input', { type: 'checkbox', id: 'autoPiloto', checked: auto, onchange: e => definirAuto(e.target.checked) }), 'Piloto automático'));
  document.querySelector('main').prepend(barra);
  window.MOSAICO_SEM_EXPLICACAO = auto;
}
function definirAuto(v) {
  auto = !!v; window.MOSAICO_SEM_EXPLICACAO = auto;
  const c = document.getElementById('autoPiloto'); if (c) c.checked = auto;
  if (auto) agendarAuto(); else clearTimeout(autoTimer);
}
window.mosaicoAuto = definirAuto;   // o simulador liga/desliga todos de uma vez

$('entrar').onclick = async () => {
  const c = $('codigo').value.trim(), n = $('nome').value.trim().replace(/\s+/g, ' ');
  if (!/^\d{6}$/.test(c) || !n) return aviso($('avisoEntrada'), 'Informe o código de 6 números e seu nome.', 'erro');
  $('entrar').disabled = true;
  try {
    uid = await b.identificar();
    const s = await b.lerSala(c);
    if (!s || s.status !== 'open') throw new Error('Sala não encontrada ou já encerrada.');
    const existente = await b.lerMembro(c, uid);
    if (!existente) {
      if (!s.entradaAberta) throw new Error('A entrada nesta sala está fechada no momento. Peça a quem conduz para liberar.');
      await b.entrar(c, uid, n);
    }
    meuNome = existente?.nome || n;
    try { sessionStorage.setItem(SESSAO, JSON.stringify({ codigo: c, nome: meuNome })); } catch {}
    conectar(c);
  } catch (e) {
    aviso($('avisoEntrada'), e.message === 'recusado' ? 'A sala recusou a entrada (entrada fechada ou sala encerrada).' : e.message, 'erro');
    $('entrar').disabled = false;
  }
};

// Retomar depois de recarregar a página (ou entrar sozinho, no simulador)
(async () => {
  let salvo = null; try { salvo = JSON.parse(sessionStorage.getItem(SESSAO) || 'null'); } catch {}
  if (salvo) {
    uid = await b.identificar();
    if (await b.lerMembro(salvo.codigo, uid)) { meuNome = salvo.nome; conectar(salvo.codigo); return; }
  }
  if (PERFIL && $('codigo').value) {
    uid = await b.identificar();
    const existente = await b.lerMembro($('codigo').value, uid).catch(() => null);
    $('nome').value = existente?.nome || params.get('nome') || 'Simulado ' + PERFIL;
    $('entrar').click();
  }
})();

function conectar(c) {
  codigo = c;
  $('entrada').hidden = true; $('jogo').hidden = false;
  $('identidade').textContent = meuNome + ' · sala ' + c;
  b.observarSala(c, s => { sala = s; sincronizarPacotes(); render(); }, () => aviso($('status'), 'Conexão interrompida. Confira sua internet.', 'erro'));
}

// ---------- quem sou eu na sala ----------
const grupoDe = s => Object.entries(s?.composicao || {}).find(([, m]) => m.includes(uid))?.[0] || null;
const coberturas = s => Object.entries(s?.leitoresExtra || {}).filter(([, m]) => m.includes(uid)).map(([g]) => g);
const nomeGrupo = (s, g) => s.publico.grupos.find(x => x.id === g)?.nome || g;
const nomeDe = (s, u) => s.nomes?.[u] || 'alguém';

function pacotesNecessarios() {
  if (!sala || sala.fase !== 'etapa') return [];
  if (sala.etapaInfo?.organizacao === 'individual') return ['individual'];
  const g = grupoDe(sala);
  return [g, ...coberturas(sala)].filter(Boolean);
}
function sincronizarPacotes() {
  const quero = new Set(pacotesNecessarios());
  for (const id of Object.keys(inscricoes)) if (!quero.has(id)) { inscricoes[id](); delete inscricoes[id]; delete pacotes[id]; }
  for (const id of quero) if (!inscricoes[id]) inscricoes[id] = b.observarPacote(codigo, id, p => { pacotes[id] = p; render(); }, () => {});
}

// ---------- renderização ----------
function render() {
  if (!sala || sala.status !== 'open') {
    limpar($('status')); limpar($('tarefa'), h('div', { class: 'cartao' }, h('h2', {}, 'Sala encerrada'), h('p', {}, 'Obrigado por participar!')));
    try { sessionStorage.removeItem(SESSAO); } catch {}
    return;
  }
  renderStatus();
  const g = grupoDe(sala);
  const chave = JSON.stringify([sala.fase, sala.etapaAtual, g, sala.representantes?.[g], sala.executores, coberturas(sala),
    pacotesNecessarios().map(id => pacotes[id]?.etapaId), enviados(), sala.final ? 1 : 0]);
  if (chave === chaveRenderizada) return;   // evita apagar o que está sendo escolhido/digitado
  chaveRenderizada = chave;
  renderTarefa();
  agendarAuto();
}

// ---------- piloto automático (simulador) ----------
// Age como uma pessoa: espera alguns segundos, escolhe uma opção ao acaso,
// marca as peças exigidas, escreve uma justificativa curta e confirma o envio.
function agendarAuto() {
  clearTimeout(autoTimer);
  if (auto) autoTimer = setTimeout(autoAgir, 2500 + Math.random() * 5000);
}
function autoAgir() {
  if (!auto) return;
  const escolher = l => l[Math.floor(Math.random() * l.length)];
  for (const btn of $('tarefa').querySelectorAll('button.primario:not(:disabled)')) {
    const caixa = btn.parentElement;
    const radios = [...caixa.querySelectorAll(':scope > .opcoes input[type=radio]')];
    if (!radios.length) continue;
    const r = escolher(radios); r.checked = true; r.dispatchEvent(new Event('change'));
    const caixas = [...caixa.querySelectorAll(':scope > .peca input[type=checkbox]')];
    caixas.slice(0, 2).forEach(c => { c.checked = true; c.dispatchEvent(new Event('change')); });
    const ta = caixa.querySelector(':scope > textarea');
    if (ta) { ta.value = 'Escolha feita pelo participante simulado.'; ta.dispatchEvent(new Event('input')); }
    btn.click(); setTimeout(() => btn.click(), 400);
  }
  // Se algo falhou (ex.: conexão), tenta de novo em alguns segundos.
  setTimeout(() => { if (auto && $('tarefa').querySelector('button.primario:not(:disabled)')) agendarAuto(); }, 4000);
}

function enviados() {
  const p = sala.progresso || {};
  return { grupos: Object.keys(p.porGrupo || {}).sort(), eu: !!(p.porParticipante || {})[uid] };
}

function renderStatus() {
  const s = sala, g = grupoDe(s), p = s.progresso;
  const partes = [];
  if (g) partes.push(h('span', { class: 'chip' }, h('i', { style: { background: corDoGrupo(s.publico.grupos, g) } }), nomeGrupo(s, g)));
  if (s.fase === 'etapa' && p) partes.push(h('span', { class: 'sutil' }, ` ${p.enviados} de ${p.esperados} ${s.etapaInfo?.organizacao === 'individual' ? 'responderam' : 'grupos enviaram'}`));
  limpar($('status'), partes.length ? h('div', { class: 'linha-botoes' }, partes) : null);
}

function renderTarefa() {
  const s = sala, alvo = $('tarefa'), g = grupoDe(s);
  if (s.fase === 'lobby' || (!g && s.fase === 'grupos')) {
    return limpar(alvo, h('div', { class: 'cartao' }, h('h2', {}, s.publico.titulo), h('p', {}, 'Você está na sala. Aguarde a formação dos grupos.'), s.publico.introducao && h('p', { class: 'sutil' }, s.publico.introducao)));
  }
  if (s.fase === 'grupos') return limpar(alvo, cartaoGrupo(s, g, true));
  if (s.fase === 'revisao') return limpar(alvo, h('div', { class: 'cartao' }, h('h2', {}, 'Etapa encerrada'), h('p', {}, 'Aguarde a próxima etapa.')), s.escala != null && h('div', { class: 'cartao' }, h('h3', {}, 'Desempenho da turma'), escalaVisual(s.escala)));
  if (s.fase === 'final') return limpar(alvo, resultadoFinal(s));
  if (s.fase !== 'etapa') return limpar(alvo);

  const info = s.etapaInfo;
  if (info.organizacao === 'individual') {
    const pk = pacotes.individual;
    if (!pk || pk.etapaId !== s.etapaAtual) return limpar(alvo, carregando());
    explicar('ind-' + s.etapaAtual, info.titulo, ['Esta etapa é individual. Responda sozinho, no seu celular.', 'Depois de enviar, não é possível alterar.']);
    return limpar(alvo, tarefaIndividual(pk));
  }
  if (!g) return limpar(alvo, h('div', { class: 'cartao' }, h('p', {}, 'Aguardando quem conduz incluir você em um grupo.')));
  const souRep = s.representantes?.[g] === uid;
  explicar(`grp-${s.etapaAtual}-${souRep}`, info.titulo, souRep
    ? ['Você é quem envia a decisão do seu grupo.', 'Discutam juntos e só envie quando houver acordo. Fique atento ao tempo.', 'Depois de enviar, não é possível alterar.']
    : [`Quem envia pelo seu grupo é ${nomeDe(s, s.representantes?.[g])}.`, 'Leiam as peças juntos e cheguem a um acordo. Só o representante envia.']);
  const blocos = [];
  const pk = pacotes[g];
  blocos.push(pk && pk.etapaId === s.etapaAtual ? tarefaGrupo(pk, g, souRep) : carregando());
  for (const extra of coberturas(s)) {
    const px = pacotes[extra];
    if (px && px.etapaId === s.etapaAtual) blocos.push(h('div', { class: 'cartao destaque' },
      h('h2', {}, 'Tarefa extra: cobrir o grupo ' + nomeGrupo(s, extra)),
      h('p', { class: 'sutil' }, 'Esse grupo ficou sem participantes. Quem conduz pediu que o seu grupo execute também a tarefa dele.'),
      tarefaGrupo(px, extra, s.executores?.[extra] === uid)));
  }
  limpar(alvo, blocos);
}

const carregando = () => h('div', { class: 'cartao' }, h('p', { class: 'sutil' }, 'Carregando a etapa…'));

function cartaoGrupo(s, g, comExplicacao) {
  const membros = s.composicao[g] || [], rep = s.representantes?.[g];
  if (comExplicacao) explicar('grupo-' + g, 'Encontre seu grupo', [`Você está no grupo ${nomeGrupo(s, g)}.`, rep === uid ? 'Você foi indicado para enviar as decisões do grupo.' : `Quem envia as decisões do grupo é ${nomeDe(s, rep)}.`, 'Procure os colegas do seu grupo e sentem juntos.']);
  return h('div', { class: 'grupo cartao', style: { '--cor': corDoGrupo(s.publico.grupos, g) } },
    h('h2', {}, nomeGrupo(s, g)),
    h('p', { class: 'sutil' }, s.publico.grupos.find(x => x.id === g)?.funcao || ''),
    h('ul', {}, membros.map(u => h('li', {}, nomeDe(s, u) + (u === uid ? ' (você)' : ''), u === rep && h('span', { class: 'rep' }, 'REPRESENTANTE')))));
}

function rascunho(chave) { return rascunhos[chave] ||= { escolha: null, evidencias: new Set(), justificativa: '' }; }

function tarefaGrupo(pk, g, possoEnviar) {
  const s = sala, r = rascunho(pk.etapaId + '__' + g), cfg = pk.config || {};
  const jaFoi = !!s.progresso?.porGrupo?.[g];
  const caixa = h('div', { class: 'cartao' });
  caixa.append(h('h2', {}, pk.titulo), pk.instrucao && h('p', {}, pk.instrucao));

  if (pk.typeId === 'investigacao_fragmentos') {
    caixa.append(h('h3', {}, 'Peças do grupo'));
    for (const p of pk.pecas || []) {
      const marcar = possoEnviar && !jaFoi && h('label', { class: 'marcar' },
        h('input', { type: 'checkbox', checked: r.evidencias.has(p.id), onchange: e => e.target.checked ? r.evidencias.add(p.id) : r.evidencias.delete(p.id) }), 'Usar como evidência');
      caixa.append(h('div', { class: 'peca' }, p.conteudo, marcar));
    }
  }
  if (pk.typeId === 'comparar_hipoteses') {
    caixa.append(h('h3', {}, 'O que cada grupo concluiu'));
    for (const c of pk.contribuicoes || []) {
      const hip = (cfg.hipotesesCandidatas || []).find(x => x.id === c.hipoteseId);
      caixa.append(h('div', { class: 'grupo', style: { '--cor': corDoGrupo(s.publico.grupos, c.grupoId), marginBottom: '12px' } },
        h('h3', {}, c.grupoNome + (c.autoria?.contingencia ? ' (tarefa coberta)' : '')),
        h('p', {}, h('strong', {}, 'Hipótese: '), hip?.texto || '—'),
        c.justificativa && h('p', { class: 'sutil' }, '“' + c.justificativa + '”'),
        (c.evidencias || []).length ? h('div', {}, h('small', {}, 'Evidências citadas:'), c.evidencias.map(e => h('div', { class: 'peca' }, e.conteudo))) : h('small', {}, 'Nenhuma evidência citada.')));
    }
  }

  caixa.append(h('h3', {}, cfg.pergunta || 'Decisão do grupo'));
  caixa.append(listaOpcoes(cfg.hipotesesCandidatas || [], r, possoEnviar && !jaFoi, 'h-' + pk.etapaId + g));

  if (jaFoi) { caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Decisão do grupo enviada.')); return caixa; }
  if (!possoEnviar) { caixa.append(h('p', { class: 'aviso' }, `Discutam. Só ${nomeDe(s, (s.executores?.[g]) || s.representantes?.[g])} envia a decisão.`)); return caixa; }

  const just = cfg.justificativa || 'opcional';
  if (just !== 'nenhuma') {
    caixa.append(h('label', { for: 'j-' + g }, 'Justificativa ' + (just === 'obrigatoria' ? '(obrigatória)' : '(opcional)')),
      h('textarea', { id: 'j-' + g, maxlength: 400, oninput: e => { r.justificativa = e.target.value; } }, r.justificativa));
  }
  const msg = h('p', { class: 'aviso', hidden: true });
  const botao = botaoConfirmar('Enviar decisão do grupo', async () => {
    if (!r.escolha) throw new Error('Escolham uma hipótese.');
    const min = pk.typeId === 'investigacao_fragmentos' ? (cfg.minEvidencias ?? 1) : 0;
    if (r.evidencias.size < min) throw new Error(`Marquem pelo menos ${min} peça(s) como evidência.`);
    if (just === 'obrigatoria' && r.justificativa.trim().length < 10) throw new Error('Escrevam uma justificativa curta.');
    const dados = { hipoteseId: r.escolha, justificativa: r.justificativa.trim().slice(0, 400) };
    if (pk.typeId === 'investigacao_fragmentos') dados.evidencias = [...r.evidencias];
    await b.enviar(codigo, pk.etapaId + '__' + g, { etapaId: pk.etapaId, escopo: 'grupo', grupoId: g, autor: uid, dados, contingencia: g !== grupoDe(s) });
  }, msg);
  caixa.append(botao, msg);
  return caixa;
}

function tarefaIndividual(pk) {
  const r = rascunho(pk.etapaId + '__eu'), cfg = pk.config || {};
  const caixa = h('div', { class: 'cartao' }, h('h2', {}, pk.titulo), pk.instrucao && h('p', { class: 'sutil' }, pk.instrucao), h('h3', {}, cfg.enunciado));
  const jaFoi = !!sala.progresso?.porParticipante?.[uid];
  caixa.append(listaOpcoes(cfg.alternativas || [], r, !jaFoi, 'a-' + pk.etapaId));
  if (jaFoi) { caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Resposta enviada.')); return caixa; }
  const msg = h('p', { class: 'aviso', hidden: true });
  caixa.append(botaoConfirmar('Enviar resposta', async () => {
    if (!r.escolha) throw new Error('Escolha uma alternativa.');
    await b.enviar(codigo, pk.etapaId + '__' + uid, { etapaId: pk.etapaId, escopo: 'participante', grupoId: grupoDe(sala), autor: uid, dados: { alternativaId: r.escolha }, contingencia: false });
  }, msg), msg);
  return caixa;
}

function listaOpcoes(opcoes, r, editavel, nome) {
  return h('div', { class: 'opcoes', role: editavel ? 'radiogroup' : null }, opcoes.map(o => editavel
    ? h('label', { class: 'opcao' }, h('input', { type: 'radio', name: nome, value: o.id, checked: r.escolha === o.id, onchange: () => { r.escolha = o.id; } }), h('span', {}, o.texto))
    : h('div', { class: 'opcao leitura' + (r.escolha === o.id ? ' escolhida' : '') }, h('span', {}, '• ' + o.texto))));
}

/** Botão de dois toques: o primeiro pede confirmação, o segundo envia. */
function botaoConfirmar(rotulo, acao, msg) {
  let armado = false;
  const btn = h('button', { class: 'btn primario bloco', onclick: async () => {
    aviso(msg, '');
    if (!armado) { armado = true; btn.textContent = 'Toque de novo para confirmar (não dá para alterar)'; setTimeout(() => { armado = false; btn.textContent = rotulo; }, 6000); return; }
    btn.disabled = true; btn.textContent = 'Enviando…';
    try { await acao(); btn.textContent = 'Enviado'; aviso(msg, 'Enviado! Aguarde os demais.', 'ok'); }
    catch (e) {
      armado = false; btn.disabled = false; btn.textContent = rotulo;
      aviso(msg, e.message === 'ja-enviado' ? 'Isto já tinha sido enviado.' : e.message === 'recusado' ? 'Envio recusado: a etapa pode ter sido encerrada.' : e.message, 'erro');
    }
  } }, rotulo);
  return btn;
}

function resultadoFinal(s) {
  const f = s.final || {};
  const m = f.meta;
  return h('div', {},
    h('div', { class: 'cartao destaque' }, h('h2', {}, m ? (m.atingida ? 'A turma atingiu a meta!' : 'A turma não atingiu a meta desta vez') : 'Atividade concluída'),
      m && h('p', {}, `${m.acertos} acerto(s) em ${m.total} resposta(s) · meta de ${Math.round(m.limiar * 100)}%`)),
    (f.explicacoes || []).map(e => h('div', { class: 'cartao' }, h('h3', {}, e.titulo), e.resposta && h('p', {}, h('strong', {}, 'Resposta esperada: '), e.resposta), h('p', {}, e.explicacao))));
}
