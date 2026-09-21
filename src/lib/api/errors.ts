/** Thrown by a service to say exactly what HTTP status a route should
 *  answer with — keeps that decision in the service (which knows *why*
 *  something failed) instead of the route re-deriving it from a generic
 *  Error message. */
class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Every route's catch block funnels through this — one place that turns
 *  a thrown `ApiError` into its intended status, and anything unexpected
 *  into a logged 500 rather than leaking an internal error to the client. */
function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error(error)
  return Response.json({ error: "Something went wrong." }, { status: 500 })
}

export { ApiError, apiErrorResponse }
