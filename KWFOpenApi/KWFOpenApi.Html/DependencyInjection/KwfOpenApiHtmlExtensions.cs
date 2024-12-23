﻿namespace KWFOpenApi.Html.DependencyInjection
{
    using KWFOpenApi.Html.Abstractions;
    using KWFOpenApi.Html.Document;
    using KWFOpenApi.Html.Middleware;

    using Microsoft.AspNetCore.Builder;
    using Microsoft.Extensions.DependencyInjection;

    public static class KwfOpenApiHtmlExtensions
    {
        public static IServiceCollection AddOpenApiHtmlRenderer(this IServiceCollection services)
        {
            services.AddSingleton<IKwfApiDocumentRenderer, KwfApiDocumentRender>();
            return services;
        }

        public static IApplicationBuilder UseKwfOpenApiUI(this IApplicationBuilder appBuilder, string? openApiUIUrl = null)
        {
            var htmlRenderer = appBuilder.ApplicationServices.GetRequiredService<IKwfApiDocumentRenderer>();
            var middleware = new KwfOpenApiUiMiddleware(htmlRenderer, openApiUIUrl);
            appBuilder.Use(middleware.InvokeAsync);
            return appBuilder;
        }
    }
}
