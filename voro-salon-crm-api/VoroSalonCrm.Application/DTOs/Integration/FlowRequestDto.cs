namespace VoroSalonCrm.Application.DTOs.Integration
{
    public class FlowRequestDto
    {
        public string? Trigger { get; set; }

        public string? ServiceId { get; set; }
        public string? EmployeeId { get; set; }
        public string? Date { get; set; }
        public string? Time { get; set; }
        public string? Description { get; set; }

        public string? FlowToken { get; set; }
        public string? Phone { get; set; }
        public string? Name { get; set; }
    }

    public class FlowResponseDto
    {
        public object? Data { get; set; }
    }
}