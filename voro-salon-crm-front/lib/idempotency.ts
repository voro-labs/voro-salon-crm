/**
 * Gera uma chave de idempotência única para requisições de mutação.
 * Deve ser chamada uma vez por ação do usuário (não por retry).
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID()
}

/**
 * Cache para reutilizar a mesma chave de idempotência em retries automáticos.
 * Chave: endpoint + body hash
 * Valor: Idempotency-Key
 */
const idempotencyKeyCache = new Map<string, string>()

/**
 * Gera um hash simples do corpo da requisição.
 * Usado para detectar se a mesma ação está sendo retentada.
 */
function hashRequestBody(body: unknown): string {
  if (!body) return "empty"
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body)
  return btoa(bodyStr).slice(0, 16) // Primeiros 16 chars de base64
}

/**
 * Obtém ou gera uma chave de idempotência para uma requisição.
 * Reutiliza a chave se for o mesmo endpoint + body (retry).
 */
export function getOrGenerateIdempotencyKey(
  endpoint: string,
  body: unknown,
  forceNew = false
): string {
  const cacheKey = `${endpoint}:${hashRequestBody(body)}`

  if (!forceNew && idempotencyKeyCache.has(cacheKey)) {
    return idempotencyKeyCache.get(cacheKey)!
  }

  const newKey = generateIdempotencyKey()
  idempotencyKeyCache.set(cacheKey, newKey)

  // Limpa o cache após 5 minutos (TTL da chave)
  setTimeout(() => idempotencyKeyCache.delete(cacheKey), 5 * 60 * 1000)

  return newKey
}

/**
 * Limpa o cache de chaves de idempotência.
 * Útil em testes ou quando quer forçar uma nova chave.
 */
export function clearIdempotencyKeyCache(): void {
  idempotencyKeyCache.clear()
}
