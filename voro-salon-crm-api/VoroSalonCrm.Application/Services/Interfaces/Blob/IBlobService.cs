namespace VoroSalonCrm.Application.Services.Interfaces.Blob
{
    public interface IBlobService
    {
        Task<string> UploadAsync(string blobName,
            Stream stream,
            string contentType,
            CancellationToken ct = default);
    }
}
