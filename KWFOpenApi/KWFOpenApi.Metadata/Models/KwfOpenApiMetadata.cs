namespace KWFOpenApi.Metadata.Models
{
    public class KwfOpenApiMetadata
    {
        public IEnumerable<KwfAuthorizarion> AuthorizationTypes { get; set; } = Array.Empty<KwfAuthorizarion>();
        public string? ApiName { get; set; } = "KwfApi";
        public string ApiDescription { get; set; } = string.Empty;
        public string ApiVersion { get; set; } = string.Empty;
        public string? OpenApiDocumentUrl { get; set; }
        public Dictionary<string, List<KwfOpenApiRoute>>? Entrypoints { get; set; }
        public Dictionary<string, List<KwfModelProperty>>? Models { get; set; }
        public Dictionary<string, List<string>>? Enums { get; set; }
    }
}
