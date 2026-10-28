> **Atualização em 25/10/2026:** este documento é um registro histórico de propostas de 23/10. Cartões, pares, corrida, cruzadas e os demais tipos listados no README já estão implementados. Consulte o README e ERGONOMIA-DOCENTE.md para a situação atual. A geração integrada por IA ainda aguarda ativação; o caminho com IA externa está disponível.

# Mosaico Sala · Próximas atividades

Plano para a próxima sessão, escrito em 23/10/2026. Cobre as ideias novas, como encaixá-las na plataforma e os encaminhamentos técnicos. Nada daqui foi construído ainda.

## Princípios (valem para tudo)

- **Plataforma genérica.** Cada tipo precisa servir de fisiologia a ética, e também a esportes e games. Se encaixa nos dois extremos, encaixa em quase todas as disciplinas.
- **O professor decide.** Todo tipo tem o seletor de organização:
  - **dentro do grupo**: o grupo trabalha junto;
  - **entre grupos**: rodadas, só os líderes, ou grupos complementares;
  - **individual somando para o grupo**, quando fizer sentido.
- **Fracionar → cooperar → superar a meta.** Sempre que possível, cada celular tem só uma parte, e o grupo precisa juntar.
- **O gabarito nunca sai do celular de quem conduz.** Os alunos mandam a jogada, e quem conduz confere e devolve o resultado (mesmo padrão do cadeado e do quiz).
- **Tudo entra pela planilha** (modo aberto, LGPD) e pelo editor do Planejar (biblioteca fechada).
- **Tudo testado no `/simulador` e no "Ver como fica"**, com o piloto automático jogando.

## Ordem proposta

1. **Cartões de arrastar**: um motor só, três formatos (ordenar, classificar, termômetro).
2. **Pares**: ligar e jogo da memória.
3. **Corrida**: quiz no próprio ritmo, pontos para o grupo, power-ups.
4. **Palavras cruzadas.**

Ainda falta o professor decidir:

- Confirmar essa ordem.
- No **Termômetro**, escolher entre: só debate, posição esperada com pontuação, ou as duas como opção.
- Completar a ideia "Em fisiologia do treino a competição…".

---

## 1. Cartões de arrastar (`cartoes_arrastar`)

Um motor de arrastar e soltar com três formatos.

| Formato | O que o aluno faz | Exemplo fisiologia | Exemplo ética | Gabarito |
| --- | --- | --- | --- | --- |
| `ordenar` | põe os cartões em sequência (dominó de causa e efeito) | Renina → Angiotensina I → Angiotensina II → Vasoconstrição → ↑ PA | etapas de um processo ético-disciplinar | a ordem |
| `classificar` | arrasta cada cartão para uma coluna (card sorting) | simpático / parassimpático | infração / dever / direito | a coluna de cada cartão |
| `termometro` | posiciona cada caso numa linha entre dois polos | intensidade: leve ↔ máxima | Totalmente antiético ↔ Totalmente ético | opcional: posição esperada ± margem |

### Configuração (rascunho)

```js
config: {
  formato: 'ordenar' | 'classificar' | 'termometro',
  cartoes: [{ id, texto, imagem? }],                 // imagem leve, como na montagem
  colunas: [{ id, titulo }],                          // classificar
  polos: { esquerda: 'Totalmente antiético', direita: 'Totalmente ético' },   // termometro
  distribuicao: 'todos' | 'fracionado',              // fracionado: cada celular segura alguns cartões
  tentativas: 'uma' | 'repetir', espera: 30,
  mostrarDistribuicaoNoTelao: true                   // termometro: onde cada grupo pôs cada caso
}
docente.respostas[etapa] = {
  ordem: [ids],                                      // ordenar
  colunaDe: { cartaoId: colunaId },                  // classificar
  posicao: { cartaoId: 0..100 }, margem: 15          // termometro (opcional)
}
```

### Modos

- **Dentro do grupo, quadro compartilhado:** todos veem o mesmo quadro. Quem arrasta muda o quadro de todos, e o líder confirma o envio.
- **Dentro do grupo, fracionado:** cada celular tem alguns cartões e só pode colocar os seus. O grupo precisa coordenar quem põe o quê.
- **Entre grupos:** cada grupo recebe um trecho da cadeia, e o telão monta a cadeia inteira na ordem em que os grupos enviam. Outra opção: os líderes montam juntos, como na montagem entre representantes.
- **Termômetro:** a força está no debate. O telão mostra os pontos de todos os grupos na mesma linha, e as maiores divergências viram a discussão.

### Encaminhamento técnico

- **Arrastar:** usar Pointer Events (`pointerdown`, `pointermove` e `pointerup`, com `setPointerCapture`), e não a API de arrastar nativa do HTML5. A nativa não funciona no toque do iPhone.
  - Acrescentar a alternativa "toque no cartão, depois toque no lugar", para acessibilidade e para quem tem dificuldade de arrastar.
  - Aplicar `touch-action: none` só na área do quadro, para a página continuar rolando fora dela.
- **Quadro compartilhado:** o estado do grupo passa pelo cérebro de quem conduz.
  - Cada movimento vira um envio `etapa__uid__mN`. Isso já é permitido pela regra `tentativa`, cujo sufixo aceita `[a-z][0-9]{1,4}`.
  - Quem conduz aplica os movimentos em ordem e regrava o pacote do grupo. A latência fica em torno de 1 s, o que basta para a sala de aula.
  - Não precisa de regra nova.
- **Envio final:** uma tentativa `etapa__grupo__fN`, mandada pelo líder com o quadro inteiro. Quem conduz confere com o gabarito.
- **Conferência:**
  - ordenar: posição exata, ou "quantos pares vizinhos estão certos", para dar nota parcial;
  - classificar: quantos cartões estão na coluna certa;
  - termômetro: distância até a posição esperada, dentro da margem.
- **Planilha:**
  - aba **Cartoes**: etapa | id | texto | coluna_certa | ordem_certa | posicao_certa;
  - aba **Colunas**: etapa | id | titulo;
  - na aba **Etapas**: formato, polos e margem.
- **Arquivos novos:** `js/core/cartoes.js` (puro, testado: embaralhar, conferir, aplicar movimentos) e `js/arrastar.js` (interação).

---

## 2. Pares (`pares`)

O professor define pares de conteúdo, sem precisar de duas imagens iguais. Exemplos: *Hemossiderina ↔ Fígado*, *EPO ↔ Rim*, *Beneficência ↔ "agir em favor do paciente"*.

| Formato | Como joga |
| --- | --- |
| `ligar` | arrasta um cartão até o par; reaproveita o motor de arrastar |
| `memoria` | cartas viradas; vira duas: se formam par, ficam abertas |

### Modos

- **Dentro do grupo:**
  - cada aluno tem uma parte das cartas (fracionado), e o par pode estar no celular de outro colega;
  - ou o tabuleiro é compartilhado e cada um joga na sua vez.
- **Entre grupos:** o tabuleiro aparece no telão. O grupo da vez (sorteio, como no quiz) escolhe as duas cartas pelo celular do líder. Acertou, joga de novo; errou, passa a vez.

### Encaminhamento técnico

- **Configuração:** `config: { formato, pares: [{ id, a: {texto, imagem?}, b: {texto, imagem?} }], mostrarNoTelao }`. Os pares não são segredo, mas a posição das cartas é sorteada por quem conduz e mandada só virada (sem conteúdo) até alguém virar.
- **Memória entre grupos:** reaproveitar quase toda a máquina de vez do quiz (`sortearGrupo` e a vez com tempo). A jogada é `etapa__grupo__rN` com `{ cartas: [i, j] }`.
- **Planilha:** aba **Pares**: etapa | id | lado_a | lado_b.

---

## 3. Corrida (`corrida`)

É o quiz no próprio ritmo (como o Quizizz): cada aluno responde a sua sequência, e os pontos somam para o grupo. Aqui cabem a **"Corrida dos Sistemas"** (causa e efeito: "se o hormônio X aumenta, o que acontece com o órgão Y?") e, na ética, o "se tal coisa acontecer, o que esperar do comportamento". As perguntas usam a **mesma aba Perguntas** que já existe.

### Power-ups (opcionais, o professor liga ou desliga)

Cada um é ganho com uma sequência de acertos, por exemplo 3 seguidos:

| Power-up | Efeito |
| --- | --- |
| Dobrar | dobra os pontos do grupo por 30 s |
| Congelar | congela o próprio tempo da próxima pergunta |
| Escudo | o próximo erro não quebra a sequência |
| Ajuda do grupo | revela uma alternativa errada para um colega |

### Encaminhamento técnico

- **Respostas:** cada resposta é uma `tentativa` `etapa__uid__tN`, com a mesma regra de hoje.
- **Pontos e power-ups:** calculados no cérebro de quem conduz, em função pura e testável, a partir da ordem dos envios. É o mesmo padrão de `estadoCadeado`.
- **Placar:** o telão mostra o placar por grupo ao vivo e um "feed" dos power-ups ativados.
- **Ordem das perguntas:** cada aluno recebe as perguntas em ordem embaralhada (`prepararCadeado` já faz algo parecido).

---

## 4. Palavras cruzadas (`cruzadas`)

O professor dá a palavra e a dica, e o sistema monta a grade sozinho.

### Modos

- **Dentro do grupo:** grade compartilhada, e cada aluno recebe dicas diferentes (informação fracionada). A letra que um digita aparece para todos do grupo.
- **Entre grupos:** grupos complementares (o grupo A tem as horizontais, o B as verticais) ou corrida pela grade completa.

### Encaminhamento técnico

- **Gerar a grade:** algoritmo guloso de cruzamento, em função pura e testada. Pôr a palavra mais longa no centro e encaixar as outras onde cruzam numa letra igual, sem encostar em outras palavras. Tentar algumas ordens com semente fixa e escolher a grade mais compacta.
- **Prévia no Planejar:** a grade e as palavras que não couberam, como na prévia da montagem.
- **Grade compartilhada:** o mesmo padrão do quadro dos cartões. Cada letra é um envio `etapa__uid__lN` com `{ celula, letra }`, e quem conduz aplica e regrava o pacote do grupo.
- **Respostas:** as palavras certas ficam no gabarito, e o pacote leva só a grade vazia, os números e as dicas daquele aluno. Conferir palavra por palavra, normalizando acentos, de modo que "HEMACIA" vale como "HEMÁCIA".
- **Planilha:** aba **Palavras**: etapa | palavra | dica | quem (grupo/aluno, opcional).
- **Tamanho:** limitar a 25 palavras e 15×15, para caber no celular.

---

## Ainda pendentes (de antes)

- **Resultado em cadeia:** o resultado de um grupo alimenta outro, e "se um grupo errar, erram todos". Hoje só existe a conexão investigação → comparação. A ideia é generalizar as portas para que cadeado, montagem e cartões passem resultado adiante.
- **Realidade aumentada:** o professor vai mandar os arquivos.
- **README:** a tabela de tipos ainda não lista `montagem_pecas`, `cadeado_grupo` e `quiz_grupos`.
- **Testes:** o comando que funciona no Node 22 é `node --test tests/nucleo.test.mjs` (com a pasta inteira `tests/` ele falha).

## Já pronto até 23/10

| Tipo | Situação |
| --- | --- |
| `investigacao_fragmentos`, `comparar_hipoteses`, `questao_individual` | prontos |
| `montagem_pecas` | texto ou conta com cortes, ou imagem cortada; dentro do grupo ou entre representantes; prévia ao vivo; imagem embutida na planilha |
| `cadeado_grupo` | por acertos ou por pedaços do código; espera depois do erro; mensagem de abertura |
| `quiz_grupos` | sorteio do grupo da vez; pergunta só no líder; repassar ou revelar; placar |
| Regras do Firestore | biblioteca fechada, peças por celular, revelação e tentativas, testadas no emulador (26 cenários) |
