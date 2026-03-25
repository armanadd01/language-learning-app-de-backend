export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function assertFound<T>(value: T | null | undefined, message = 'Not found'): NonNullable<T> {
  if (!value) throw new HttpError(404, message);
  return value as NonNullable<T>;
}
