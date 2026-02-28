using VoroSalonCrm.Shared.ViewModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;

namespace VoroSalonCrm.Shared.Extensions
{
    public static class ResponseExtension
    {
        public static IActionResult ToActionResult<T>(this ResponseViewModel<T> response) where T : class?
        {
            var statusCodeResult = response.Status switch
            {
                >= 200 and < 300 => new ObjectResult(response) { StatusCode = response.Status },
                >= 400 and < 500 => new BadRequestObjectResult(response) { StatusCode = response.Status },
                >= 500 => new ObjectResult(response) { StatusCode = response.Status },
                _ => new ObjectResult(response) { StatusCode = StatusCodes.Status500InternalServerError }
            };

            return statusCodeResult;
        }
    }
}
