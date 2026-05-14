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
 * Gera um hash do corpo da requisição usando DJB2 XOR.
 * Cobre o body completo e suporta caracteres não-ASCII (acentos, etc).
 */
function hashRequestBody(body: unknown): string {
  if (!body) return "empty"
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body)
  let hash = 5381
  for (let i = 0; i < bodyStr.length; i++) {
    hash = ((hash << 5) + hash) ^ bodyStr.charCodeAt(i)
    hash = hash >>> 0 // unsigned 32-bit
  }
  return hash.toString(36)
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
