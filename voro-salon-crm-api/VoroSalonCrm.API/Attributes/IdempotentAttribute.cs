namespace VoroSalonCrm.API.Attributes
{
    /// <summary>
    /// Marca um endpoint como idempotente. Requisições com o mesmo header
    /// Idempotency-Key retornarão a resposta cacheada sem re-executar a lógica.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public class IdempotentAttribute : Attribute
    {
        /// <summary>
        /// Tempo de vida da chave de idempotência no cache. Default: 24 horas.
        /// </summary>
        public int ExpirationHours { get; set; } = 24;
    }
}
