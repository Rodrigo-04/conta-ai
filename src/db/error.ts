//Definir os códigos de erro possíveis
export type AccountErrorCode =
  | "NOT FOUND"
  | "UNKNOWN_PERSON"
  | "INVALID_VALUE"
  | "INCOMPLETE"
  | "NO_PAYER"
  | "RECIPIENT_REQUIRED";

//Definir classe de erro
export class AccountError extends Error {
  readonly code: AccountErrorCode;
  readonly details?: unknown;

  constructor(code: AccountErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AccountError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AccountError.prototype);
  }
}
