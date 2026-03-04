namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IExportService
    {
        Task<(byte[] FileBytes, string FileName)> ExportClientsCsvAsync();
        Task<(byte[] FileBytes, string FileName)> ExportServiceRecordsCsvAsync();
    }
}
