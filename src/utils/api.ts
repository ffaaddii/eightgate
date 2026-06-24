type ApiOk<T> = T

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(args: { status: number; message: string; payload: unknown }) {
    super(args.message)
    this.name = 'ApiError'
    this.status = args.status
    this.payload = args.payload
  }
}

async function apiRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<ApiOk<T>> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const res = await fetch(url, {
    ...init,
    headers: isFormData
      ? init?.headers
      : {
          'content-type': 'application/json',
          ...(init?.headers ?? {}),
        },
    credentials: 'include',
  })

  const text = await res.text()
  const json = text ? (JSON.parse(text) as unknown) : null
  if (!res.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
        ? String((json as { error: string }).error)
        : res.statusText
    throw new ApiError({ status: res.status, message, payload: json })
  }
  return json as ApiOk<T>
}

export function apiGet<T>(url: string): Promise<T> {
  return apiRequest<T>(url)
}

export function apiPost<T>(url: string, body: unknown): Promise<T> {
  return apiRequest<T>(url, { method: 'POST', body: JSON.stringify(body) })
}

export function apiPatch<T>(url: string, body: unknown): Promise<T> {
  return apiRequest<T>(url, { method: 'PATCH', body: JSON.stringify(body) })
}

export function apiPostForm<T>(url: string, body: FormData): Promise<T> {
  return apiRequest<T>(url, { method: 'POST', body })
}

export function apiPatchForm<T>(url: string, body: FormData): Promise<T> {
  return apiRequest<T>(url, { method: 'PATCH', body })
}

export function apiDelete<T>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: 'DELETE' })
}
