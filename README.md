# Conta Aí

> Nome de trabalho. Pode mudar antes da publicação (ver [planejamento.md](./planejamento.md), seção 12).

App mobile para dividir a conta de restaurantes entre amigos. Tire uma foto da nota, corrija o que o OCR leu errado, escolha quem consumiu o quê e veja quanto cada um paga, com taxa de serviço e controle de quem já pagou.

**Status:** em planejamento. Ainda não há código.

## O que o app faz (MVP)

- Leitura da nota por foto, com **OCR no aparelho** (gratuito e offline), ou cadastro manual
- Tela de revisão para corrigir nome e valor dos itens, com aviso quando a soma não bate com o total
- Dois modos de divisão: **igual** entre N pessoas ou **por itens** (inclusive itens compartilhados)
- Taxa de serviço dividida **igualmente** ou **proporcional ao consumo**
- Diferença de centavos atribuída a uma pessoa, por **sorteio** ou escolha manual
- Resultado em cards por pessoa, com status **pago / pendente**
- Pessoas com apelido, histórico de contas e sincronização entre aparelhos (login com Google ou e-mail)

## Stack

| Camada | Tecnologia |
|---|---|
| App | Expo (React Native) + TypeScript |
| Banco local | SQLite (`expo-sqlite`) |
| Login e nuvem | Supabase (Auth + Postgres) |
| Leitura da nota | OCR no aparelho (ex.: ML Kit), exige *development build* do Expo |
| Testes | Vitest ou Jest (módulo de cálculo) |

## Documentação

- [planejamento.md](./planejamento.md): decisões, regras de negócio, telas, arquitetura, modelo de dados, riscos e roadmap

## Como rodar

A definir. Os passos entram aqui quando o projeto Expo for criado (Sprint 0).

## Checklist

### Antes de começar

- [X] Decidir o nome do app (Conta aí)
- [X] Criar o repositório no GitHub (conta-ai)
- [ ] Criar projeto no Supabase com o mesmo nome (slug)
- [ ] Reunir de 10 a 20 fotos reais de notas (térmica, self-service, com couvert, com desconto)

### Sprint 0: Fundação

- [X] Criar o projeto Expo com TypeScript e `expo-router`
- [ ] Configurar o *development build* (necessário para o OCR)
- [ ] Definir a estrutura de pastas (UI, módulo de cálculo, banco, sincronização)
- [ ] Configurar `expo-sqlite` e as migrações do esquema (conta, item, pessoa, consumo, parcela)
- [ ] Configurar lint, formatação e ambiente de testes

### Sprint 1: Módulo de cálculo

- [ ] Divisão igual em centavos inteiros
- [ ] Divisão por itens, incluindo itens compartilhados
- [ ] Taxa de serviço igual e proporcional ao consumo
- [ ] Diferença de centavos: cálculo, sorteio e escolha manual, com resultado gravado
- [ ] Testes dos casos mínimos (R$ 100 ÷ 3, taxa de 10%, item dividido por 7, 15 pessoas, 0,45 kg)
- [ ] Teste de propriedade: a soma das pessoas sempre é igual ao total

### Sprint 2: Fluxo manual

- [ ] Tela inicial com lista de contas e botão "Nova conta"
- [ ] Cadastro e edição de itens (nome, quantidade, valor da linha)
- [ ] Cadastro de pessoas (nome e apelido) e escolha do pagador
- [ ] Escolha do modo de divisão e da regra da taxa
- [ ] Atribuição de itens às pessoas
- [ ] Aviso "Temos uma diferença" com sorteio ou escolha

### Sprint 3: Resultado e histórico

- [ ] Resultado em cards por pessoa (valor, apelido, status)
- [ ] Marcar pago / pendente, com data do pagamento
- [ ] Histórico de contas e filtro de contas com pendências
- [ ] Detalhe da conta, edição e exclusão
- [ ] Confirmação ao alterar conta que já tem parcelas pagas

### Sprint 4: Login

- [ ] Configurar o Supabase Auth com Google e e-mail
- [ ] Telas de login, cadastro e recuperação de senha
- [ ] Sessão persistente e logout
- [ ] Tabelas no Postgres com RLS por usuário

### Sprint 5: Leitura da nota (OCR)

- [ ] Escolher a biblioteca de OCR com testes nas notas reais
- [ ] Captura com guia de enquadramento, recorte e ajuste de contraste
- [ ] Interpretador de texto: itens, quantidade, valor, taxa de serviço e total
- [ ] Tela de revisão com a foto ao lado e destaque das linhas incertas
- [ ] Aviso de conferência (soma dos itens ≠ total da nota)
- [ ] Tratamento de erro e opção de digitar manualmente
- [ ] Armazenar a foto só no aparelho, com opção de apagar

### Sprint 6: Sincronização

- [ ] Decidir entre sincronização própria ou biblioteca pronta
- [ ] Sincronização em segundo plano, com UUIDs, `updated_at` e `deleted_at`
- [ ] Regra de conflito (a última alteração vence) e aviso de conta alterada em outro aparelho
- [ ] Testar com dois aparelhos e com o app offline

### Sprint 7: Acabamento

- [ ] Estados de erro, carregamento e lista vazia
- [ ] Textos, acessibilidade e performance
- [ ] Privacidade e LGPD (consentimento, exclusão de conta e dados)
- [ ] Testes em aparelho real com notas reais
- [ ] Preparar a publicação (ícone, nome, identificador do app e builds)

## Fora do escopo por enquanto

Modo colaborativo em tempo real, agenda de amigos entre contas, pagamento parcial, cobrança por WhatsApp e Pix, leitura do QR code da NFC-e, rateio de desconto e couvert, e notificações de lembrete.