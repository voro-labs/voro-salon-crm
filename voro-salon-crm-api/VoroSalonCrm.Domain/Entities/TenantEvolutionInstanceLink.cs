namespace VoroSalonCrm.Domain.Entities
{
    public class TenantEvolutionInstanceLink
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public Guid InstanceId { get; set; }
        public DateTimeOffset LinkedAt { get; set; } = DateTimeOffset.UtcNow;
        public Tenant Tenant { get; set; } = null!;
        public TenantEvolutionInstance Instance { get; set; } = null!;
    }
}
