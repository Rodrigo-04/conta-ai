# Responsabilidade

O core irá cuidar dos cálculos que o sistema precisar

> Sem tela
> Sem banco de dados

Aqui lidaremos com:

- divisão de itens
- taxa de serviço
- distribuição de centavos não divisíveis

## Arquivos

| Nome         | Objetivo                                |
| ------------ | --------------------------------------- |
| types.ts     | Definir tipos e objetos para usar.      |
| erros.ts     | Representar erros dos cálculos.         |
| money.ts     | Validar valores e somar.                |
| fee.ts       | Calcular taxa de serviço.               |
| split.ts     | Dividir a conta entre as pessoas.       |
| remainder.ts | Sorteia a diferença da divisão.         |
| receipt.ts   | Confere valores e define valor.         |
| index.js     | Reúne as exportações dos arquivos core. |

Irei usar o Jest para testes automáticos

> https://jestjs.io/

Testes gerados pelo Claude (46 testes)

Precisamos instalar as ferramentas

```bash
npx expo install jest-expo jest @types/jest --dev
npm install --save-dev fast-check
```

E para executar

```bash
npm test
```
