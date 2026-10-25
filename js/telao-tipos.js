/* MOSAICO · Telão dos tipos novos (junto com telao.js). Só informação pública: placar, andamento,
   o tabuleiro da memória entre grupos e, depois de encerrar, as respostas e os caminhos. */

import { h, corDoGrupo, iconeGrupo } from './ui.js';
import { POWER_UPS } from './core/corrida.js';
import { INSTRUMENTOS } from './core/escalas.js';
import { JOGOS } from './core/jogos.js';

export function criarTelao(ctx) {
  const S = () => ctx.sala(), gs = () => S().publico.grupos, nome = g => gs().find(x => x.id === g)?.nome || g;
  const tipo = i => {
    if (!i) return null;
    if (i.typeId === 'pares' && i.formato === 'memoria') return i.organizacao === 'representantes' ? 'memoriaTelao' : 'memoria';
    if (i.typeId === 'corrida') return 'corrida';
    if (i.typeId === 'cruzadas') return 'cruzadas';
    if (i.typeId === 'sequencia') return 'sequencia';
    if (i.typeId === 'escala_padronizada') return 'escala';
    if (i.typeId === 'jogo_economico') return 'jogo';
    if (i.typeId === 'quiz_pensar') return i.formato === 'equipe' ? 'equipe' : i.formato === 'ramificado' ? 'ramos' : 'corrida';
    if (i.typeId === 'analise_imagem') return i.formato === 'perguntas' ? 'corrida' : i.formato === 'observar' ? 'observar' : null;
    return null;
  };
  const chipG = (g, extra) => h('span', { class: 'chip', style: { '--cor': corDoGrupo(gs(), g) } }, iconeGrupo(gs(), g, 40), nome(g), extra);
  const frase = t => h('p', { style: { fontSize: '1.3em', fontWeight: 700, margin: '0 0 .5em', textAlign: 'center' } }, t);
  const barras = (por, valor, total, rot) => h('div', { class: 'cadeados' }, Object.entries(por).map(([g, x]) =>
    h('div', { class: 'cadeado-telao' + (x.concluido || x.final ? ' aberto' : ''), style: { '--cor': g === 'turma' ? '#ff8a3d' : corDoGrupo(gs(), g) } },
      g === 'turma' ? h('div', { class: 'titulo-grupo' }, 'Turma') : h('div', { class: 'titulo-grupo' }, iconeGrupo(gs(), g, 40), nome(g)),
      h('div', { class: 'cadeado-barra' }, h('span', { style: { width: Math.round(100 * valor(x) / Math.max(1, total(x))) + '%' } })), h('small', {}, rot(x)))));
  const placar = (pl, unid = '') => h('div', { class: 'quiz-placar telao-placar' }, Object.entries(pl || {}).sort((x, y) => y[1] - x[1]).map(([g, n]) => chipG(g, h('strong', {}, ` ${n}${unid}`))));

  /** Mídia da análise de imagem (foto, gráfico ou modelo 3D), vinda do pacote público "revelacao". */
  function midia() {
    const m = ctx.revelacao();
    if (!m || m.tipo !== 'midia' || m.etapaId !== S().etapaAtual && m.etapaId !== S().revelacao) return null;
    if (m.midia === 'modelo3d') {
      if (!customElements.get('model-viewer')) { const s = document.createElement('script'); s.type = 'module'; s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js'; document.head.append(s); }
      const mv = document.createElement('model-viewer');
      mv.setAttribute('src', m.modelo?.url || m.modelo?.dados || ''); mv.setAttribute('auto-rotate', ''); mv.setAttribute('camera-controls', ''); mv.className = 'telao-3d';
      return mv;
    }
    return h('img', { class: 'telao-midia', src: m.imagem?.dados, alt: m.enunciado || '' });
  }

  function gradeCruz(gr) {
    const nums = {}; for (const x of gr.numeros || []) nums[x.r + ',' + x.c] = x.n;
    return h('div', { class: 'cruz-grade telao-cruz', style: { '--c': gr.colunas } }, gr.letras.flatMap((l, r) => [...l].map((ch, c) =>
      ch === '#' ? h('span', { class: 'cruz-vazio' }) : h('span', { class: 'cruz-cel' + (ch !== '.' ? ' cheia' : '') }, nums[r + ',' + c] && h('small', {}, nums[r + ',' + c]), ch !== '.' ? ch : ''))));
  }
  function tabuleiro(j) {
    return h('div', { class: 'memoria telao-memoria', style: { '--n': Math.ceil(Math.sqrt(j.cartas.length * 1.6)) } }, j.cartas.map((c, i) => {
      const aberta = c.aberta;
      return h('div', { class: 'carta' + (aberta ? ' aberta' : '') + (c.achada ? ' achada' : '') + (c.errada ? ' errada' : ''), style: c.achada && c.por ? { '--cor': corDoGrupo(gs(), c.por) } : null }, aberta ? c.texto : h('span', { class: 'verso' }, i + 1));
    }));
  }

  const CORES_SEQ = ['#2dd4bf', '#fbbf24', '#fb7185', '#38bdf8', '#a3e635', '#a78bfa'];
  function rankingSeq(r, destaque) {
    return h('ol', { class: 'seq-ranking' + (destaque ? ' final' : '') }, (r || []).map((x, k) => h('li', { style: { '--cor': corDoGrupo(gs(), x.grupo) } },
      h('span', { class: 'pos' }, k === 0 ? '🥇' : k === 1 ? '🥈' : k === 2 ? '🥉' : `${k + 1}º`), iconeGrupo(gs(), x.grupo, 30), h('span', { class: 'nome' }, x.nome), h('strong', {}, x.recorde))));
  }
  const enfeiteSeq = n => h('div', { class: 'seq-enfeite', 'aria-hidden': 'true' }, CORES_SEQ.slice(0, n || 4).map((c, k) => h('i', { style: { '--cor': c, '--k': k } })));

  // ---------- escala padronizada e jogo econômico: só a turma, nunca uma pessoa ----------
  const virgula = x => String(x).replace('.', ',');
  const contagem = (n, de, verbo) => h('p', { class: 'telao-contagem' }, h('strong', {}, n), ` de ${de} ${verbo}`);
  function mediasEscala(j) {
    const ins = INSTRUMENTOS[j.instrumento]; if (!ins) return null;
    if (!j.resumo) return frase('A média da turma não será mostrada nesta atividade.');
    if (j.resumo.suprimido) return frase(`A média da turma aparece a partir de ${j.resumo.minimo} respostas (houve ${j.resumo.n}).`);
    return h('div', { class: 'escala-telao' },
      h('p', { class: 'sutil' }, `Média da turma, de 1 a 5 (${j.resumo.n} respostas). A faixa clara mostra onde fica a maioria (média ± 1 desvio-padrão).`),
      ins.fatores.map(f => { const x = j.resumo.fatores[f.id]; if (!x) return null;
        const pos = v => `${Math.max(0, Math.min(100, (v - 1) * 25))}%`;
        return h('div', { class: 'escala-telao-linha' }, h('span', { class: 'rot' }, f.nome),
          h('div', { class: 'escala-telao-trilho' },
            h('i', { class: 'faixa', style: { left: pos(x.media - x.dp), width: `calc(${pos(x.media + x.dp)} - ${pos(x.media - x.dp)})` } }),
            h('b', { class: 'ponto', style: { left: pos(x.media) } })),
          h('strong', {}, virgula(x.media))); }),
      h('p', { class: 'sutil' }, ins.traducao));
  }
  function histograma(j) {
    const R = j.resumo; if (!R) return null;
    const max = Math.max(1, ...R.distribuicao), J = JOGOS[j.formato];
    return h('div', { class: 'hist' },
      h('div', { class: 'hist-barras' }, R.distribuicao.map((n, v) => h('div', { class: 'hist-col' }, h('small', {}, n || ''), h('i', { style: { height: `${Math.round(100 * n / max)}%` } }), h('span', {}, v)))),
      h('p', { class: 'hist-eixo' }, `${J.rotulo} (de ${R.dotacao}) · média ${virgula(R.media)}`));
  }
  function destaquesJogo(j) {
    const R = j.resumo; if (!R) return null;
    const itens = [];
    if (j.formato === 'ditador') itens.push(`${R.deuZero} de ${R.n} não deram nada`, `${R.deuMetade} deram metade ou mais`);
    if (j.formato === 'ultimato') itens.push(`${R.recusadas} oferta(s) recusada(s) de ${R.n}`, `mínimo aceito, em média: ${virgula(R.mediaMinimo)}`);
    if (j.formato === 'confianca') itens.push(`devolveram, em média, ${virgula(R.mediaDevolver)}% do que receberam`, `cada ponto enviado vira ${R.multiplicador}`);
    if (j.formato === 'bens_publicos') itens.push(`puseram no fundo, em média, ${virgula(R.media)} de ${R.dotacao} (${Math.round(100 * R.media / R.dotacao)}%)`, `se todos pusessem tudo, cada um teria ${R.dotacao * R.fator}`);
    itens.push(`ganho médio: ${virgula(R.ganhoMedio)} pontos`);
    return h('div', { class: 'quiz-placar telao-placar' }, itens.map(t => h('span', { class: 'chip' }, t)));
  }
  function relacao(j) {
    const r = j.relacao; if (!r) return null;
    if (r.suprimido) return h('p', { class: 'sutil', style: { textAlign: 'center' } }, `A relação com a personalidade aparece a partir de 5 pessoas que fizeram a escala e o jogo (houve ${r.n}).`);
    const D = j.resumo?.dotacao || 10, W = 360, H = 220, x = v => 30 + (v - 1) / 4 * (W - 40), y = v => H - 25 - v / D * (H - 40);
    const svg = `<svg viewBox="0 0 ${W} ${H}" class="dispersao" role="img" aria-label="Cada ponto é uma pessoa (anônima): Honestidade-Humildade e decisão no jogo">
      <line x1="30" y1="${H - 25}" x2="${W - 10}" y2="${H - 25}" stroke="currentColor" opacity=".4"/><line x1="30" y1="15" x2="30" y2="${H - 25}" stroke="currentColor" opacity=".4"/>
      ${r.pontos.map(p => `<circle cx="${x(p.h).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="6" fill="#ff8a3d" opacity=".75"/>`).join('')}
      <text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-size="12" fill="currentColor">Honestidade-Humildade (1 a 5)</text>
      <text x="12" y="${H / 2}" text-anchor="middle" font-size="12" fill="currentColor" transform="rotate(-90 12 ${H / 2})">${JOGOS[j.formato].rotulo}</text></svg>`;
    const caixa = h('div', { class: 'relacao-telao' }); caixa.innerHTML = svg;
    const forca = r.r === null ? 'sem variação suficiente para calcular' : Math.abs(r.r) < 0.1 ? 'praticamente nenhuma relação' : Math.abs(r.r) < 0.3 ? 'relação fraca' : Math.abs(r.r) < 0.5 ? 'relação moderada' : 'relação forte';
    caixa.append(h('p', {}, h('strong', {}, `r = ${r.r === null ? '—' : virgula(r.r)}`), ` (${r.n} pessoas): ${forca}${r.r > 0.1 ? ', quem tem mais Honestidade-Humildade tende a ' + ({ ditador: 'dar', ultimato: 'oferecer', confianca: 'enviar', bens_publicos: 'contribuir' })[j.formato] + ' mais' : r.r < -0.1 ? ', no sentido contrário ao esperado' : ''}. Uma turma é pequena: é uma pista para discutir, não uma conclusão.`));
    return caixa;
  }

  return {
    tem: i => !!tipo(i),
    aoVivo() {
      const i = S().etapaInfo, t = tipo(i), j = S().jogo || {}, pr = S().progresso || {}, m = midia();
      const corpo = [];
      if (m) corpo.push(h('div', { class: 'telao-midia-caixa' }, m));
      if (t === 'corrida') {
        corpo.push(frase(i.typeId === 'quiz_pensar' ? '🤔 Responda e diga o quanto tem certeza' : '🏁 Cada um no seu ritmo: os pontos somam para o grupo'));
        if (j.placar) corpo.push(placar(j.placar, ' pts'));
        if (j.jogadores) corpo.push(h('p', { class: 'sutil', style: { textAlign: 'center' } }, `${j.terminaram} de ${j.jogadores} terminaram`));
        if ((j.feed || []).length) corpo.push(h('div', { class: 'telao-feed' }, j.feed.slice(-4).reverse().map(f => h('div', {}, h('span', {}, POWER_UPS[f.usar]?.icone || '⚡'), ` ${f.quem} usou `, h('strong', {}, f.nome), f.alvo ? ` em ${nome(f.alvo)}` : '', f.bloqueado ? ' — bloqueado!' : ''))));
      }
      if (t === 'memoria') { corpo.push(frase('🃏 Achem os pares'), barras(pr.porGrupo || {}, x => x.achados, x => x.total, x => x.concluido ? `✔ ${x.posicao}º · ${x.tentativas} jogadas` : `${x.achados} de ${x.total} pares · ${x.tentativas} jogadas`)); }
      if (t === 'memoriaTelao' && j.cartas) {
        corpo.push(h('div', { class: 'quiz-vez-telao', style: { '--cor': corDoGrupo(gs(), j.vez) } }, iconeGrupo(gs(), j.vez, 80),
          h('div', {}, h('small', {}, `${j.achados} de ${j.total} pares`), h('div', { class: 'quiz-nome' }, j.concluido ? 'Todos os pares achados!' : (/^grupo\b/i.test(nome(j.vez)) ? 'Vez do ' : 'Vez do grupo ') + nome(j.vez))),
          !j.concluido && h('span', { class: 'relogio', id: 'relogioQuiz', 'data-ate': (j.vezDesde || 0) + (j.segundos || 30) * 1000 }, '')), tabuleiro(j), placar(j.placar));
      }
      if (t === 'cruzadas') {
        corpo.push(frase('✏️ Cada um tem algumas dicas: juntem as palavras'));
        if (j.turma && j.grade) corpo.push(gradeCruz(j.grade), h('p', { class: 'sutil', style: { textAlign: 'center' } }, `${j.acertos} de ${j.total} palavras`));
        else corpo.push(barras(pr.porGrupo || {}, x => x.acertos, x => x.total, x => x.concluido ? `✔ ${x.posicao}º` : `${x.acertos} de ${x.total} palavras`));
      }
      if (t === 'equipe') {
        const fase = { espera: 'Aguardem a pergunta', individual: '🤫 Cada um responde sozinho', grupo: '💬 Agora o grupo decide junto', revelada: 'Resposta' }[j.fase] || '';
        corpo.push(frase(`${fase}${j.total ? ` · pergunta ${j.q + 1} de ${j.total}` : ''}`));
        if (j.pergunta) corpo.push(h('div', { class: 'explicacao', style: { fontSize: '1.05em' } }, h('strong', {}, j.pergunta.enunciado), h('ol', { type: 'A' }, j.pergunta.alternativas.map(a => h('li', { class: j.certaId === a.id ? 'certa' : '' }, a.texto,
          j.respostasGrupos ? h('span', { class: 'quem-marcou' }, Object.entries(j.respostasGrupos).filter(([, v]) => v === a.id).map(([g]) => iconeGrupo(gs(), g, 28))) : '')))));
        if (j.revelacao?.explicacao) corpo.push(h('div', { class: 'explicacao' }, j.revelacao.explicacao));
        if (j.respondidos && j.fase !== 'revelada') corpo.push(h('div', { class: 'quiz-placar telao-placar' }, Object.entries(j.respondidos).map(([g, x]) => chipG(g, h('small', {}, j.fase === 'individual' ? ` ${x.n}/${x.de}` : x.grupo ? ' ✔' : ' …')))));
        if (j.placar) corpo.push(placar(j.placar, ' pts'));
      }
      if (t === 'sequencia') {
        corpo.push(enfeiteSeq(j.botoes), frase('🧠 Observe, ouça e repita: a sequência cresce a cada acerto'));
        if (j.placar) corpo.push(placar(j.placar, j.media ? ' (média)' : ' passos'));
        if (j.ranking?.length) corpo.push(rankingSeq(j.ranking));
        if (j.jogadores) corpo.push(h('p', { class: 'sutil', style: { textAlign: 'center' } }, `${j.jogaram} de ${j.jogadores} já jogaram · ${j.partidas} partida(s)`));
      }
      if (t === 'ramos') corpo.push(frase('🧭 Cada escolha muda o caminho'), barras(pr.porGrupo || {}, x => x.final ? 1 : 0, () => 1, x => x.final ? `chegou a um final · ${x.passos} escolhas` : `${x.passos} escolha(s)`));
      if (t === 'escala') corpo.push(frase('🪞 Cada um responde sozinho: não há resposta certa'), contagem(j.respondidos ?? 0, j.total ?? 0, 'responderam'),
        h('p', { class: 'sutil', style: { textAlign: 'center' } }, 'O perfil de cada um aparece só no próprio celular. Aqui, ao final, só a média da turma.'));
      if (t === 'jogo') {
        const J = JOGOS[j.formato];
        if (!j.revelado) corpo.push(frase(J ? `${J.nome}: ${J.resumo}` : ''), contagem(j.respondidos ?? 0, j.total ?? 0, 'decidiram'));
        else corpo.push(frase(`${J.nome}: o que a turma decidiu`), h('div', { class: 'jogo-telao' }, histograma(j), relacao(j)), destaquesJogo(j));
      }
      if (t === 'observar') corpo.push(frase('🔍 Observem e descrevam'), barras(pr.porGrupo || {}, x => x.enviou ? 1 : 0, () => 1, x => x.enviou ? 'escreveu' : 'observando'));
      return h('div', { style: { display: 'grid', gap: '.8em' } }, corpo);
    },
    revisao() {
      const i = S().etapaInfo, t = tipo(i), j = S().jogo || {};
      const corpo = [];
      const m = midia();
      if (t === 'corrida' && j.final) {
        corpo.push(placar(j.placar, ' pts'));
        if (j.destaques?.length) corpo.push(h('p', { style: { textAlign: 'center' } }, '🏅 ', j.destaques.map(d => `${d.nome} (${d.pontos})`).join(' · ')));
        if (j.corrente) corpo.push(h('div', { class: 'cadeia-telao' }, j.corrente.map((x, k) => [k > 0 && h('span', { class: 'seta' }, '→'), h('span', { class: 'cartao-arr' }, x)])));
        if (j.calibracao) {
          const linhas = [['certeza', 'Tenho certeza'], ['duvida', 'Estou em dúvida'], ['chute', 'Chutei']];
          corpo.push(h('div', { class: 'explicacao' }, h('strong', {}, 'Calibração da turma: quanto acertamos em cada nível de certeza'),
            h('div', { class: 'dist' }, linhas.map(([k, rot]) => { const [n, ac] = j.calibracao[k] || [0, 0]; const p = n ? Math.round(100 * ac / n) : 0;
              return h('div', { class: 'dist-linha' }, h('span', {}, rot), h('div', { class: 'dist-barra' }, h('i', { style: { width: p + '%' } })), h('small', {}, n ? `${p}% de ${n}` : '—')); }))));
        }
      }
      if (t === 'memoria' || t === 'memoriaTelao') {
        if (j.placar) corpo.push(placar(j.placar, ' pares'));
        if (j.porGrupo) corpo.push(h('div', { class: 'quiz-placar telao-placar' }, Object.entries(j.porGrupo).map(([g, x]) => chipG(g, h('strong', {}, ` ${x.achados}/${x.total}${x.posicao ? ' · ' + x.posicao + 'º' : ''}`)))));
        if (j.pares) corpo.push(h('div', { class: 'pares-telao' }, j.pares.map(p => h('div', {}, h('span', { class: 'cartao-arr' }, p.a), h('span', { class: 'seta' }, '↔'), h('span', { class: 'cartao-arr' }, p.b)))));
      }
      if (t === 'cruzadas' && j.grade) {
        corpo.push(h('div', { class: 'cruz-final' }, gradeCruz(j.grade), h('ul', { class: 'cruz-dicas' }, (j.dicas || []).map(d => h('li', {}, h('strong', {}, `${d.numero}${d.dir === 'h' ? '→' : '↓'} `), d.dica)))));
        corpo.push(h('div', { class: 'quiz-placar telao-placar' }, Object.entries(j.porGrupo || {}).map(([g, x]) => g === 'turma' ? h('span', { class: 'chip' }, `Turma ${x.acertos}/${x.total}`) : chipG(g, h('strong', {}, ` ${x.acertos}/${x.total}`)))));
      }
      if (t === 'sequencia' && j.final) {
        corpo.push(placar(j.placar, j.media ? ' (média)' : ' passos'));
        corpo.push(h('div', { class: 'seq-final' },
          j.ranking?.length ? h('div', {}, h('p', { class: 'seq-final-tit' }, 'Maiores sequências'), rankingSeq(j.ranking, true)) : null,
          j.derrubaram?.length ? h('div', { class: 'explicacao' }, h('p', { class: 'seq-final-tit' }, 'Os termos que mais derrubaram a turma'),
            h('dl', { class: 'seq-defs' }, j.derrubaram.flatMap(x => [h('dt', {}, `${x.termo} · ${x.vezes}×`), x.definicao ? h('dd', {}, x.definicao) : null]))) : null));
      }
      if (t === 'equipe' && j.placar) corpo.push(placar(j.placar, ' pts'), j.detalhe && h('p', { class: 'sutil', style: { textAlign: 'center' } }, 'Acertos individuais e do grupo: ' + Object.entries(j.detalhe).map(([g, d]) => `${nome(g)} ${d.individual} + ${d.grupo}`).join(' · ')));
      if (t === 'ramos' && j.caminhos) corpo.push(h('div', { class: 'caminhos' }, Object.entries(j.caminhos).map(([g, c]) => h('div', { class: 'caminho ' + (c.desfecho || '') , style: { '--cor': corDoGrupo(gs(), g) } },
        h('div', { class: 'titulo-grupo' }, iconeGrupo(gs(), g, 36), nome(g), h('span', { class: 'desfecho' }, c.final ? { bom: 'final bom', neutro: 'final neutro', ruim: 'final ruim' }[c.desfecho] : 'não terminou')),
        h('small', {}, c.escolhas.join(' → ')), c.final && h('p', {}, c.textoFinal)))));
      if (t === 'escala' && j.final) corpo.push(mediasEscala(j));
      if (t === 'jogo' && j.final) corpo.push(h('div', { class: 'jogo-telao' }, histograma(j), relacao(j)), destaquesJogo(j));
      if (t === 'observar' && j.respostas) corpo.push(h('div', { class: 'observacoes' }, m && h('div', { class: 'telao-midia-caixa pequena' }, m), h('div', { style: { display: 'grid', gap: '.5em' } }, j.respostas.map(r => h('div', { class: 'explicacao', style: { borderLeft: `6px solid ${corDoGrupo(gs(), r.grupo)}` } }, h('strong', {}, nome(r.grupo) + ': '), r.texto)))));
      else if (m && t !== 'observar') corpo.unshift(h('div', { class: 'telao-midia-caixa pequena' }, m));
      return h('div', { style: { display: 'grid', gap: '.8em' } }, corpo);
    },
    midia
  };
}
