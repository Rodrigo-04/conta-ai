//Definir os códigos de erro possíveis
export type SplitErrorCode = //cria um Union Type, aceitando apenas os textos específicados
  | "NO_PEOPLE" //nenhuma pessoa informada
  | "DUPLICATE_PERSON" //existe uma pessoa duplicada
  | "INVALID_AMOUNT" //valor inválido
  | "INVALID_PERCENT" //percentual inválido
  | "UNKNOWN_PERSON" //pessoa não encontrada
  | "UNKNOWN_ITEM" //item não encontrado
  | "UNASSIGNED_ITEMS"; //existem itens sem uma pessoa tribuida

//Definir classe de erro
export class SplitError extends Error {
  //herda propriedades de error (classe de erro padão do JS)
  readonly code: SplitErrorCode;
  readonly details?: unknown;

  constructor(code: SplitErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "SplitError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, SplitError.prototype);
  }
}
