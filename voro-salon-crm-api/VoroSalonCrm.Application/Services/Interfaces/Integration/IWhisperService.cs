namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IWhisperService
    {
        /// <summary>
        /// Transcribes audio bytes using the OpenAI Whisper API.
        /// </summary>
        Task<string> TranscribeAsync(Stream audioStream, string filename, string language = "pt");
    }
}
