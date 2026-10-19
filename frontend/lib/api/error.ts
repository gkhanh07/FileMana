export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function readApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as {
      statusCode?: number;
      code?: string;
      message?: string;
    };
    return new ApiError(
      body.statusCode ?? res.status,
      body.code ?? "INTERNAL_ERROR",
      body.message ?? res.statusText,
    );
  } catch {
    return new ApiError(res.status, "INTERNAL_ERROR", res.statusText);
  }
}
