namespace KWFOpenApi.Metadata.Extensions
{
    using System.Globalization;
    using System.Net;
    using System.Net.Mime;
    using System.Text;

    using Microsoft.OpenApi.Any;
    using Microsoft.OpenApi.Models;

    using KWFOpenApi.Metadata.Models;

    public static class Constants
    {
        public const string IdentationSpace = "    ";
        public const string ObjectType = "object";
        public const string ArrayType = "array";
        public const string stringType = "string";
        public const string boolType = "boolean";
        public const string integerType = "integer";
        public const string numberType = "number";
        public const string nullType = "null";
        public const string DateTimeFormat = "date-time";
        public const string ByteFormat = "byte";
        public const string BinaryFormat = "binary";
    }

    public static class KwfOpenApiCommonExtensions
    {

        public static (PrimitiveType type, string? value) GetOpenApiValue(this IOpenApiAny value)
        {
            if (value is null)
            {
                return (PrimitiveType.Integer, null);
            }

            if (value.AnyType == AnyType.Primitive)
            {
                switch (value)
                {
                    case OpenApiString strEx:
                        return (strEx.PrimitiveType, strEx?.Value);
                    case OpenApiInteger intEx:
                        return (intEx.PrimitiveType, intEx?.Value.ToString());
                    case OpenApiLong lonEx:
                        return (lonEx.PrimitiveType, lonEx?.Value.ToString());
                    case OpenApiFloat fltEx:
                        return (fltEx.PrimitiveType, fltEx?.Value.ToString());
                    case OpenApiDouble dobEx:
                        return (dobEx.PrimitiveType, dobEx?.Value.ToString());
                    case OpenApiBoolean boolEx:
                        return (boolEx.PrimitiveType, boolEx is not null ? boolEx.Value ? bool.TrueString : bool.FalseString : null);
                    case OpenApiDate dateEx:
                        return (dateEx.PrimitiveType, dateEx?.Value.ToString("o").Substring(0, 10));
                    case OpenApiDateTime dateTimeEx:
                        return (dateTimeEx.PrimitiveType, dateTimeEx?.Value.ToString());
                    case OpenApiPassword pwEx:
                        return (pwEx.PrimitiveType, pwEx?.Value);
                    case OpenApiByte byteEx:
                        return (byteEx.PrimitiveType, byteEx is not null ? Convert.ToBase64String(byteEx.Value) : null);
                    case OpenApiBinary binEx:
                        return (binEx.PrimitiveType, binEx is not null ? Encoding.UTF8.GetString(binEx.Value) : null);
                    default: return (PrimitiveType.Integer, null);
                }
            }

            return (PrimitiveType.Integer, null);
        }

        public static void AppendIdentation(this StringBuilder builder, int times)
        {
            for (int id = 0; id < times; id++)
            {
                builder.Append(Constants.IdentationSpace);
            }
        }

        public static bool IsStringFormat(this PrimitiveType primitiveType)
        {
            switch (primitiveType)
            {
                case PrimitiveType.String:
                case PrimitiveType.Password:
                case PrimitiveType.Binary:
                case PrimitiveType.Byte:
                case PrimitiveType.Date:
                case PrimitiveType.DateTime:
                    {
                        return true;
                    }
                default: return false;
            }
        }

        public static string GetMethod(this OperationType operationType)
        {
            switch (operationType)
            {
                case OperationType.Get: return "GET";
                case OperationType.Post: return "POST";
                case OperationType.Put: return "PUT";
                case OperationType.Delete: return "DELETE";
                default: return "UNDEFINED";
            }
        }

        public static KwfRequestBodyType GetMediaType(this string mediaType)
        {
            switch (mediaType.ToLowerInvariant())
            {
                case MediaTypeNames.Application.Json: return KwfRequestBodyType.Json;
                case MediaTypeNames.Multipart.FormData: return KwfRequestBodyType.FormData;
                default: return KwfRequestBodyType.ClearText;
            }
        }

        public static HttpStatusCode GetStatusCode(this string statusCode)
        {
            var intCode = int.TryParse(statusCode, out var codeNumber) ? codeNumber : 0;
            return (HttpStatusCode) intCode;
        }

        public static string GetStringSampleForFormat(this string? format, string? fallback = null)
        {
            if (format == null)
            {
                return fallback ?? Constants.stringType;
            }

            switch (format.ToLowerInvariant())
            {
                case Constants.DateTimeFormat: 
                    return DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);
                case Constants.ByteFormat:
                    return Constants.ByteFormat;
                case Constants.BinaryFormat:
                    return Constants.BinaryFormat;
                default: return Constants.stringType;
            }
        }
    }
}
