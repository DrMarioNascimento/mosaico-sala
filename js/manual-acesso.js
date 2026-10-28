/* Mosaico Sala · Manual do professor
   O texto do manual NÃO está neste site nem no repositório: fica no Firestore (manual/atual), e as regras
   do servidor só deixam ler quem está na lista de mestres. Esta página é só a moldura: pede o login,
   busca o texto e mostra. Para publicar uma versão nova: Planejamento → Administração → Publicar manual. */
import { backend } from './backend.js';

const $ = id => document.getElementById(id);
const aviso = (t, botao = true) => {
  $('acessoManual').hidden = false; $('entrarManual').hidden = !botao;
  const a = $('avisoManual'); a.hidden = !t; a.textContent = t || '';
};

let b = null;
try { b = await backend(); } catch { /* sem internet para carregar o login */ }

/** Busca o texto no servidor e mostra. Recusa = conta fora da lista de mestres. */
async function abrir() {
  aviso('Carregando o manual…', false);
  let m;
  try { m = await b.lerManual(); }
  catch (e) {
    const recusado = e?.code === 'permission-denied' || /permission/i.test(e?.message || '');
    return aviso(recusado ? 'O manual é só para professores autorizados. Peça ao administrador para incluir a sua conta na lista de mestres.' : 'Sem conexão para buscar o manual. Confira a internet e recarregue a página.', false);
  }
  if (!m?.html) return aviso('O manual ainda não foi publicado. Administradores: Planejamento → Administração → Publicar manual.', false);
  const molde = document.createElement('template'); molde.innerHTML = m.html;
  molde.content.querySelectorAll('script, iframe, object, embed').forEach(x => x.remove());   // só texto e imagens
  $('conteudoManual').replaceChildren(molde.content);
  document.body.classList.remove('manual-fechado'); $('acessoManual').hidden = true;
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

if (!b) aviso('Sem conexão para confirmar o login. Confira a internet e recarregue a página.', false);
else if (await b.contaAtual().catch(() => null)) abrir();
else {
  aviso('', true);
  $('entrarManual').onclick = () => {
    const p = b.entrarGoogle();     // sem await antes: o iPhone exige o pop-up direto no toque
    $('entrarManual').disabled = true;
    p.then(abrir).catch(e => {
      $('entrarManual').disabled = false;
      aviso(e?.code === 'auth/popup-closed-by-user' ? 'Login cancelado.' : e?.code === 'auth/popup-blocked' ? 'O navegador bloqueou a janela do Google. Permita pop-ups e tente de novo.' : 'Não foi possível entrar. Confira a internet.');
    });
  };
}
