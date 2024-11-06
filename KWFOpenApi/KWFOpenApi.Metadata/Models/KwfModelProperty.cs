namespace KWFOpenApi.Metadata.Models
{
    using System.Text.Json.Serialization;

    public class KwfModelProperty
    {
        public required string Name { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public required string Type { get; set; }
        public string? Format { get; set; }
        public bool IsRequired { get; set; } = false;
        public bool IsEnum { get; set; } = false;
        public bool IsObject { get; set; } = false;
        public bool IsArray { get; set; } = false;
        public bool IsDate { get; set; } = false;
        public bool IsDictionary { get; set; } = false;
        public string? DictionaryValueType { get; set; }
        public string? DictionaryValueReference { get; set; }
        public bool DictionaryValueIsArray { get; set; }
        public bool DictionaryValueIsEnum { get; set; }
        public KwfModelProperty? NestedArrayProperty { get; set; }

        [JsonIgnore]
        public string? ExampleValue { get; set; }
        [JsonIgnore]
        public Dictionary<string, string>? ExampleValueDictionary { get; set; }
        [JsonIgnore]
        public List<string>? ExampleValueArray { get; set; }
    }
}
