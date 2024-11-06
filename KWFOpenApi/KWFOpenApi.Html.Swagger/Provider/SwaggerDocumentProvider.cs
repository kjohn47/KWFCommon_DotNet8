namespace KWFOpenApi.Html.Swagger.Provider
{
    using System;
    using System.Threading.Tasks;

    using KWFOpenApi.Html.Abstractions;

    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.OpenApi.Models;

    using Swashbuckle.AspNetCore.Swagger;

    public class SwaggerDocumentProvider : IKwfApiDocumentProvider
    {
        private const string DefaultDocumentName = "v1";
        private const string DefaultSwaggerUrl = "swagger/v1/swagger.json";

        private readonly IServiceProvider _serviceProvider;
        private readonly string _documentName;
        private readonly string _documentUrl;

        public SwaggerDocumentProvider(IServiceProvider serviceProvider, string? documentName, string? documentUrl)
        {
            _serviceProvider = serviceProvider;
            _documentName = string.IsNullOrEmpty(documentName) ? DefaultDocumentName : documentName;
            _documentUrl = string.IsNullOrEmpty(documentUrl) ? DefaultSwaggerUrl : documentUrl;
        }

        public async Task<(string documentUrl, OpenApiDocument openApiDocument)> GetOpenApiDocumentAsync()
        {
            var swaggerProvider = _serviceProvider.GetRequiredService<IAsyncSwaggerProvider>();
            var document = await swaggerProvider.GetSwaggerAsync(_documentName);
            
            return (_documentUrl, document);
        }
    }
}
