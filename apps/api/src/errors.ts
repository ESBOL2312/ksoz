/** Ошибка с HTTP-статусом; error handler в app.ts превращает её в JSON { error, message }. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export const notFound = (what = 'not_found') => new AppError(404, what);
export const badRequest = (code: string, message?: string) => new AppError(400, code, message);
export const conflict = (code: string, message?: string) => new AppError(409, code, message);
