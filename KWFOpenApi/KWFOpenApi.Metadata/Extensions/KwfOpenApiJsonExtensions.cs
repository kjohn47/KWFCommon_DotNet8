namespace KWFOpenApi.Metadata.Extensions
{
    using System.Text;

    using KWFOpenApi.Metadata.Models;

    using Microsoft.OpenApi.Models;

    public static class KwfOpenApiJsonExtensions
    {
        private const int _maxEnumDepth = 6;

        public static string GenerateJsonBody(this OpenApiSchema value, KwfOpenApiMetadata metadata)
        {
            if ((value.Type == null || 
                value.Type.Equals(Constants.ObjectType, StringComparison.InvariantCultureIgnoreCase) ||
                value.Type.Equals(Constants.ArrayType, StringComparison.InvariantCultureIgnoreCase)) && value.Reference?.Id == null)
            {
                return "{}";
            }

            if (value.Type != null)
            {
                if (value.Type.Equals(Constants.stringType, StringComparison.InvariantCultureIgnoreCase) && value.Reference?.Id == null)
                {
                    return "\"string\"";
                }

                if (value.Type.Equals(Constants.integerType, StringComparison.InvariantCultureIgnoreCase) ||
                    value.Type.Equals(Constants.numberType, StringComparison.InvariantCultureIgnoreCase))
                {
                    return "0";
                }

                if (value.Type.Equals(Constants.nullType, StringComparison.InvariantCultureIgnoreCase))
                {
                    return "null";
                }

                if (value.Type.Equals(Constants.boolType, StringComparison.InvariantCultureIgnoreCase))
                {
                    return "false";
                }
            }

            if (metadata.Enums != null && metadata.Enums.TryGetValue(value.Reference.Id, out var apiEnum))
            { 
                return $"\"{GenerateEnumSample(apiEnum)}\"";
            }

            return metadata.GenerateJsonBodyFromReference(value.Reference.Id);
        }

        private static string GenerateJsonBodyFromReference(this KwfOpenApiMetadata metadata, string reference, int identation = 0, bool isFinal = true)
        {
            if (metadata?.Models == null)
            {
                return "{}";
            }
            
            var modelProperties = metadata.Models.TryGetValue(reference, out var modelPropertiesObj) ? modelPropertiesObj : null;

            if (modelProperties == null || modelProperties.Count == 0)
            {
                return "{}";
            }

            var reqStrBuilder = new StringBuilder();
            var numProp = modelProperties.Count;
            var lastPropIndex = numProp - 1;

            reqStrBuilder.Append("{\n");

            for (int i = 0; i < numProp; i++)
            {
                var prop = modelProperties[i];
                if (prop == null)
                {
                    continue;
                }

                reqStrBuilder.AppendIdentation(identation + 1);

                reqStrBuilder.Append("\"");
                reqStrBuilder.Append(prop.Name);
                reqStrBuilder.Append("\": ");

                reqStrBuilder.AppendPropertiesForJsonType(metadata, prop, identation, i == lastPropIndex);
            }

            reqStrBuilder.AppendIdentation(identation);

            reqStrBuilder.Append("}");
            if (!isFinal)
            {
                reqStrBuilder.Append(",");
            }
            reqStrBuilder.Append("\n");

            return reqStrBuilder.ToString();
        }

        private static void AppendPropertiesForJsonType(this StringBuilder builder, KwfOpenApiMetadata metadata, KwfModelProperty value, int currIdentation, bool isFinal)
        {
            if (value.IsArray)
            {
                // call array handler
                builder.AppendForJsonArray(metadata, value, currIdentation + 1, isFinal);
                return;
            }

            if (value.IsDictionary)
            {
                // call dictionary handler
                builder.AppendForJsonDictionary(value, currIdentation + 1, isFinal);
                return;
            }

            if (value.IsEnum && value.Reference != null)
            {
                var enumValues = metadata.Enums != null && metadata.Enums.TryGetValue(value.Reference, out var apiEnum) ? apiEnum : null;
                builder.Append(GenerateEnumSample(enumValues, isFinal));
                builder.Append("\n");

                return;
            }

            if (value.IsObject && value.Reference != null)
            {
                builder.Append(metadata.GenerateJsonBodyFromReference(value.Reference, currIdentation + 1, isFinal));
                return;
            }

            if (value.Type.Equals(Constants.stringType, StringComparison.InvariantCultureIgnoreCase))
            {
                builder.Append("\"");
                builder.Append(value.ExampleValue ?? value.Format.GetStringSampleForFormat(Constants.stringType));
                builder.Append("\"");
                if (!isFinal)
                {
                    builder.Append(",");
                }
                builder.Append("\n");

                return;
            }

            if (value.Type.Equals(Constants.boolType, StringComparison.InvariantCultureIgnoreCase))
            {
                builder.Append(value.ExampleValue ?? bool.FalseString);
                if (!isFinal)
                {
                    builder.Append(",");
                }
                builder.Append("\n");

                return;
            }

            if (value.Type.Equals(Constants.integerType, StringComparison.InvariantCultureIgnoreCase) ||
                value.Type.Equals(Constants.numberType, StringComparison.InvariantCultureIgnoreCase))
            {
                builder.Append(value.ExampleValue ?? "0");
                if (!isFinal)
                {
                    builder.Append(",");
                }
                builder.Append("\n");

                return;
            }

            if (value.Type.Equals(Constants.nullType, StringComparison.InvariantCultureIgnoreCase))
            {
                builder.Append("null");
                if (!isFinal)
                {
                    builder.Append(",");
                }
                builder.Append("\n");

                return;
            }
        }

        private static void AppendForJsonDictionary(this StringBuilder builder, KwfModelProperty value, int identation, bool isFinal)
        {
            if (!value.IsDictionary)
            {
                return;
            }

            if (value.ExampleValueDictionary == null || value.ExampleValueDictionary.Count == 0)
            {
                if (value.IsObject)
                {
                    var typeStartsWithDictionary = value.DictionaryValueType != null && value.DictionaryValueType.StartsWith("Dictionary");
                    if (value.DictionaryValueReference != null && (value.DictionaryValueType == null || !typeStartsWithDictionary))
                    {
                        var refToDisplay = value.DictionaryValueIsArray ? $"[ {value.DictionaryValueReference} ]" : value.DictionaryValueReference;
                        builder.Append($"{{ {{ \"Key\": {refToDisplay} }} }}");
                        if (!isFinal)
                        {
                            builder.Append(",");
                        }

                        builder.Append("\n");
                        return;
                    }

                    if (value.DictionaryValueType != null)
                    {
                        if (typeStartsWithDictionary)
                        {
                            builder.Append($"{{ {value.DictionaryValueType} }}");
                            if (!isFinal)
                            {
                                builder.Append(",");
                            }

                            builder.Append("\n");
                            return;
                        }

                        var typeToDisplay = value.DictionaryValueIsArray ? $"[ {value.DictionaryValueType} ]" : value.DictionaryValueType;
                        builder.Append($"{{ {{ \"Key\": {typeToDisplay} }} }}");
                        if (!isFinal)
                        {
                            builder.Append(",");
                        }

                        builder.Append("\n");
                        return;
                    }

                    builder.Append("{ {\"Key\": \"Value\"} }");
                    if (!isFinal)
                    {
                        builder.Append(",");
                    }

                    builder.Append("\n");
                }
                return;
            }

            builder.Append("{\n");
            var dictCount = value.ExampleValueDictionary.Count;
            for (int y = 0; y < dictCount; y++)
            {
                var dicEntry = value.ExampleValueDictionary.ElementAt(y);
                var dicKey = dicEntry.Key;
                var dicValue = dicEntry.Value;

                builder.AppendIdentation(identation + 1);

                builder.Append("\"");
                builder.Append(dicKey);
                builder.Append("\": ");
                builder.Append(dicValue);

                if (y < dictCount - 1)
                {
                    builder.Append(",");
                }

                builder.Append("\n");
            }

            builder.AppendIdentation(identation);

            builder.Append("}");
            if (!isFinal)
            {
                builder.Append(",");
            }

            builder.Append("\n");
        }
        
        private static void AppendForJsonArray(this StringBuilder builder, KwfOpenApiMetadata metadata, KwfModelProperty value, int identation, bool isFinal)
        {
            if (!value.IsArray)
            {
                return;
            }

            if (value.Reference != null)
            {
                if (value.IsObject)
                {
                    builder.Append("[\n");
                    builder.AppendIdentation(identation + 1);
                    builder.Append(metadata.GenerateJsonBodyFromReference(value.Reference, identation + 1));
                    builder.AppendIdentation(identation);
                    builder.Append("]");
                    if (!isFinal)
                    {
                        builder.Append(",");
                    }
                    builder.Append("\n");

                    return;
                }

                if (value.IsEnum && metadata.Enums != null && metadata.Enums.TryGetValue(value.Reference, out var valuesEnum))
                {
                    builder.Append("[ \"");
                    builder.AppendEnumSampleList(valuesEnum);
                    builder.Append(" \"]");
                    if (!isFinal)
                    {
                        builder.Append(",");
                    }
                    builder.Append("\n");

                    return;
                }
            }

            if (value.Type.Equals(Constants.ArrayType, StringComparison.InvariantCultureIgnoreCase) && value.NestedArrayProperty != null)
            {
                builder.Append("[\n");
                builder.AppendIdentation(identation + 1);
                builder.AppendForJsonArray(metadata, value.NestedArrayProperty, identation + 1, true);
                builder.AppendIdentation(identation);
                builder.Append("]");
                if (!isFinal)
                {
                    builder.Append(",");
                }
                builder.Append("\n");
                return;
            }

            if (value.ExampleValueArray != null && value.ExampleValueArray.Count > 0)
            {
                builder.Append("[\n");
                var count = value.ExampleValueArray.Count;
                for (int y = 0; y < count; y++)
                {
                    var item = value.ExampleValueArray[y];
                    if (y == 0)
                    {
                        builder.AppendIdentation(identation + 1);
                    }

                    if (value.Type.Equals(Constants.stringType, StringComparison.InvariantCultureIgnoreCase))
                    {
                        builder.Append("\"");
                        builder.Append(item);
                        builder.Append("\"");
                    }
                    else
                    {
                        builder.Append(item);
                    }

                    if (y < count - 1)
                    {
                        builder.Append(",");
                    }
                }

                if (count > 0)
                {
                    builder.Append("\n");
                    builder.AppendIdentation(identation);
                }

                builder.Append("]");
                if (!isFinal)
                {
                    builder.Append(",");
                }
                builder.Append("\n");
                return;
            }

            if (value.Type.Equals(Constants.integerType, StringComparison.InvariantCultureIgnoreCase) ||
                value.Type.Equals(Constants.numberType, StringComparison.InvariantCultureIgnoreCase))
            {
                builder.Append("[0, 1, 2, 3]");
                if (!isFinal)
                {
                    builder.Append(",");
                }
                builder.Append("\n");

                return;
            }

            if (value.Type.Equals(Constants.boolType, StringComparison.InvariantCultureIgnoreCase))
            {
                builder.Append("[false, false, true]");
                if (!isFinal)
                {
                    builder.Append(",");
                }
                builder.Append("\n");

                return;
            }

            if (value.IsDictionary && (value.DictionaryValueType != null || value.DictionaryValueReference != null))
            {
                builder.Append("[\"");
                var typeStartsWithDictionary = value.DictionaryValueType != null && value.DictionaryValueType.StartsWith("Dictionary");
                if (value.DictionaryValueReference != null && (value.DictionaryValueType == null || !typeStartsWithDictionary))
                {
                    builder.Append($"{{ {{ \"Key\": {value.DictionaryValueReference} }} }}");
                }
                else if (typeStartsWithDictionary)
                {
                    builder.Append($"{{ {value.DictionaryValueType}\" }}");
                }
                else
                {

                    builder.Append($"{{ {{ \"Key\": \"{value.DictionaryValueType}\" }} }}");
                }
                builder.Append("\"]");
                if (!isFinal)
                {
                    builder.Append(",");
                }

                builder.Append("\n");
                return;
            }

            builder.Append("[\"");
            builder.Append(value.Format.GetStringSampleForFormat(value.Type) ?? value.Type);
            builder.Append("\"]");
            if (!isFinal)
            {
                builder.Append(",");
            }

            builder.Append("\n");

            return;
        }

        private static string GenerateEnumSample(List<string>? enumValues, bool isFinal = true)
        {
            if (enumValues != null && enumValues.Count > 0)
            {
                var enumStrBuilder = new StringBuilder("\"");
                enumStrBuilder.Append(Constants.stringType);
                enumStrBuilder.Append("\"");
                
                if (!isFinal)
                {
                    enumStrBuilder.Append(",");
                }

                enumStrBuilder.Append(" => [");
                enumStrBuilder.AppendEnumSampleList(enumValues);
                enumStrBuilder.Append("]");
                return enumStrBuilder.ToString();
            }

            return $"\"{Constants.stringType}\"";
        }

        private static void AppendEnumSampleList(this StringBuilder enumStrBuilder, List<string>? enumValues)
        {
            if (enumValues != null && enumValues.Count > 0)
            {
                var iteratorMax = enumValues.Count > _maxEnumDepth ? _maxEnumDepth : enumValues.Count;
                for (int ei = 0; ei < iteratorMax; ei++)
                {
                    var isLastEnum = (ei == iteratorMax - 1);
                    enumStrBuilder.Append(enumValues[ei]);
                    if (!isLastEnum)
                    {
                        enumStrBuilder.Append(",");
                    }

                    if (isLastEnum && enumValues.Count > iteratorMax)
                    {
                        enumStrBuilder.Append(",(...)");
                    }
                }
            }
        }
    }
}
