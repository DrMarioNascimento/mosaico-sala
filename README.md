# MOSAICO · Sala

Plataforma de atividades em grupo para a sala de aula: **cada grupo tem uma parte, ninguém tem o quadro completo, a turma junta as peças e supera a meta.** Quem conduz abre a sala; os alunos entram pelo celular, com um código ou QR, sem cadastro e sem instalar nada; o telão acompanha a aula.

- **Site:** https://mosaico-sala.web.app
- **Manual completo:** https://mosaico-sala.web.app/manual (só para professores da lista de mestres; o texto fica no Firestore e a fonte, fora do repositório)
- **Licença:** [LICENSE.md](LICENSE.md), publicada em https://mosaico-sala.web.app/licenca

## Estado em 25 de outubro de 2026

- **Entrada em três portas:** *Entrar em uma sala* (o aluno digita o código no próprio cartão), *Sou professor* e *Quer conhecer antes?* (turma simulada, sem cadastro).
- **Área do professor:** três ações (Criar com IA, Aplicar em sala, Usar um modelo), *Minhas atividades* com Aplicar, Abrir, duplicar e apagar, modelos prontos e o resto em *Mais opções*.
- **Criação com IA:** o professor envia o material (texto, PDF, Word), define turma, tempo e objetivo, e recebe uma proposta para revisar. A geração integrada (Gemini, via Firebase AI Logic) é só para professores autorizados; os demais usam o caminho com IA externa.
- **Administração** (administradores fixos): todas as atividades de todos os professores (abrir cópia, apagar), salas abertas e vencidas (encerrar) e a lista de professores autorizados.
- **Alternativas sorteadas por aluno:** a ordem do autor nunca entrega a resposta. Onde o telão mostra a lista com letras (quiz entre grupos, equipe), a ordem é a mesma para a sala toda.
- **Salas apagadas sozinhas:** prazo de 24 h, faxina das vencidas ao abrir *Aplicar em sala* e política de TTL do Firestore como garantia. Ver [OPERACAO-SALAS.md](OPERACAO-SALAS.md).
- **Ícones 3D** num estilo só, com o mesmo tamanho óptico, em `assets/ilustracoes/3d/` (ver [ICONES-3D.md](ICONES-3D.md)).

## Acesso

| Quem | O que pode |
| --- | --- |
| Qualquer conta Google | Planejar, revisar, imprimir e exportar atividades; rascunhos no próprio navegador; pedido para IA externa |
| Professor autorizado (lista de mestres) | Tudo acima + biblioteca em nuvem, salas on-line e geração integrada com IA |
| Administrador (e-mails fixos) | Tudo acima + área de administração |
| Aluno | Entrar numa sala aberta por código ou QR, sem cadastro |

Acrescentar `?ensaio=1` a qualquer página roda tudo neste navegador, sem internet, para ensaiar a aula sozinho (com participantes simulados).

## Páginas

| Página | Quem usa | Onde |
| --- | --- | --- |
| `index.html` | todos (as três portas) | qualquer aparelho |
| `participar.html` | alunos (sem cadastro) | celular |
| `planejar.html` | professor: criar, revisar, salvar; administração | PC ou celular |
| `conduzir.html` | professor: abrir sala, grupos, conduzir, encerrar | celular ou PC |
| `telao.html` | telão da sala (digitar o código já abre) | TV / projetor |
| `previa.html` | “Ver como fica”: professor, telão e turma simulada lado a lado | PC |
| `simulador.html` | simulador da aula na sala real | PC |
| `manual.html` | moldura do manual: pede o login e busca o texto no Firestore (publicado em Administração → Publicar manual) | professores da lista de mestres |
| `licenca.html` | licença de uso (mesmo texto do `LICENSE.md`) | todos |

## Os 8 passos do professor

1. **Entrar** com a conta Google.
2. **Inserir material:** colar texto ou enviar PDF, Word, texto ou Markdown (lidos no navegador), ou abrir um modelo.
3. **Planejar:** turma, tempo, objetivo, organização e número de grupos.
4. **Gerar ou adaptar:** proposta da IA (integrada ou externa) ou ajuste do modelo.
5. **Revisar conteúdo:** respostas esperadas e justificativas em linguagem de professor, fontes por peça e pendências declaradas pela IA. A validação de estrutura não verifica a ciência: a revisão é do professor.
6. **Experimentar:** “Ver como fica” com uma turma simulada.
7. **Salvar** na biblioteca ou exportar a planilha.
8. **Aplicar em sala:** abrir a sala (código e QR), formar os grupos, conduzir as etapas, revelar o resultado, baixar o relatório e encerrar.

## Tipos de atividade

| typeId | Atividade | Em resumo |
| --- | --- | --- |
| `investigacao_fragmentos` | Investigação por fragmentos | Cada grupo recebe parte das evidências e escolhe a hipótese que elas sustentam |
| `comparar_hipoteses` | Comparação entre grupos | Os grupos veem as conclusões dos outros e decidem a explicação que integra tudo |
| `montagem_pecas` | Quebra-cabeça de texto ou imagem | Cada celular é uma peça; o todo só aparece com os celulares na ordem |
| `cadeado_grupo` | Cadeado do grupo | Escape room: cada um responde a sua pergunta e o grupo destrava junto |
| `quiz_grupos` | Quiz entre grupos | O sistema sorteia o grupo da vez; o telão mostra a vez e o placar |
| `cartoes_arrastar` | Cartões de arrastar | Ordenar, classificar em colunas ou posicionar num termômetro entre dois polos |
| `pares` | Pares | Ligar cada cartão ao seu par ou jogo da memória |
| `corrida` | Corrida | No próprio ritmo: quiz, corrente de causa e efeito ou direção (↑ ↓ =) |
| `cruzadas` | Palavras cruzadas | A grade se monta sozinha; as dicas ficam divididas entre os celulares |
| `sequencia` | Sequência (Genius) | Luz e som; a sequência de termos cresce a cada acerto |
| `quiz_pensar` | Quiz que faz pensar | Em equipe (TBL), decisão com três finais ou resposta com grau de certeza |
| `analise_imagem` | Análise de imagem | Foto, gráfico ou modelo 3D: marcar, responder ou descrever; amplia em tela cheia no celular |
| `escala_padronizada` | Escala padronizada | Mini-IPIP6 (Big Five + Honestidade-Humildade); o aluno vê o próprio perfil, o telão só a média |
| `jogo_economico` | Jogo econômico | Ditador, ultimato, confiança e bens públicos, com pares sorteados |
| `questao_individual` | Questão individual | Múltipla escolha de transferência, pode contar para a meta |

O manual explica cada uma e por que é um recurso pedagógico importante.

## Segurança e dados

- As respostas esperadas **nunca** vão ao servidor durante a aula: ficam no aparelho de quem conduz. Só vai ao telão e aos celulares o que quem conduz revela.
- Cada grupo lê só o próprio pacote; envios são criados e nunca sobrescritos; o prazo gravado por um aluno tem de ser o da sala.
- A introdução da atividade é pública (telão e celulares); a validação avisa quando ela parece falar com quem conduz.
- Encerrar a sala apaga participantes, pacotes, envios e a sala. Salas vencidas são apagadas na volta de quem conduz e pelo TTL do Firestore.
- Lista de mestres: e-mails fixos em `firestore.rules` (função `fixos()`, os mesmos de `ADMINS` em `js/mestres.js`) + o documento `config/mestres`. Os administradores editam a lista em Planejamento → Administração.
- Relatório da aula: planilha .csv com envios e acertos por etapa e por grupo, sem nomes nem identificadores.
- Material enviado à geração integrada vai ao Gemini (Google); nenhum dado de participante é enviado.

## Estrutura

```
js/core/           Núcleo puro e testado (distribuição, tipos, validação, equilíbrio, motor, prompt, embaralhar…)
js/planejar.js     Planejamento, área do professor e administração
js/autoria-docente.js  Criação a partir do material (IA integrada ou externa)
js/revisao-docente.js  Revisão do professor em linguagem legível
js/conduzir.js     Condução (o “cérebro” da sala) e faxina das salas vencidas
js/telao.js        Telão
js/participar.js   Celular do aluno
js/*-tipos.js      Condução, celular, telão e Planejamento dos tipos de atividade
js/icones.js       Ícones 3D (assets/ilustracoes/3d) e de linha
js/backend.js      Escolhe Firebase ou ensaio local
js/cloud-*.js      Firebase (Firestore + Auth) / ensaio (localStorage)
casos/             Modelos prontos (listados em js/casos.js)
firestore.rules    Regras do Firestore (publicadas à mão no console)
tests/             Testes do núcleo e dos modelos
tests/rules/       Testes das regras no emulador do Firestore
tests/e2e/         Aula completa de cada modelo, com celulares simulados (Playwright)
sw.js, manifest.webmanifest   App instalável; as páginas abrem mesmo com a internet oscilando
```

## Testes

- `node --test tests/*.test.mjs` — núcleo e modelos (Node 20+), sem navegador.
- `npx firebase-tools@13 emulators:exec --only firestore --project demo-mosaico-sala "node --test tests/rules/firestore.test.mjs"` — regras no emulador (precisa de Java 11+ e de `@firebase/rules-unit-testing` e `firebase` instalados).
- `node --test tests/e2e/aula.e2e.mjs` — uma aula inteira de cada modelo (precisa do Playwright).
- Em cada pull request, o GitHub roda os testes e publica uma prévia no Firebase.

## Publicação

- Firebase Hosting, projeto `mosaico-sala`, publicado a cada push na `main` (`.github/workflows/firebase-hosting.yml`).
- **Regras do Firestore:** a conta de serviço do fluxo automático não tem permissão para publicá-las (HTTP 403). Cole o `firestore.rules` em Firestore → Regras no console, ou dê a ela o papel *Firebase Rules Admin*.
- **IA integrada:** os créditos da API Gemini são pré-pagos no AI Studio (projeto mosaico-sala → Faturamento). Sem saldo, a geração para e o professor vê “Os créditos de IA do projeto acabaram”.
- **TTL:** quatro políticas no campo `expiresAt` (`rooms`, `members`, `envios`, `pacotes`), ver [OPERACAO-SALAS.md](OPERACAO-SALAS.md).

## Licença e uso

Uso gratuito pelo endereço oficial, dentro do acesso descrito acima, em aulas, cursos, palestras, treinamentos e eventos. Repositório público não é licença aberta: código, interfaces, tipos de atividade, casos, ícones e demais componentes não podem ser copiados, modificados, hospedados em outro endereço nem usados para treinar IA sem autorização. As atividades criadas por cada docente pertencem a quem as criou. Ver [LICENSE.md](LICENSE.md).

Ao mudar o `LICENSE.md`, atualize também o `licenca.html`, que é a versão publicada no site.

**Autor e titular:** Mário César Nascimento, PhD.
Copyright © 2026. Todos os direitos reservados.
