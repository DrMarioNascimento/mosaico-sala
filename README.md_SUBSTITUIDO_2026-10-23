# MOSAICO · Sala

Plataforma de aplicação de atividades MOSAICO em sala: quem conduz importa uma atividade, abre a sala por QR Code, os participantes entram sem cadastro e são distribuídos entre os grupos planejados.

Especificação de referência: *MOSAICO — Autoria automática e aplicação de atividades em sala*, versão 2.0 (23/10/2026), com a seção 7.1–7.5 (Gramática MOSAICO e autonomia docente).

## Estado atual — primeiro corte

| Parte | Situação |
| --- | --- |
| Núcleo (`js/core/`) | Pronto e testado |
| Caso piloto (`casos/ciclista-altitude.json`) | Pronto, aguardando revisão docente |
| Prompt para IA externa | Pronto (`js/core/prompt.js`) |
| Telas (condutor, telão, participante) e Firebase | Em construção |

## Estrutura

```
js/core/distribuicao.js   Distribuição equilibrada (seção 9, ADR-001)
js/core/tipos.js          Catálogo ActivityType (3 tipos no primeiro corte)
js/core/validacao.js      Validação estrutural da atividade importada
js/core/equilibrio.js     Gramática MOSAICO e sugestões de equilíbrio (7.1–7.4)
js/core/motor.js          Projeções por grupo, coleções, meta, contingências
js/core/prompt.js         Prompt de montagem para IA externa (seção 6)
casos/                    Atividades prontas
tests/                    Testes automáticos (critérios da seção 22)
```

## Tipos de atividade disponíveis

| typeId | Versão | Uso |
| --- | --- | --- |
| `investigacao_fragmentos` | 1.0.0 | Cada grupo recebe parte das evidências e escolhe uma hipótese |
| `comparar_hipoteses` | 1.0.0 | Grupos veem as hipóteses e evidências dos outros e decidem |
| `questao_individual` | 1.0.0 | Múltipla escolha individual, pode contar para a meta |

## Testes

Requer Node 20 ou superior. Na pasta do repositório:

```
node --test tests/*.test.mjs
```

## Arquitetura da sala

- O "cérebro" da sessão roda no aparelho de quem conduz. Só ele carrega o material docente.
- O Firestore recebe apenas a projeção autorizada de cada grupo na etapa atual.
- Encerrar a sala apaga os dados da sessão, como no Eita!.
- Projeto Firebase próprio, separado do Eita! e dos demais jogos.

Prof. Mário César Nascimento, PhD ©
