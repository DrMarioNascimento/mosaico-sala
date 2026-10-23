/* Codificador de QR do MOSAICO — ISO/IEC 18004, modo byte.

   O QR e como as pessoas entram na mesa. Ate aqui ele vinha de
   api.qrserver.com: um servico de terceiros, sem SLA, no caminho critico
   de entrada. Se ele cai ou fica lento, o telao mostra um quadrado vazio
   no momento em que doze pessoas estao olhando para ele — e o link da
   sala ainda saia do dominio a cada geracao.

   Suporta versoes 1 a 10 nos niveis L e M, que cobrem com folga um link
   de sala (~70 caracteres). Q e H nao estao implementados de proposito:
   o jogo nao os usa, e tabela nao conferida e tabela que mente.

   Conferido modulo a modulo contra a saida do proprio api.qrserver.com
   em tests/qr.test.mjs.                                                */
(function (global) {
  "use strict";

  var QR = {};

  /* ---------- GF(256), primitivo 0x11d ---------- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i += 1) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j += 1) EXP[j] = EXP[j - 255];
  })();

  function mul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  /* Polinomio gerador de Reed-Solomon para `grau` codewords de correcao. */
  function gerador(grau) {
    var g = [1];
    for (var i = 0; i < grau; i += 1) {
      var novo = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j += 1) {
        novo[j] ^= g[j];
        novo[j + 1] ^= mul(g[j], EXP[i]);
      }
      g = novo;
    }
    return g;
  }

  function correcao(dados, grau) {
    var g = gerador(grau);
    var resto = new Array(dados.length + grau).fill(0);
    for (var i = 0; i < dados.length; i += 1) resto[i] = dados[i];
    for (var k = 0; k < dados.length; k += 1) {
      var coef = resto[k];
      if (coef === 0) continue;
      for (var j = 0; j < g.length; j += 1) resto[k + j] ^= mul(g[j], coef);
    }
    return resto.slice(dados.length);
  }

  /* ---------- tabelas por versao (1..10) ---------- */
  var TOTAL = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

  /* [ecPorBloco, blocosGrupo1, dadosGrupo1, blocosGrupo2, dadosGrupo2] */
  var BLOCOS = {
    L: [null,
      [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0],
      [26, 1, 108, 0, 0], [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0],
      [30, 2, 116, 0, 0], [18, 2, 68, 2, 69]],
    M: [null,
      [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0],
      [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39],
      [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]]
  };

  var ALINHAMENTO = [null, [], [6, 18], [6, 22], [6, 26], [6, 30],
    [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  var BITS_NIVEL = { L: 1, M: 0 };

  function capacidadeDados(versao, nivel) {
    var b = BLOCOS[nivel][versao];
    return b[1] * b[2] + b[3] * b[4];
  }

  /* ---------- bits ---------- */
  function Fluxo() { this.bits = []; }
  Fluxo.prototype.push = function (valor, tamanho) {
    for (var i = tamanho - 1; i >= 0; i -= 1) this.bits.push((valor >>> i) & 1);
  };
  Fluxo.prototype.bytes = function () {
    var saida = [];
    for (var i = 0; i < this.bits.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j += 1) b = (b << 1) | (this.bits[i + j] || 0);
      saida.push(b);
    }
    return saida;
  };

  function utf8(texto) {
    var out = [], s = unescape(encodeURIComponent(texto));
    for (var i = 0; i < s.length; i += 1) out.push(s.charCodeAt(i));
    return out;
  }

  /* ---------- codificacao ---------- */
  function codificar(texto, nivel) {
    var dados = utf8(texto), versao = 0;
    for (var v = 1; v <= 10; v += 1) {
      var contador = v < 10 ? 8 : 16;
      /* 4 bits de modo + contador + 8 bits por byte */
      if (4 + contador + dados.length * 8 <= capacidadeDados(v, nivel) * 8) { versao = v; break; }
    }
    if (!versao) throw new Error("Texto longo demais para um QR versão 10 nível " + nivel + ".");

    var totalDados = capacidadeDados(versao, nivel);
    var f = new Fluxo();
    f.push(4, 4);                                   /* modo byte */
    f.push(dados.length, versao < 10 ? 8 : 16);     /* contador  */
    for (var i = 0; i < dados.length; i += 1) f.push(dados[i], 8);

    /* terminador de ate 4 bits, depois alinha em byte */
    var faltam = totalDados * 8 - f.bits.length;
    f.push(0, Math.min(4, faltam));
    while (f.bits.length % 8) f.bits.push(0);

    var bytes = f.bytes();
    var enchimento = [0xEC, 0x11], k = 0;
    while (bytes.length < totalDados) { bytes.push(enchimento[k % 2]); k += 1; }

    /* divide em blocos, calcula correcao, intercala */
    var cfg = BLOCOS[nivel][versao];
    var blocosDados = [], blocosEc = [], pos = 0;
    function fatia(quantos, tamanho) {
      for (var b = 0; b < quantos; b += 1) {
        var d = bytes.slice(pos, pos + tamanho); pos += tamanho;
        blocosDados.push(d);
        blocosEc.push(correcao(d, cfg[0]));
      }
    }
    fatia(cfg[1], cfg[2]);
    fatia(cfg[3], cfg[4]);

    var saida = [], maiorDados = Math.max(cfg[2], cfg[4] || 0);
    for (var c = 0; c < maiorDados; c += 1)
      for (var b1 = 0; b1 < blocosDados.length; b1 += 1)
        if (c < blocosDados[b1].length) saida.push(blocosDados[b1][c]);
    for (var e = 0; e < cfg[0]; e += 1)
      for (var b2 = 0; b2 < blocosEc.length; b2 += 1) saida.push(blocosEc[b2][e]);

    return { versao: versao, codewords: saida };
  }

  /* ---------- matriz ---------- */
  function novaMatriz(tamanho) {
    var m = [];
    for (var i = 0; i < tamanho; i += 1) m.push(new Int8Array(tamanho).fill(-1));
    return m;
  }

  function desenharFuncoes(m, versao) {
    var n = m.length;

    function finder(topo, esq) {
      for (var r = -1; r <= 7; r += 1) {
        for (var c = -1; c <= 7; c += 1) {
          var y = topo + r, x = esq + c;
          if (y < 0 || y >= n || x < 0 || x >= n) continue;
          var borda = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                      (c >= 0 && c <= 6 && (r === 0 || r === 6));
          var miolo = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          m[y][x] = (borda || miolo) ? 1 : 0;
        }
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);

    /* temporizacao */
    for (var i = 8; i < n - 8; i += 1) {
      var v = i % 2 === 0 ? 1 : 0;
      m[6][i] = v; m[i][6] = v;
    }

    /* alinhamento, exceto onde colide com os finders */
    var centros = ALINHAMENTO[versao];
    for (var a = 0; a < centros.length; a += 1) {
      for (var b = 0; b < centros.length; b += 1) {
        var cy = centros[a], cx = centros[b];
        if ((cy === 6 && cx === 6) || (cy === 6 && cx === n - 7) || (cy === n - 7 && cx === 6)) continue;
        for (var dy = -2; dy <= 2; dy += 1)
          for (var dx = -2; dx <= 2; dx += 1)
            m[cy + dy][cx + dx] = (Math.max(Math.abs(dy), Math.abs(dx)) !== 1) ? 1 : 0;
      }
    }

    m[n - 8][8] = 1;   /* modulo sempre escuro */

    /* reserva das areas de formato (preenchidas depois) */
    for (var f = 0; f <= 8; f += 1) {
      if (m[8][f] === -1) m[8][f] = 0;
      if (m[f][8] === -1) m[f][8] = 0;
    }
    for (var g = 0; g < 8; g += 1) {
      if (m[8][n - 1 - g] === -1) m[8][n - 1 - g] = 0;
      if (m[n - 1 - g][8] === -1) m[n - 1 - g][8] = 0;
    }

    /* reserva da informacao de versao */
    if (versao >= 7) {
      for (var r2 = 0; r2 < 6; r2 += 1)
        for (var c2 = 0; c2 < 3; c2 += 1) {
          if (m[r2][n - 11 + c2] === -1) m[r2][n - 11 + c2] = 0;
          if (m[n - 11 + c2][r2] === -1) m[n - 11 + c2][r2] = 0;
        }
    }
  }

  function colocarDados(m, codewords) {
    var n = m.length, bit = 0, total = codewords.length * 8;
    function proximo() {
      if (bit >= total) return 0;
      var b = (codewords[bit >>> 3] >>> (7 - (bit & 7))) & 1;
      bit += 1;
      return b;
    }
    var subindo = true;
    for (var col = n - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;            /* a coluna de temporizacao nao recebe dados */
      for (var passo = 0; passo < n; passo += 1) {
        var linha = subindo ? n - 1 - passo : passo;
        for (var d = 0; d < 2; d += 1) {
          var x = col - d;
          if (m[linha][x] === -1) m[linha][x] = proximo();
        }
      }
      subindo = !subindo;
    }
  }

  var MASCARAS = [
    function (i, j) { return (i + j) % 2 === 0; },
    function (i) { return i % 2 === 0; },
    function (i, j) { return j % 3 === 0; },
    function (i, j) { return (i + j) % 3 === 0; },
    function (i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0; },
    function (i, j) { return (i * j) % 2 + (i * j) % 3 === 0; },
    function (i, j) { return ((i * j) % 2 + (i * j) % 3) % 2 === 0; },
    function (i, j) { return ((i + j) % 2 + (i * j) % 3) % 2 === 0; }
  ];

  function penalidade(m) {
    var n = m.length, p = 0, i, j;

    /* regra 1: sequencias de 5 ou mais */
    function corridas(pegar) {
      for (i = 0; i < n; i += 1) {
        var atual = pegar(i, 0), tamanho = 1;
        for (j = 1; j < n; j += 1) {
          var v = pegar(i, j);
          if (v === atual) { tamanho += 1; }
          else { if (tamanho >= 5) p += 3 + (tamanho - 5); atual = v; tamanho = 1; }
        }
        if (tamanho >= 5) p += 3 + (tamanho - 5);
      }
    }
    corridas(function (a, b) { return m[a][b]; });
    corridas(function (a, b) { return m[b][a]; });

    /* regra 2: blocos 2x2 da mesma cor */
    for (i = 0; i < n - 1; i += 1)
      for (j = 0; j < n - 1; j += 1) {
        var v0 = m[i][j];
        if (v0 === m[i][j + 1] && v0 === m[i + 1][j] && v0 === m[i + 1][j + 1]) p += 3;
      }

    /* regra 3: padrao 1:1:3:1:1 cercado de claro */
    var A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function achar(pegar) {
      for (i = 0; i < n; i += 1)
        for (j = 0; j + 11 <= n; j += 1) {
          var okA = true, okB = true;
          for (var k = 0; k < 11; k += 1) {
            var v = pegar(i, j + k);
            if (v !== A[k]) okA = false;
            if (v !== B[k]) okB = false;
          }
          if (okA) p += 40;
          if (okB) p += 40;
        }
    }
    achar(function (a, b) { return m[a][b]; });
    achar(function (a, b) { return m[b][a]; });

    /* regra 4: desequilibrio entre claro e escuro */
    var escuros = 0;
    for (i = 0; i < n; i += 1) for (j = 0; j < n; j += 1) escuros += m[i][j];
    var proporcao = escuros * 100 / (n * n);
    p += Math.floor(Math.abs(proporcao - 50) / 5) * 10;
    return p;
  }

  function bchFormato(dados) {
    var v = dados << 10;
    for (var i = 14; i >= 10; i -= 1) if ((v >>> i) & 1) v ^= 0x537 << (i - 10);
    return ((dados << 10) | v) ^ 0x5412;
  }

  function bchVersao(versao) {
    var v = versao << 12;
    for (var i = 17; i >= 12; i -= 1) if ((v >>> i) & 1) v ^= 0x1f25 << (i - 12);
    return (versao << 12) | v;
  }

  /* As duas copias da informacao de formato. A ordem linha/coluna aqui e
     facil de trocar sem querer, e o erro so aparece na hora de ler: um QR
     com formato transposto tem a aparencia certa e nao decodifica. */
  function aplicarFormato(m, nivel, mascara) {
    var n = m.length, bits = bchFormato((BITS_NIVEL[nivel] << 3) | mascara);
    function bit(i) { return (bits >>> i) & 1; }
    /* copia junto ao finder superior-esquerdo */
    for (var i = 0; i <= 5; i += 1) m[i][8] = bit(i);
    m[7][8] = bit(6);
    m[8][8] = bit(7);
    m[8][7] = bit(8);
    for (var j = 9; j < 15; j += 1) m[8][14 - j] = bit(j);
    /* copia dividida entre os outros dois finders */
    for (var k = 0; k < 8; k += 1) m[8][n - 1 - k] = bit(k);
    for (var l = 8; l < 15; l += 1) m[n - 15 + l][8] = bit(l);
    m[n - 8][8] = 1;
  }

  function aplicarVersao(m, versao) {
    if (versao < 7) return;
    var n = m.length, bits = bchVersao(versao);
    for (var i = 0; i < 18; i += 1) {
      var b = (bits >>> i) & 1, r = Math.floor(i / 3), c = i % 3;
      m[r][n - 11 + c] = b;
      m[n - 11 + c][r] = b;
    }
  }

  /* Devolve { tamanho, versao, mascara, modulos } — modulos[linha][coluna],
     1 escuro, 0 claro. Sem margem: quem desenha decide a zona silenciosa. */
  QR.gerar = function (texto, opcoes) {
    opcoes = opcoes || {};
    var nivel = opcoes.nivel === "L" ? "L" : "M";
    var cod = codificar(String(texto), nivel);
    var n = 17 + 4 * cod.versao;

    var base = novaMatriz(n);
    desenharFuncoes(base, cod.versao);
    var funcao = [];
    for (var i = 0; i < n; i += 1) funcao.push(base[i].slice());
    colocarDados(base, cod.codewords);

    var melhor = null;
    var forcada = typeof opcoes.mascara === "number" ? opcoes.mascara : -1;
    for (var mk = 0; mk < 8; mk += 1) {
      if (forcada >= 0 && mk !== forcada) continue;
      var m = [];
      for (var r = 0; r < n; r += 1) m.push(base[r].slice());
      for (var y = 0; y < n; y += 1)
        for (var x = 0; x < n; x += 1)
          if (funcao[y][x] === -1 && MASCARAS[mk](y, x)) m[y][x] ^= 1;
      aplicarFormato(m, nivel, mk);
      aplicarVersao(m, cod.versao);
      var p = penalidade(m);
      if (!melhor || p < melhor.p) melhor = { p: p, m: m, mascara: mk };
    }

    return { tamanho: n, versao: cod.versao, nivel: nivel,
             mascara: melhor.mascara, modulos: melhor.m };
  };

  /* SVG pronto para innerHTML. `margem` em modulos (a norma pede 4). */
  QR.svg = function (texto, opcoes) {
    opcoes = opcoes || {};
    var q = QR.gerar(texto, opcoes);
    var margem = opcoes.margem == null ? 4 : opcoes.margem;
    var lado = q.tamanho + margem * 2;
    var caminho = [];
    for (var y = 0; y < q.tamanho; y += 1) {
      for (var x = 0; x < q.tamanho; x += 1) {
        if (q.modulos[y][x]) caminho.push("M" + (x + margem) + " " + (y + margem) + "h1v1h-1z");
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + lado + ' ' + lado + '" ' +
      'shape-rendering="crispEdges" role="img" aria-label="' +
      (opcoes.rotulo || "Código QR para entrar na mesa") + '">' +
      '<rect width="' + lado + '" height="' + lado + '" fill="' + (opcoes.fundo || "#ffffff") + '"/>' +
      '<path fill="' + (opcoes.tinta || "#000000") + '" d="' + caminho.join("") + '"/></svg>';
  };

  global.MosaicoQR = QR;
})(typeof window !== "undefined" ? window : globalThis);
