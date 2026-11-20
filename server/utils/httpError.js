// Erro com código HTTP e mensagem que pode ser mostrada ao usuário.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
