namespace KWFOpenApi.Metadata.Models
{
    public class KwfParam
    {
        public required string Name { get; set; }
        public bool Required { get; set; } = false;
        public bool IsEnum { get; set; } = false;
        public bool IsArray { get; set; } = false;
        public string? Format { get; set; }
        public string? EnumReference { get; set; } // when IsEnum
        public List<string>? EnumValues { get; set; } // when IsEnum and anonymous
    }
}
