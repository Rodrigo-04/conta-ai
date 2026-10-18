# Responsabilidade

O core irá cuidar dos cálculos que o sistema precisar

> Sem tela
> Sem banco de dados

Aqui lidaremos com:

- divisão de itens
- taxa de serviço
- distribuição de centavos não divisíveis

## Arquivos

| Nome     | Objetivo                           |
| -------- | ---------------------------------- |
| types.ts | Definir tipos e objetos para usar. |
| erros.ts | Representar erros dos cálculos.    |
| money.ts | Validar valores e somar.           |
| fee.ts   | Calcular taxa de serviço.          |
| split.ts | Dividir a conta entre as pessoas.  |

Irei usar o Jest para testes automáticos

Precisamos instalar as ferramentas

```bash
npx expo install jest-expo jest @types/jest --dev
npm install --save-dev fast-check
```

E para executar

```bash
npm test
```
