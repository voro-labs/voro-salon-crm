namespace VoroSalonCrm.Application.Services.Interfaces.Blob
{
    public interface IBlobService
    {
        Task<string> UploadAsync(string fileName, Stream stream, string contentType, CancellationToken ct = default);
        Task<string?> GetSignedUrlAsync(string blobUrl, CancellationToken ct = default);
    }
}
