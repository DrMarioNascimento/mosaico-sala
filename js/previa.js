/* MOSAICO · Ver como fica (aberta pelo Planejamento)
   Tudo em modo ensaio, neste navegador: a condução (celular), o telão e uma turma
   simulada entram na mesma sala, já com a atividade que está sendo editada. */
import { link, EM_ENSAIO } from './backend.js';

if (!EM_ENSAIO) { const u = new URL(location.href); u.searchParams.set('ensaio', '1'); location.replace(u.href); }
const $ = id => document.getElementById(id);
let codigo = null, esperaSala = null;
const Q = new URLSearchParams(location.search);
const ETAPA = Q.get('etapa');   // “Ver esta etapa”: a condução já começa nela
// Compacta: embutida no Planejamento (prévia ao vivo). Só o telão e um celular; a condução roda escondida.
const COMPACTA = Q.has('compacta');
const SALA_VIVA = 'mosaico-previa-viva-sala';
if (COMPACTA) {
  document.body.classList.add('compacta');
  $('turma').previousElementSibling.textContent = 'Celular de um aluno';
  if (Q.get('qtd')) $('qtd').value = Q.get('qtd');
  if (Q.get('auto') === '0') $('auto').checked = false;
  addEventListener('message', e => { if (e.origin === location.origin && e.data?.tipo === 'mosaico-previa-recomecar') iniciar(); });
}

/** Compacta: é recarregada a cada troca de etapa; apaga a própria sala anterior (o código fica na sessão desta aba). */
function limparSalaAnterior() {
  let anterior = codigo; if (!anterior) try { anterior = sessionStorage.getItem(SALA_VIVA); } catch {}
  if (!anterior) return;
  const prefixo = 'mosaico-ensaio:rooms/' + anterior;
  for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith(prefixo)) localStorage.removeItem(k); }
}


function iniciar() {
  if (COMPACTA) limparSalaAnterior();
  codigo = null;
  $('telao').innerHTML = ''; $('turma').innerHTML = '<p class="sutil">Os participantes aparecem assim que a sala abrir.</p>';
  $('conducao').src = link('conduzir.html', { previa: '1', t: Date.now(), ...(ETAPA ? { etapa: ETAPA } : {}), ...(COMPACTA ? { fonte: 'viva' } : {}) });
  $('info').textContent = 'Abrindo a sala de ensaio…';
}

function ajustarTelao() { const f = $('telao').querySelector('iframe'); if (f) f.style.transform = `scale(${$('telao').clientWidth / 1280})`; }
addEventListener('resize', ajustarTelao);

addEventListener('message', async e => {
  if(e.origin!==location.origin || e.source!==$('conducao').contentWindow) return;
  if(e.data?.tipo==='mosaico-previa-erro'){clearTimeout(esperaSala);$('info').textContent='Não foi possível abrir o ensaio: '+e.data.mensagem;return;}
  if(e.data?.tipo!=='mosaico-previa-sala'||codigo)return;
  clearTimeout(esperaSala);
  codigo = e.data.codigo;
  if (COMPACTA) try { sessionStorage.setItem(SALA_VIVA, codigo); } catch {}
  const t = document.createElement('iframe'); t.src = link('telao.html', { sala: codigo }); t.title = 'Telão';
  $('telao').replaceChildren(t); ajustarTelao();
  $('turma').replaceChildren();
  const n = Math.min(20, Math.max(1, Number($('qtd').value) || 8));
  for (let i = 1; i <= n; i++) {
    const caixa = document.createElement('div'); caixa.className = 'pv-cel';
    const f = document.createElement('iframe'); f.title = 'Participante ' + i;
    f.src = link('participar.html', { sala: codigo, perfil: String(i), ...($('auto').checked ? { auto: '1' } : {}), ...(COMPACTA ? { explica: '0' } : {}) });
    caixa.append(f); $('turma').append(caixa);
    await new Promise(r => setTimeout(r, 250));
  }
  if (COMPACTA && window.parent !== window) window.parent.postMessage({ tipo: 'mosaico-previa-pronta' }, location.origin);
  $('info').textContent = ETAPA
    ? `Sala ${codigo} com ${n} participantes simulados. Os grupos são sorteados e a etapa começa sozinha.`
    : `Sala ${codigo} com ${n} participantes simulados. A primeira etapa começa automaticamente. Use Condução no painel do professor para encerrar a etapa e avançar.`;
});

$('auto').onchange = e => { for (const f of document.querySelectorAll('#turma iframe')) { try { f.contentWindow.mosaicoAuto?.(e.target.checked); } catch {} } };
$('recomecar').onclick = iniciar;
iniciar();
