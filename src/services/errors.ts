export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Algo deu errado. Tente de novo.';
