/* MOSAICO · Versão imprimível (seção 16 da especificação)
   Material de participantes por grupo + material de quem conduz em separado.
   Sem códigos visíveis nas peças. */

import { formaDoGrupo, urlIcone } from './ui.js';

const icone = (a, gid, tam = 44) => `<img src="${new URL(urlIcone(formaDoGrupo(a, gid).forma), location.href).href}" alt="" width="${tam}" height="${tam}" style="vertical-align:middle;margin-right:8px">`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ordem = a => [...a.etapas].sort((x, y) => x.ordem - y.ordem);

export function gerarImpressao(a) {
  const partes = [];
  partes.push(`<section class="folha capa"><p class="marca">MOSAICO</p><h1>${esc(a.titulo)}</h1>
    ${a.perguntaCentral ? `<p class="pergunta">${esc(a.perguntaCentral)}</p>` : ''}
    ${a.introducao ? `<p>${esc(a.introducao)}</p>` : ''}
    <p class="sutil">${esc(a.publico || '')}${a.duracaoMin ? ' · ' + esc(a.duracaoMin) + ' min' : ''}</p>
    <p class="sutil">Grupos: ${a.grupos.map(g => esc(g.nome)).join(' · ')}</p></section>`);

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
  const individuais = ordem(a).filter(e => e.typeId === 'questao_individual');
  if (individuais.length) partes.push(`<section class="folha"><p class="cab">Individual · uma folha por participante</p><h2>Questões individuais</h2>
    <p>Nome: ______________________________</p>
    ${individuais.map((e, i) => `<div class="questao"><h3>${i + 1}. ${esc(e.config.enunciado)}</h3>
      <ul class="caixas">${e.config.alternativas.map(al => `<li>☐ ${esc(al.texto)}</li>`).join('')}</ul></div>`).join('')}</section>`);

  // Material de quem conduz (separado)
  const r = a.docente?.respostas || {};
  partes.push(`<section class="folha docente"><p class="cab">MATERIAL DE QUEM CONDUZ — NÃO DISTRIBUIR</p><h2>Respostas esperadas</h2>
    ${ordem(a).filter(e => r[e.id]).map(e => {
      const op = (e.config?.alternativas || e.config?.hipotesesCandidatas || []).find(o => o.id === r[e.id].corretaId);
      return `<div class="questao"><h3>${esc(e.titulo)}</h3><p><strong>${esc(op?.texto || r[e.id].corretaId)}</strong></p><p>${esc(r[e.id].explicacao || '')}</p></div>`;
    }).join('')}
    ${a.meta?.ativa !== false && a.meta ? `<h3>Meta</h3><p>${esc(a.meta.descricao || '')} (limiar ${Math.round(a.meta.limiar * 100)}%)</p>` : ''}
    ${(a.docente?.guia || []).length ? `<h3>Guia de condução</h3><ol>${a.docente.guia.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
    ${(a.docente?.pontosDeDiscussao || []).length ? `<h3>Pontos de discussão</h3><ul>${a.docente.pontosDeDiscussao.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <h3>Distribuição das peças</h3><ul>${a.grupos.map(g => `<li>${esc(g.nome)}: ${a.pecas.filter(p => p.destinatarios.includes(g.id)).length} peça(s)</li>`).join('')}</ul>
    <h3>Fontes</h3><ul>${a.fontes.map(f => `<li>${esc(f.descricao)} — ${esc(f.localizacao || '')}</li>`).join('')}</ul>
    ${(a.pendencias || []).length ? `<h3>Pendências</h3><ul>${a.pendencias.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</section>`);

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.titulo)} · impressão</title>
<style>
 body{font:12pt/1.45 Georgia,serif;color:#111;margin:0;background:#eee}
 .folha{background:#fff;max-width:19cm;margin:1cm auto;padding:1.5cm;box-shadow:0 1px 4px rgba(0,0,0,.2);page-break-after:always}
 h1{font:800 22pt Arial,sans-serif;margin:.2em 0}h2{font:800 16pt Arial,sans-serif;margin:.2em 0 .4em}h3{font:700 12pt Arial,sans-serif;margin:1em 0 .4em}
 .marca{font:900 11pt Arial,sans-serif;letter-spacing:.2em;color:#c25a12}.cab{font:700 9pt Arial,sans-serif;color:#666;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #ccc;padding-bottom:4px}
 .pergunta{font-size:14pt;font-style:italic}.sutil{color:#555}
 .peca{border:1.5px solid #333;border-radius:6px;padding:10px 12px;margin:10px 0}.peca .marcar{display:block;font:9pt Arial,sans-serif;color:#555;margin-top:6px}
 .caixas{list-style:none;padding:0}.caixas li{margin:6px 0}
 .linhas{border-bottom:1px solid #999;padding-bottom:2.5cm}
 table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #555;padding:6px;text-align:left;height:1.4cm;vertical-align:top}th{height:auto;background:#f0f0f0;font:700 10pt Arial,sans-serif}
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
