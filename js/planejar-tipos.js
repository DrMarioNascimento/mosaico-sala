/* MOSAICO · Editores do Planejamento para os tipos novos (junto com planejar.js)
   Pares · Corrida · Palavras cruzadas · Quiz que faz pensar · Análise de imagem
   Como nos outros tipos, a resposta certa vai para docente.respostas (só quem conduz vê). */

import { h, limpar } from './ui.js';
import { POWER_UPS } from './core/corrida.js';
import { montarGrade } from './core/cruzadas.js';
import { problemasRamos } from './core/pensar.js';
import { lerTermos, VELOCIDADES } from './core/sequencia.js';

/** Banco inicial de Fisiologia para a Sequência (Genius): o professor pode apagar, editar e acrescentar. */
export const BANCO_FISIOLOGIA = `Fígado | Armazena glicogênio, produz bile e a maior parte das proteínas plasmáticas, como a albumina.
Renina | Enzima das células justaglomerulares do rim, liberada quando cai a pressão de perfusão; converte angiotensinogênio em angiotensina I.
Inotrópico | Que altera a força de contração do miocárdio (positivo aumenta, negativo diminui).
Mitocôndria | Organela do ciclo de Krebs e da fosforilação oxidativa: a principal fonte de ATP em aerobiose.
Sinapse | Junção onde um neurônio transmite o sinal a outra célula, em geral pela liberação de um neurotransmissor.
Néfron | Unidade funcional do rim: glomérulo e túbulos, onde o plasma é filtrado e o filtrado é ajustado até virar urina.
Homeostase | Manutenção do meio interno em faixas compatíveis com a vida, sobretudo por retroalimentação negativa.
Miosina | Proteína motora do filamento grosso; suas cabeças hidrolisam ATP e puxam a actina no ciclo das pontes cruzadas.
Actina | Proteína do filamento fino do sarcômero, onde as cabeças de miosina se ligam durante a contração.
Cronotrópico | Que altera a frequência cardíaca.
Aldosterona | Mineralocorticoide do córtex adrenal: aumenta a reabsorção de sódio e a secreção de potássio no néfron distal.
Surfactante | Lipídios e proteínas dos pneumócitos tipo II que reduzem a tensão superficial nos alvéolos.
Hematócrito | Fração do volume de sangue ocupada pelas hemácias.
Eritropoetina | Hormônio produzido sobretudo pelo rim em resposta à hipóxia; estimula a produção de hemácias na medula óssea.
Barorreceptor | Receptor de estiramento do seio carotídeo e do arco aórtico que informa a pressão arterial ao tronco encefálico.
Quimiorreceptor | Receptor sensível a PO₂, PCO₂ e pH do sangue, que ajusta a ventilação.
Potencial de ação | Inversão rápida e transitória do potencial de membrana que se propaga em neurônios e fibras musculares.
Insulina | Hormônio das células beta do pâncreas que favorece a captação e o armazenamento de glicose.
Glucagon | Hormônio das células alfa do pâncreas que eleva a glicemia, estimulando glicogenólise e gliconeogênese no fígado.
Débito cardíaco | Volume bombeado por um ventrículo por minuto: frequência cardíaca × volume sistólico.
Complacência | Variação de volume por variação de pressão (ΔV/ΔP); no pulmão, a facilidade de distensão.
Hemoglobina | Proteína das hemácias que transporta O₂ ligado ao ferro do grupo heme (e parte do CO₂).
Sarcômero | Unidade contrátil da fibra muscular estriada, entre duas linhas Z.
Tropomiosina | Cobre os sítios da actina em repouso; o cálcio ligado à troponina a desloca e libera a contração.
Acetilcolina | Neurotransmissor da junção neuromuscular, dos gânglios autonômicos e das sinapses parassimpáticas pós-ganglionares.
Vasopressina | ADH: hormônio da neuro-hipófise que aumenta a reabsorção de água nos ductos coletores (aquaporina-2).
Glomérulo | Novelo de capilares do néfron onde o plasma é filtrado para a cápsula de Bowman.
Ventilação alveolar | Ar novo que chega aos alvéolos por minuto: (volume corrente − espaço morto) × frequência respiratória.
Lactato | Formado quando a LDH reduz o piruvato; também é combustível para o coração, o músculo oxidativo e o fígado.
Termorregulação | Controle da temperatura central pelo hipotálamo, equilibrando produção e perda de calor.`;

export function criarEditores(ctx) {
  const { campo, seletor, mudar, tocar, novoId, idsDe } = ctx;
  const R = e => { const a = ctx.A(); const r = a.docente.respostas[e.id]; return r && typeof r === 'object' && !('corretaId' in r) ? r : (a.docente.respostas[e.id] = {}); };
  const caixaLista = (titulo, itens, ...extra) => h('div', { class: 'cartao' }, h('h3', {}, titulo), ...extra, itens);
  const remover = (lista, x, min, aposMudar) => h('button', { class: 'btn perigo pequeno', disabled: lista.length <= min, 'aria-label': 'Remover', onclick: () => mudar(() => { lista.splice(lista.indexOf(x), 1); aposMudar?.(); }) }, '✕');
  const colar = (rotulo, ajuda, placeholder, aoColar) => {
    const ta = h('textarea', { rows: 5, placeholder });
    return h('details', { style: { marginTop: '10px' } }, h('summary', {}, rotulo), h('p', { class: 'sutil' }, ajuda), ta,
      h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', onclick: () => { const n = aoColar(ta.value); ctx.avisoGeral(n ? `${n} item(ns) adicionado(s).` : 'Nada reconhecido. Confira o formato.', n ? 'ok' : 'erro'); } }, 'Adicionar')));
  };
  const caixaOpcoes = (...l) => h('div', { class: 'opcoes', style: { marginTop: '10px' } }, ...l);
  const marcar = (rot, val, fn) => h('label', { class: 'opcao' }, h('input', { type: 'checkbox', checked: !!val, onchange: ev => { fn(ev.target.checked); tocar(); } }), h('span', {}, rot));
  const ajudaOrg = (e, dentro, entre) => h('p', { class: 'sutil' }, e.participacao.organizacao === 'representantes' ? 'Entre grupos: ' + entre : e.participacao.organizacao === 'individual' ? 'Individual: cada aluno joga e os pontos somam para o grupo.' : 'Dentro do grupo: ' + dentro, ' (Mude em “Organização”, acima.)');

  // ======================================================== Pares
  function pares(e) {
    const c = e.config, ps = c.pares;
    return h('div', {},
      h('div', { class: 'cartao' }, h('h3', {}, 'Formato e regras'),
        h('div', { class: 'campos-2' },
          seletor('Formato', c.formato, [['ligar', 'Ligar (arrastar até o par)'], ['memoria', 'Jogo da memória']], v => { c.formato = v; }, { redesenhar: true }),
          campo('Comando para o grupo (opcional)', c.enunciado || '', v => { c.enunciado = v; }, { max: 500 })),
        ajudaOrg(e, c.formato === 'memoria' ? 'cada grupo tem o próprio tabuleiro no celular.' : 'o grupo liga os cartões num quadro compartilhado.',
          c.formato === 'memoria' ? 'o tabuleiro fica no telão e cada grupo joga na sua vez, pelo celular do líder. Acertou, joga de novo; errou, passa a vez.' : 'os representantes montam um quadro só, juntos.'),
        c.formato === 'ligar' ? h('div', { class: 'campos-3' },
          seletor('Cartões no grupo', c.distribuicao || 'todos', [['todos', 'Todos movem qualquer cartão'], ['fracionado', 'Cada celular segura alguns']], v => { c.distribuicao = v; }),
          seletor('Tentativas', c.tentativas || 'repetir', [['repetir', 'Repetir até acertar'], ['uma', 'Uma só']], v => { c.tentativas = v; }),
          seletor('Espera depois de errar', String(c.espera ?? 15), [['0', 'na hora'], ['15', '15 s'], ['30', '30 s'], ['60', '1 min']], v => { c.espera = Number(v); }))
          : e.participacao.organizacao === 'representantes' && h('div', { style: { maxWidth: '300px' } }, campo('Tempo de cada vez (segundos)', c.segundos ?? 30, v => { c.segundos = Math.max(10, Math.min(300, Math.round(v || 30))); }, { tipo: 'number' })),
        caixaOpcoes(marcar('Ao encerrar, o telão mostra todos os pares', c.revelarAoEncerrar !== false, v => { c.revelarAoEncerrar = v; }))),
      caixaLista(`Pares (${ps.length} de no máximo 12)`, h('div', {},
        ps.map((p, i) => h('div', { class: 'linha-item par-edit' },
          h('input', { value: p.a, maxlength: 150, placeholder: 'Lado A (ex.: Hemossiderina)', 'aria-label': `Par ${i + 1}, lado A`, oninput: ev => { p.a = ev.target.value; tocar(); } }),
          h('span', { class: 'num' }, '↔'),
          h('input', { value: p.b, maxlength: 150, placeholder: 'Lado B (ex.: Fígado)', 'aria-label': `Par ${i + 1}, lado B`, oninput: ev => { p.b = ev.target.value; tocar(); } }),
          remover(ps, p, 2))),
        h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', disabled: ps.length >= 12, onclick: () => mudar(() => { ps.push({ id: novoId('p', idsDe(ps)), a: '', b: '' }); }) }, '＋ Adicionar par')),
        colar('Colar vários pares', 'Um par por linha, com os lados separados por "=", "↔", ";" ou tabulação.', 'Hemossiderina = Fígado\nEPO = Rim', txt => {
          const novos = String(txt).split(/\r?\n/).map(l => l.split(/\s*(?:=|↔|;|\t)\s*/)).filter(x => x.length >= 2 && x[0].trim() && x[1].trim());
          if (!novos.length) return 0;
          mudar(() => { c.pares = ps.filter(p => p.a.trim() || p.b.trim()); for (const [a, b] of novos) if (c.pares.length < 12) c.pares.push({ id: novoId('p', idsDe(c.pares)), a: a.trim().slice(0, 150), b: b.trim().slice(0, 150) }); });
          return novos.length;
        }),
        campo('Explicação para a discussão (opcional)', R(e).explicacao || '', v => { R(e).explicacao = v; }, { area: true, linhas: 2 }))),
      h('p', { class: 'sutil' }, 'Dica: os pares não precisam ser imagem com imagem. Termo e definição, órgão e função, princípio e exemplo… tudo vira par.'));
  }

  // ======================================================== Sequência (Genius)
  function sequencia(e) {
    const c = e.config, ts = c.termos, n = Number(c.botoes ?? 4);
    const adicionar = txt => { const novos = lerTermos(txt, ts.filter(t => t.termo.trim())); if (!novos.length) return 0; mudar(() => { c.termos = [...ts.filter(t => t.termo.trim()), ...novos].slice(0, 300); }); return novos.length; };
    return h('div', {},
      h('div', { class: 'cartao' }, h('h3', {}, 'Painel e regras'),
        h('p', { class: 'sutil' }, 'Como o Genius: o painel acende um termo com luz e som, o aluno repete, e a cada acerto a sequência cresce mais um. Errou ou demorou, acaba a partida. Cada partida sorteia termos novos do banco. Cada aluno joga no próprio celular; vale o recorde, que soma para o grupo.'),
        h('div', { class: 'campos-3' },
          seletor('Botões no painel', String(n), [['4', '4 (como o original)'], ['6', '6 (mais difícil)']], v => { c.botoes = Number(v); }),
          seletor('Velocidade', c.velocidade || 'classica', Object.entries(VELOCIDADES).map(([k, v]) => [k, v.nome]), v => { c.velocidade = v; }),
          seletor('Partidas por aluno', String(c.partidas ?? 0), [['0', 'Sem limite (enquanto a etapa durar)'], ['1', '1'], ['2', '2'], ['3', '3'], ['5', '5']], v => { c.partidas = Number(v); })),
        h('div', { class: 'campos-2' },
          seletor('Placar do grupo', c.placar || 'soma', [['soma', 'Soma dos recordes'], ['media', 'Média dos recordes (grupos de tamanhos diferentes)']], v => { c.placar = v; }),
          campo('Passos que contam como acerto (meta)', c.meta ?? 6, v => { c.meta = Math.max(1, Math.min(50, Math.round(v || 6))); }, { tipo: 'number' }))),
      caixaLista(`Banco de termos (${ts.filter(t => t.termo.trim()).length} de no máximo 300)`, h('div', {},
        h('p', { class: 'sutil' }, `Cada partida sorteia ${n} termos daqui. A definição é opcional: aparece no celular ao fim de cada partida, para o aluno fixar o que acabou de memorizar. Termos curtos cabem melhor nos botões.`),
        ts.map((t, i) => h('div', { class: 'linha-item seq-termo-edit' },
          h('input', { value: t.termo, maxlength: 40, placeholder: 'Termo (ex.: Renina)', 'aria-label': `Termo ${i + 1}`, oninput: ev => { t.termo = ev.target.value; tocar(); } }),
          h('input', { value: t.definicao || '', maxlength: 200, placeholder: 'Definição curta (opcional)', 'aria-label': `Definição do termo ${i + 1}`, oninput: ev => { t.definicao = ev.target.value; tocar(); } }),
          remover(ts, t, 0))),
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn', disabled: ts.length >= 300, onclick: () => mudar(() => { ts.push({ id: novoId('t', idsDe(ts)), termo: '', definicao: '' }); }) }, '＋ Adicionar termo'),
          h('button', { class: 'btn discreto', onclick: () => { const k = adicionar(BANCO_FISIOLOGIA); ctx.avisoGeral(k ? `${k} termo(s) de Fisiologia adicionado(s).` : 'Os termos do banco de Fisiologia já estão aqui.', k ? 'ok' : 'info'); } }, 'Acrescentar o banco de Fisiologia (30 termos)'),
          ts.length > 0 && h('button', { class: 'btn perigo discreto', onclick: () => { if (confirm('Apagar todos os termos do banco?')) mudar(() => { c.termos = []; }); } }, 'Apagar todos')),
        colar('Colar vários termos', 'Um termo por linha. Para pôr a definição, separe com "|" ou tabulação (dá para colar duas colunas de uma planilha).', 'Renina | Enzima renal que converte angiotensinogênio em angiotensina I\nNéfron\nMiosina', adicionar))));
  }

  // ======================================================== Corrida
  function corrida(e) {
    const c = e.config, r = R(e);
    const blocoFormato = c.formato === 'quiz' ? ctx.editorPerguntas(e, { explicacao: true })
      : c.formato === 'corrente' ? corrente(e) : direcao(e);
    const ativos = new Set(c.powerUps || []);
    const pu = escopo => Object.entries(POWER_UPS).filter(([, x]) => x.escopo === escopo).map(([id, x]) => marcar(`${x.icone} ${x.nome}: ${x.efeito}`, ativos.has(id), v => { c.powerUps = v ? [...new Set([...(c.powerUps || []), id])] : (c.powerUps || []).filter(p => p !== id); }));
    return h('div', {},
      h('div', { class: 'cartao' }, h('h3', {}, 'Formato e regras'),
        seletor('Formato', c.formato, [['quiz', 'Quiz no próprio ritmo (como o Quizizz)'], ['corrente', 'Corrente de causa e efeito'], ['direcao', 'Escolher a direção (↑ ↓ =)']], v => trocar(v), { redesenhar: true }),
        h('p', { class: 'sutil' }, { quiz: 'Cada aluno responde a própria sequência, em ordem embaralhada. Os pontos somam para o grupo.', corrente: 'Parte de um gatilho. Cada acerto libera a próxima consequência; um erro quebra a corrente.', direcao: 'Depois de cada estímulo, o aluno marca se cada variável aumenta, diminui ou não muda.' }[c.formato]),
        ajudaOrg(e, 'o líder responde pelo grupo (uma sequência por grupo).', 'o líder responde pelo grupo.'),
        h('div', { class: 'campos-3' },
          seletor('Tempo por pergunta', String(c.segundos ?? 30), [['0', 'Sem limite'], ['15', '15 s'], ['20', '20 s'], ['30', '30 s'], ['45', '45 s'], ['60', '1 min'], ['90', '1 min 30']], v => { c.segundos = Number(v); }),
          c.formato !== 'corrente' ? seletor('Ordem', c.embaralhar === false ? 'n' : 's', [['s', 'Embaralhada para cada aluno'], ['n', 'A mesma para todos']], v => { c.embaralhar = v === 's'; }) : seletor('Se errar um elo', c.aoQuebrar || 'recomecar', [['recomecar', 'Volta ao início da corrente'], ['continuar', 'Segue, mas zera a sequência']], v => { c.aoQuebrar = v; }),
          campo('Acertos seguidos para ganhar power-up', c.sequencia ?? 3, v => { c.sequencia = Math.max(2, Math.min(10, Math.round(v || 3))); }, { tipo: 'number' }))),
      h('div', { class: 'cartao' }, h('h3', {}, 'Power-ups (opcionais)'), h('p', { class: 'sutil' }, 'O aluno ganha um power-up a cada sequência de acertos e escolhe quando usar. Os “entre grupos” atingem o grupo que está na frente.'),
        h('h4', {}, 'Dentro do grupo (cooperação)'), caixaOpcoes(...pu('dentro')), h('h4', {}, 'Entre grupos (disputa)'), caixaOpcoes(...pu('entre'))),
      blocoFormato,
      campo('Explicação para a discussão (opcional)', r.explicacao || '', v => { r.explicacao = v; }, { area: true, linhas: 2 }));
    function trocar(v) {
      c.formato = v;
      if (v === 'quiz' && !c.perguntas?.length) c.perguntas = [{ id: 'p1', enunciado: '', alternativas: ['a', 'b', 'c', 'd'].map(l => ({ id: l, texto: '' })) }];
      if (v === 'corrente' && !c.elos?.length) { c.gatilho ||= ''; c.elos = [1, 2, 3].map(i => ({ id: 'e' + i, consequencia: '', distratores: ['', ''] })); c.aoQuebrar ||= 'recomecar'; }
      if (v === 'direcao' && !c.rodadas?.length) c.rodadas = [{ id: 'r1', estimulo: '', variaveis: [{ id: 'r1_v1', nome: '' }, { id: 'r1_v2', nome: '' }] }];
      if (v !== 'quiz') { delete c.perguntas; delete r.perguntas; }
      if (v !== 'corrente') { delete c.elos; delete c.gatilho; delete c.aoQuebrar; }
      if (v !== 'direcao') { delete c.rodadas; delete r.direcoes; }
      if (v === 'corrente') delete c.embaralhar; else c.embaralhar ??= true;
    }
  }
  function corrente(e) {
    const c = e.config, es = c.elos;
    return caixaLista(`Corrente (${es.length} elos)`, h('div', {},
      campo('Gatilho: o ponto de partida', c.gatilho || '', v => { c.gatilho = v; }, { area: true, linhas: 2, ajuda: 'Ex.: “A ciclista sobe para 3.000 m de altitude.”' }),
      es.map((x, i) => h('div', { class: 'pergunta-edit' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('strong', {}, `Elo ${i + 1}: o que acontece ${i ? 'em seguida' : 'primeiro'}?`),
          h('div', { class: 'mini' }, h('button', { class: 'btn pequeno', disabled: !i, 'aria-label': 'Subir elo', onclick: () => mudar(() => { [es[i - 1], es[i]] = [es[i], es[i - 1]]; }) }, '↑'), remover(es, x, 2))),
        h('input', { value: x.consequencia, maxlength: 200, placeholder: 'Consequência certa (ex.: ↓ PO₂ arterial)', 'aria-label': `Consequência do elo ${i + 1}`, oninput: ev => { x.consequencia = ev.target.value; tocar(); } }),
        h('small', { class: 'sutil' }, 'Alternativas erradas (2 a 4):'),
        x.distratores.map((d, k) => h('div', { class: 'linha-item' }, h('span', { class: 'num' }, '✗'), h('input', { value: d, maxlength: 200, 'aria-label': `Alternativa errada ${k + 1} do elo ${i + 1}`, oninput: ev => { x.distratores[k] = ev.target.value; tocar(); } }),
          h('button', { class: 'btn perigo pequeno', disabled: x.distratores.length <= 2, onclick: () => mudar(() => { x.distratores.splice(k, 1); }) }, '✕'))),
        h('button', { class: 'btn pequeno', disabled: x.distratores.length >= 4, onclick: () => mudar(() => { x.distratores.push(''); }) }, '＋ Errada'))),
      h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', disabled: es.length >= 15, onclick: () => mudar(() => { es.push({ id: novoId('e', idsDe(es)), consequencia: '', distratores: ['', ''] }); }) }, '＋ Adicionar elo'))),
      h('p', { class: 'sutil' }, 'O aluno vê a consequência anterior e escolhe a próxima. A ordem dos elos é a ordem da cascata.'));
  }
  function direcao(e) {
    const c = e.config, rs = c.rodadas, r = R(e); r.direcoes ||= {};
    return caixaLista(`Estímulos (${rs.length})`, h('div', {},
      rs.map((rd, i) => h('div', { class: 'pergunta-edit' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, h('strong', {}, `Estímulo ${i + 1}`), remover(rs, rd, 1)),
        h('input', { value: rd.estimulo, maxlength: 300, placeholder: 'Ex.: Começa um exercício intenso', 'aria-label': `Estímulo ${i + 1}`, oninput: ev => { rd.estimulo = ev.target.value; tocar(); } }),
        rd.variaveis.map((v, k) => h('div', { class: 'linha-item direcao-edit' },
          h('input', { value: v.nome, maxlength: 80, placeholder: 'Variável (ex.: FC)', 'aria-label': `Variável ${k + 1} do estímulo ${i + 1}`, oninput: ev => { v.nome = ev.target.value; tocar(); } }),
          h('div', { class: 'direcao-botoes' }, ['sobe', 'desce', 'igual'].map(d => { const btn = h('button', { type: 'button', class: 'direcao' + (r.direcoes[v.id] === d ? ' ativo' : ''), title: { sobe: 'Aumenta', desce: 'Diminui', igual: 'Não muda' }[d] }, { sobe: '↑', desce: '↓', igual: '=' }[d]);
            btn.onclick = () => { r.direcoes[v.id] = d; btn.parentElement.querySelectorAll('.direcao').forEach(x => x.classList.toggle('ativo', x === btn)); tocar(); }; return btn; })),
          h('button', { class: 'btn perigo pequeno', disabled: rd.variaveis.length <= 1, onclick: () => mudar(() => { rd.variaveis.splice(k, 1); delete r.direcoes[v.id]; }) }, '✕'))),
        h('button', { class: 'btn pequeno', disabled: rd.variaveis.length >= 8, onclick: () => mudar(() => { rd.variaveis.push({ id: `${rd.id}_v${novoN(rd.variaveis.map(x => x.id), rd.id + '_v')}`, nome: '' }); }) }, '＋ Variável'))),
      h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', disabled: rs.length >= 15, onclick: () => mudar(() => { const id = novoId('r', idsDe(rs)); rs.push({ id, estimulo: '', variaveis: [{ id: id + '_v1', nome: '' }, { id: id + '_v2', nome: '' }] }); }) }, '＋ Adicionar estímulo'))),
      h('p', { class: 'sutil' }, 'Marque a direção certa de cada variável (↑ aumenta, ↓ diminui, = não muda). Ela fica só no gabarito.'));
  }
  const novoN = (ids, pref) => { let n = 1; while (ids.includes(pref + n)) n++; return n; };

  // ======================================================== Palavras cruzadas
  function cruzadas(e) {
    const c = e.config, ws = c.palavras, previa = h('div');
    const desenhar = () => {
      const g = montarGrade(ws);
      if (!g.palavras.length) return limpar(previa, h('p', { class: 'sutil' }, 'Escreva palavras com dica para ver a grade.'));
      const nums = {}; g.numeros.forEach((l, r) => l.forEach((n, k) => { if (n) nums[r + ',' + k] = n; }));
      limpar(previa, h('p', {}, h('strong', {}, `${g.palavras.length} palavra(s) na grade · ${g.linhas} × ${g.colunas}`)),
        h('div', { class: 'cruz-grade', style: { '--c': g.colunas, maxWidth: Math.min(520, g.colunas * 34) + 'px' } }, g.celulas.flatMap((l, r) => l.map((ch, k) => ch === null ? h('span', { class: 'cruz-vazio' }) : h('span', { class: 'cruz-cel cheia' }, nums[r + ',' + k] && h('small', {}, nums[r + ',' + k]), ch)))),
        g.naoCouberam.length > 0 && h('p', { class: 'aviso', 'data-tipo': 'alerta' }, 'Não couberam (sem letra em comum ou grade grande demais): ' + g.naoCouberam.map(x => x.palavra).join(', ') + '. Troque ou acrescente palavras que cruzem.'));
    };
    setTimeout(desenhar, 0);
    return h('div', {},
      h('div', { class: 'cartao' }, h('h3', {}, 'Regras'),
        h('div', { class: 'campos-2' },
          seletor('Dicas', c.dicas || 'fracionadas', [['fracionadas', 'Cada celular tem só algumas (o grupo junta)'], ['todas', 'Todos veem todas as dicas']], v => { c.dicas = v; }),
          seletor('Grade', c.grade || 'por_grupo', [['por_grupo', 'Uma por grupo (corrida entre grupos)'], ['turma', 'Uma só, da turma (os grupos se completam)']], v => { c.grade = v; })),
        h('p', { class: 'sutil' }, 'Acentos e espaços não importam: “hemacia” vale como “HEMÁCIA”. Cada aluno manda a palavra inteira da dica que tem.')),
      caixaLista(`Palavras (${ws.length} de no máximo 25)`, h('div', {},
        ws.map((w, i) => h('div', { class: 'linha-item par-edit' },
          h('input', { value: w.palavra, maxlength: 20, placeholder: 'Palavra', 'aria-label': `Palavra ${i + 1}`, style: { textTransform: 'uppercase' }, oninput: ev => { w.palavra = ev.target.value; tocar(); clearTimeout(previa._t); previa._t = setTimeout(desenhar, 300); } }),
          h('span', { class: 'num' }, ':'),
          h('input', { value: w.dica, maxlength: 200, placeholder: 'Dica', 'aria-label': `Dica ${i + 1}`, oninput: ev => { w.dica = ev.target.value; tocar(); clearTimeout(previa._t); previa._t = setTimeout(desenhar, 300); } }),
          remover(ws, w, 3))),
        h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', disabled: ws.length >= 25, onclick: () => mudar(() => { ws.push({ id: novoId('w', idsDe(ws)), palavra: '', dica: '' }); }) }, '＋ Adicionar palavra')),
        colar('Colar várias palavras', 'Uma por linha: PALAVRA, depois ":" ou "=" ou tabulação, depois a dica.', 'HEMÁCIA: Célula que leva oxigênio\nRIM: Produz eritropoetina', txt => {
          const novos = String(txt).split(/\r?\n/).map(l => l.split(/\s*(?::|=|\t)\s*/)).filter(x => x.length >= 2 && x[0].trim() && x.slice(1).join(' ').trim());
          if (!novos.length) return 0;
          mudar(() => { c.palavras = ws.filter(w => w.palavra.trim() || w.dica.trim()); for (const [p, ...d] of novos) if (c.palavras.length < 25) c.palavras.push({ id: novoId('w', idsDe(c.palavras)), palavra: p.trim().slice(0, 20), dica: d.join(': ').trim().slice(0, 200) }); });
          return novos.length;
        }))),
      h('div', { class: 'cartao' }, h('h3', {}, 'Prévia da grade (só você vê as letras)'), previa));
  }

  // ======================================================== Quiz que faz pensar
  function pensar(e) {
    const c = e.config, r = R(e);
    return h('div', {},
      h('div', { class: 'cartao' }, h('h3', {}, 'Formato'),
        seletor('Formato', c.formato, [['equipe', 'Em equipe (TBL): sozinho, depois o grupo'], ['ramificado', 'Tomada de decisão (cenários com ramos)'], ['metacognicao', 'Metacognição (resposta + certeza)']], v => trocar(v), { redesenhar: true }),
        h('p', { class: 'sutil' }, { equipe: 'Você abre cada pergunta pelo celular: primeiro cada aluno responde sozinho; depois o grupo vê como respondeu, debate e manda a resposta do grupo (vale o dobro). Por fim você revela.', ramificado: 'Cada grupo lê um cenário e escolhe uma ação. Cada escolha leva a outro cenário, até um final bom, neutro ou ruim. O telão compara os caminhos no fim.', metacognicao: 'Junto com a resposta, o aluno diz se tem certeza, está em dúvida ou chutou. Certeza vale mais e perde no erro. O telão mostra a calibração da turma no fim.' }[c.formato]),
        c.formato === 'equipe' && h('div', {}, seletor('Resposta do grupo', c.consenso || 'lider', [['lider', 'O líder manda, depois do debate'], ['todos', 'Vale quando todos votam igual (consenso)']], v => { c.consenso = v; }),
          caixaOpcoes(marcar('Na fase do grupo, mostrar como cada um respondeu sozinho', c.mostrarIndividuais !== false, v => { c.mostrarIndividuais = v; }))),
        c.formato === 'metacognicao' && caixaOpcoes(marcar('A certeza conta pontos (certeza: +3 ou −2; dúvida: +2 ou 0; chute: +1 ou 0)', c.pontuarConfianca !== false, v => { c.pontuarConfianca = v; }),
          marcar('Ao encerrar, o telão mostra a calibração da turma', c.mostrarCalibracao !== false, v => { c.mostrarCalibracao = v; }))),
      c.formato === 'ramificado' ? cenarios(e) : ctx.editorPerguntas(e, { explicacao: true }),
      campo('Explicação para a discussão (opcional)', r.explicacao || '', v => { r.explicacao = v; }, { area: true, linhas: 2 }));
    function trocar(v) {
      c.formato = v;
      if (v === 'ramificado') { delete c.perguntas; delete r.perguntas; c.cenarios ||= [{ id: 's1', texto: '', final: false, opcoes: [{ id: 'o1', texto: '', destino: 's2', feedback: '' }, { id: 'o2', texto: '', destino: 's3', feedback: '' }] }, { id: 's2', texto: '', final: true, desfecho: 'bom', opcoes: [] }, { id: 's3', texto: '', final: true, desfecho: 'ruim', opcoes: [] }]; }
      else { delete c.cenarios; c.perguntas ||= [{ id: 'p1', enunciado: '', alternativas: ['a', 'b', 'c', 'd'].map(l => ({ id: l, texto: '' })) }]; }
      if (v === 'equipe') { c.consenso ||= 'lider'; c.mostrarIndividuais ??= true; } else { delete c.consenso; delete c.mostrarIndividuais; }
      if (v === 'metacognicao') { c.pontuarConfianca ??= true; c.mostrarCalibracao ??= true; e.participacao.organizacao = 'individual'; e.participacao.envio = 'individual'; }
      else { delete c.pontuarConfianca; delete c.mostrarCalibracao; e.participacao.organizacao = 'grupos'; e.participacao.envio = 'representante'; }
    }
  }
  function cenarios(e) {
    const cs = e.config.cenarios, probs = problemasRamos(cs);
    const rotulo = (x, i) => i === 0 ? 'Início' : x.final ? `Final ${i} (${{ bom: 'bom', neutro: 'neutro', ruim: 'ruim' }[x.desfecho || 'neutro']})` : `Cenário ${i}`;
    return h('div', { class: 'cartao' }, h('h3', {}, `Cenários (${cs.length})`),
      h('p', { class: 'sutil' }, 'O primeiro é o início. Cada opção leva a outro cenário ou a um final. Os grupos só veem o cenário em que estão.'),
      cs.map((x, i) => h('div', { class: 'pergunta-edit cenario-edit' + (x.final ? ' final' : '') },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' } }, h('strong', {}, rotulo(x, i)),
          i > 0 && h('div', { class: 'mini' },
            seletor('', x.final ? 'final' : 'cenario', [['cenario', 'Cenário'], ['final', 'Final']], v => { x.final = v === 'final'; if (x.final) { x.desfecho ||= 'neutro'; x.opcoes = []; } else { delete x.desfecho; if (!x.opcoes.length) x.opcoes = [{ id: 'o1', texto: '', destino: '', feedback: '' }, { id: 'o2', texto: '', destino: '', feedback: '' }]; } }, { redesenhar: true }),
            x.final && seletor('', x.desfecho || 'neutro', [['bom', 'Bom'], ['neutro', 'Neutro'], ['ruim', 'Ruim']], v => { x.desfecho = v; }, { redesenhar: true }),
            h('button', { class: 'btn perigo pequeno', onclick: () => mudar(() => { cs.splice(i, 1); cs.forEach(y => y.opcoes.forEach(o => { if (o.destino === x.id) o.destino = ''; })); }) }, '✕'))),
        h('textarea', { rows: 2, maxlength: 600, placeholder: x.final ? 'O que aconteceu no fim (ex.: “O paciente confiou na equipe e aceitou o tratamento.”)' : 'A situação que o grupo lê', oninput: ev => { x.texto = ev.target.value; tocar(); } }, x.texto),
        !x.final && x.opcoes.map((o, k) => h('div', { class: 'opcao-ramo' },
          h('input', { value: o.texto, maxlength: 200, placeholder: `Opção ${k + 1}`, 'aria-label': `Opção ${k + 1} de ${rotulo(x, i)}`, oninput: ev => { o.texto = ev.target.value; tocar(); } }),
          h('select', { 'aria-label': 'Leva para', onchange: ev => { o.destino = ev.target.value; tocar(); } }, h('option', { value: '' }, 'leva para…'), cs.map((y, n) => y.id !== x.id && h('option', { value: y.id, selected: o.destino === y.id }, rotulo(y, n)))),
          h('input', { value: o.feedback || '', maxlength: 300, placeholder: 'Comentário depois da escolha (opcional)', 'aria-label': 'Comentário', oninput: ev => { o.feedback = ev.target.value; tocar(); } }),
          h('button', { class: 'btn perigo pequeno', disabled: x.opcoes.length <= 2, onclick: () => mudar(() => { x.opcoes.splice(k, 1); }) }, '✕'))),
        !x.final && h('button', { class: 'btn pequeno', disabled: x.opcoes.length >= 5, onclick: () => mudar(() => { x.opcoes.push({ id: novoId('o', idsDe(x.opcoes)), texto: '', destino: '', feedback: '' }); }) }, '＋ Opção'))),
      h('div', { class: 'linha-botoes' },
        h('button', { class: 'btn', onclick: () => mudar(() => { cs.push({ id: novoId('s', idsDe(cs)), texto: '', final: false, opcoes: [{ id: 'o1', texto: '', destino: '', feedback: '' }, { id: 'o2', texto: '', destino: '', feedback: '' }] }); }) }, '＋ Cenário'),
        h('button', { class: 'btn', onclick: () => mudar(() => { cs.push({ id: novoId('s', idsDe(cs)), texto: '', final: true, desfecho: 'bom', opcoes: [] }); }) }, '＋ Final')),
      probs.length ? h('ul', { class: 'diag' }, probs.map(p => h('li', { class: 'aviso' }, p))) : h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'A árvore está completa: todo caminho chega a um final.'));
  }

  // ======================================================== Análise de imagem
  function analise(e) {
    const c = e.config, r = R(e);
    const arquivo = h('input', { type: 'file', accept: c.midia === 'modelo3d' ? '.glb,model/gltf-binary' : 'image/*' });
    arquivo.onchange = async () => {
      const f = arquivo.files[0]; if (!f) return;
      try {
        if (c.midia === 'modelo3d') {
          if (f.size > 700000) throw new Error('Modelo grande demais para enviar (máx. ~700 KB). Publique o .glb (por exemplo no GitHub Pages do lab-ra) e informe o endereço.');
          const dados = await new Promise((ok, falha) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).replace(/^data:[^;]*;/, 'data:model/gltf-binary;')); fr.onerror = falha; fr.readAsDataURL(f); });
          c.modelo = { dados };
        } else { ctx.avisoGeral('Reduzindo a imagem…'); c.imagem = await ctx.comprimirImagem(f); ctx.avisoGeral(`Imagem pronta (${Math.round(c.imagem.dados.length / 1024)} KB).`, 'ok'); }
        mudar(() => {});
      } catch (err) { ctx.avisoGeral(err.message, 'erro'); }
    };
    const tarefas = c.midia === 'modelo3d' ? [['perguntas', 'Perguntas sobre o modelo'], ['observar', 'Observar e descrever']] : [['marcar', 'Marcar na imagem'], ['perguntas', 'Perguntas sobre a imagem'], ['observar', 'Observar e descrever']];
    return h('div', {},
      h('div', { class: 'cartao' }, h('h3', {}, 'Mídia'),
        h('div', { class: 'campos-2' },
          seletor('Tipo de mídia', c.midia, [['foto', 'Foto (lâmina, peça, documento…)'], ['grafico', 'Gráfico ou infográfico'], ['modelo3d', 'Modelo 3D (.glb)']], v => { c.midia = v; if (v === 'modelo3d') { delete c.imagem; c.modelo ||= { url: '' }; if (c.tarefa === 'marcar') trocarTarefa('perguntas'); } else delete c.modelo; }, { redesenhar: true }),
          seletor('Tarefa', c.tarefa, tarefas, v => trocarTarefa(v), { redesenhar: true })),
        c.midia === 'modelo3d'
          ? h('div', {}, campo('Endereço do modelo (.glb)', c.modelo?.url || '', v => { c.modelo = { url: v.trim() }; }, { ajuda: 'Ex.: https://drmarionascimento.github.io/lab-ra/modelos/celula.glb. Ou envie um .glb pequeno:' }), arquivo, c.modelo?.dados && h('p', { class: 'sutil' }, `Modelo enviado (${Math.round(c.modelo.dados.length / 1024)} KB).`))
          : h('div', {}, h('label', {}, c.imagem ? 'Trocar a imagem' : 'Enviar a imagem (é reduzida e comprimida automaticamente)'), arquivo),
        campo('O que fazer com a imagem', c.enunciado || '', v => { c.enunciado = v; }, { area: true, linhas: 2, max: 500 }),
        ajudaOrg(e, c.tarefa === 'observar' ? 'o grupo observa junto e o líder escreve; o texto vai para o telão.' : 'o grupo trabalha junto.', 'os representantes marcam num quadro só.')),
      c.tarefa === 'marcar' && marcadores(e),
      c.tarefa === 'perguntas' && ctx.editorPerguntas(e, { explicacao: true }),
      campo('Explicação para a discussão (opcional)', r.explicacao || '', v => { r.explicacao = v; }, { area: true, linhas: 2 }));
    function trocarTarefa(v) {
      c.tarefa = v;
      if (v === 'marcar') { c.marcadores ||= [{ id: 'm1', rotulo: '' }]; c.tolerancia ??= 8; c.distribuicao ||= 'todos'; c.tentativas ||= 'uma'; e.participacao.organizacao = e.participacao.organizacao === 'individual' ? 'grupos' : e.participacao.organizacao; }
      else { delete c.marcadores; delete c.tolerancia; delete c.distribuicao; delete c.tentativas; delete r.posicoes; }
      if (v === 'perguntas') c.perguntas ||= [{ id: 'p1', enunciado: '', alternativas: ['a', 'b', 'c', 'd'].map(l => ({ id: l, texto: '' })) }]; else { delete c.perguntas; delete r.perguntas; }
      if (v === 'observar') { e.participacao.organizacao = 'grupos'; e.participacao.envio = 'representante'; }
    }
  }
  function marcadores(e) {
    const c = e.config, r = R(e), ms = c.marcadores; r.posicoes ||= {};
    const sel = { id: ms.find(m => !r.posicoes[m.id])?.id || ms[0]?.id };
    const foto = h('div', { class: 'marcar-foto', style: { aspectRatio: c.imagem ? `${c.imagem.largura} / ${c.imagem.altura}` : '4 / 3', cursor: 'crosshair' } }, c.imagem && h('img', { src: c.imagem.dados, alt: '' }));
    const pinos = () => { foto.querySelectorAll('.marcar-pino, .marcar-esperado').forEach(x => x.remove()); ms.forEach((m, k) => { const p = r.posicoes[m.id]; if (p) foto.append(h('div', { class: 'marcar-esperado', style: { left: p.x + '%', top: p.y + '%', width: 2 * (c.tolerancia ?? 8) + '%' } }, h('span', {}, k + 1))); }); };
    foto.addEventListener('click', ev => { if (!sel.id) return; const b = foto.getBoundingClientRect(); r.posicoes[sel.id] = { x: Math.round(((ev.clientX - b.left) / b.width) * 1000) / 10, y: Math.round(((ev.clientY - b.top) / b.height) * 1000) / 10 }; tocar(); pinos(); });
    setTimeout(pinos, 0);
    return h('div', { class: 'cartao' }, h('h3', {}, `Itens para marcar (${ms.length} de no máximo 10)`),
      h('p', { class: 'sutil' }, 'Escolha um item e toque na imagem onde ele fica. O círculo mostra a tolerância. Os alunos não veem essas posições.'),
      ms.map((m, i) => h('div', { class: 'linha-item' },
        h('label', { class: 'correta', style: { margin: 0 } }, h('input', { type: 'radio', name: 'mk-' + e.id, checked: sel.id === m.id, onchange: () => { sel.id = m.id; } }), String(i + 1)),
        h('input', { value: m.rotulo, maxlength: 80, placeholder: 'Ex.: Núcleo', 'aria-label': `Item ${i + 1}`, oninput: ev => { m.rotulo = ev.target.value; tocar(); } }),
        h('span', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, h('small', { class: 'sutil' }, r.posicoes[m.id] ? '📍 marcado' : 'sem posição'), remover(ms, m, 1, () => { delete r.posicoes[m.id]; })))),
      h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', disabled: ms.length >= 10, onclick: () => mudar(() => { ms.push({ id: novoId('m', idsDe(ms)), rotulo: '' }); }) }, '＋ Adicionar item')),
      c.imagem ? foto : h('p', { class: 'aviso' }, 'Envie a imagem para marcar as posições.'),
      h('div', { class: 'campos-3' },
        campo('Tolerância (% da largura)', c.tolerancia ?? 8, v => { c.tolerancia = Math.max(2, Math.min(30, Math.round(v || 8))); pinos(); }, { tipo: 'number' }),
        seletor('Itens no grupo', c.distribuicao || 'todos', [['todos', 'Todos marcam qualquer item'], ['fracionado', 'Cada celular com alguns']], v => { c.distribuicao = v; }),
        seletor('Tentativas', c.tentativas || 'uma', [['uma', 'Uma só'], ['repetir', 'Repetir até acertar']], v => { c.tentativas = v; })));
  }

  return {
    pares, corrida, cruzadas, sequencia, quiz_pensar: pensar, analise_imagem: analise,
    configInicial(typeId) {
      const q = () => [{ id: 'p1', enunciado: '', alternativas: ['a', 'b', 'c', 'd'].map(l => ({ id: l, texto: '' })) }];
      if (typeId === 'pares') return { formato: 'ligar', enunciado: '', pares: [1, 2, 3, 4].map(i => ({ id: 'p' + i, a: '', b: '' })), distribuicao: 'todos', tentativas: 'repetir', espera: 15, segundos: 30, revelarAoEncerrar: true };
      if (typeId === 'corrida') return { formato: 'quiz', perguntas: q(), segundos: 30, embaralhar: true, powerUps: ['dobrar', 'escudo'], sequencia: 3 };
      if (typeId === 'cruzadas') return { palavras: [1, 2, 3].map(i => ({ id: 'w' + i, palavra: '', dica: '' })), dicas: 'fracionadas', grade: 'por_grupo' };
      if (typeId === 'sequencia') return { termos: lerTermos(BANCO_FISIOLOGIA).slice(0, 8), botoes: 4, velocidade: 'classica', partidas: 0, placar: 'soma', meta: 6 };
      if (typeId === 'quiz_pensar') return { formato: 'equipe', perguntas: q(), consenso: 'lider', mostrarIndividuais: true };
      if (typeId === 'analise_imagem') return { midia: 'foto', enunciado: '', tarefa: 'perguntas', perguntas: q() };
      return null;
    }
  };
}
