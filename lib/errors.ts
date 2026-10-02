/**
 * An error whose message is safe to show to the user. Anything else that
 * reaches an API boundary is logged and reported as a generic 500.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (code: string, message: string) =>
  new AppError(400, code, message);

export const notFound = (message = "Not found.") =>
  new AppError(404, "not_found", message);

export const payloadTooLarge = (message: string) =>
  new AppError(413, "payload_too_large", message);

export const unsupportedMediaType = (message: string) =>
  new AppError(415, "unsupported_media_type", message);
