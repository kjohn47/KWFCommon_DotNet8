namespace KWFOpenApi.Html.Document
{
    using System.Reflection;
    using System.IO;
    using System.Text;
    using System.Text.Json;

    using Microsoft.AspNetCore.Components;
    using Microsoft.AspNetCore.Components.Web;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Logging;

    using KWFOpenApi.Metadata.Models;
    using KWFOpenApi.Html.Abstractions;
    using KWFOpenApi.Metadata;
    using KWFJson.Configuration;

    public class KwfApiDocumentRender : IKwfApiDocumentRenderer
    {
        private object _lockObj = new object();

        private readonly IServiceProvider _serviceProvider;
        private readonly IKwfApiDocumentProvider _kwfApiDocumentProvider;
        private readonly ILoggerFactory _loggerFactory;
        private readonly ILogger<KwfApiDocumentRender> _logger;
        private readonly JsonSerializerOptions _jsonSerializerOptions = new KWFJsonConfiguration().GetJsonSerializerOptions();

        private string? _renderedPage;
        private string? _openApiCss;
        private string? _openApiJs;

        public KwfApiDocumentRender(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
            _kwfApiDocumentProvider = serviceProvider.GetRequiredService<IKwfApiDocumentProvider>();
            _loggerFactory = serviceProvider.GetRequiredService<ILoggerFactory>();
            _logger = _loggerFactory.CreateLogger<KwfApiDocumentRender>();
        }

        public string GetKwfOpenApiCss()
        {
            if (string.IsNullOrWhiteSpace(_openApiCss))
            {
                lock(_lockObj)
                {
                    _openApiCss = GetEmbeddedFile("kwfopenapi.css");
                }
            }

            return _openApiCss;
        }

        public string GetKwfOpenApiJs()
        {
            if (string.IsNullOrWhiteSpace(_openApiJs))
            {
                lock (_lockObj)
                {
                    _openApiJs = GetEmbeddedFile("kwfopenapi.js");
                }
            }

            return _openApiJs;
        }

        public async Task<string> GetHtmlForMetadata()
        {
            if (!string.IsNullOrEmpty(_renderedPage))
            {
                return _renderedPage;
            }

            var (documentUrl, openApiDocument) = await _kwfApiDocumentProvider.GetOpenApiDocumentAsync();
            
            return await GetHtmlForMetadata(openApiDocument.GenerateMetadata(documentUrl));
        }

        public async Task<string> GetHtmlForMetadata(KwfOpenApiMetadata metadata)
        {
            if (metadata == null)
            {
                throw new ArgumentNullException(nameof(metadata));
            }

            _renderedPage = await RenderDocument(metadata);

            return _renderedPage;
        }

        private async Task<string> RenderDocument(KwfOpenApiMetadata metadata)
        {
            await using var htmlRenderer = new HtmlRenderer(_serviceProvider, _loggerFactory);

            try
            {
                var html = await htmlRenderer.Dispatcher.InvokeAsync(async () =>
                {
                    var dictionary = new Dictionary<string, object?>
                    {
                        { "Metadata", metadata },
                        { "SerializerOptions", _jsonSerializerOptions }
                    };

                    var parameters = ParameterView.FromDictionary(dictionary);
                    var output = await htmlRenderer.RenderComponentAsync<KwfApiDocumentation>(parameters);

                    return output.ToHtmlString();
                });

                return html;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occured during render of open api document");
                return string.Empty;
            }
        }

        private static string GetEmbeddedFile(string fileName)
        {
            var assembly = typeof(KwfApiDocumentRender)
                .GetTypeInfo()
                .Assembly;

            var resources = assembly.GetManifestResourceNames();

            var documentResource = resources.FirstOrDefault(r => r.EndsWith(fileName));
            if (documentResource == null)
            {
                throw new FileNotFoundException("Resource for file not found", fileName);
            }

            var fileStream = assembly.GetManifestResourceStream(documentResource);

            if (fileStream == null)
            {
                throw new NullReferenceException($"Failed to get resource stream for {fileName}");
            }

            using var streamReader = new StreamReader(fileStream, Encoding.UTF8);
            return streamReader.ReadToEnd();
        }
    }
}
