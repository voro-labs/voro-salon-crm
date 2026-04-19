using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Filters
{
    public class ValidateModelFilter : IActionFilter
    {
        public void OnActionExecuting(ActionExecutingContext context)
        {
            if (!context.ModelState.IsValid)
            {
                var errors = context.ModelState
                    .Where(e => e.Value?.Errors.Count > 0)
                    .Select(e => $"{e.Key}: {string.Join("; ", e.Value!.Errors.Select(err => err.ErrorMessage))}")
                    .ToList();

                var message = string.Join(" | ", errors);

                var response = ResponseViewModel<object>.Fail(
                    string.IsNullOrWhiteSpace(message) ? "Dados inválidos na requisição." : message,
                    status: 400
                );

                context.Result = new BadRequestObjectResult(response);
            }
        }

        public void OnActionExecuted(ActionExecutedContext context) { }
    }
}
