import { cadeadoIcone } from './lock-icons.js';
/* MOSAICO · Telão (TV): só informação pública. Nunca mostra peças nem respostas antes do fim. */
import { backend, link, EM_ENSAIO } from './backend.js';
import { $, h, limpar, aviso, corDoGrupo, iconeGrupo, contagemRegressiva, escalaVisual, pl } from './ui.js';
import { svgPeca } from './quebra-cabeca.js';
import { criarTelao } from './telao-tipos.js';
import { ilustra } from './icones.js';
import { embaralharPor } from './core/embaralhar.js';

const b = await backend();

// Tela cheia de verdade: o telão ocupa a tela inteira em que está (botão ⛶ ou tecla F).
async function alternarTelaCheia() {
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch { /* navegador sem tela cheia */ }
}
$('telaCheia').onclick = alternarTelaCheia;

/* Caber na tela: o telão nunca corta conteúdo. As medidas acompanham a tela (vw/vh), mas uma TV com zoom,
   escala do Windows ou formato diferente de 16:9 pode deixar o conteúdo maior que o espaço. Nesse caso,
   tudo encolhe junto (--ajuste) até caber inteiro. */
let pedidoCaber = 0;
function caber() {
  cancelAnimationFrame(pedidoCaber);
  pedidoCaber = requestAnimationFrame(() => {
    const raiz = document.documentElement, centro = $('centro');
    const passou = () => centro.scrollHeight > centro.clientHeight + 1 || centro.scrollWidth > centro.clientWidth + 1
      || document.querySelector('.telao-palco').scrollHeight > innerHeight + 1 || raiz.scrollWidth > innerWidth + 1;
    let a = 1; raiz.style.setProperty('--ajuste', a);
    while (passou() && a > 0.45) { a = Math.round((a - 0.05) * 100) / 100; raiz.style.setProperty('--ajuste', a); }
  });
}
addEventListener('resize', caber);
document.addEventListener('fullscreenchange', caber);
if ('ResizeObserver' in window) new ResizeObserver(caber).observe(document.documentElement);
document.fonts?.ready?.then(caber);
addEventListener('keydown', e => { if ((e.key === 'f' || e.key === 'F') && !(e.target instanceof HTMLInputElement)) alternarTelaCheia(); });
let codigo = null, sala = null, relogio = null, revelacao = null, inscRevelacao = null, revelacaoDe = null;
const ordemDaSala = (opcoes, enunciado) => embaralharPor(opcoes, codigo + '|' + (enunciado || ''));   // a mesma ordem dos celulares
const TT = criarTelao({ sala: () => sala, revelacao: () => revelacao, ordemDaSala });

const inicial = new URLSearchParams(location.search).get('sala');
if (inicial) abrir(inicial);
else {
  // Digitou os 6 números: abre sozinho (sem precisar clicar em Mostrar).
  $('abrir').onclick = () => abrir($('codigo').value.trim());
  $('codigo').addEventListener('input', ev => { const v = ev.target.value.replace(/\D/g, '').slice(0, 6); ev.target.value = v; if (v.length === 6) abrir(v); });
  $('codigo').addEventListener('keydown', ev => { if (ev.key === 'Enter') abrir($('codigo').value.trim()); });
  $('codigo').focus();
}

async function abrir(c) {
  if (!/^\d{6}$/.test(c)) return aviso($('avisoTelao'), 'Informe o código de 6 números.', 'erro');
  try {
    await b.identificar();
    if (!(await b.lerSala(c))) throw new Error('Sala não encontrada.');
    codigo = c;
    try { history.replaceState(null, '', location.pathname + '?' + new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(location.search)), sala: c })); } catch {}   // recarregar a página mantém a sala
    b.observarSala(c, s => {
      sala = s;
      // todo montado (só quando quem conduz revela, ao encerrar a montagem)
      const alvo = s?.revelacao || null;
      if (alvo !== revelacaoDe) { inscRevelacao?.(); inscRevelacao = null; revelacao = null; revelacaoDe = alvo; if (alvo) inscRevelacao = b.observarPacote(c, 'revelacao', p => { revelacao = p; render(); }, () => {}); }
      render();
    }, () => {});
    clearInterval(relogio); relogio = setInterval(atualizarRelogio, 1000);
  } catch (e) { aviso($('avisoTelao'), e.message, 'erro'); }
}

const nomeGrupo = g => sala.publico.grupos.find(x => x.id === g)?.nome || g;

function render() { desenhar(); caber(); }
function desenhar() {
  const c = $('centro');
  if (!sala || sala.status !== 'open') { $('cabecalho').textContent = ''; return limpar(c, h('h1', {}, 'Sala encerrada'), h('p', {}, 'Obrigado!')); }
  const p = sala.publico;
  $('cabecalho').textContent = p.titulo + ' · sala ' + codigo;
  $('rodape').textContent = `${pl(Object.keys(sala.nomes || {}).length, 'participante')}`;

  if (sala.fase === 'lobby') {
    const url = link('participar.html', { sala: codigo });
    const qr = h('div', { class: 'qr' }); qr.innerHTML = window.MosaicoQR.svg(url, { nivel: 'M', margem: 2, rotulo: 'QR Code para entrar na sala' });
    return limpar(c,
      h('h1', {}, p.titulo),
      h('div', { class: 'telao-entrada' }, qr,
        h('div', {}, h('p', {}, 'Aponte a câmera para o QR Code ou acesse o endereço e digite o código:'),
          h('p', { class: 'sutil' }, url.replace(/\?.*$/, '')), h('div', { class: 'codigo' }, codigo),
          h('p', { class: 'sutil' }, sala.entradaAberta ? 'Entrada aberta' : 'Entrada fechada'))),
      EM_ENSAIO && h('p', { class: 'aviso faixa-simulacao', 'data-tipo': 'alerta' }, 'Simulação: esta sala existe só neste computador. O QR não funciona em celulares de verdade.'),
      p.introducao && h('p', {}, p.introducao));
  }
  if (sala.fase === 'grupos') {
    return limpar(c, h('h1', {}, 'Encontre seu grupo'), p.perguntaCentral && h('p', {}, p.perguntaCentral), gradeGrupos());
  }
  if (sala.fase === 'etapa' || sala.fase === 'revisao') {
    const info = sala.etapaInfo || {};
    return limpar(c,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1em' } },
        h('h1', { class: 'titulo-etapa' }, ilustra(info.typeId, 96), info.titulo), h('span', { class: 'relogio', id: 'relogio' }, sala.fase === 'revisao' ? 'Encerrada' : '')),
      info.instrucao && h('p', {}, info.instrucao),
      sala.fase === 'revisao' && revelacao && revelacao.tipo !== 'midia' && revelacao.etapaId === sala.revelacao ? todoMontado()
        : sala.fase === 'revisao' && sala.etapaInfo?.typeId === 'quiz_grupos' ? quiz()
        : sala.fase === 'revisao' && sala.etapaInfo?.typeId === 'cadeado_grupo' ? cadeados()
        : sala.fase === 'revisao' && (sala.etapaInfo?.quadro || sala.etapaInfo?.typeId === 'cartoes_arrastar') && sala.jogo?.tipo === 'cartoes' ? cartoesRevisao()
        : sala.fase === 'revisao' && TT.tem(sala.etapaInfo) && sala.jogo?.final ? TT.revisao() : progresso(),
      sala.escala != null && h('div', {}, h('small', {}, 'Desempenho da turma'), escalaVisual(sala.escala)));
  }
  if (sala.fase === 'final') {
    const f = sala.final || {}, m = f.meta;
    return limpar(c,
      h('h1', {}, m ? (m.atingida ? 'A turma atingiu a meta!' : 'Meta não atingida desta vez') : 'Atividade concluída'),
      m && h('p', {}, `${pl(m.acertos, 'acerto')} em ${pl(m.total, 'resposta')} · meta de ${Math.round(m.limiar * 100)}%`),
      h('div', { style: { display: 'grid', gap: '.8em', overflow: 'auto' } },
        (f.explicacoes || []).map(e => h('div', { class: 'explicacao' }, h('strong', {}, e.titulo + ': '), e.resposta && h('span', {}, e.resposta + ' — '), e.explicacao))));
  }
  limpar(c);
}

function gradeGrupos() {
  return h('div', { class: 'grade-grupos' }, sala.publico.grupos.map(g => {
    const membros = sala.composicao?.[g.id] || [], rep = sala.representantes?.[g.id];
    return h('div', { class: 'grupo', style: { '--cor': corDoGrupo(sala.publico.grupos, g.id) } },
      h('h3', { class: 'titulo-grupo' }, iconeGrupo(sala.publico.grupos, g.id, 64), g.nome),
      membros.length ? h('ul', {}, membros.map(u => h('li', { class: u === rep ? 'eh-rep' : null }, sala.nomes?.[u] || '—', u === rep && h('span', { class: 'rep' }, 'REPRESENTANTE'))))
        : h('p', { class: 'sutil' }, 'Sem participantes'));
  }));
}

function todoMontado() {
  if (revelacao.tipo === 'imagem') return h('div', { style: { display: 'flex', justifyContent: 'center', minHeight: 0 } }, h('img', { src: revelacao.dados, alt: 'Imagem montada', style: { maxWidth: '100%', maxHeight: '60vh', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,.5)' } }));
  return h('div', {}, h('p', { class: 'sutil' }, 'Na ordem certa:'), h('div', { class: 'pecas-fila', style: { justifyContent: 'center' } },
    revelacao.pecas.map((t, i) => h('div', { style: { width: '7.5em' } }, svgPeca({ texto: t, aspecto: 1.25, bordas: { topo: 0, base: 0, esquerda: i ? -1 : 0, direita: i < revelacao.pecas.length - 1 ? 1 : 0 } })))),
    h('p', { style: { fontSize: '1.3em', fontWeight: 700, textAlign: 'center', marginTop: '.6em' } }, revelacao.pecas.join(' ')));
}

function progresso() {
  if (sala.etapaInfo?.typeId === 'cadeado_grupo') return cadeados();
  if (sala.etapaInfo?.typeId === 'quiz_grupos') return quiz();
  if (sala.etapaInfo?.quadro || sala.etapaInfo?.typeId === 'cartoes_arrastar') return cartoesAoVivo();
  if (TT.tem(sala.etapaInfo)) return TT.aoVivo();
  if (sala.etapaInfo?.typeId === 'montagem_pecas') return h('div', { class: 'cartao', style: { textAlign: 'center' } },
    h('p', { style: { fontSize: '2em', fontWeight: 800, margin: 0 } }, '🧩 Montem os celulares na ordem certa'),
    h('p', { class: 'sutil' }, sala.etapaInfo.organizacao === 'representantes' ? 'Representantes: juntem-se à frente com os celulares.' : 'Cada grupo junta os próprios celulares.'));
  const pr = sala.progresso || {};
  if (sala.etapaInfo?.organizacao === 'individual')
    return h('p', {}, h('strong', {}, `${pr.enviados || 0} de ${pr.esperados || 0}`), ' responderam');
  return h('div', { class: 'progresso' }, sala.publico.grupos.map(g => {
    const ok = pr.porGrupo?.[g.id], vazio = !(sala.composicao?.[g.id] || []).length && !sala.executores?.[g.id];
    return h('span', { class: 'chip', style: { '--cor': corDoGrupo(sala.publico.grupos, g.id) } }, iconeGrupo(sala.publico.grupos, g.id, 44), g.nome,
      h('span', { class: 'estado ' + (ok ? 'ok' : vazio ? 'vazio' : 'pend') }, ok ? 'enviou' : vazio ? 'sem grupo' : 'pensando'));
  }));
}

function atualizarRelogio() {
  const r = document.getElementById('relogio');
  if (r && sala?.fase === 'etapa') r.textContent = contagemRegressiva(sala.etapaInfo?.inicio, sala.etapaInfo?.tempoMin, sala.etapaInfo?.pausadoEm);
  const q = document.getElementById('relogioQuiz'), j = sala?.jogo;
  if (q && q.dataset.ate) { const s = Math.max(0, Math.ceil((Number(q.dataset.ate) - Date.now()) / 1000)); q.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; q.classList.toggle('acabando', s <= 10); }
  else if (q && j?.inicio) { const s = Math.max(0, Math.ceil((j.inicio + j.segundos * 1000 - Date.now()) / 1000)); q.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; q.classList.toggle('acabando', s <= 10); }
}

// ---------- cadeado do grupo: um cadeado por grupo, com o progresso (sem perguntas nem respostas) ----------
function cadeados() {
  const pr = sala.progresso || {}, por = pr.porGrupo || {}, frag = pr.regra === 'fragmentos';
  const grupos = sala.publico.grupos.filter(g => por[g.id]);
  if (!grupos.length) return h('p', { class: 'sutil' }, 'Distribuindo as perguntas…');
  return h('div', {},
    h('p', { style: { fontSize: '1.3em', fontWeight: 700, margin: '0 0 .6em', textAlign: 'center' } }, frag ? '🔑 Cada acerto revela um pedaço do código. Juntem os pedaços!' : [cadeadoIcone(), ' Cada um responde a sua pergunta. O grupo abre o cadeado junto!']),
    h('div', { class: 'cadeados' }, grupos.map(g => {
      const x = por[g.id], fr = frag ? x.acertos / Math.max(1, x.total) : x.acertos / Math.max(1, x.necessarios);
      return h('div', { class: 'cadeado-telao' + (x.destravado ? ' aberto' : ''), style: { '--cor': corDoGrupo(sala.publico.grupos, g.id) } },
        h('div', { class: 'cadeado-icone' }, cadeadoIcone(x.destravado)),
        h('div', { class: 'titulo-grupo' }, iconeGrupo(sala.publico.grupos, g.id, 40), g.nome),
        h('div', { class: 'cadeado-barra' }, h('span', { style: { width: Math.round(100 * Math.min(1, fr)) + '%' } })),
        h('small', {}, x.destravado ? `Aberto · ${x.posicao}º` : frag ? `${x.acertos} de ${x.total} pedaços` : `${x.acertos} de ${x.necessarios} acertos`));
    })));
}

const vezDo = n => /^grupo\b/i.test(n) ? 'Vez do ' + n : 'Vez do grupo ' + n;
// ---------- quiz entre grupos: de quem é a vez, placar e (depois) a resposta ----------
function quiz() {
  const j = sala.jogo || {}, gs = sala.publico.grupos;
  const placar = h('div', { class: 'quiz-placar telao-placar' }, gs.filter(x => (sala.composicao?.[x.id] || []).length || j.placar?.[x.id] !== undefined)
    .sort((x, y) => (j.placar?.[y.id] || 0) - (j.placar?.[x.id] || 0))
    .map(x => h('span', { class: 'chip', style: { '--cor': corDoGrupo(gs, x.id) } }, iconeGrupo(gs, x.id, 40), x.nome, h('strong', {}, ' ' + (j.placar?.[x.id] || 0)))));
  if (!j.n) return h('div', {}, h('p', { style: { fontSize: '1.6em', textAlign: 'center' } }, 'Preparem-se: o sistema vai sortear o grupo da vez.'), placar);
  const nome = nomeGrupo(j.grupoId), cor = corDoGrupo(gs, j.grupoId);
  const cab = h('div', { class: 'quiz-vez-telao', style: { '--cor': cor } }, iconeGrupo(gs, j.grupoId, 120),
    h('div', {}, h('small', {}, `Pergunta ${j.n} de ${j.total}${j.repasseDe ? ' · repassada por ' + nomeGrupo(j.repasseDe) : ''}`),
      h('div', { class: 'quiz-nome' }, j.estado === 'respondendo' ? vezDo(nome) : { certo: nome + ' acertou!', errado: nome + ' errou', tempo: 'Tempo esgotado para ' + nome, encerrada: 'Pergunta encerrada' }[j.estado] || nome)),
    j.estado === 'respondendo' ? h('span', { class: 'relogio', id: 'relogioQuiz' }, '') : h('span', { class: 'quiz-sinal' }, j.estado === 'certo' ? '✔' : '✗'));
  const corpo = [];
  if (j.enunciado) corpo.push(h('div', { class: 'explicacao', style: { fontSize: '1.1em' } }, h('strong', {}, j.enunciado), h('ol', { type: 'A' }, ordemDaSala(j.alternativas, j.enunciado).map(a => h('li', {}, a.texto)))));
  else if (j.estado === 'respondendo') corpo.push(h('p', { class: 'sutil', style: { textAlign: 'center' } }, 'A pergunta está só no celular do líder do grupo.'));
  if (j.revelacao?.texto && j.estado !== 'respondendo') corpo.push(h('div', { class: 'explicacao' }, h('strong', {}, 'Resposta: ' + j.revelacao.texto), j.revelacao.explicacao && h('p', {}, j.revelacao.explicacao)));
  setTimeout(atualizarRelogio, 0);
  return h('div', { style: { display: 'grid', gap: '1em' } }, cab, ...corpo, placar);
}

// ---------- cartões de arrastar ----------
const gs = () => sala.publico.grupos;
const rotuloConj = g => g === 'representantes'
  ? h('div', { class: 'titulo-grupo' }, h('span', { style: { fontSize: '1.6em' } }, '🤝'), 'Representantes')
  : h('div', { class: 'titulo-grupo' }, iconeGrupo(gs(), g, 40), nomeGrupo(g));
const FRASE = { ordenar: '🧩 Ponham os cartões na ordem certa', classificar: '🗂️ Separem os cartões nas colunas', termometro: '🌡️ Posicionem cada caso na linha', imagem: '📍 Marquem na imagem onde fica cada item' };

/** Durante a etapa: só o andamento de cada quadro (nada das posições, para ninguém copiar). */
function cartoesAoVivo() {
  const pr = sala.progresso || {}, por = pr.porGrupo || {};
  const ids = Object.keys(por);
  if (!ids.length) return h('p', { class: 'sutil' }, 'Distribuindo os cartões…');
  const m = TT.midia();
  return h('div', {},
    m && h('div', { class: 'telao-midia-caixa' }, m),
    h('p', { style: { fontSize: '1.3em', fontWeight: 700, margin: '0 0 .6em', textAlign: 'center' } }, sala.etapaInfo?.typeId === 'pares' ? '🔗 Liguem cada cartão ao seu par' : FRASE[pr.formato] || ''),
    h('div', { class: 'cadeados' }, ids.map(g => {
      const x = por[g], fr = x.colocados / Math.max(1, x.total), espera = !x.travado && x.confirmacoes > 0 && Date.now() < x.liberaEm;
      return h('div', { class: 'cadeado-telao' + (x.concluido ? ' aberto' : ''), style: { '--cor': g === 'representantes' ? '#ff8a3d' : corDoGrupo(gs(), g) } },
        rotuloConj(g),
        h('div', { class: 'cadeado-barra' }, h('span', { style: { width: Math.round(100 * fr) + '%' } })),
        h('small', {}, x.concluido ? (x.posicao ? `✔ Certo · ${x.posicao}º` : '✔ Fechado') : x.travado ? 'Enviado' : espera ? 'Ajustando para tentar de novo' : x.confirmacoes ? 'Tentando de novo' : `${x.colocados} de ${x.total} colocados`));
    })));
}

/** Depois de encerrar: resultado de cada quadro, a resposta esperada e, no termômetro, onde cada grupo pôs cada caso. */
function cartoesRevisao() {
  const j = sala.jogo, por = j.porGrupo || {};
  const placar = !j.semGabarito && h('div', { class: 'quiz-placar telao-placar' }, Object.entries(por).map(([g, x]) =>
    h('span', { class: 'chip', style: { '--cor': g === 'representantes' ? '#ff8a3d' : corDoGrupo(gs(), g) } }, g === 'representantes' ? '🤝' : iconeGrupo(gs(), g, 40), g === 'representantes' ? 'Representantes' : nomeGrupo(g),
      h('strong', {}, ' ' + (x.confirmou ? `${x.acertos}/${x.total}` : '—') + (x.concluido ? ' ✔' : '')))));
  if (j.formato === 'termometro') {
    const lista = (j.distribuicao || []).slice(0, 8);
    return h('div', { class: 'termo-telao' },
      h('div', { class: 'termo-polos' }, h('span', {}, '◀ ' + (j.polos?.esquerda || '')), h('span', {}, (j.polos?.direita || '') + ' ▶')),
      lista.map((c, i) => h('div', { class: 'termo-linha-telao' },
        h('div', { class: 'termo-rotulo' }, c.texto, i === 0 && c.divergencia >= 30 && h('span', { class: 'etiqueta-div' }, 'maior divergência')),
        h('div', { class: 'termo-trilha' },
          h('div', { class: 'termo-faixa' }),
          c.esperado !== undefined && h('div', { class: 'termo-esperado', style: { left: Math.max(0, c.esperado - (j.margem ?? 15)) + '%', width: (Math.min(100, c.esperado + (j.margem ?? 15)) - Math.max(0, c.esperado - (j.margem ?? 15))) + '%' } }),
          c.pontos.map((p, k) => h('div', { class: 'termo-ponto', style: { left: p.pos + '%', top: (k % 3) * 22 - 22 + '%' } },
            p.conj === 'representantes' ? h('span', {}, '🤝') : iconeGrupo(gs(), p.conj, 34)))))),
      placar);
  }
  const corpo = [];
  if (j.formato === 'imagem') {
    const img = revelacao?.tipo === 'midia' ? revelacao.imagem : null;
    const prop = img?.largura && img?.altura ? img.largura / img.altura : 4 / 3;
    corpo.push(h('div', { class: 'marcar-foto telao-marcar', style: { aspectRatio: `${prop}`, width: `min(60vw, ${Math.round(38 * prop)}vh)` } }, img && h('img', { src: img.dados, alt: '' }),
      ...(j.marcadores || []).flatMap((mk, k) => [
        ...(mk.esperado ? [h('div', { class: 'marcar-esperado', style: { left: mk.esperado.x + '%', top: mk.esperado.y + '%', width: 2 * (j.tolerancia || 8) + '%' } }, h('span', {}, k + 1))] : []),
        ...mk.pontos.map(p => h('div', { class: 'marcar-pino', style: { left: p.x + '%', top: p.y + '%', '--cor': p.conj === 'representantes' ? '#ff8a3d' : corDoGrupo(sala.publico.grupos, p.conj) } }, h('span', {}, k + 1)))])),
      h('div', { class: 'marcar-itens', style: { justifyContent: 'center' } }, (j.marcadores || []).map((mk, k) => h('span', { class: 'marcar-item' }, h('span', { class: 'n' }, k + 1), mk.rotulo))));
  }
  if (j.pares) corpo.push(h('div', { class: 'pares-telao' }, j.pares.map(p => h('div', {}, h('span', { class: 'cartao-arr' }, p.a), h('span', { class: 'seta' }, '↔'), h('span', { class: 'cartao-arr' }, p.b)))));
  if (j.trechos) corpo.push(h('div', { class: 'cadeia-telao' }, j.trechos.map((t, k) => [k > 0 && h('span', { class: 'seta' }, '→'),
    h('span', { class: 'trecho', style: { '--cor': corDoGrupo(sala.publico.grupos, t.grupo) } }, iconeGrupo(sala.publico.grupos, t.grupo, 28), t.cartoes.map((x, i) => [i > 0 && h('span', { class: 'seta' }, '→'), h('span', { class: 'cartao-arr' }, x)]))])));
  else if (j.ordem) corpo.push(h('div', {}, h('p', { class: 'sutil', style: { textAlign: 'center' } }, 'Ordem esperada'),
    h('div', { class: 'cadeia-telao' }, j.ordem.map((t, i) => [i > 0 && h('span', { class: 'seta' }, '→'), h('span', { class: 'cartao-arr' }, t)]))));
  if (j.colunas) corpo.push(h('div', { class: 'cartoes-colunas telao-colunas', style: { '--n': j.colunas.length } }, j.colunas.map(c =>
    h('div', { class: 'cartoes-coluna' }, h('h4', {}, c.titulo), h('div', { class: 'cartoes-lista' }, c.cartoes.map(t => h('span', { class: 'cartao-arr' }, t)))))));
  return h('div', { style: { display: 'grid', gap: '1em' } }, ...corpo, placar);
}
