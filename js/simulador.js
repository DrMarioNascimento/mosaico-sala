/* Mosaico Sala · Simular
   1 · Só no PC (mais usado): escolhe a atividade e abre a simulação local (previa.html): condução, telão e
       turma fictícia lado a lado, tudo neste navegador.
   2 · Com meu celular (ensaio geral): mostra o telão e vários celulares simulados entrando na sala REAL.
       Quem conduz comanda tudo pelo próprio celular. Cada celular simulado é um participante independente
       (login anônimo próprio, ?perfil=N). Telão em cima, turma embaixo. */
import { backend, link, EM_ENSAIO } from './backend.js';
import { CASOS, carregarCaso } from './casos.js';
import { validarAtividade } from './core/validacao.js';
import { h, limpar, aviso, pl } from './ui.js';
import { linkDocente } from './nav.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const b = await backend();

// ------------------------------------------------------------ modo
function mostrar(modo) {
  $('escolha').hidden = modo !== 'escolha';
  $('celular').hidden = modo !== 'celular';
  if (modo === 'celular') $('codigo').focus();
}
const modoInicial = params.get('sala') || location.hash === '#celular' ? 'celular' : 'escolha';
mostrar(modoInicial);
$('voltarEscolha').href = linkDocente('simulador.html');
$('voltarEscolha').onclick = ev => { if (!params.get('sala')) { ev.preventDefault(); history.replaceState(null, '', location.pathname + location.search); mostrar('escolha'); } };
$('irCelular').onclick = () => { history.replaceState(null, '', location.pathname + location.search + '#celular'); mostrar('celular'); };
if (EM_ENSAIO) { $('irCelular').disabled = true; $('avisoEnsaioCelular').hidden = false; }

// ------------------------------------------------------------ 1 · só no PC
/** Guarda a atividade para a simulação e abre a tela de simulação (condução + telão + turma). */
function simular(a) {
  const erros = validarAtividade(a).filter(x => x.severidade === 'erro');
  if (erros.length) return aviso($('avisoPc'), `“${a.titulo}” ainda tem ${pl(erros.length, 'item', 'itens')} a completar. Abra no Planejamento e confira a Revisão.`, 'alerta');
  try { localStorage.setItem('mosaico-previa', JSON.stringify(a)); } catch { return aviso($('avisoPc'), 'O navegador não permitiu guardar a simulação.', 'erro'); }
  location.href = 'previa.html?ensaio=1&de=simulador' + (EM_ENSAIO ? '&demonstracao=1' : '');
}
const item = (titulo, sub, acao) => h('li', {}, h('div', { class: 'tit' }, h('strong', {}, titulo), sub && h('small', {}, sub)),
  h('button', { class: 'btn primario pequeno', onclick: async ev => { ev.currentTarget.disabled = true; try { await acao(); } finally { ev.currentTarget.disabled = false; } } }, 'Simular'));

limpar($('listaModelos'), CASOS.map(c => item(c.titulo, c.resumo, async () => {
  try { simular(await carregarCaso(c.id)); } catch (e) { aviso($('avisoPc'), 'Não foi possível abrir o modelo: ' + e.message, 'erro'); }
})));

async function minhasAtividades() {
  const alvo = $('listaMinhas');
  if (EM_ENSAIO) return limpar(alvo);   // demonstração: só os modelos
  const conta = await b.contaAtual();
  if (!conta) {
    const btn = h('button', { class: 'btn', 'data-ico': 'sair' }, 'Entrar com Google para ver minhas atividades');
    btn.onclick = () => { const p = b.entrarGoogle(); btn.disabled = true; p.then(minhasAtividades).catch(() => { btn.disabled = false; }); };   // pop-up direto no toque
    return limpar(alvo, h('h3', {}, 'Minhas atividades'), btn);
  }
  let lista;
  try { lista = await b.listarBiblioteca(); } catch { return limpar(alvo); }   // conta sem biblioteca: só os modelos
  limpar(alvo, h('h3', {}, 'Minhas atividades'),
    lista.length
      ? h('ul', { class: 'sim-lista' }, lista.map(x => item(x.titulo || '(sem título)', x.minha ? '' : 'compartilhada por ' + (x.autor || 'outro professor'), async () => {
          try { const d = x.conteudo ? x : await b.lerBiblioteca(x.id); simular(JSON.parse(d.conteudo)); }
          catch (e) { aviso($('avisoPc'), 'Não foi possível abrir a atividade: ' + e.message, 'erro'); }
        })))
      : h('p', { class: 'sutil' }, 'Nenhuma atividade salva ainda. Use um modelo abaixo ou prepare a sua no Planejamento.'));
}
minhasAtividades();

// ------------------------------------------------------------ 2 · com meu celular
$('codigo').value = params.get('sala') || '';
let total = 0, codigo = null;
// Os celulares simulados focam campos dentro dos próprios iframes, e o navegador rola a página até eles,
// escondendo o telão sob a barra. Enquanto a turma entra, a página fica no topo, a menos que a pessoa role.
let rolouSozinho = false, segurarTopo = 0;
for (const ev of ['wheel', 'touchmove', 'keydown', 'pointerdown']) addEventListener(ev, () => { rolouSozinho = true; }, { passive: true });
addEventListener('scroll', () => { if (!rolouSozinho && Date.now() < segurarTopo && scrollY > 0) scrollTo(0, 0); }, { passive: true });
const manterTopo = ms => { rolouSozinho = false; segurarTopo = Date.now() + ms; scrollTo(0, 0); };

function ajustarTelao() {
  const box = $('telao'), f = box.querySelector('iframe');
  if (f) f.style.transform = `scale(${box.clientWidth / 1280})`;
}
addEventListener('resize', ajustarTelao);

function celular(n) {
  const url = link('participar.html', { sala: codigo, perfil: String(n), ...($('autoTodos').checked ? { auto: '1' } : {}) });
  const caixa = document.createElement('div'); caixa.className = 'sim-celular';
  const f = document.createElement('iframe'); f.src = url; f.title = 'Participante simulado ' + n;
  const r = document.createElement('span'); r.className = 'rotulo'; r.textContent = '#' + n;
  caixa.append(f, r); $('celulares').append(caixa);
}

$('codigo').addEventListener('input', ev => { ev.target.value = ev.target.value.replace(/\D/g, '').slice(0, 6); });
$('codigo').addEventListener('keydown', ev => { if (ev.key === 'Enter') $('iniciar').click(); });
$('iniciar').onclick = async () => {
  const c = $('codigo').value.trim();
  if (!/^\d{6}$/.test(c)) { $('info').textContent = 'Digite o código de 6 números da sala.'; return; }
  // Confere antes de encher a tela de celulares: a sala existe e está aberta?
  try { await b.identificar(); const s = await b.lerSala(c); if (!s || s.status !== 'open') { $('info').textContent = `A sala ${c} não foi encontrada ou já foi encerrada. Abra a sala no celular e confira o código.`; return; } }
  catch { $('info').textContent = 'Sem conexão com o servidor. Confira a internet.'; return; }
  codigo = c; total = 0;
  const url = new URL(location.href); url.searchParams.set('sala', c); url.hash = ''; history.replaceState(null, '', url);
  $('passosCelular').hidden = true;
  $('telao').hidden = false;
  $('telao').innerHTML = '';
  const t = document.createElement('iframe'); t.src = link('telao.html', { sala: c }); t.title = 'Telão'; t.allow = 'fullscreen'; t.allowFullscreen = true;
  $('telao').append(t); ajustarTelao();
  $('celulares').innerHTML = '';
  const n = Math.min(30, Math.max(1, Number($('qtd').value) || 12));
  manterTopo(n * 500 + 6000);
  $('info').textContent = `Entrando ${n} participantes simulados…`;
  // entradas espaçadas, como numa sala de verdade (e para não sobrecarregar o login)
  for (let i = 1; i <= n; i++) { celular(++total); await new Promise(r => setTimeout(r, 500)); }
  $('info').textContent = `${n} participantes simulados na sala ${c}. Conduza pelo celular.`;
};

$('mais').onclick = () => { if (codigo) { celular(++total); $('info').textContent = `${total} participantes simulados.`; } };

$('autoTodos').onchange = e => {
  for (const f of document.querySelectorAll('.sim-celular iframe')) { try { f.contentWindow.mosaicoAuto?.(e.target.checked); } catch {} }
};

$('escala').onchange = e => document.documentElement.style.setProperty('--esc', e.target.value);

if ($('codigo').value && params.has('auto')) $('iniciar').click();
