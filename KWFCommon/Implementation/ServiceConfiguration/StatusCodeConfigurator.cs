namespace KWFCommon.Implementation.ServiceConfiguration
{
    using KWFCommon.Abstractions.Constants;
    using KWFCommon.Abstractions.Models;
    using KWFCommon.Implementation.Models;

    using Microsoft.AspNetCore.Builder;
    using Microsoft.AspNetCore.Http;

    using System.Net;
    using System.Text.Json;

    public static class StatusCodeConfigurator
    {
        public static void UseStatusCodeHandler(
            this IApplicationBuilder app,
            JsonSerializerOptions serializerOpt,
            bool isDev = false)
        {
            app.UseStatusCodePages(a => a.Run(async ctx =>
            {
                if (ctx.Response.HasStarted)
                {
                    return;
                }

                switch (ctx.Response.StatusCode)
                {
                    case ((int)HttpStatusCode.Unauthorized):
                        {
                            string message = "Selected authentication is invalid or user is not authenticated";
                            string code = string.Empty;
                            if (ctx.Response.Headers.TryGetValue(RestConstants.AuthenticateHeader, out var authHeader))
                            {
                                if (authHeader.Count > 0)
                                {
                                    code = authHeader[0] ?? string.Empty;
                                }

                                switch (code)
                                {
                                    case ErrorConstants.AuthSignatureErrorCode:
                                        {
                                            message = "Invalid authentication signature, please logout and login again";
                                            break;
                                        }
                                    case ErrorConstants.AuthExpiredErrorCode:
                                        {
                                            message = "Your authentication has expired, request new token from auth server and send new request";
                                            break;
                                        }
                                    default:
                                        {
                                            code = ErrorConstants.AuthDefaultErrorCode;
                                            break;
                                        }
                                }
                            }

                            if (!isDev)
                            {
                                message = "User is not authenticated";
                            }

                            await ctx.Response.WriteAsJsonAsync(
                                new ErrorResult(
                                    code,
                                    message,
                                    HttpStatusCode.Unauthorized,
                                    ErrorTypeEnum.Application),
                                serializerOpt);
                            break;
                        }
                    case ((int)HttpStatusCode.Forbidden):
                        {
                            await ctx.Response.WriteAsJsonAsync(
                                new ErrorResult(
                                    ErrorConstants.AuthorizationErrorCode,
                                    "User is not allowed to resource",
                                    HttpStatusCode.Forbidden,
                                    ErrorTypeEnum.Application),
                                serializerOpt);
                            break;
                        }
                    case ((int)HttpStatusCode.NotFound):
                        {
                            await ctx.Response.WriteAsJsonAsync(
                                new ErrorResult(
                                    ErrorConstants.DefaultErrorCode,
                                    "Could not find desired resource",
                                    HttpStatusCode.NotFound,
                                    ErrorTypeEnum.Application),
                                serializerOpt);
                            break;
                        }
                    default:
                        {
                            await ctx.Response.WriteAsJsonAsync(
                                new ErrorResult(
                                    ErrorConstants.DefaultErrorCode,
                                    "Unknown error occurred",
                                    (HttpStatusCode)ctx.Response.StatusCode,
                                    ErrorTypeEnum.Application),
                                serializerOpt);
                            break;
                        }
                }
            }));
        }
    }
}
