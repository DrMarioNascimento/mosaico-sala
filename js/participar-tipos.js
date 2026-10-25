/* MOSAICO · Tela do participante nos tipos novos (junto com participar.js)
   Pares na memória · Corrida · Palavras cruzadas · Quiz que faz pensar · Análise de imagem (mídia, perguntas e observar)
   O celular só manda a jogada; quem conduz confere e devolve o resultado. */

import { h, corDoGrupo, iconeGrupo } from './ui.js';
import { POWER_UPS } from './core/corrida.js';
import { VELOCIDADES, duracaoTom, frequencias, TOM_ERRO, sortearPainel, proximoBotao, conferirToque, MAX_PASSOS } from './core/sequencia.js';
import { INSTRUMENTOS, OPCOES_RESPOSTA, pontuar } from './core/escalas.js';
import { JOGOS } from './core/jogos.js';

export function criarTelas(ctx) {
  const { b } = ctx;
  const S = () => ctx.sala(), uid = () => ctx.uid(), P = id => ctx.pacotes[id];
  const g = () => ctx.grupoDe(S());
  const souLider = gr => (S().executores?.[gr] || S().representantes?.[gr]) === uid();
  const pend = {};                                   // envios à espera da conferência (chave → valor visto)
  const local = {};                                  // escolhas locais (memória, confiança, direções)
  const cartao = (...f) => {
    const el = h('div', { class: 'cartao', style: { '--cor': g() ? corDoGrupo(S().publico.grupos, g()) : '#ff8a3d' } }, ...f);
    const juntar = el.append.bind(el);
    el.append = (...x) => juntar(...x.flat(Infinity).filter(v => v !== null && v !== undefined && v !== false && v !== ''));   // nada de "null"/"false" na tela
    return el;
  };
  const nomeGrupo = x => S().publico.grupos.find(y => y.id === x)?.nome || x;
  const DIR = { sobe: '↑', desce: '↓', igual: '=' }, DIR_NOME = { sobe: 'Aumenta', desce: 'Diminui', igual: 'Não muda' };
  const tipo = info => {
    if (info.typeId === 'pares' && info.formato === 'memoria') return info.organizacao === 'representantes' ? 'memoriaTelao' : 'memoria';
    if (info.typeId === 'corrida') return 'corrida';
    if (info.typeId === 'cruzadas') return 'cruzadas';
    if (info.typeId === 'sequencia') return 'sequencia';
    if (info.typeId === 'escala_padronizada') return 'escala';
    if (info.typeId === 'jogo_economico') return 'jogo';
    if (info.typeId === 'quiz_pensar') return info.formato === 'equipe' ? 'equipe' : info.formato === 'ramificado' ? 'ramos' : 'corrida';
    if (info.typeId === 'analise_imagem') return info.formato === 'perguntas' ? 'corrida' : info.formato === 'observar' ? 'observar' : null;
    return null;
  };

  // ---------- mídia (análise de imagem) ----------
  let carregandoMV = null;
  const modelViewer = () => carregandoMV ||= new Promise(ok => {
    if (customElements.get('model-viewer')) return ok();
    const s = document.createElement('script'); s.type = 'module'; s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js'; s.onload = ok; s.onerror = ok; document.head.append(s);
  });
  function midia(info) {
    const m = P('revelacao');
    if (!m || m.etapaId !== S().etapaAtual) return h('p', { class: 'sutil' }, 'Carregando a imagem…');
    if (m.midia === 'modelo3d') {
      modelViewer();
      const mv = document.createElement('model-viewer');
      mv.setAttribute('src', m.modelo?.url || m.modelo?.dados || ''); mv.setAttribute('camera-controls', ''); mv.setAttribute('touch-action', 'pan-y'); mv.setAttribute('alt', m.enunciado || 'Modelo 3D');
      mv.className = 'modelo-3d';
      return h('div', {}, mv, h('small', { class: 'sutil' }, 'Gire com um dedo e amplie com dois.'));
    }
    return h('img', { class: 'analise-img', src: m.imagem?.dados, alt: m.enunciado || 'Imagem para analisar' });
  }
  const temMidia = info => info.typeId === 'analise_imagem';

  // ---------- corrida (e metacognição, e perguntas sobre a imagem) ----------
  function corrida(info) {
    const porGrupo = info.organizacao !== 'individual', jog = porGrupo ? g() : uid(), pk = jog && P(jog), j = S().jogo || {};
    ctx.explicar('cor-' + S().etapaAtual, info.titulo, info.typeId === 'quiz_pensar'
      ? ['Responda e diga o quanto tem certeza.', 'Certeza vale mais pontos, mas perde pontos se errar. Seja honesto com você!']
      : ['Responda no seu ritmo: cada acerto soma pontos para o seu grupo.', 'Acertos seguidos dão power-ups. Use na hora certa!']);
    if (pk === undefined) return ctx.carregando();
    const caixa = cartao(h('h2', {}, info.titulo), info.instrucao && info.instrucao !== info.titulo && h('p', {}, info.instrucao));
    if (temMidia(info)) caixa.append(midia(info));
    if (!pk || pk.etapaId !== S().etapaAtual) { caixa.append(h('p', { class: 'aviso' }, porGrupo ? 'Aguardando o pacote do grupo…' : 'Você entrou depois do início. Ajude o seu grupo!')); return caixa; }
    if (j.placar) caixa.append(placar(j.placar));
    if ((j.feed || []).length) caixa.append(h('div', { class: 'feed-pu' }, j.feed.slice(-3).reverse().map(f => h('small', {}, `${POWER_UPS[f.usar]?.icone || '⚡'} ${f.quem} usou ${f.nome}${f.alvo ? ' em ' + nomeGrupo(f.alvo) : ''}${f.bloqueado ? ' (bloqueado!)' : ''}`))));
    if (pk.ultimo && (pk.ultimo.item !== undefined)) caixa.append(h('p', { class: 'aviso flash', 'data-tipo': pk.ultimo.certo ? 'ok' : 'erro' },
      pk.ultimo.certo ? `✔ Acertou! +${pk.ultimo.pts}` : pk.ultimo.tempo ? '⏱ Tempo esgotado.' : `✗ ${pk.ultimo.pts > 0 ? 'Quase: +' + pk.ultimo.pts : 'Errou' + (pk.ultimo.pts < 0 ? ' (' + pk.ultimo.pts + ')' : '')}.`,
      !pk.ultimo.certo && pk.ultimo.certaTexto && h('span', {}, ' Certo: ' + pk.ultimo.certaTexto), pk.ultimo.explicacao && h('small', { style: { display: 'block' } }, pk.ultimo.explicacao)));
    caixa.append(h('div', { class: 'corrida-status' }, h('span', {}, `${Math.min(pk.pos + 1, pk.total)} de ${pk.total}`), h('strong', {}, `${pk.pontos} pts`), pk.sequencia > 1 && h('span', {}, `🔥 ${pk.sequencia} seguidos`), pk.escudo && h('span', {}, '🛡 escudo')));
    if (pk.terminou) { caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, `Você terminou${porGrupo ? '' : ''}! ${pk.posicao ? pk.posicao + 'º a terminar. ' : ''}Acompanhe o placar no telão.`)); return caixa; }
    if (porGrupo && !souLider(g())) { caixa.append(h('p', { class: 'sutil' }, `Quem responde pelo grupo é ${ctx.nomeDe(S(), S().executores?.[g()] || S().representantes?.[g()])}. Ajudem a pensar!`)); }
    const congelado = j.congelados?.[pk.porGrupo ? jog : g()];
    if (congelado && congelado > ctx.agora()) { caixa.append(h('p', { class: 'aviso', 'data-tipo': 'erro' }, '🧊 Seu grupo foi congelado por outro grupo. Volta em ', ctx.contador(congelado), '.')); return caixa; }
    const it = pk.item, chave = S().etapaAtual + '#' + pk.pos;
    if (pend[chave] !== undefined && pend[chave] === pk.pos) { caixa.append(h('p', { class: 'aviso' }, 'Conferindo…')); return caixa; }
    if (pk.segundos > 0) caixa.append(ctx.agora() > pk.inicioItem + pk.segundos * 1000
      ? h('p', { class: 'aviso', 'data-tipo': 'alerta' }, '⏱ O tempo desta pergunta acabou: ela conta como erro. Responda para seguir.')
      : h('p', { class: 'sutil' }, 'Tempo: ', ctx.contador(pk.inicioItem + pk.segundos * 1000, 'relogio')));
    const pode = !porGrupo || souLider(g());
    caixa.append(h('div', { class: 'corrida-item' }, it.pergunta ? [h('small', { class: 'sutil' }, info.typeId === 'corrida' && pk.formato === 'corrente' ? (pk.pos === 0 ? 'Ponto de partida' : 'Aconteceu') : ''), h('p', { class: 'corrente-de' }, it.enunciado), h('h3', {}, it.pergunta)] : h('h3', {}, it.enunciado)));
    const enviar = dados => ctx.enviar(`${S().etapaAtual}__${jog}__t`, pk.proxima.t, { pos: pk.pos, ...dados }, g()).then(() => { pend[chave] = pk.pos; ctx.redesenhar(); }).catch(e => ctx.aviso(e.message, 'erro'));
    if (it.tipo === 'mc') {
      let alts = it.alternativas.filter(a => a.id !== pk.tirar);
      if (pk.embaralhado) alts = [...alts].reverse();
      const conf = local[chave];
      if (pk.confianca && conf) {
        caixa.append(h('p', {}, 'Sua resposta: ', h('strong', {}, it.alternativas.find(a => a.id === conf)?.texto)), h('p', {}, 'O quanto você tem certeza?'),
          h('div', { class: 'conf-botoes' }, [['certeza', 'Tenho certeza'], ['duvida', 'Estou em dúvida'], ['chute', 'Chutei']].map(([id, t]) => h('button', { class: 'btn', 'data-auto': 'conf', onclick: () => enviar({ alternativaId: conf, confianca: id }) }, t))),
          h('button', { class: 'btn discreto pequeno', onclick: () => { delete local[chave]; ctx.redesenhar(); } }, 'Trocar a resposta'));
      } else caixa.append(h('div', { class: 'corrida-alts' }, alts.map(a => h('button', { class: 'corrida-alt', disabled: !pode, 'data-auto': 'alt', onclick: () => { if (pk.confianca) { local[chave] = a.id; ctx.redesenhar(); } else enviar({ alternativaId: a.id }); } }, a.texto))));
    } else {
      const esc = local[chave] ||= {};
      caixa.append(h('div', { class: 'direcoes' }, it.variaveis.map(v => h('div', { class: 'direcao-linha' }, h('span', {}, v.nome),
        h('div', { class: 'direcao-botoes' }, ['sobe', 'desce', 'igual'].map(d => h('button', { class: 'direcao' + (esc[v.id] === d ? ' ativo' : ''), disabled: !pode, title: DIR_NOME[d], 'aria-label': `${v.nome}: ${DIR_NOME[d]}`, 'data-auto': 'dir', onclick: () => { esc[v.id] = d; ctx.redesenhar(); } }, DIR[d])))))));
      const ok = it.variaveis.every(v => esc[v.id]);
      caixa.append(h('button', { class: 'btn primario bloco', disabled: !pode || !ok, 'data-auto': 'enviar', onclick: () => enviar({ direcoes: { ...esc } }) }, ok ? 'Enviar' : 'Marque todas as variáveis'));
    }
    if ((pk.inventario || []).length && pode) caixa.append(h('div', { class: 'pu-lista' }, h('small', { class: 'sutil' }, 'Seus power-ups:'),
      pk.inventario.map((p, k) => h('button', { class: 'pu', 'data-auto': 'pu', title: POWER_UPS[p]?.efeito, onclick: () => ctx.enviar(`${S().etapaAtual}__${jog}__u`, pk.proxima.u, { usar: p }, g()).then(ctx.redesenhar).catch(e => ctx.aviso(e.message, 'erro')) },
        h('span', {}, POWER_UPS[p]?.icone || '⚡'), POWER_UPS[p]?.nome || p))));
    else if ((pk.powerUps || []).length) caixa.append(h('small', { class: 'sutil' }, `Acerte ${pk.sequenciaPU} seguidas para ganhar um power-up.`));
    return caixa;
  }
  const placar = pl => h('div', { class: 'quiz-placar' }, Object.entries(pl).sort((x, y) => y[1] - x[1]).map(([gr, n]) =>
    h('span', { class: 'chip', style: { '--cor': corDoGrupo(S().publico.grupos, gr) } }, iconeGrupo(S().publico.grupos, gr, 22), nomeGrupo(gr), h('strong', {}, ' ' + n))));

  // ---------- memória ----------
  function memoria(info, telao) {
    const j = S().jogo || {}, pk = telao ? (j.tipo === 'memoria' ? j : null) : P(g());
    ctx.explicar('mem-' + S().etapaAtual, info.titulo, telao ? ['O tabuleiro está no telão. Na vez do seu grupo, o líder escolhe duas cartas pelo celular.', 'Acertou, joga de novo. Errou, passa a vez.'] : ['Virem duas cartas: se formam par, ficam abertas.', 'Combinem antes: o tabuleiro é do grupo inteiro.']);
    if (pk === undefined) return ctx.carregando();
    const caixa = cartao(h('h2', {}, info.titulo), info.instrucao && info.instrucao !== info.titulo && h('p', {}, info.instrucao), pk?.enunciado && pk.enunciado !== info.instrucao && h('h3', {}, pk.enunciado));
    if (!pk || pk.etapaId !== S().etapaAtual) { caixa.append(ctx.carregando()); return caixa; }
    if (!pk.cartas) { caixa.append(ctx.carregando()); return caixa; }
    const minha = telao ? (pk.vez === g() && souLider(g())) : true;
    caixa.append(h('p', {}, h('strong', {}, `${pk.achados} de ${pk.total} pares`), telao ? '' : ` · ${pk.tentativas} jogada(s)`));
    if (telao) {
      caixa.append(placar(pk.placar || {}));
      if (pk.concluido) caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Todos os pares foram achados!'));
      else if (!minha) { caixa.append(h('p', { class: 'aviso' }, pk.vez === g() ? `É a vez do seu grupo! ${ctx.nomeDe(S(), S().representantes?.[g()])} escolhe as cartas.` : `${/^grupo\b/i.test(nomeGrupo(pk.vez)) ? 'Vez do ' : 'Vez do grupo '}${nomeGrupo(pk.vez)}. Acompanhe no telão.`)); return caixa; }
      else caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Sua vez! Escolha duas cartas. ', ctx.contador((pk.vezDesde || 0) + (pk.segundos || 30) * 1000)));
    } else if (pk.concluido) { caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, `Completo!${pk.posicao ? ' (' + pk.posicao + 'º)' : ''}`)); }
    const chave = S().etapaAtual + '#mem', sel = local[chave] ||= { cartas: [], vista: null };
    const marca = JSON.stringify([pk.ultima, pk.achados, telao ? pk.jogadas : pk.tentativas]);
    if (sel.vista !== marca) { sel.vista = marca; sel.cartas = []; sel.mostrarErradas = true; }
    const esperando = pend[chave] && pend[chave] === marca;
    const grade = h('div', { class: 'memoria', style: { '--n': Math.ceil(Math.sqrt(pk.cartas.length * 1.4)) } }, pk.cartas.map((c, i) => {
      const aberta = c.achada || (c.errada && sel.mostrarErradas) || sel.cartas.includes(i);
      const btn = h('button', { class: 'carta' + (aberta ? ' aberta' : '') + (c.achada ? ' achada' : '') + (c.errada && sel.mostrarErradas ? ' errada' : ''), disabled: !minha || c.achada || pk.concluido || esperando, 'data-auto': c.achada ? null : 'carta', 'aria-label': aberta ? (c.texto || 'carta') : 'Carta virada ' + (i + 1) },
        aberta ? (c.texto || '…') : h('span', { class: 'verso' }, i + 1));
      btn.onclick = () => {
        sel.mostrarErradas = false;
        if (sel.cartas.includes(i)) return;
        sel.cartas.push(i);
        if (sel.cartas.length === 2) {
          const [a, bb] = sel.cartas;
          const id = telao ? `${S().etapaAtual}__${g()}__r` : `${S().etapaAtual}__${uid()}__j`;
          ctx.enviar(id, telao ? pk.proxima : 1, { cartas: [a, bb] }, g()).then(() => { pend[chave] = marca; ctx.redesenhar(); }).catch(e => { sel.cartas = []; ctx.aviso(e.message, 'erro'); ctx.redesenhar(); });
        }
        ctx.redesenhar();
      };
      return btn;
    }));
    // a carta escolhida mostra o texto? só depois que quem conduz devolver (o texto não está no celular)
    caixa.append(grade, esperando ? h('p', { class: 'sutil' }, 'Conferindo…') : sel.cartas.length === 1 ? h('p', { class: 'sutil' }, 'Escolha a segunda carta.') : null);
    if (pk.ultima && !pk.ultima.acertou && sel.mostrarErradas) caixa.append(h('p', { class: 'sutil' }, `Não formam par${pk.ultima.quem && !telao ? ' (' + pk.ultima.quem + ')' : ''}. Memorizem!`));
    return caixa;
  }

  // ---------- palavras cruzadas ----------
  function cruzadas(info) {
    const dk = P(uid()), gpk = dk && P(dk.pacoteGrade);
    ctx.explicar('cruz-' + S().etapaAtual, info.titulo, ['Cada um tem algumas dicas. Resolva as suas e ajude os colegas.', 'Acentos não importam. A palavra certa aparece na grade de todos.']);
    if (dk === undefined) return ctx.carregando();
    const caixa = cartao(h('h2', {}, info.titulo), info.instrucao && info.instrucao !== info.titulo && h('p', {}, info.instrucao));
    if (!dk || dk.etapaId !== S().etapaAtual) { caixa.append(h('p', { class: 'aviso' }, 'Você entrou depois da distribuição das dicas. Ajude seu grupo!')); return caixa; }
    if (!gpk || gpk.etapaId !== S().etapaAtual) { caixa.append(ctx.carregando()); return caixa; }
    caixa.append(h('p', {}, h('strong', {}, `${gpk.acertos} de ${gpk.total} palavras`), gpk.conjunto === 'turma' ? ' · a grade é da turma inteira' : ''), gpk.concluido && h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Grade completa!'));
    caixa.append(gradeCruzadas(gpk.grade));
    const resolvida = i => gpk.palavras.find(p => p.i === i)?.resolvida;
    if (dk.ultimo) caixa.append(h('p', { class: 'aviso', 'data-tipo': dk.ultimo.certo ? 'ok' : 'erro' }, dk.ultimo.certo ? '✔ Certa!' : `✗ “${dk.ultimo.texto}” não é.`));
    const dir = d => d === 'h' ? '→' : '↓';
    caixa.append(h('h3', {}, 'Suas dicas'), dk.minhas.length ? h('div', { class: 'dicas' }, dk.minhas.map(m => {
      if (resolvida(m.i)) return h('div', { class: 'dica feita' }, h('strong', {}, `${m.numero} ${dir(m.dir)} `), m.dica, ' ✔');
      const r = ctx.rascunho('cz-' + S().etapaAtual + '-' + m.i);
      const inp = h('input', { type: 'text', maxlength: 20, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': `Resposta da dica ${m.numero}`, value: r.justificativa || '', placeholder: `${m.tamanho} letras`, 'data-auto': 'palavra', oninput: e => { r.justificativa = e.target.value; } });
      const btn = h('button', { class: 'btn primario pequeno', onclick: () => { const v = inp.value.trim(); if (!v) return; ctx.enviar(`${S().etapaAtual}__${uid()}__w`, dk.proxima, { palavra: m.i, texto: v.slice(0, 30) }, g()).then(() => { r.justificativa = ''; }).catch(e => ctx.aviso(e.message, 'erro')); } }, 'Enviar');
      return h('div', { class: 'dica' }, h('div', {}, h('strong', {}, `${m.numero} ${dir(m.dir)} `), m.dica, h('small', { class: 'sutil' }, ` (${m.tamanho})`)), h('div', { class: 'dica-resp' }, inp, btn));
    })) : h('p', { class: 'sutil' }, 'Você não tem dicas: ajude os colegas a pensar.'));
    const outras = gpk.palavras.filter(p => !dk.minhas.some(m => m.i === p.i));
    if (outras.length) caixa.append(h('details', {}, h('summary', {}, 'Quem tem as outras dicas'), h('ul', {}, outras.map(p => h('li', {}, `${p.numero} ${dir(p.dir)} (${p.tamanho}) — `, p.resolvida ? `resolvida por ${p.por}` : (p.com.join(', ') || '—'))))));
    return caixa;
  }
  function gradeCruzadas(gr) {
    const nums = {}; for (const x of gr.numeros || []) nums[x.r + ',' + x.c] = x.n;
    return h('div', { class: 'cruz-grade', style: { '--c': gr.colunas } }, gr.letras.flatMap((linha, r) => [...linha].map((ch, c) =>
      ch === '#' ? h('span', { class: 'cruz-vazio' }) : h('span', { class: 'cruz-cel' + (ch !== '.' ? ' cheia' : '') }, nums[r + ',' + c] && h('small', {}, nums[r + ',' + c]), ch !== '.' ? ch : ''))));
  }

  // ---------- quiz em equipe (TBL) ----------
  function equipe(info) {
    const pk = P(g());
    ctx.explicar('eq-' + S().etapaAtual, info.titulo, ['Primeiro cada um responde sozinho, sem conversar.', 'Depois o grupo debate e decide a resposta do grupo. A resposta do grupo vale mais!']);
    if (!g()) return h('div', { class: 'cartao' }, h('p', {}, 'Aguardando quem conduz incluir você em um grupo.'));
    if (pk === undefined) return ctx.carregando();
    const caixa = cartao(h('h2', {}, info.titulo), info.instrucao && info.instrucao !== info.titulo && h('p', {}, info.instrucao));
    if (!pk || pk.etapaId !== S().etapaAtual) { caixa.append(ctx.carregando()); return caixa; }
    caixa.append(h('p', { class: 'sutil' }, `Pergunta ${pk.q + 1} de ${pk.total} · grupo: ${pk.placar?.pontos ?? 0} pts`));
    if (pk.fase === 'espera') { caixa.append(h('p', { class: 'aviso' }, 'Aguardem: quem conduz vai abrir a pergunta.')); return caixa; }
    caixa.append(h('h3', {}, pk.pergunta.enunciado));
    const alts = ctx.ordemDaSala(pk.pergunta.alternativas, pk.pergunta.enunciado);
    const meuNome = S().nomes?.[uid()], chave = S().etapaAtual + '#eq' + pk.q;
    if (pk.fase === 'individual') {
      const ja = pk.respondidos.includes(meuNome) || pend[chave + 'i'];
      if (ja) caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Resposta individual enviada. Aguarde a fase do grupo.'), h('small', { class: 'sutil' }, `${pk.respondidos.length} de ${pk.membros} do grupo responderam.`));
      else caixa.append(h('p', { class: 'sutil' }, 'Responda sozinho, sem conversar.'), h('div', { class: 'corrida-alts' }, alts.map(a => h('button', { class: 'corrida-alt', 'data-auto': 'alt', onclick: () => ctx.enviar(`${S().etapaAtual}__${uid()}__t`, 1, { q: pk.q, alternativaId: a.id }, g()).then(() => { pend[chave + 'i'] = true; ctx.redesenhar(); }).catch(e => ctx.aviso(e.message, 'erro')) }, a.texto))));
      return caixa;
    }
    if (pk.individuais) {
      const tot = Object.values(pk.individuais).reduce((x, y) => x + y, 0) || 1;
      caixa.append(h('p', { class: 'sutil' }, 'Como o grupo respondeu sozinho:'), h('div', { class: 'dist' }, alts.map(a => h('div', { class: 'dist-linha' }, h('span', {}, a.texto), h('div', { class: 'dist-barra' }, h('i', { style: { width: Math.round(100 * (pk.individuais[a.id] || 0) / tot) + '%' } })), h('small', {}, pk.individuais[a.id] || 0)))));
    }
    if (pk.fase === 'grupo') {
      if (pk.doGrupo) { caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Resposta do grupo: ', h('strong', {}, String(pk.pergunta.alternativas.find(a => a.id === pk.doGrupo)?.texto || '').replace(/[.。]+$/, '')), '. Aguardem a revelação.')); return caixa; }
      if (pk.consenso === 'todos') {
        const meu = pk.votos?.[meuNome];
        caixa.append(h('p', {}, 'Debatam. A resposta do grupo vale quando todos votarem igual.'), h('div', { class: 'corrida-alts' }, alts.map(a => h('button', { class: 'corrida-alt' + (meu === a.id ? ' ativo' : ''), 'data-auto': 'alt', onclick: () => ctx.enviar(`${S().etapaAtual}__${uid()}__v`, 1, { q: pk.q, alternativaId: a.id }, g()).catch(e => ctx.aviso(e.message, 'erro')) }, a.texto))),
          pk.votos && h('small', { class: 'sutil' }, 'Votos: ' + Object.entries(pk.votos).map(([n, v]) => `${n} → ${pk.pergunta.alternativas.find(a => a.id === v)?.texto?.slice(0, 18)}`).join(' · ')));
      } else if (souLider(g())) {
        const r = ctx.rascunho('eqg-' + chave);
        caixa.append(h('p', {}, 'Debatam e marque a resposta do grupo.'), ctx.listaOpcoes(alts, r, true, 'eqg' + chave, null));
        const msg = h('p', { class: 'aviso', hidden: true });
        caixa.append(ctx.botaoConfirmar('Enviar a resposta do grupo', async () => { if (!r.escolha) throw new Error('Escolham uma alternativa.'); await ctx.enviar(`${S().etapaAtual}__${g()}__g`, pk.proximaG, { q: pk.q, alternativaId: r.escolha }, g()); }, msg), msg);
      } else caixa.append(h('p', { class: 'sutil' }, `Debatam. ${ctx.nomeDe(S(), S().representantes?.[g()])} envia a resposta do grupo.`));
      return caixa;
    }
    // revelada
    const certo = pk.doGrupo && pk.doGrupo === pk.certaId;
    caixa.append(h('p', { class: 'aviso', 'data-tipo': certo ? 'ok' : 'erro' }, pk.doGrupo ? (certo ? '✔ O grupo acertou!' : '✗ O grupo errou.') : 'O grupo não respondeu.'),
      h('p', {}, h('strong', {}, 'Resposta: '), pk.revelacao?.texto), pk.revelacao?.explicacao && h('p', { class: 'sutil' }, pk.revelacao.explicacao));
    return caixa;
  }

  // ---------- tomada de decisão ----------
  function ramos(info) {
    const pk = P(g());
    ctx.explicar('ram-' + S().etapaAtual, info.titulo, ['Cada escolha do grupo leva a um cenário diferente.', 'Discutam as consequências antes: o líder confirma a escolha.']);
    if (!g()) return h('div', { class: 'cartao' }, h('p', {}, 'Aguardando quem conduz incluir você em um grupo.'));
    if (pk === undefined) return ctx.carregando();
    const caixa = cartao(h('h2', {}, info.titulo), info.instrucao && info.instrucao !== info.titulo && h('p', {}, info.instrucao));
    if (!pk || pk.etapaId !== S().etapaAtual || !pk.cenario) { caixa.append(ctx.carregando()); return caixa; }
    if (pk.escolhaAnterior) caixa.append(h('p', { class: 'sutil' }, 'Vocês escolheram: ', h('strong', {}, pk.escolhaAnterior)), pk.feedback && h('p', { class: 'aviso' }, pk.feedback));
    caixa.append(h('div', { class: 'cenario' + (pk.final ? ' final ' + pk.desfecho : '') }, h('p', {}, pk.cenario.texto)));
    if (pk.final) { caixa.append(h('p', { class: 'aviso', 'data-tipo': pk.desfecho === 'bom' ? 'ok' : pk.desfecho === 'ruim' ? 'erro' : 'alerta' }, { bom: 'Final bom.', neutro: 'Final neutro.', ruim: 'Final ruim.' }[pk.desfecho] + ' Aguardem a discussão.')); return caixa; }
    if (!souLider(g())) { caixa.append(h('p', { class: 'sutil' }, 'O que vocês fariam? ', `${ctx.nomeDe(S(), S().representantes?.[g()])} confirma a escolha do grupo.`), ctx.listaOpcoes(pk.cenario.opcoes, {}, false, 'rv')); return caixa; }
    const r = ctx.rascunho('ram-' + S().etapaAtual + pk.cenario.id), msg = h('p', { class: 'aviso', hidden: true });
    caixa.append(ctx.listaOpcoes(pk.cenario.opcoes, r, true, 'ram' + pk.cenario.id),
      ctx.botaoConfirmar('Confirmar a escolha do grupo', async () => { if (!r.escolha) throw new Error('Escolham uma opção.'); await ctx.enviar(`${S().etapaAtual}__${g()}__d`, pk.proxima, { cenario: pk.cenario.id, opcao: r.escolha }, g()); }, msg), msg);
    return caixa;
  }

  // ---------- observar e descrever ----------
  function observar(info) {
    const pk = P(g());
    if (!g()) return h('div', { class: 'cartao' }, h('p', {}, 'Aguardando quem conduz incluir você em um grupo.'));
    const caixa = cartao(h('h2', {}, info.titulo), info.instrucao && info.instrucao !== info.titulo && h('p', {}, info.instrucao), midia(info));
    if (pk === undefined || !pk || pk.etapaId !== S().etapaAtual) { caixa.append(ctx.carregando()); return caixa; }
    if (pk.enunciado !== info.instrucao) caixa.append(h('h3', {}, pk.enunciado));
    if (!souLider(g())) { caixa.append(h('p', { class: 'sutil' }, `Observem juntos. ${ctx.nomeDe(S(), S().representantes?.[g()])} escreve pelo grupo.`), pk.minha && h('p', { class: 'aviso' }, 'O grupo escreveu: ', pk.minha)); return caixa; }
    const r = ctx.rascunho('obs-' + S().etapaAtual);
    if (!r.justificativa && pk.minha) r.justificativa = pk.minha;
    const ta = h('textarea', { maxlength: 400, rows: 4, 'data-auto': 'texto', oninput: e => { r.justificativa = e.target.value; } }, r.justificativa || '');
    caixa.append(h('label', {}, 'O que o grupo observa (vai para o telão)'), ta,
      h('button', { class: 'btn primario bloco', onclick: () => { const v = ta.value.trim(); if (v.length < 5) return ctx.aviso('Escrevam um pouco mais.', 'erro'); ctx.enviar(`${S().etapaAtual}__${g()}__o`, pk.proxima, { texto: v.slice(0, 400) }, g()).then(() => ctx.aviso('Enviado! Vocês podem melhorar e enviar de novo.', 'ok')).catch(e => ctx.aviso(e.message, 'erro')); } }, pk.minha ? 'Enviar de novo (substitui)' : 'Enviar'));
    return caixa;
  }

  // ---------- sequência (Genius) ----------
  // O jogo roda inteiro neste celular (luz, som, tempo); o elemento fica vivo entre os redesenhos da tela,
  // para a sequência não ser interrompida quando chega um pacote novo. Ao fim de cada partida, manda só o resultado.
  let audio = null, mudo = false, jogoSeq = null;
  const CORES_SEQ = ['#2dd4bf', '#fbbf24', '#fb7185', '#38bdf8', '#a3e635', '#a78bfa'];
  function somPronto() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';   // iPhone: toca mesmo com a chave do silencioso
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch { audio = null; }
  }
  function tom(freq, ms, forma = 'triangle', volume = 0.32) {
    if (mudo || !audio) return;
    try {
      const t0 = audio.currentTime, o = audio.createOscillator(), gn = audio.createGain();
      o.type = forma; o.frequency.value = freq;
      gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(volume, t0 + 0.008);
      gn.gain.setValueAtTime(volume, t0 + ms / 1000); gn.gain.linearRampToValueAtTime(0, t0 + ms / 1000 + 0.04);
      o.connect(gn).connect(audio.destination); o.start(t0); o.stop(t0 + ms / 1000 + 0.06);
    } catch {}
  }
  function criarJogoSeq(etapaId) {
    const G = { etapa: etapaId, pk: null, estado: 'pronto', painel: [], seq: [], feitos: 0, nivel: 0, timers: new Set(), limite: null, feitasLocal: 0, ultimoRes: null, enviando: false, falhou: null };
    const visorNivel = h('strong', {}, '00'), visorRec = h('strong', {}, '00'), visorMsg = h('span', { class: 'seq-msg', 'aria-live': 'polite' }, 'Toque em Iniciar');
    const painel = h('div', { class: 'seq-painel' }), fim = h('div', { class: 'seq-fim' }), acoes = h('div', { class: 'seq-acoes' });
    const btnSom = h('button', { class: 'seq-som', type: 'button', 'aria-label': 'Som ligado', onclick: () => { mudo = !mudo; btnSom.textContent = mudo ? '🔇' : '🔊'; btnSom.setAttribute('aria-label', mudo ? 'Som desligado' : 'Som ligado'); } }, mudo ? '🔇' : '🔊');
    G.el = h('div', { class: 'seq-jogo' },
      h('div', { class: 'seq-visor' }, h('div', {}, h('small', {}, 'NÍVEL'), visorNivel), h('div', {}, h('small', {}, 'RECORDE'), visorRec), visorMsg, btnSom),
      painel, acoes, fim);
    const depois = (ms, fn) => { const id = setTimeout(() => { G.timers.delete(id); if (!vivo()) return parar(); fn(); }, ms); G.timers.add(id); };
    const vivo = () => S()?.fase === 'etapa' && S()?.etapaAtual === G.etapa;
    const parar = () => { for (const id of G.timers) clearTimeout(id); G.timers.clear(); clearTimeout(G.limite); };
    G.parar = parar;
    const dois = n => String(n).padStart(2, '0');
    const msg = t => { visorMsg.textContent = t; };
    const vel = () => VELOCIDADES[G.pk?.velocidade] || VELOCIDADES.classica;
    const freqs = () => frequencias(G.painel.length);
    function acender(i, ms) {
      const b = painel.children[i]; if (!b) return;
      b.classList.add('aceso'); tom(freqs()[i], ms);
      depois(ms, () => b.classList.remove('aceso'));
    }
    function montarPainel() {
      painel.replaceChildren(...G.painel.map((t, i) => {
        const b = h('button', { type: 'button', class: 'seq-btn', style: { '--cor': CORES_SEQ[i] }, 'aria-label': t.termo }, h('span', {}, t.termo));
        b.addEventListener('pointerdown', ev => { ev.preventDefault(); tocar(i); });
        b.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); tocar(i); } });
        return b;
      }));
      painel.dataset.n = G.painel.length;
    }
    function botoesAcao() {
      const pk = G.pk, restam = pk.partidas ? Math.max(0, pk.partidas - Math.max(pk.feitas, G.feitasLocal)) : Infinity;
      const pode = pk.podeJogar !== false && restam > 0;
      acoes.replaceChildren();
      if (G.estado === 'mostrando' || G.estado === 'vez') return;
      if (G.falhou) acoes.append(h('button', { class: 'btn primario bloco', onclick: () => enviarRes(G.falhou) }, 'Tentar enviar de novo'));
      else if (G.enviando) acoes.append(h('p', { class: 'sutil' }, 'Enviando o resultado…'));
      else if (pode) acoes.append(h('button', { class: 'btn primario bloco seq-iniciar', 'data-auto': 'seq-iniciar', onclick: iniciar }, G.estado === 'fim' ? 'Nova partida (novas palavras)' : 'Iniciar'));
      else acoes.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Suas partidas acabaram. Acompanhe o ranking no telão!'));
      if (pode && pk.partidas) acoes.append(h('small', { class: 'sutil' }, restam === 1 ? 'Última partida.' : `${restam} partida(s) restante(s).`));
    }
    function iniciar() {
      somPronto(); parar();
      G.painel = sortearPainel(G.pk.termos, G.pk.botoes); G.seq = []; G.nivel = 0; G.feitos = 0; G.ultimoRes = null;
      fim.replaceChildren(); montarPainel(); visorNivel.textContent = '00';
      G.estado = 'mostrando'; botoesAcao(); msg('Observe…');
      depois(900, rodada);
    }
    function rodada() {
      G.seq.push(proximoBotao(G.painel.length));
      G.estado = 'mostrando'; G.el.classList.remove('sua-vez'); msg('Observe…');
      const ms = duracaoTom(G.seq.length, G.pk.velocidade), pausa = vel().pausa;
      G.seq.forEach((b, k) => depois(k * (ms + pausa), () => acender(b, ms)));
      depois(G.seq.length * (ms + pausa) + 40, suaVez);
    }
    function suaVez() { G.estado = 'vez'; G.feitos = 0; G.el.classList.add('sua-vez'); msg('Sua vez!'); armar(); if (Date.now() < (G.autoAte || 0)) autoJogar(); }
    function armar() { clearTimeout(G.limite); G.limite = setTimeout(() => { if (vivo() && G.estado === 'vez') errou(null); }, vel().limite); }
    function tocar(i) {
      if (G.estado !== 'vez') return;
      const r = conferirToque(G.seq, G.feitos, i);
      if (r === 'erro') return errou(i);
      acender(i, 220);
      if (r === 'certo') { G.feitos++; armar(); return; }
      clearTimeout(G.limite);
      G.nivel = G.seq.length; visorNivel.textContent = dois(G.nivel);
      if (G.nivel > (G.pk.recorde || 0)) visorRec.textContent = dois(G.nivel);
      if (G.nivel >= MAX_PASSOS) return errou(undefined);
      G.estado = 'mostrando'; G.el.classList.remove('sua-vez'); msg('Isso! Mais um…');
      depois(800, rodada);
    }
    function errou(tocado) {
      clearTimeout(G.limite);
      const esperado = G.seq[G.feitos];
      G.estado = 'fim'; G.el.classList.remove('sua-vez');
      msg(tocado === undefined ? 'Sequência máxima!' : tocado === null ? 'Tempo esgotado!' : 'Errou!');
      if (tocado !== undefined) {
        tom(TOM_ERRO, 1200, 'square', 0.22);
        if (tocado !== null) painel.children[tocado]?.classList.add('errado');
        const certo = painel.children[esperado];
        [0, 1, 2].forEach(k => { depois(k * 360, () => certo?.classList.add('aceso')); depois(k * 360 + 200, () => certo?.classList.remove('aceso')); });
        depois(1400, () => painel.querySelector('.errado')?.classList.remove('errado'));
      }
      G.feitasLocal = Math.max(G.feitasLocal, G.pk.feitas) + 1;
      const res = { partida: G.feitasLocal, pontos: G.nivel, termos: G.painel.map(t => t.id), erro: tocado === undefined ? null : { esperado: G.painel[esperado]?.id || null, tocado: tocado === null ? null : G.painel[tocado]?.id || null } };
      mostrarFim(res, esperado, tocado);
      enviarRes(res);
    }
    function mostrarFim(res, esperado, tocado) {
      const rec = res.pontos > (G.pk.recorde || 0);
      const defs = G.painel.filter(t => t.definicao);
      fim.replaceChildren(...[
        h('p', { class: 'seq-resultado' }, h('strong', {}, res.pontos), res.pontos === 1 ? ' passo' : ' passos', rec && res.pontos > 0 ? h('span', { class: 'seq-recorde' }, '★ novo recorde') : ''),
        tocado !== undefined && G.painel[esperado] && h('p', { class: 'sutil' }, tocado === null ? 'O tempo acabou. ' : `Você tocou ${G.painel[tocado].termo}. `, 'O certo era ', h('strong', {}, G.painel[esperado].termo), '.'),
        defs.length ? h('details', { open: true }, h('summary', {}, 'Os termos desta partida'), h('dl', { class: 'seq-defs' }, defs.flatMap(t => [h('dt', {}, t.termo), h('dd', {}, t.definicao)]))) : null].filter(Boolean));
    }
    async function enviarRes(res) {
      G.enviando = true; G.falhou = null; botoesAcao();
      try { await ctx.enviar(`${G.etapa}__${uid()}__s`, Math.max(G.pk.proxima || 1, res.partida), res, g()); }
      catch (e) { G.falhou = res; ctx.aviso('Não foi possível enviar o resultado: ' + e.message, 'erro'); }
      G.enviando = false; botoesAcao();
    }
    G.atualizar = pk => {
      G.pk = pk;
      visorRec.textContent = dois(Math.max(pk.recorde || 0, G.estado === 'pronto' ? 0 : G.nivel));
      if (!G.painel.length) { G.painel = sortearPainel(pk.termos, pk.botoes); montarPainel(); }
      if (G.estado !== 'mostrando' && G.estado !== 'vez') botoesAcao();
    };
    /** Piloto automático do simulador: joga como uma pessoa (acerta quase sempre, às vezes erra). */
    function autoJogar() {
      if (G.autoAndando) return;
      G.autoAndando = true;
      const passo = () => {
        if (G.estado !== 'vez') { G.autoAndando = false; return; }
        const certo = G.seq[G.feitos], i = Math.random() < 0.93 ? certo : Math.floor(Math.random() * G.painel.length);
        tocar(i); depois(380, passo);
      };
      depois(500, passo);
    }
    G.el._auto = () => {
      G.autoAte = Date.now() + 15000;                  // enquanto o piloto estiver ligado, o próprio jogo responde na vez
      if (G.estado === 'pronto' || G.estado === 'fim') { const b = acoes.querySelector('[data-auto=seq-iniciar]'); if (b && !G.enviando) b.click(); return; }
      if (G.estado === 'vez') autoJogar();
    };
    return G;
  }
  function sequencia(info) {
    const pk = P(uid());
    ctx.explicar('seq-' + S().etapaAtual, info.titulo, ['Observe a ordem em que os termos acendem e tocam. Depois, repita tocando nos termos.', 'A cada acerto a sequência cresce mais um. Vale o seu recorde, que soma para o grupo. Ligue o som!']);
    if (pk === undefined) return ctx.carregando();
    const caixa = cartao(h('h2', {}, info.titulo), info.instrucao && info.instrucao !== info.titulo && h('p', {}, info.instrucao));
    if (!pk || pk.etapaId !== S().etapaAtual) { caixa.append(h('p', { class: 'aviso' }, 'Preparando o seu painel…')); return caixa; }
    if (!jogoSeq || jogoSeq.etapa !== S().etapaAtual) { jogoSeq?.parar(); jogoSeq = criarJogoSeq(S().etapaAtual); }
    jogoSeq.atualizar(pk);
    caixa.append(jogoSeq.el,
      h('p', { class: 'sutil seq-rodape' }, pk.feitas ? `Seu recorde: ${pk.recorde}${pk.posicao ? ` · ${pk.posicao}º de ${pk.jogadores} na turma` : ''} · melhor do seu grupo: ${pk.recordeGrupo}` : 'Cada partida sorteia novos termos do banco.'));
    return caixa;
  }

  // ---------- escala padronizada ----------
  // As respostas item a item ficam só neste celular (também na sessão, para sobreviver a recarregar a página);
  // para quem conduz vai só a média de cada fator.
  const respostasEscala = {};
  const guardaEscala = etapa => { try { return JSON.parse(sessionStorage.getItem('mosaico-escala:' + etapa) || 'null') || {}; } catch { return {}; } };
  function perfil(ins, escores) {
    return h('div', { class: 'perfil' },
      h('p', { class: 'sutil' }, 'Seu perfil (de 1 a 5). Só você vê. Não é bom nem ruim: é um retrato de como você se descreveu hoje.'),
      ins.fatores.map(f => { const v = escores?.[f.id];
        return h('div', { class: 'perfil-fator' },
          h('div', { class: 'perfil-linha' }, h('strong', {}, f.nome), h('span', {}, v === null || v === undefined ? '—' : String(v).replace('.', ','))),
          h('div', { class: 'perfil-barra', role: 'img', 'aria-label': `${f.nome}: ${v ?? 'sem escore'} de 5` }, h('i', { style: { width: v ? `${(v - 1) * 25}%` : '0' } })),
          h('small', { class: 'sutil' }, v >= 3.5 ? `Mais alto: ${f.alto}.` : v <= 2.5 ? `Mais baixo: ${f.baixo}.` : `Na média: entre “${f.baixo}” e “${f.alto}”.`)); }),
      h('p', { class: 'sutil' }, ins.traducao));
  }
  function escala(info) {
    const etapa = S().etapaAtual, ins = INSTRUMENTOS[info.formato] || INSTRUMENTOS['mini-ipip6'], pk = P(uid());
    ctx.explicar('esc-' + etapa, info.titulo, [ins.instrucao]);
    const caixa = cartao(h('h2', {}, info.titulo), info.instrucao && info.instrucao !== info.titulo && h('p', {}, info.instrucao));
    const meu = pk && pk.etapaId === etapa ? pk.escores : local['esc-' + etapa];
    if (meu) { caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Respostas enviadas. Obrigado!'), perfil(ins, meu)); return caixa; }
    const r = respostasEscala[etapa] ||= guardaEscala(etapa);
    const contador = h('p', { class: 'sutil escala-contador' });
    const enviar = h('button', { class: 'btn primario bloco', 'data-auto': 'escala-enviar' }, 'Enviar e ver meu perfil');
    const atualizar = () => { const n = ins.itens.filter(i => r[i.id]).length; contador.textContent = `${n} de ${ins.itens.length} respondidas`; enviar.disabled = n < ins.itens.length; };
    enviar.onclick = async () => {
      const escores = pontuar(ins.id, r);
      enviar.disabled = true;
      try { await ctx.enviar(`${etapa}__${uid()}__r`, 1, { escores }, g()); local['esc-' + etapa] = escores; ctx.redesenhar(); }
      catch (e) { enviar.disabled = false; ctx.aviso('Não foi possível enviar: ' + e.message, 'erro'); }
    };
    caixa.append(
      h('p', { class: 'sutil' }, ins.instrucao),
      h('div', { class: 'escala-legenda' }, OPCOES_RESPOSTA.map(o => h('span', {}, h('strong', {}, o.valor), ' ', o.texto))),
      h('ol', { class: 'escala-itens' }, ins.itens.map(it => h('li', { class: 'escala-item', 'data-auto': 'likert-linha' },
        h('p', {}, it.texto),
        h('div', { class: 'likert', role: 'radiogroup', 'aria-label': it.texto }, OPCOES_RESPOSTA.map(o => {
          const b = h('button', { type: 'button', class: 'likert-op' + (r[it.id] === o.valor ? ' ativo' : ''), role: 'radio', 'aria-checked': String(r[it.id] === o.valor), 'aria-label': o.texto, title: o.texto }, String(o.valor));
          b.onclick = () => {
            r[it.id] = o.valor;
            try { sessionStorage.setItem('mosaico-escala:' + etapa, JSON.stringify(r)); } catch {}
            for (const x of b.parentElement.children) { x.classList.toggle('ativo', x === b); x.setAttribute('aria-checked', String(x === b)); }
            atualizar();
          };
          return b;
        }))))),
      contador, enviar);
    atualizar();
    return caixa;
  }

  // ---------- jogo econômico ----------
  const rascunhoJogo = {};   // fora de `local`: mexer no controle não deve redesenhar a tela
  function jogo(info) {
    const etapa = S().etapaAtual, j = S().jogo || {}, J = JOGOS[info.formato] || JOGOS.ditador, pk = P(uid());
    const D = j.dotacao ?? 10;
    ctx.explicar('jogo-' + etapa, J.nome, [J.resumo, 'Você joga com colegas sorteados, sem saber quem são, e ninguém fica sabendo da sua escolha. Os pontos não valem nota.']);
    const caixa = cartao(h('h2', {}, info.titulo || J.nome), h('p', {}, J.resumo), info.instrucao && h('p', { class: 'sutil' }, info.instrucao));
    const minha = pk && pk.etapaId === etapa ? pk.minha : local['jogo-' + etapa];
    if (j.revelado && pk?.resultado) {
      caixa.append(h('div', { class: 'jogo-ganho' }, h('small', {}, 'Seus pontos'), h('strong', {}, String(pk.resultado.ganho).replace('.', ','))),
        h('ul', {}, pk.resultado.linhas.map(l => h('li', {}, l))), h('p', { class: 'sutil' }, 'Veja no telão o que a turma decidiu.'));
      return caixa;
    }
    if (j.revelado) { caixa.append(h('p', { class: 'aviso' }, 'Os resultados já foram revelados, e sua decisão não entrou no cálculo. Acompanhe pelo telão.')); return caixa; }
    if (minha) { caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Decisão enviada. Aguarde quem conduz revelar os resultados.'), h('p', { class: 'sutil' }, descreverDecisao(info.formato, minha, j))); return caixa; }
    const d = rascunhoJogo[etapa] ||= {};
    const deslizador = (chave, rot, max, passo, sufixo, inicial) => {
      if (d[chave] === undefined) d[chave] = inicial;
      const valor = h('output', {}, d[chave] + sufixo);
      const input = h('input', { type: 'range', min: 0, max, step: passo, value: d[chave], 'data-auto': 'jogo-valor', 'aria-label': rot,
        oninput: ev => { d[chave] = Number(ev.target.value); valor.textContent = d[chave] + sufixo; } });
      return h('label', { class: 'jogo-campo' }, h('span', {}, rot, ' ', valor), input);
    };
    const campos = {
      ditador: () => [deslizador('dar', `De ${D} pontos, quantos você dá ao colega?`, D, 1, '', Math.round(D / 2))],
      ultimato: () => [deslizador('oferta', `Quanto você oferece (de ${D})?`, D, 1, '', Math.round(D / 2)), deslizador('minimo', 'Quando for a sua vez de receber, qual é a menor oferta que você aceita?', D, 1, '', Math.round(D / 4))],
      confianca: () => [deslizador('enviar', `Quantos dos seus ${D} pontos você envia? (Chegam multiplicados por ${j.multiplicador ?? 3}.)`, D, 1, '', Math.round(D / 2)), deslizador('devolver', 'Quando você receber pontos, que parte devolve?', 100, 10, '%', 50)],
      bens_publicos: () => [deslizador('contribuir', `Quantos dos seus ${D} pontos você põe no fundo do grupo? (O fundo é multiplicado por ${j.fator ?? 2} e dividido entre todos.)`, D, 1, '', Math.round(D / 2))]
    }[info.formato] || (() => []);
    const enviar = h('button', { class: 'btn primario bloco', 'data-auto': 'jogo-enviar' }, 'Confirmar decisão');
    enviar.onclick = async () => {
      enviar.disabled = true;
      try { await ctx.enviar(`${etapa}__${uid()}__d`, 1, { ...d }, g()); local['jogo-' + etapa] = { ...d }; ctx.redesenhar(); }
      catch (e) { enviar.disabled = false; ctx.aviso('Não foi possível enviar: ' + e.message, 'erro'); }
    };
    caixa.append(h('div', { class: 'jogo-campos' }, campos()), enviar, h('p', { class: 'sutil' }, 'Depois de confirmar, não dá para mudar.'));
    return caixa;
  }
  function descreverDecisao(formato, d, j) {
    if (formato === 'ditador') return `Você vai dar ${d.dar} ponto(s).`;
    if (formato === 'ultimato') return `Você oferece ${d.oferta} e aceita a partir de ${d.minimo}.`;
    if (formato === 'confianca') return `Você envia ${d.enviar} e devolve ${d.devolver}% do que receber.`;
    if (formato === 'bens_publicos') return `Você põe ${d.contribuir} no fundo do grupo.`;
    return '';
  }

  return {
    tem: info => !!tipo(info),
    pacotes(info) {
      const t = tipo(info), extra = temMidia(info) ? ['revelacao'] : [];
      if (t === 'corrida') return [info.organizacao === 'individual' ? uid() : g(), ...extra].filter(Boolean);
      if (t === 'memoria' || t === 'equipe' || t === 'ramos' || t === 'observar') return [g(), ...extra].filter(Boolean);
      if (t === 'cruzadas') return [uid(), P(uid())?.pacoteGrade || g()].filter(Boolean);
      if (t === 'sequencia' || t === 'escala' || t === 'jogo') return [uid()].filter(Boolean);
      return extra;
    },
    chave(info) {
      const t = tipo(info), ids = this.pacotes(info);
      return JSON.stringify([ids.map(i => P(i) === undefined ? 'c' : P(i)), t === 'memoriaTelao' || t === 'corrida' || t === 'equipe' ? S().jogo : t === 'jogo' ? S().jogo?.revelado : null, Object.keys(local).length, JSON.stringify(local), Object.keys(pend)]);
    },
    tarefa(info) {
      const t = tipo(info);
      if (t === 'corrida') return corrida(info);
      if (t === 'memoria') return memoria(info, false);
      if (t === 'memoriaTelao') return memoria(info, true);
      if (t === 'cruzadas') return cruzadas(info);
      if (t === 'sequencia') return sequencia(info);
      if (t === 'equipe') return equipe(info);
      if (t === 'ramos') return ramos(info);
      if (t === 'observar') return observar(info);
      if (t === 'escala') return escala(info);
      if (t === 'jogo') return jogo(info);
    },
    midia,
    /** Piloto automático (simulador): uma ação de cada vez, como uma pessoa. */
    auto(raiz) {
      const um = l => l[Math.floor(Math.random() * l.length)];
      const pega = sel => [...raiz.querySelectorAll(sel)].filter(x => !x.disabled);
      const seq = raiz.querySelector('.seq-jogo'); if (seq?._auto) return seq._auto();
      const linhas = [...raiz.querySelectorAll('[data-auto=likert-linha]')];
      if (linhas.length) { for (const l of linhas) if (!l.querySelector('.ativo')) um([...l.querySelectorAll('button')]).click(); const env = pega('[data-auto=escala-enviar]'); if (env.length) env[0].click(); return; }
      const jv = pega('[data-auto=jogo-valor]'); if (jv.length) { for (const i of jv) { i.value = Math.round(Math.random() * Number(i.max) / Number(i.step || 1)) * Number(i.step || 1); i.dispatchEvent(new Event('input')); } const env = pega('[data-auto=jogo-enviar]'); if (env.length) env[0].click(); return; }
      const pu = pega('[data-auto=pu]'); if (pu.length && Math.random() < 0.3) return um(pu).click();
      const conf = pega('[data-auto=conf]'); if (conf.length) return um(conf).click();
      const alts = pega('[data-auto=alt]'); if (alts.length) return um(alts).click();
      const dirs = pega('.direcao-linha'); if (dirs.length) { for (const l of dirs) { const bs = [...l.querySelectorAll('button')].filter(x => !x.disabled); if (bs.length && !l.querySelector('.ativo')) { um(bs).click(); return; } } const env = pega('[data-auto=enviar]'); if (env.length) return env[0].click(); }
      const cartas = pega('[data-auto=carta]'); if (cartas.length) { um(cartas).click(); setTimeout(() => { const c2 = pega('[data-auto=carta]').filter(x => !x.classList.contains('aberta')); if (c2.length) um(c2).click(); }, 300); return; }
      const pal = pega('[data-auto=palavra]'); if (pal.length) { const i = um(pal); i.value = 'chute'; i.dispatchEvent(new Event('input')); i.parentElement.querySelector('button')?.click(); return; }
      const tx = pega('[data-auto=texto]'); if (tx.length && !tx[0].value) { tx[0].value = 'Observação do participante simulado.'; tx[0].dispatchEvent(new Event('input')); tx[0].nextElementSibling?.click(); }
    }
  };
}
