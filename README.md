# MOSAICO · Sala

## Disponibilidade e novidades — 24 de outubro de 2026

**Planejamento público com conta Google; condução de salas restrita.** Qualquer conta Google pode montar e exportar atividades em [Planejamento](https://mosaico-sala.web.app/planejar.html). A biblioteca compartilhada e a criação de salas on-line exigem uma conta autorizada; participantes entram por código ou QR. O ensaio local serve para pré-visualização e não concede autorização de hospedagem de uma sala on-line.

A descrição “modo aberto (planilha)” refere-se à montagem e exportação, não à liberação da condução. Os termos de uso estão na [licença](LICENSE.md), também publicada em https://mosaico-sala.web.app/licenca.

[Ver todos os recursos públicos](https://www.drmarionascimento.com.br/#acesso-publico). O acesso respeita [LICENSE.md](LICENSE.md).

Plataforma de aplicação de atividades MOSAICO em sala: quem conduz importa uma atividade, abre a sala por QR Code, os participantes entram sem cadastro e são distribuídos entre os grupos planejados. Cada grupo recebe só uma parte das evidências; as hipóteses circulam entre grupos; a turma compete para superar a meta.

Especificação de referência: *MOSAICO — Autoria automática e aplicação de atividades em sala*, versão 2.0 (23/10/2026), com a seção 7.1–7.5 (Gramática MOSAICO e autonomia docente).

## Páginas

| Página | Quem usa | Onde |
| --- | --- | --- |
| `index.html` | todos | entrada |
| `conduzir.html` | quem conduz (login Google, lista de mestres) | celular |
| `telao.html` | telão da sala | TV / PC da sala |
| `participar.html` | participantes (sem cadastro) | celular |
| `planejar.html` | quem planeja (login Google) | PC |
| `previa.html` | pré-visualização aberta pelo Planejamento (ensaio local) | PC |
| `simulador.html` | simulador de aula na sala real | PC |
| `licenca.html` | licença de uso (mesmo texto do `LICENSE.md`), ligada no rodapé de todas as páginas | todos |

Acrescentar `?ensaio=1` a qualquer página roda tudo neste navegador, sem internet, para ensaiar a aula sozinho (com participantes simulados).

## Fluxo da aula

1. **Atividade:** modelo pronto, arquivo importado (botão ou arrastar e soltar) ou montagem por IA externa (prompt gerado na própria tela). No Planejamento, o botão **Dar esta aula** leva a atividade aberta direto para a Condução, já na aba Sala. O Planejamento mostra os 3 passos (Sobre a turma → Etapas → Revisar) com as pendências de cada um, e **Ver esta etapa** abre a turma simulada já naquela etapa. Revisão, sugestões de equilíbrio, ajustes de tempo, competição, nomes dos grupos e meta.
2. **Sala:** abrir sala → QR Code e código → abrir o telão (no PC da sala, digitar os 6 números já abre o telão).
3. **Grupos:** sorteio equilibrado (seção 9). Excedentes pela ordem de alocação; mover pessoas; trocar representante; entrada tardia vai para o grupo menor.
4. **Condução:** iniciar e encerrar etapas; acompanhar envios; contingências para grupo vazio ou pendente (outro grupo cobre / registro pela condução / ausência registrada).
5. **Resultado:** revelar a meta e as explicações; encerrar a sala apaga tudo.

## Planejamento e dois modos de uso

- **Fechado (biblioteca):** contas da lista de mestres guardam atividades no Firestore (`biblioteca/`). Cada conta lê e edita as suas; pode compartilhar com os outros mestres (leitura e cópia). Nenhum dado de participante fica na biblioteca.
- **Aberto (planilha):** qualquer conta Google pode montar e exportar a planilha `.xlsx`. Rascunhos são locais; a biblioteca em nuvem é restrita. A criação de uma sala on-line a partir da planilha continua exigindo uma conta de mestre autorizada.
- Formato da planilha: abas Atividade, Grupos, Etapas, Opcoes, Pecas e Fontes (ver `js/core/planilha.js`). A planilha contém o gabarito: não distribuir aos participantes.
- LGPD: nomes dos participantes só durante a sessão (apagados ao encerrar); a validação avisa quando um texto parece conter CPF, e-mail ou telefone. Casos devem ser fictícios.

## Estrutura

```
js/core/           Núcleo puro, testado (distribuição, tipos, validação, equilíbrio, motor, prompt)
js/conduzir.js     Painel de quem conduz ("cérebro" da sala)
js/telao.js        Telão
js/participar.js   Participante
js/imprimir.js     Versão para imprimir (material docente em folha separada)
js/backend.js      Escolhe Firebase ou ensaio local
js/cloud-*.js      Firebase (Firestore + Auth) / ensaio (localStorage)
js/qr.js           Gerador de QR Code próprio (mesmo do Eita!)
casos/             Modelos prontos (listados em js/casos.js; tests/casos.test.mjs confere cada um)
js/*-tipos.js      Condução, celular, telão e Planejamento dos tipos novos (pares, corrida, cruzadas, sequência/Genius, quiz que faz pensar, análise de imagem)
firestore.rules    Regras do Firestore
tests/             Testes automáticos (critérios da seção 22)
```

## Segurança e dados

- O material docente (respostas esperadas, guia) **nunca** vai ao servidor durante a atividade: fica só no aparelho de quem conduz. Só é publicado o que quem conduz revela no fim.
- Cada grupo só consegue ler o próprio pacote (regras do Firestore).
- Envios só podem ser criados, nunca sobrescritos.
- Encerrar a sala apaga participantes, pacotes, envios e a sala. Salas abandonadas são apagadas na próxima entrada de quem conduz.
- Lista de mestres: e-mails fixos em `firestore.rules` e/ou documento `config/mestres` com o campo `emails` (lista).

## Tipos de atividade disponíveis

| typeId | Versão | Uso |
| --- | --- | --- |
| `investigacao_fragmentos` | 1.0.0 | Cada grupo recebe parte das evidências e escolhe uma hipótese |
| `comparar_hipoteses` | 1.0.0 | Grupos veem as hipóteses e evidências dos outros e decidem |
| `questao_individual` | 1.0.0 | Múltipla escolha individual, pode contar para a meta |
| `montagem_pecas` | 1.0.0 | Reconstrução com peças |
| `cadeado_grupo` | 1.0.0 | Desafio de cadeado por grupo |
| `quiz_grupos` | 1.0.0 | Quiz entre grupos |
| `cartoes_arrastar` | 1.0.0 | Cartões de arrastar em quadro compartilhado: ordenar (a cadeia inteira ou por trechos, entre grupos), classificar ou termômetro (entre dois polos) |
| `pares` | 1.0.0 | Pares de conteúdo: ligar (arrastar até o par) ou jogo da memória (por grupo, ou no telão com a vez de cada grupo) |
| `corrida` | 1.0.0 | No próprio ritmo, pontos somam para o grupo: quiz, corrente de causa e efeito ou escolher a direção (↑ ↓ =), com power-ups opcionais |
| `cruzadas` | 1.0.0 | Palavras cruzadas montadas sozinhas; dicas divididas entre os celulares; grade por grupo ou da turma |
| `sequencia` | 1.0.0 | Sequência (Genius): o painel acende termos sorteados de um banco, com luz e som (Web Audio, notas do Genius original); a sequência cresce a cada acerto; vale o recorde de cada aluno, que soma para o grupo; ranking no telão |
| `quiz_pensar` | 1.0.0 | Quiz que faz pensar: em equipe (TBL), tomada de decisão com ramos, ou metacognição (resposta + certeza) |
| `analise_imagem` | 1.0.0 | Foto, gráfico ou modelo 3D (.glb): marcar na imagem, perguntas sobre ela ou observar e descrever (vai para o telão) |

## Publicação

- Firebase Hosting, projeto `mosaico-sala` (plano gratuito). Endereço: https://mosaico-sala.web.app
- Publicação automática a cada push (`.github/workflows/firebase-hosting.yml`), com o segredo `FIREBASE_SERVICE_ACCOUNT_MOSAICO_SALA`.
- As regras (`firestore.rules`) são coladas em Firestore → Regras no console.

## Testes

Requer Node 20 ou superior:

```
node --test tests/nucleo.test.mjs
```

## Licença e uso

Uso gratuito pelo endereço oficial, dentro do acesso descrito acima, em aulas, cursos, palestras, treinamentos e eventos. Repositório público não é licença aberta: código, interfaces, tipos de atividade, casos, banco de termos e demais componentes não podem ser copiados, modificados, hospedados em outro endereço nem usados para treinar IA sem autorização. As atividades criadas por cada docente pertencem a quem as criou. Ver [LICENSE.md](LICENSE.md).

Ao mudar o `LICENSE.md`, atualize também o `licenca.html`, que é a versão publicada no site.

**Autor e titular:** Mário César Nascimento, PhD.  
Copyright © 2026. Todos os direitos reservados.
