/* MOSAICO · Telão (TV): só informação pública. Nunca mostra peças nem respostas antes do fim. */
import { backend, link } from './backend.js';
import { $, h, limpar, aviso, corDoGrupo, iconeGrupo, contagemRegressiva, escalaVisual } from './ui.js';

const b = await backend();

// Tela cheia de verdade: o telão ocupa a tela inteira em que está (botão ⛶ ou tecla F).
async function alternarTelaCheia() {
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch { /* navegador sem tela cheia */ }
}
$('telaCheia').onclick = alternarTelaCheia;
addEventListener('keydown', e => { if ((e.key === 'f' || e.key === 'F') && !(e.target instanceof HTMLInputElement)) alternarTelaCheia(); });
let codigo = null, sala = null, relogio = null;

const inicial = new URLSearchParams(location.search).get('sala');
if (inicial) abrir(inicial); else $('abrir').onclick = () => abrir($('codigo').value.trim());

async function abrir(c) {
  if (!/^\d{6}$/.test(c)) return aviso($('avisoTelao'), 'Informe o código de 6 números.', 'erro');
  try {
    await b.identificar();
    if (!(await b.lerSala(c))) throw new Error('Sala não encontrada.');
    codigo = c;
    b.observarSala(c, s => { sala = s; render(); }, () => {});
    clearInterval(relogio); relogio = setInterval(atualizarRelogio, 1000);
  } catch (e) { aviso($('avisoTelao'), e.message, 'erro'); }
}

const nomeGrupo = g => sala.publico.grupos.find(x => x.id === g)?.nome || g;

function render() {
  const c = $('centro');
  if (!sala || sala.status !== 'open') { $('cabecalho').textContent = ''; return limpar(c, h('h1', {}, 'Sala encerrada'), h('p', {}, 'Obrigado!')); }
  const p = sala.publico;
  $('cabecalho').textContent = p.titulo + ' · sala ' + codigo;
  $('rodape').textContent = `${Object.keys(sala.nomes || {}).length} participante(s)`;

  if (sala.fase === 'lobby') {
    const url = link('participar.html', { sala: codigo });
    const qr = h('div', { class: 'qr' }); qr.innerHTML = window.MosaicoQR.svg(url, { nivel: 'M', margem: 2, rotulo: 'QR Code para entrar na sala' });
    return limpar(c,
      h('h1', {}, p.titulo),
      h('div', { class: 'telao-entrada' }, qr,
        h('div', {}, h('p', {}, 'Aponte a câmera para o QR Code ou acesse o endereço e digite o código:'),
          h('p', { class: 'sutil' }, url.replace(/\?.*$/, '')), h('div', { class: 'codigo' }, codigo),
          h('p', { class: 'sutil' }, sala.entradaAberta ? 'Entrada aberta' : 'Entrada fechada'))),
      p.introducao && h('p', {}, p.introducao));
  }
  if (sala.fase === 'grupos') {
    return limpar(c, h('h1', {}, 'Encontre seu grupo'), p.perguntaCentral && h('p', {}, p.perguntaCentral), gradeGrupos());
  }
  if (sala.fase === 'etapa' || sala.fase === 'revisao') {
    const info = sala.etapaInfo || {};
    return limpar(c,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1em' } },
        h('h1', {}, info.titulo), h('span', { class: 'relogio', id: 'relogio' }, sala.fase === 'revisao' ? 'Encerrada' : '')),
      info.instrucao && h('p', {}, info.instrucao),
      progresso(),
      sala.escala != null && h('div', {}, h('small', {}, 'Desempenho da turma'), escalaVisual(sala.escala)));
  }
  if (sala.fase === 'final') {
    const f = sala.final || {}, m = f.meta;
    return limpar(c,
      h('h1', {}, m ? (m.atingida ? 'A turma atingiu a meta!' : 'Meta não atingida desta vez') : 'Atividade concluída'),
      m && h('p', {}, `${m.acertos} acerto(s) em ${m.total} resposta(s) · meta de ${Math.round(m.limiar * 100)}%`),
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

function progresso() {
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
  if (r && sala?.fase === 'etapa') r.textContent = contagemRegressiva(sala.etapaInfo?.inicio, sala.etapaInfo?.tempoMin);
}
