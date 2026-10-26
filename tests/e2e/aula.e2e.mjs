// Teste de ponta a ponta: conduz uma aula inteira de cada modelo pronto, em modo ensaio (sem internet),
// com participantes simulados de verdade (celulares em piloto automático).
// Rodar: node --test tests/e2e/   (precisa do Playwright com o Chromium instalado)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASOS } from '../../js/casos.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const PARTICIPANTES = 6;
const espera = ms => new Promise(r => setTimeout(r, ms));

let servidor, base, navegador;
before(async () => {
  servidor = createServer(async (req, res) => {
    const caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
    try { const corpo = await readFile(join(RAIZ, caminho)); res.writeHead(200, { 'content-type': TIPOS[extname(caminho)] || 'application/octet-stream' }); res.end(corpo); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${servidor.address().port}/`;
  navegador = await chromium.launch();
});
after(async () => { await navegador?.close(); servidor?.close(); });

/** Clica no primeiro botão visível com esse nome; devolve se clicou. */
async function clicar(pagina, nome) {
  const b = pagina.getByRole('button', { name: nome, exact: true });
  if (await b.count() && await b.first().isVisible() && await b.first().isEnabled()) { await b.first().click(); return true; }
  return false;
}

for (const caso of CASOS.filter(c=>!process.env.MOSAICO_CASOS || process.env.MOSAICO_CASOS.split(',').includes(c.id))) {
  test(`Aula completa: ${caso.titulo}`, { timeout: 720_000 }, async t => {
    const ctx = await navegador.newContext({ viewport: { width: 420, height: 900 }, serviceWorkers: 'block' });
    const erros = [];
    ctx.on('page', p => p.on('pageerror', e => erros.push(`${new URL(p.url()).pathname}: ${e.message}`)));
    try {
      // Condução: entra, escolhe o modelo e abre a sala
      const cond = await ctx.newPage();
      await cond.goto(base + 'conduzir.html?ensaio=1');
      await cond.locator('#abas').waitFor();   // ensaio: sem tela de login, entra direto
      await cond.getByRole('button', { name: caso.titulo, exact: true }).click();
      await cond.getByRole('button', { name: 'Abrir sala', exact: true }).click();
      const codigo = (await cond.locator('.codigo').innerText({ timeout: 10_000 })).trim();
      assert.match(codigo, /^\d{6}$/);

      // Turma: celulares simulados em piloto automático
      const turma = [];
      for (let i = 1; i <= PARTICIPANTES; i++) {
        const p = await ctx.newPage();
        await p.goto(base + `participar.html?ensaio=1&sala=${codigo}&perfil=${i}&auto=1`);
        turma.push(p);
      }
      await cond.waitForFunction(n => /(\d+) participante/.exec(document.body.innerText)?.[1] >= n, PARTICIPANTES, { timeout: 30_000 });

      // Grupos e condução de todas as etapas até o resultado
      // Fluxo curto: na própria aba Sala, “Formar grupos e começar” sorteia e leva à condução
      await cond.getByRole('button', { name: 'Formar grupos e começar', exact: true }).click();
      await cond.locator('#aba-conducao:not([hidden])').waitFor();
      const fim = Date.now() + 660_000;
      let emAndamentoDesde = 0;
      while (Date.now() < fim) {
        if (await cond.getByText('Resultado revelado').isVisible()) break;
        if (await clicar(cond, 'Revelar resultado final')) { await espera(800); continue; }
        if (await clicar(cond, 'Registrar ausência e liberar')) { await espera(500); continue; }
        if (await clicar(cond, 'Iniciar etapa')) { emAndamentoDesde = Date.now(); await espera(1500); continue; }
        if (await clicar(cond, 'Abrir a pergunta (cada um responde sozinho)') || await clicar(cond, 'Passar para o grupo') || await clicar(cond, 'Revelar a resposta') || await clicar(cond, 'Próxima pergunta')) { await espera(2000); continue; }
        if (await clicar(cond, 'Sortear a primeira pergunta') || await clicar(cond, 'Sortear a próxima pergunta')) { await espera(1500); continue; }
        // Etapa em andamento: dá tempo ao piloto automático; depois encerra (dois toques, se faltar alguém).
        if (emAndamentoDesde && Date.now() - emAndamentoDesde > 15_000) {
          const enc = cond.getByRole('button', { name: /Encerrar etapa|Toque de novo para encerrar/ });
          if (await enc.count() && await enc.first().isVisible()) {
            await enc.first().click(); await espera(300);
            if (await enc.count() && await enc.first().isVisible()) await enc.first().click();
            emAndamentoDesde = 0; await espera(1000); continue;
          }
        }
        await espera(1000);
      }
      const resultado = await cond.locator('.cartao.destaque').innerText().catch(() => '');
      assert.match(resultado, /Resultado revelado/, `A aula não chegou ao resultado. Tela da condução:\n${(await cond.locator('#aba-conducao').innerText()).slice(0, 1500)}`);

      t.diagnostic(resultado.replace(/\s+/g, ' ').trim());

      // Relatório da aula: baixa e confere que traz as etapas e nenhum nome dos participantes
      const [download] = await Promise.all([cond.waitForEvent('download'), cond.getByRole('button', { name: 'Baixar relatório da aula (planilha)' }).click()]);
      const csv = await readFile(await download.path(), 'utf8');
      assert.match(csv, /Etapa;Organização;Grupo;Envios;Avaliados;Acertos;% de acertos/);
      for (let i = 1; i <= PARTICIPANTES; i++) assert.ok(!csv.includes('Simulado ' + i), 'O relatório não pode trazer nomes');

      // Os celulares veem o fim da atividade
      await espera(1500);
      for (const p of turma) assert.ok((await p.locator('body').innerText()).trim().length > 0);
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); }
  });
}
