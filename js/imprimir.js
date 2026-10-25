/* MOSAICO · Versão imprimível (seção 16 da especificação)
   Material de participantes por grupo + material de quem conduz em separado.
   Sem códigos visíveis nas peças. */

import { formaDoGrupo, urlIcone } from './ui.js';
import { svgPeca } from './quebra-cabeca.js';
import { pecasDeTexto, bordas, embaralharSemOrdemCerta, gradeDoCorte } from './core/montagem.js';
import { respostaEsperadaTexto } from './core/cartoes.js';
import { montarGrade } from './core/cruzadas.js';
import { respostaCerta } from './core/desafios.js';

const icone = (a, gid, tam = 44) => `<img src="${new URL(urlIcone(formaDoGrupo(a, gid).forma), location.href).href}" alt="" width="${tam}" height="${tam}" style="vertical-align:middle;margin-right:8px">`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ordem = a => [...a.etapas].sort((x, y) => x.ordem - y.ordem);

export function gerarImpressao(a) {
  const partes = [], partesDocente = [];
  const marca = `<p class="marca"><img src="${new URL('../assets/mosaico.webp', import.meta.url).href}" alt="" width="52" height="52"> <span>MOSAICO</span></p>`;
  partes.push(`<section class="folha capa">${marca}<h1>${esc(a.titulo)}</h1>
    ${a.perguntaCentral ? `<p class="pergunta">${esc(a.perguntaCentral)}</p>` : ''}
    ${a.introducao ? `<p style="white-space:pre-line">${esc(a.introducao)}</p>` : ''}
    <p class="sutil">${esc(a.publico || '')}${a.duracaoMin ? ' · ' + esc(a.duracaoMin) + ' min' : ''}</p>
    <p class="sutil">Grupos: ${a.grupos.map(g => esc(g.nome)).join(' · ')}</p>
    <p class="sutil" style="margin-top:2cm;font-size:9pt">Material gerado no MOSAICO · Sala (mosaico-sala.web.app). O conteúdo desta atividade pertence a quem a criou; a plataforma é © 2026 Prof. Mário César Nascimento, PhD — todos os direitos reservados (mosaico-sala.web.app/licenca).</p></section>`);

  for (const e of ordem(a)) {
    const cfg = e.config || {};
    if (e.typeId === 'investigacao_fragmentos') {
      for (const g of [...a.grupos].sort((x, y) => x.ordemAlocacao - y.ordemAlocacao)) {
        const pecas = a.pecas.filter(p => p.etapaId === e.id && p.destinatarios.includes(g.id));
        partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · Grupo ${esc(g.nome)}</p>
          <h2>${icone(a, g.id)}${esc(g.nome)}</h2>${g.funcao ? `<p class="sutil">${esc(g.funcao)}</p>` : ''}
          <p>${esc(e.instrucao || '')}</p>
          ${pecas.map(p => `<div class="peca">${esc(p.conteudo)}<span class="marcar">☐ usar como evidência</span></div>`).join('')}
          <h3>${esc(cfg.pergunta || '')}</h3>
          <ul class="caixas">${(cfg.hipotesesCandidatas || []).map(hp => `<li>☐ ${esc(hp.texto)}</li>`).join('')}</ul>
          ${cfg.justificativa !== 'nenhuma' ? '<p class="linhas">Justificativa:</p>' : ''}</section>`);
      }
    } else if (e.typeId === 'montagem_pecas') {
      if (cfg.modo === 'texto') {
        const textos = pecasDeTexto({ ...cfg, quantidade: 'fixa' }, 0), bs = bordas({ linhas: 1, colunas: textos.length });
        const pecas = textos.map((texto, i) => ({ texto, bordas: bs[i], aspecto: 1.25 }));
        const svg = p => svgPeca(p, { cor: '#333' }).outerHTML;
        partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · recortar e embaralhar</p><h2>${esc(e.titulo)}</h2>
          <p>${esc(e.instrucao || 'Recorte as peças e entregue embaralhadas. A turma deve colocá-las na ordem certa.')}</p>
          <div class="pecas-imp">${embaralharSemOrdemCerta(pecas).map(svg).join('')}</div></section>`);
        partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · ordem certa</h3><p>${textos.map(esc).join(' &nbsp;|&nbsp; ')}</p></div>`);
      } else if (cfg.imagem?.dados) {
        const g = gradeDoCorte(cfg.corte?.tipo || 'colunas', cfg.corte?.n || 4, cfg.corte?.colunas);
        partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · recortar nas linhas e embaralhar</p><h2>${esc(e.titulo)}</h2>
          <div class="img-corte" style="--l:${g.linhas};--c:${g.colunas}"><img src="${cfg.imagem.dados}" alt=""><div class="grade-corte"></div></div></section>`);
        partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · imagem completa</h3><img src="${cfg.imagem.dados}" alt="" style="max-width:100%"></div>`);
      }
    } else if (e.typeId === 'cadeado_grupo') {
      // papel: cartões de pergunta para recortar; no verso (ou entregue pelo professor), o pedaço do código
      const frag = cfg.regra === 'fragmentos';
      const rp = a.docente?.respostas?.[e.id] || {};
      partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · cartões para recortar (um por aluno)</p><h2><img src="${new URL('../assets/icons/locks/closed-blue.png', import.meta.url).href}" alt="" aria-hidden="true" style="display:inline-block;width:2.1em;height:2.1em;max-width:none;object-fit:contain;vertical-align:middle;flex-shrink:0"> ${esc(e.titulo)}</h2>
        <p>${esc(e.instrucao || (frag ? 'Cada aluno responde a sua pergunta. Quem acerta recebe um pedaço do código. Juntem os pedaços para abrir o cadeado.' : 'Cada aluno responde a sua pergunta. O cadeado abre quando o grupo acerta o suficiente.'))}</p>
        <div class="cartoes">${(cfg.perguntas || []).map((q, i) => `<div class="cartao-q"><small>Pergunta ${i + 1}</small><strong>${esc(q.enunciado)}</strong>
          <ul class="caixas">${q.alternativas.map((al, k) => `<li>☐ ${'ABCDE'[k]}) ${esc(al.texto)}</li>`).join('')}</ul></div>`).join('')}</div></section>`);
      if (frag) partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · pedaços do código (o professor entrega a quem acertar)</p>
        <div class="pedacos">${(cfg.fragmentos || []).map(f => `<div class="pedaco">${esc(f)}</div>`).join('')}</div></section>`);
      partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · cadeado</h3>
        ${frag ? `<p>Código: <strong>${esc(rp.codigo || '')}</strong> · pedaços na ordem: ${(cfg.fragmentos || []).map(esc).join(' | ')}</p>` : `<p>Abre com ${cfg.minAcertos > 0 ? cfg.minAcertos : 'todos os'} acerto(s) no grupo.</p>`}
        <ol>${(cfg.perguntas || []).map(q => `<li>${esc(q.enunciado)} → <strong>${esc(q.alternativas.find(o => o.id === rp.perguntas?.[q.id]?.corretaId)?.texto || '?')}</strong></li>`).join('')}</ol></div>`);
    } else if (e.typeId === 'quiz_grupos') {
      const rp = a.docente?.respostas?.[e.id] || {};
      partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · quiz entre grupos (ler em voz alta)</h3>
        <ol>${(cfg.perguntas || []).map(q => `<li>${esc(q.enunciado)}<br>${q.alternativas.map((al, k) => `${'ABCDE'[k]}) ${esc(al.texto)}`).join(' &nbsp; ')}<br>Resposta: <strong>${esc(q.alternativas.find(o => o.id === rp.perguntas?.[q.id]?.corretaId)?.texto || '?')}</strong>${rp.perguntas?.[q.id]?.explicacao ? ' — ' + esc(rp.perguntas[q.id].explicacao) : ''}</li>`).join('')}</ol>
        <table><thead><tr><th>Grupo</th><th>Pontos</th></tr></thead><tbody>${a.grupos.map(g => `<tr><td>${icone(a, g.id, 22)}${esc(g.nome)}</td><td></td></tr>`).join('')}</tbody></table></div>`);
    } else if (e.typeId === 'cartoes_arrastar') {
      const rp = a.docente?.respostas?.[e.id] || {}, cs = embaralharSemOrdemCerta(cfg.cartoes || []);
      const cab = { ordenar: 'recortar, embaralhar e pôr na ordem', classificar: 'recortar e separar nas colunas', termometro: 'marcar cada caso na linha' }[cfg.formato];
      if (cfg.formato === 'termometro') {
        partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · ${cab} (uma folha por grupo)</p><h2>${esc(e.titulo)}</h2>
          <p>${esc(e.instrucao || '')}</p>${cfg.enunciado ? `<h3>${esc(cfg.enunciado)}</h3>` : ''}
          ${cs.map(c => `<div class="termo-imp"><strong>${esc(c.texto)}</strong><div class="termo-linha-imp"><span>${esc(cfg.polos?.esquerda || '')}</span><i></i><span>${esc(cfg.polos?.direita || '')}</span></div></div>`).join('')}</section>`);
      } else {
        partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · ${cab}</p><h2>${esc(e.titulo)}</h2>
          <p>${esc(e.instrucao || '')}</p>${cfg.enunciado ? `<h3>${esc(cfg.enunciado)}</h3>` : ''}
          ${cfg.formato === 'classificar' ? `<div class="pedacos">${(cfg.colunas || []).map(c => `<div class="pedaco coluna-imp">${esc(c.titulo)}</div>`).join('')}</div>` : ''}
          <div class="pedacos">${cs.map(c => `<div class="pedaco cartao-imp">${esc(c.texto)}</div>`).join('')}</div></section>`);
      }
      const resp = respostaEsperadaTexto(cfg, rp);
      partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · cartões (${{ ordenar: 'ordenar', classificar: 'classificar', termometro: 'termômetro' }[cfg.formato] || ''})</h3><p>${resp ? '<strong>' + esc(resp) + '</strong>' : 'Só debate (sem posição esperada).'}</p>${rp.explicacao ? `<p>${esc(rp.explicacao)}</p>` : ''}</div>`);
    } else if (e.typeId === 'pares') {
      const ps = cfg.pares || [];
      const cartas = cfg.formato === 'memoria' ? embaralharSemOrdemCerta(ps.flatMap(p => [p.a, p.b])) : null;
      partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · ${cfg.formato === 'memoria' ? 'cartas para recortar (viradas para baixo)' : 'cartões para recortar e ligar'}</p><h2>${esc(e.titulo)}</h2>
        <p>${esc(e.instrucao || cfg.enunciado || '')}</p>
        ${cartas ? `<div class="pedacos">${cartas.map(t => `<div class="pedaco cartao-imp">${esc(t)}</div>`).join('')}</div>`
          : `<div class="ligar-imp"><div>${ps.map(p => `<div class="pedaco coluna-imp">${esc(p.a)}</div>`).join('')}</div><div>${embaralharSemOrdemCerta(ps).map(p => `<div class="pedaco cartao-imp">${esc(p.b)}</div>`).join('')}</div></div>`}</section>`);
      partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · pares</h3><ul>${ps.map(p => `<li>${esc(p.a)} ↔ ${esc(p.b)}</li>`).join('')}</ul></div>`);
    } else if (e.typeId === 'corrida') {
      const rp = a.docente?.respostas?.[e.id] || {};
      if (cfg.formato === 'corrente') {
        partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · corrente de causa e efeito</p><h2>${esc(e.titulo)}</h2><p>${esc(e.instrucao || 'Escolha, em cada passo, o que acontece em seguida.')}</p>
          <p class="pergunta">${esc(cfg.gatilho || '')}</p>${(cfg.elos || []).map((el, i) => `<div class="questao"><h3>${i + 1}. ${i ? 'E depois?' : 'O que acontece primeiro?'}</h3><ul class="caixas">${embaralharSemOrdemCerta([el.consequencia, ...(el.distratores || [])]).map(t => `<li>☐ ${esc(t)}</li>`).join('')}</ul></div>`).join('')}</section>`);
        partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · corrente</h3><p>${[cfg.gatilho, ...(cfg.elos || []).map(x => x.consequencia)].map(esc).join(' → ')}</p></div>`);
      } else if (cfg.formato === 'direcao') {
        partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · escolher a direção</p><h2>${esc(e.titulo)}</h2><p>${esc(e.instrucao || 'Marque se cada variável aumenta (↑), diminui (↓) ou não muda (=).')}</p>
          ${(cfg.rodadas || []).map(r => `<h3>${esc(r.estimulo)}</h3><table><thead><tr><th>Variável</th><th>↑</th><th>↓</th><th>=</th></tr></thead><tbody>${r.variaveis.map(v => `<tr><td>${esc(v.nome)}</td><td>☐</td><td>☐</td><td>☐</td></tr>`).join('')}</tbody></table>`).join('')}</section>`);
        partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · direções</h3>${(cfg.rodadas || []).map(r => `<p><strong>${esc(r.estimulo)}:</strong> ${r.variaveis.map(v => `${esc(v.nome)} ${({ sobe: '↑', desce: '↓', igual: '=' })[rp.direcoes?.[v.id]] || '?'}`).join(' · ')}</p>`).join('')}</div>`);
      } else perguntasImp(e, cfg, rp, 'quiz no próprio ritmo');
    } else if (e.typeId === 'quiz_pensar') {
      const rp = a.docente?.respostas?.[e.id] || {};
      if (cfg.formato === 'ramificado') {
        partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · cenários (o professor entrega o próximo conforme a escolha)</p><h2>${esc(e.titulo)}</h2>
          ${(cfg.cenarios || []).map((c, i) => `<div class="cartao-q"><small>${i === 0 ? 'Início' : c.final ? 'Final' : 'Cenário ' + i}</small><p>${esc(c.texto)}</p>${c.final ? '' : `<ul class="caixas">${c.opcoes.map(o => `<li>☐ ${esc(o.texto)}</li>`).join('')}</ul>`}</div>`).join('')}</section>`);
        partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · mapa da decisão</h3><ul>${(cfg.cenarios || []).filter(c => !c.final).map((c, i) => `<li>${esc(c.texto.slice(0, 60))}…<ul>${c.opcoes.map(o => { const d = cfg.cenarios.find(x => x.id === o.destino); return `<li>${esc(o.texto)} → ${d?.final ? 'FINAL ' + esc(d.desfecho || '') : esc((d?.texto || '?').slice(0, 40))}${o.feedback ? ' — ' + esc(o.feedback) : ''}</li>`; }).join('')}</ul></li>`).join('')}</ul></div>`);
      } else perguntasImp(e, cfg, rp, cfg.formato === 'equipe' ? 'em equipe: primeiro sozinho, depois o grupo' : 'responda e marque o quanto tem certeza', cfg.formato === 'metacognicao');
    } else if (e.typeId === 'cruzadas') {
      const g = montarGrade(cfg.palavras || []), nums = {};
      g.numeros.forEach((l, r) => l.forEach((n, k) => { if (n) nums[r + ',' + k] = n; }));
      const grade = cheia => `<div class="cruz-imp" style="grid-template-columns:repeat(${g.colunas},1fr)">${g.celulas.flatMap((l, r) => l.map((ch, k) => ch === null ? '<span class="v"></span>' : `<span class="c">${nums[r + ',' + k] ? `<small>${nums[r + ',' + k]}</small>` : ''}${cheia ? ch : ''}</span>`)).join('')}</div>`;
      const dicas = d => g.palavras.filter(p => p.dir === d).map(p => `<li value="${p.numero}">${esc(p.dica)} (${p.resposta.length})</li>`).join('');
      partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · palavras cruzadas</p><h2>${esc(e.titulo)}</h2>${grade(false)}
        <div class="cruz-dicas-imp"><div><h3>Horizontais →</h3><ol>${dicas('h')}</ol></div><div><h3>Verticais ↓</h3><ol>${dicas('v')}</ol></div></div></section>`);
      partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · grade resolvida</h3>${grade(true)}${g.naoCouberam.length ? `<p>Não couberam: ${g.naoCouberam.map(x => esc(x.palavra)).join(', ')}</p>` : ''}</div>`);
    } else if (e.typeId === 'sequencia') {
      const ts = cfg.termos || [];
      partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · glossário para estudar depois da sequência (Genius)</p><h2>${esc(e.titulo)} · os termos</h2>
        ${ts.some(t => t.definicao) ? `<dl class="glossario">${ts.map(t => `<dt>${esc(t.termo)}</dt>${t.definicao ? `<dd>${esc(t.definicao)}</dd>` : ''}`).join('')}</dl>` : `<p>${ts.map(t => esc(t.termo)).join(' · ')}</p>`}</section>`);
    } else if (e.typeId === 'analise_imagem') {
      const rp = a.docente?.respostas?.[e.id] || {};
      const img = cfg.imagem?.dados ? `<img src="${cfg.imagem.dados}" alt="" style="max-width:100%;border:1px solid #999">` : cfg.modelo?.url ? `<p>Modelo 3D: ${esc(cfg.modelo.url)}</p>` : '';
      partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · análise de imagem</p><h2>${esc(e.titulo)}</h2><p>${esc(cfg.enunciado || '')}</p>${img}
        ${cfg.tarefa === 'marcar' ? `<p>Marque na imagem: ${(cfg.marcadores || []).map((m, i) => `<strong>${i + 1}</strong> ${esc(m.rotulo)}`).join(' · ')}</p>` : cfg.tarefa === 'observar' ? '<p class="linhas">O que o grupo observa:</p>' : (cfg.perguntas || []).map((q, i) => `<div class="questao"><h3>${i + 1}. ${esc(q.enunciado)}</h3><ul class="caixas">${q.alternativas.map(al => `<li>☐ ${esc(al.texto)}</li>`).join('')}</ul></div>`).join('')}</section>`);
      if (cfg.tarefa === 'marcar') partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · posições</h3><div class="img-marcada">${img}${(cfg.marcadores || []).map((m, i) => rp.posicoes?.[m.id] ? `<span style="left:${rp.posicoes[m.id].x}%;top:${rp.posicoes[m.id].y}%">${i + 1}</span>` : '').join('')}</div></div>`);
      if (cfg.tarefa === 'perguntas') partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · respostas</h3><ol>${(cfg.perguntas || []).map(q => `<li>${esc(q.enunciado)} → <strong>${esc(respostaCerta(q, rp).texto)}</strong></li>`).join('')}</ol></div>`);
    } else if (e.typeId === 'comparar_hipoteses') {
      partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · uma folha por grupo</p><h2>${esc(e.titulo)}</h2>
        <p>${esc(e.instrucao || '')}</p>
        <table><thead><tr><th>Grupo</th><th>Hipótese escolhida</th><th>Evidências citadas</th></tr></thead>
        <tbody>${a.grupos.map(g => `<tr><td>${icone(a, g.id, 22)}${esc(g.nome)}</td><td></td><td></td></tr>`).join('')}</tbody></table>
        <h3>${esc(cfg.pergunta || '')}</h3>
        <ul class="caixas">${(cfg.hipotesesCandidatas || []).map(hp => `<li>☐ ${esc(hp.texto)}</li>`).join('')}</ul>
        <p class="linhas">Justificativa do grupo:</p></section>`);
    }
  }
  function perguntasImp(e, cfg, rp, sub, confianca) {
    partes.push(`<section class="folha"><p class="cab">${esc(e.titulo)} · ${esc(sub)}</p><h2>${esc(e.titulo)}</h2><p>${esc(e.instrucao || '')}</p>
      ${(cfg.perguntas || []).map((q, i) => `<div class="questao"><h3>${i + 1}. ${esc(q.enunciado)}</h3><ul class="caixas">${q.alternativas.map((al, k) => `<li>☐ ${'ABCDE'[k]}) ${esc(al.texto)}</li>`).join('')}</ul>${confianca ? '<p class="sutil">☐ Tenho certeza &nbsp; ☐ Estou em dúvida &nbsp; ☐ Chutei</p>' : ''}</div>`).join('')}</section>`);
    partesDocente.push(`<div class="questao"><h3>${esc(e.titulo)} · respostas</h3><ol>${(cfg.perguntas || []).map(q => `<li>${esc(q.enunciado)} → <strong>${esc(respostaCerta(q, rp).texto)}</strong>${rp.perguntas?.[q.id]?.explicacao ? ' — ' + esc(rp.perguntas[q.id].explicacao) : ''}</li>`).join('')}</ol></div>`);
  }
  const individuais = ordem(a).filter(e => e.typeId === 'questao_individual');
  if (individuais.length) partes.push(`<section class="folha"><p class="cab">Individual · uma folha por participante</p><h2>Questões individuais</h2>
    <p>Nome: ______________________________</p>
    ${individuais.map((e, i) => `<div class="questao"><h3>${i + 1}. ${esc(e.titulo)}: ${esc(e.config.enunciado)}</h3>
      <ul class="caixas">${e.config.alternativas.map(al => `<li>☐ ${esc(al.texto)}</li>`).join('')}</ul></div>`).join('')}</section>`);

  // Material de quem conduz (separado)
  const r = a.docente?.respostas || {};
  partes.push(`<section class="folha docente">${marca}<p class="cab">MATERIAL DE QUEM CONDUZ — NÃO DISTRIBUIR</p><h2>Respostas esperadas</h2>
    ${ordem(a).filter(e => r[e.id] && !r[e.id].perguntas && ['investigacao_fragmentos', 'comparar_hipoteses', 'questao_individual'].includes(e.typeId)).map(e => {
      const op = (e.config?.alternativas || e.config?.hipotesesCandidatas || []).find(o => o.id === r[e.id].corretaId);
      return `<div class="questao"><h3>${esc(e.titulo)}</h3><p><strong>${esc(op?.texto || r[e.id].corretaId)}</strong></p><p>${esc(r[e.id].explicacao || '')}</p></div>`;
    }).join('')}
    ${a.meta?.ativa !== false && a.meta ? `<h3>Meta</h3><p>${esc(a.meta.descricao || '')} (limiar ${Math.round(a.meta.limiar * 100)}%)</p>` : ''}
    ${partesDocente.join('')}
    ${(a.docente?.guia || []).length ? `<h3>Guia de condução</h3><ol>${a.docente.guia.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
    ${(a.docente?.pontosDeDiscussao || []).length ? `<h3>Pontos de discussão</h3><ul>${a.docente.pontosDeDiscussao.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <h3>Distribuição das peças</h3><ul>${a.grupos.map(g => `<li>${esc(g.nome)}: ${a.pecas.filter(p => p.destinatarios.includes(g.id)).length} peça(s)</li>`).join('')}</ul>
    <h3>Fontes</h3><ul>${a.fontes.map(f => `<li>${esc(f.descricao)} — ${esc(f.localizacao || '')}</li>`).join('')}</ul>
    ${(a.pendencias || []).length ? `<h3>Pendências</h3><ul>${a.pendencias.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</section>`);

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.titulo)} · impressão</title>
<style>
 img{max-width:100%;max-height:12cm;object-fit:contain}
 body{font:12pt/1.45 Georgia,serif;color:#111;margin:0;background:#eee}
 .folha{background:#fff;max-width:19cm;margin:1cm auto;padding:1.5cm;box-shadow:0 1px 4px rgba(0,0,0,.2);page-break-after:always}
 h1{font:800 22pt Arial,sans-serif;margin:.2em 0}h2{font:800 16pt Arial,sans-serif;margin:.2em 0 .4em}h3{font:700 12pt Arial,sans-serif;margin:1em 0 .4em}
 .marca{display:flex;align-items:center;gap:10px;font:900 11pt Arial,sans-serif;letter-spacing:.2em;color:#c25a12;break-inside:avoid}.marca img{width:52px;height:52px;flex:0 0 52px;object-fit:contain}.cab{font:700 9pt Arial,sans-serif;color:#666;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #ccc;padding-bottom:4px}
 .pergunta{font-size:14pt;font-style:italic}.sutil{color:#555}
 .peca{border:1.5px solid #333;border-radius:6px;padding:10px 12px;margin:10px 0}.peca .marcar{display:block;font:9pt Arial,sans-serif;color:#555;margin-top:6px}
 .caixas{list-style:none;padding:0}.caixas li{margin:6px 0}
 .linhas{border-bottom:1px solid #999;padding-bottom:2.5cm}
 table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #555;padding:6px;text-align:left;height:1.4cm;vertical-align:top}th{height:auto;background:#f0f0f0;font:700 10pt Arial,sans-serif}
 .pecas-imp{display:flex;flex-wrap:wrap;gap:10px}.pecas-imp svg{width:4.2cm;height:auto}.peca-qc-texto{width:100%;height:100%;display:flex;align-items:center;justify-content:center;text-align:center;font:800 13px Arial,sans-serif;color:#111}
 .img-corte{position:relative;display:inline-block;max-width:100%}.img-corte img{display:block;max-width:100%}.grade-corte{position:absolute;inset:0;background-image:linear-gradient(to right,#000 2px,transparent 2px),linear-gradient(to bottom,#000 2px,transparent 2px);background-size:calc(100%/var(--c)) calc(100%/var(--l));border-right:2px solid #000;border-bottom:2px solid #000;opacity:.7}
 .cartoes{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cartao-q{border:1.5px dashed #333;border-radius:8px;padding:10px;break-inside:avoid}.cartao-q small{display:block;font:700 9pt Arial,sans-serif;color:#666}
 .pedacos{display:flex;flex-wrap:wrap;gap:12px}.pedaco{border:2px dashed #333;border-radius:10px;padding:14px 18px;font:800 18pt Arial,sans-serif;min-width:3cm;text-align:center}
 .cartao-imp{font-size:13pt;min-width:4cm}.coluna-imp{background:#f0f0f0;border-style:solid}
 .termo-imp{margin:14px 0}.termo-linha-imp{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;font:9pt Arial,sans-serif;color:#555;margin-top:6px}.termo-linha-imp i{display:block;height:0;border-top:2px solid #333;position:relative}
 .ligar-imp{display:grid;grid-template-columns:1fr 1fr;gap:16px}.ligar-imp>div{display:grid;gap:10px}
 .glossario{columns:2;column-gap:1cm}.glossario dt{font-weight:800;margin-top:6px;break-after:avoid}.glossario dd{margin:0 0 4px;font-size:10pt}
 .cruz-imp{display:grid;gap:0;max-width:16cm;margin:10px 0}.cruz-imp span{aspect-ratio:1;position:relative}.cruz-imp .c{border:1px solid #333;display:grid;place-items:center;font:800 12pt Arial,sans-serif}.cruz-imp small{position:absolute;top:1px;left:2px;font:7pt Arial,sans-serif}
 .cruz-dicas-imp{display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:10.5pt}
 .img-marcada{position:relative;display:inline-block}.img-marcada span{position:absolute;transform:translate(-50%,-50%);background:#c00;color:#fff;border-radius:50%;width:22px;height:22px;display:grid;place-items:center;font:700 10pt Arial,sans-serif}
 .docente{border-top:8px solid #c00}.docente .cab{color:#c00}
 .barra{position:sticky;top:0;background:#222;color:#fff;padding:10px;text-align:center;font:14px Arial,sans-serif}
 .barra button{font:700 14px Arial,sans-serif;padding:8px 16px}
 @media print{body{background:#fff}.folha{box-shadow:none;margin:0;max-width:none;padding:0}.barra{display:none}@page{margin:1.6cm}}
</style></head><body>
<div class="barra">Material para impressão · <button onclick="print()">Imprimir</button></div>
${partes.join('\n')}
</body></html>`;
}

export function abrirImpressao(a) {
  const url = URL.createObjectURL(new Blob([gerarImpressao(a)], { type: 'text/html' }));
  const w = window.open(url, '_blank');
  if (!w) location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60e3);
}
