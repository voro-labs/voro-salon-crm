using Microsoft.AspNetCore.Http;

namespace VoroSwipeEntertainment.Shared.ViewModels
{
    public class ResponseViewModel<T> where T : class?
    {
        public int Status { get; set; }
        public string? Message { get; set; }
        public T? Data { get; set; }

        public bool HasError => Status < 200 && Status > 299;

        public static ResponseViewModel<T> Success(T? data, int status = StatusCodes.Status200OK)
            => new() { Status = status, Message = string.Empty, Data = data };
        
        public static ResponseViewModel<T> SuccessWithMessage(string message, T? data, int status = StatusCodes.Status200OK)
            => new() { Status = status, Message = message, Data = data };

        public static ResponseViewModel<T> Fail(string message, T? data = null, int status = StatusCodes.Status500InternalServerError)
            => new() { Status = status, Message = message, Data = data };
    }
}
