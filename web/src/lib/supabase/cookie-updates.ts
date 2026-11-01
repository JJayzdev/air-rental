export function applyAuthCookieUpdates<Cookie, Response>(
  updates: Cookie[],
  setRequestCookie: (cookie: Cookie) => void,
  createResponse: () => Response,
  setResponseCookie: (response: Response, cookie: Cookie) => void,
): Response {
  for (const cookie of updates) setRequestCookie(cookie)
  const response = createResponse()
  for (const cookie of updates) setResponseCookie(response, cookie)
  return response
}
