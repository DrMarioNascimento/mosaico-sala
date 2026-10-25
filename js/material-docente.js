/* Extração local: o arquivo só é enviado à IA depois do comando do professor. */
export async function lerMaterialDocente(arquivo) {
  if (!arquivo || arquivo.size > 12 * 1024 * 1024) throw new Error('Escolha um arquivo de até 12 MB.');
  const nome = arquivo.name.toLowerCase();
  if (/\.(txt|md)$/.test(nome)) return arquivo.text();
  if (nome.endsWith('.pdf')) {
    const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.mjs';
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()), isEvalSupported: false }).promise;
    try {
      if (pdf.numPages > 60) throw new Error('O documento tem mais de 60 páginas. Separe o trecho que será usado nesta aula.');
      const paginas = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const p = await pdf.getPage(i), t = await p.getTextContent();
        paginas.push('Página ' + i + '\n' + t.items.map(x => x.str + (x.hasEOL ? '\n' : ' ')).join(''));
      }
      const texto = paginas.join('\n\n');
      if (texto.replace(/Página \d+/g, '').trim().length < 80) throw new Error('Este PDF parece conter imagens sem texto selecionável. Cole o texto reconhecido por OCR para continuar.');
      return texto;
    } finally { await pdf.destroy(); }
  }
  if (nome.endsWith('.docx')) {
    if (!window.mammoth) await new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.13.0/mammoth.browser.min.js'; s.onload = resolve; s.onerror = () => { s.remove(); reject(new Error('Não foi possível carregar o leitor de Word. Cole o texto para continuar.')); }; document.head.append(s);
    });
    const r = await window.mammoth.extractRawText({ arrayBuffer: await arquivo.arrayBuffer() });
    return r.value;
  }
  throw new Error('Use PDF com texto selecionável, Word (.docx), texto (.txt) ou Markdown (.md).');
}
