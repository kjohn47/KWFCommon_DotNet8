namespace KWFOpenApi.Metadata
{
    using System.IO;
    using System.Net;

    using Microsoft.OpenApi.Any;
    using Microsoft.OpenApi.Models;
    using Microsoft.OpenApi.Readers;

    using KWFOpenApi.Metadata.Extensions;
    using KWFOpenApi.Metadata.Models;
    using System.Text;
    using System;
    using System.Data;

    public static class KwfGenerateOpenApiMetadata
    {
        public static OpenApiDocument ReadFromString(string fileData)
        {
            var reader = new OpenApiStringReader();
            return reader.Read(fileData, out var diagnostic);
        }

        public static OpenApiDocument ReadFromFile(string filePath)
        {
            using var streamReader = new StreamReader(filePath);
            var reader = new OpenApiStreamReader();
            return reader.Read(streamReader.BaseStream, out var diagnostic);
        }

        public static KwfOpenApiMetadata GenerateMetadata(this OpenApiDocument document, string documentUrl = "openapi.json")
        {
            var metadata = new KwfOpenApiMetadata
            {
                ApiName = document.Info.Title,
                ApiDescription = document.Info.Description,
                ApiVersion = document.Info.Version,
                OpenApiDocumentUrl = documentUrl,
                AuthorizationTypes = document.GetAuthorizationType()
            };

            metadata.GenerateModels(document);
            metadata.GenerateEntrypoints(document);

            return metadata;
        }

        private static IEnumerable<KwfAuthorizarion> GetAuthorizationType(this OpenApiDocument document)
        {
            var schemes = new List<KwfAuthorizarion>();
            if (document?.Components?.SecuritySchemes != null && document.Components.SecuritySchemes.Count > 0)
            {                
                foreach (var securitySchemes in document.Components.SecuritySchemes)
                {
                    var typeToAdd = securitySchemes.Value.Type switch
                    {
                        SecuritySchemeType.ApiKey when securitySchemes.Value.Scheme is "bearer" or "bearerAuth" or "Bearer" or "BearerAuth" => AuthorizationType.Bearer,
                        SecuritySchemeType.ApiKey => AuthorizationType.ApiKey,
                        SecuritySchemeType.Http when securitySchemes.Value.Scheme is null or "" or "basic" or "Basic" => AuthorizationType.Basic,
                        SecuritySchemeType.Http when securitySchemes.Value.Scheme is "bearer" or "bearerAuth" or "Bearer" or "BearerAuth" => AuthorizationType.Bearer,
                        _ => AuthorizationType.Other
                    };

                    if (!schemes.Any(s => s.AuthorizationType == typeToAdd))
                    {
                        schemes.Add(new KwfAuthorizarion
                        {
                            AuthorizationType = typeToAdd,
                            Name = securitySchemes.Value.Name ?? "Authorization"
                        });
                    }
                }

                return schemes;
            }

            schemes.Add(new KwfAuthorizarion
            {
                AuthorizationType = AuthorizationType.None
            });

            return schemes;
        }

        private static void GenerateEntrypoints(this KwfOpenApiMetadata metadata, OpenApiDocument document)
        {
            if (document?.Paths == null || document.Paths.Count == 0)
            {
                return;
            }

            var routeList = new Dictionary<string, List<KwfOpenApiRoute>>();

            // Add Path
            foreach (var path in document.Paths)
            {
                if (path.Value?.Operations == null || path.Value.Operations.Count == 0)
                {
                    continue;
                }

                // Add Operation
                foreach (var operation in path.Value.Operations)
                {
                    if (operation.Value == null)
                    {
                        continue;
                    }

                    var routeData = new KwfOpenApiRoute
                    {
                        Route = path.Key,
                        Method = operation.Key.GetMethod(),
                        Operation = operation.Value.OperationId,
                        Summary = $"{operation.Value.Summary} - {operation.Value.Description}"
                    };

                    var group = operation.Value.Tags?.FirstOrDefault();
                    if (group?.Name != null)
                    {
                        routeData.Group = group.Name;
                    }

                    // Add Parameters
                    if (operation.Value.Parameters != null && operation.Value.Parameters.Count > 0)
                    {
                        var routeParams = new List<KwfParam>();
                        var queryParams = new List<KwfParam>();
                        var headerParams = new List<KwfParam>();
                        foreach (var parameter in operation.Value.Parameters)
                        {
                            var isEnum = parameter.Schema?.Enum != null && parameter.Schema.Enum.Count > 0;
                            var isArray = parameter.Schema != null && parameter.Schema.Type == Constants.ArrayType;
                            var enumRef = isEnum ? parameter.Schema?.Reference?.Id : null;
                            List<string>? enumValues = null;

                            if (isEnum && enumRef == null)
                            {
                                // only when anonymous enum
                                enumValues = new List<string>();
                                foreach (var enumValue in parameter.Schema!.Enum)
                                {
                                    if (enumValue is OpenApiString strEnum)
                                    {
                                        enumValues.Add(strEnum.Value);
                                    }
                                }
                            }

                            var kwfParam = new KwfParam
                            {
                                Name = parameter.Name,
                                Required = parameter.Required,
                                IsArray = isArray,
                                IsEnum = isEnum,
                                EnumValues = enumValues,
                                EnumReference = enumRef,
                                Format = parameter.Schema?.Format
                            };

                            if (parameter.In == ParameterLocation.Path)
                            {
                                routeParams.Add(kwfParam);
                            }
                            else if (parameter.In == ParameterLocation.Query)
                            {
                                queryParams.Add(kwfParam);
                            }
                            else if (parameter.In == ParameterLocation.Header)
                            {
                                headerParams.Add(kwfParam);
                            }
                        }
                        
                        routeData.RouteParams = routeParams;
                        routeData.QueryParams = queryParams;
                        routeData.HeaderParams = headerParams;
                    }
                    // Add Parameters

                    // Add Requests
                    if (operation.Value.RequestBody?.Content != null && operation.Value.RequestBody.Content.Count > 0)
                    {
                        routeData.RequestBodies = new Dictionary<KwfRequestBodyType, KwfContentBody>();

                        foreach (var reqBody in operation.Value.RequestBody.Content)
                        {
                            var mediaType = reqBody.Key.GetMediaType();
                            var req = reqBody.Value;

                            if (req == null)
                            {
                                continue;
                            }

                            string? requestBody = null;

                            if (mediaType == KwfRequestBodyType.Json)
                            {
                                requestBody = req.Schema.GenerateJsonBody(metadata);
                            }
                            else if (mediaType == KwfRequestBodyType.FormData)
                            {
                                //req.Encoding needed to classify inputs on form data
                                requestBody = req.Schema.GenerateFormBody(metadata);
                            }

                            var contentBody = new KwfContentBody
                            {
                                Body = requestBody,
                                BodyObjectName = reqBody.Value.Schema.Reference?.Id,
                                MediaTypeString = reqBody.Key
                            };

                            routeData.RequestBodies.Add(mediaType, contentBody);
                        }
                    }
                    // Add Requests

                    // Add Responses
                    if (operation.Value.Responses != null && operation.Value.Responses.Count > 0)
                    {
                        routeData.ResponseSamples = new Dictionary<HttpStatusCode, Dictionary<KwfRequestBodyType, KwfContentBody>>();

                        foreach (var respCode in operation.Value.Responses.OrderBy(d => d.Key))
                        {
                            var statusCode = respCode.Key.GetStatusCode();
                            var responses = new Dictionary<KwfRequestBodyType, KwfContentBody>();
                            
                            foreach (var respBody in respCode.Value.Content)
                            {
                                var mediaType = respBody.Key.GetMediaType();
                                var resp = respBody.Value;

                                if (resp == null)
                                {
                                    continue;
                                }

                                string? responseBody = null;

                                if (mediaType == KwfRequestBodyType.Json)
                                {
                                    responseBody = resp.Schema.GenerateJsonBody(metadata);
                                }
                                else if (mediaType == KwfRequestBodyType.FormData)
                                {
                                    responseBody = resp.Schema.GenerateFormBody(metadata);
                                }

                                var contentBody = new KwfContentBody
                                {
                                    Body = responseBody,
                                    BodyObjectName = respBody.Value.Schema.Reference?.Id,
                                    MediaTypeString = respBody.Key
                                };

                                responses.Add(mediaType, contentBody);
                            }

                            routeData.ResponseSamples.Add(statusCode, responses);
                        }
                    }
                    // Add Responses

                    if (routeList.ContainsKey(routeData.Group))
                    {
                        routeList[routeData.Group].Add(routeData);
                    }
                    else
                    {
                        routeList.Add(routeData.Group, new List<KwfOpenApiRoute>
                        {
                            routeData
                        });
                    }
                }
                // Add Operation
            }

            metadata.Entrypoints = routeList;
        }

        private static void GenerateModels(this KwfOpenApiMetadata metadata, OpenApiDocument document)
        {
            if (document?.Components?.Schemas == null) 
            { 
                return;
            }

            metadata.AddEnums(document);

            // fill dictionary with all types = object
            var apiObjects = document.Components.Schemas.Where(x => x.Value.Type == Constants.ObjectType)?.ToDictionary(v => v.Key, v => v.Value);

            // polimorphism, for now just combine props on same obj
            var apiObjectsOneOf = document.Components.Schemas.Where(x => x.Value.Type is null && x.Value.OneOf != null && x.Value.OneOf.Count > 0)?.ToDictionary(v => v.Key, v => v.Value);

            var kwfModels = new Dictionary<string, List<KwfModelProperty>>();

            if (apiObjects != null && apiObjects.Count > 0)
            {
                foreach (var apiObject in apiObjects)
                {
                    kwfModels.AddObjectModelToDictionary(metadata, apiObject.Key, apiObject.Value);
                }
            }

            if (apiObjectsOneOf != null && apiObjectsOneOf.Count > 0)
            {
                foreach (var apiObjectOneOf in apiObjectsOneOf)
                {
                    kwfModels.AddObjectModelToDictionary(metadata, apiObjectOneOf.Key, apiObjectOneOf.Value);
                }
            }

            metadata.Models = kwfModels;
        }

        private static void AddEnums(this KwfOpenApiMetadata metadata, OpenApiDocument document)
        {
            var apiEnums = document.Components.Schemas.Where(x => x.Value.Type == Constants.stringType && x.Value.Enum != null && x.Value.Enum.Count > 0)?.ToDictionary(v => v.Key, v => v.Value);
            if (apiEnums == null || apiEnums.Count == 0)
            {
                return;
            }

            if (metadata.Enums == null)
            { 
                metadata.Enums = new Dictionary<string, List<string>>();
            }

            foreach (var apiEnum in apiEnums)
            {
                metadata.Enums.AddEnumToDictionary(apiEnum.Key, apiEnum.Value.Enum);
            }
        }

        private static void AddEnumToDictionary(this Dictionary<string, List<string>> dictionary, string key, IList<IOpenApiAny> items)
        {
            var enumItems = new List<string>();
            foreach (var apiEnumItem in items)
            {
                if (apiEnumItem is OpenApiString strEnum)
                {
                    enumItems.Add(strEnum.Value);
                }
            }

            dictionary.Add(key, enumItems);
        }

        private static void AddObjectModelToDictionary(this Dictionary<string, List<KwfModelProperty>> kwfModels, KwfOpenApiMetadata metadata, string apiObjKey, OpenApiSchema apiObject)
        {
            var properties = new List<KwfModelProperty>();

            if (apiObject.Properties != null && apiObject.Properties.Count > 0)
            {
                foreach (var property in apiObject.Properties)
                {
                    properties.AddPropertyToList(kwfModels, metadata, apiObjKey, apiObject, property.Key, property.Value);
                }
            }
            else if (apiObject.OneOf != null && apiObject.OneOf.Count > 0)
            {
                foreach (var oneOf in apiObject.OneOf)
                {
                    if (oneOf.Properties != null && oneOf.Properties.Count > 0)
                    {
                        foreach (var property in oneOf.Properties)
                        {
                            if (properties.Any(x => x.Name == property.Key))
                            {
                                continue;
                            }

                            properties.AddPropertyToList(kwfModels, metadata, apiObjKey, apiObject, property.Key, property.Value);
                        }
                    }
                }
            }
            else if (apiObject.AdditionalPropertiesAllowed && apiObject.AdditionalProperties != null)
            {
                if (apiObject.Example != null &&
                    apiObject.Example.AnyType == AnyType.Object &&
                    apiObject.Example is Dictionary<string, IOpenApiAny> exampleDict)
                {
                    foreach (var ex in exampleDict)
                    {
                        properties.AddPropertyToList(kwfModels, metadata, apiObjKey, apiObject, ex.Key, apiObject.AdditionalProperties, ex.Value.GetOpenApiValue().value);
                    }
                }
                else
                {
                    properties.AddPropertyToList(kwfModels, metadata, apiObjKey, apiObject, "KeyValuePair <*>", apiObject.AdditionalProperties);
                }
            }

            kwfModels.Add(apiObjKey, properties);
        }

        private static void AddPropertyToList(this List<KwfModelProperty> properties, Dictionary<string, List<KwfModelProperty>> kwfModels, KwfOpenApiMetadata metadata, string apiObjKey, OpenApiSchema apiObject, string apiPropKey, OpenApiSchema property, string? sampleValue = null)
        {
            var kwfProp = GenerateKwfProperty(kwfModels, metadata, apiObjKey, apiObject, apiPropKey, property, sampleValue);
            properties.Add(kwfProp);
        }

        private static KwfModelProperty GenerateKwfProperty(Dictionary<string, List<KwfModelProperty>> kwfModels, KwfOpenApiMetadata metadata, string apiObjKey, OpenApiSchema apiObject, string apiPropKey, OpenApiSchema property, string? sampleValue = null)
        {
            var type = property.Type;
            var isEnum = (property.Enum != null && property.Enum.Count > 0) || (property.Reference?.Id != null && metadata.Enums != null && metadata.Enums.ContainsKey(property.Reference.Id));
            var isObject = !isEnum && (property.Type == Constants.ObjectType || property.Reference?.Id != null);
            var isArray = property.Type == Constants.ArrayType;
            var isDictionary = false;
            string? reference = null;
            string? example = null;
            string? format = null;
            string? dictionaryValueType = null;
            string? dictionaryValueReference = null;
            var dictionaryValueIsEnum = false;
            var dictionaryValueIsArray = false;
            Dictionary<string, string>? exampleValueDictionary = null;
            List<string>? arrayExamples = null;
            KwfModelProperty? nestedArrayProperty = null;

            if (isEnum)
            {
                if (metadata.Enums != null && property.Reference?.Id != null && metadata.Enums.ContainsKey(property.Reference.Id))
                {
                    reference = property.Reference.Id;
                }
                else //anonymous enum
                {
                    //add reference for the enum
                    if (metadata.Enums == null)
                    {
                        metadata.Enums = new Dictionary<string, List<string>>();
                    }

                    reference = $"{apiObjKey}_{apiPropKey}_enum";
                    metadata.Enums.AddEnumToDictionary(reference, property.Enum!);
                }
            }

            if (isObject)
            {
                reference = property.Reference?.Id;

                if (reference == null)
                {
                    if (property.Properties == null || property.Properties.Count == 0) //dictionary object
                    {
                        isDictionary = true;
                    }
                    else //anonymous object
                    {
                        reference = $"{apiObjKey}_{apiPropKey}_object";
                        kwfModels.AddObjectModelToDictionary(metadata, reference, property);
                    }
                }
            }

            if (isArray && property.Items != null)
            {
                reference = property.Items.Reference?.Id;

                if (property.Items?.Enum != null && property.Items.Enum.Count > 0)
                {
                    if (reference == null || (metadata.Enums != null && !metadata.Enums.ContainsKey(reference))) //anonymous enum
                    {
                        //add reference for the enum
                        if (metadata.Enums == null)
                        {
                            metadata.Enums = new Dictionary<string, List<string>>();
                        }

                        reference = $"{apiObjKey}_{apiPropKey}_array_enum";
                        metadata.Enums.AddEnumToDictionary(reference, property.Enum!);
                    }
                }
                else if (property.Items?.Type == Constants.ObjectType)
                {
                    if (reference == null)
                    {
                        if (property.Items?.Properties == null || property.Items.Properties.Count == 0) //dictionary object
                        {
                            isDictionary = true;
                        }
                        else //anonymous object
                        {
                            reference = $"{apiObjKey}_{apiPropKey}_array_object";
                            kwfModels.AddObjectModelToDictionary(metadata, reference, property.Items);
                        }
                    }
                }
                else if (property.Items?.Type == Constants.ArrayType)
                {
                    //nested array nightmare
                    nestedArrayProperty = GenerateKwfProperty(kwfModels, metadata, apiPropKey, apiObject, $"{apiObjKey}_{apiPropKey}_nested_array", property.Items);
                }
                   
                type = property.Items?.Type;
                format = property.Items?.Format;

                if (reference != null)
                {
                    if (metadata.Enums != null && metadata.Enums.ContainsKey(reference))
                    {
                        type = Constants.stringType;
                        isEnum = true;
                    }
                    else
                    {
                        type = Constants.ObjectType;
                        isObject = true;
                    }
                }
                
                if (type == null)
                {
                    type = Constants.stringType;
                }

                if (!isObject && !isEnum &&
                    property.Example != null &&
                    property.Example.AnyType == AnyType.Array &&
                    property.Example is OpenApiArray exampleArray)
                {
                    var count = exampleArray.Count;
                    arrayExamples = new List<string>();

                    for (int y = 0; y < count; y++)
                    {
                        var item = exampleArray.ElementAt(y).GetOpenApiValue();
                        if (item.value != null)
                        {
                            if (item.type.IsStringFormat())
                            {
                                arrayExamples.Add($"\"{item.value}\"");
                            }
                            else
                            {
                                arrayExamples.Add(item.value);
                            }
                        }
                    }
                }
            }

            if (type == null && reference != null)
            {
                if (metadata.Enums != null && metadata.Enums.ContainsKey(reference))
                {
                    isEnum = true;
                    type = Constants.stringType;
                }
                else
                {
                    isObject = true;
                    type = Constants.ObjectType;
                }
            }

            if (!isArray && !isObject && !isEnum && !isDictionary)
            { 
                if (property.Example != null)
                {
                    var parsedExample = property.Example.GetOpenApiValue();
                    if (parsedExample.value != null)
                    {
                        example = parsedExample.value;
                    }
                }

                format = property.Format;
            }

            if (isDictionary)
            {
                if (property.Example != null &&
                    property.Example.AnyType == AnyType.Object &&
                    property.Example is Dictionary<string, IOpenApiAny> exampleDict)
                {
                    exampleValueDictionary = new Dictionary<string, string>();
                    foreach (var ex in exampleDict)
                    {
                        var dicKey = ex.Key;
                        var dicValue = ex.Value.GetOpenApiValue();
                        if (dicValue.type.IsStringFormat())
                        {
                            exampleValueDictionary.Add(dicKey, $"\"{dicValue.value}\"");
                        }
                        else
                        {
                            exampleValueDictionary.Add(dicKey, dicValue.value ?? Constants.nullType);
                        }
                    }
                }

                var selectedSchema = isArray ? property.Items?.AdditionalProperties : property.AdditionalProperties;
                dictionaryValueReference = selectedSchema?.Reference?.Id;
                dictionaryValueType = selectedSchema?.Type;

                if (dictionaryValueType != null || dictionaryValueReference != null)
                {
                    if (!isArray && metadata.Enums != null && dictionaryValueReference != null && metadata.Enums.ContainsKey(property.AdditionalProperties.Reference.Id))
                    {
                        dictionaryValueIsEnum = true;

                    }
                    else if (!isArray && selectedSchema?.Enum != null && selectedSchema.Enum.Count > 0)//anonymous enum
                    {
                        if (metadata.Enums == null)
                        {
                            metadata.Enums = new Dictionary<string, List<string>>();
                        }

                        dictionaryValueReference = $"{apiObjKey}_{apiPropKey}_dictionary_enum";
                        dictionaryValueIsEnum = true;

                        metadata.Enums.AddEnumToDictionary(dictionaryValueReference, selectedSchema.Enum);
                    }
                    else if (dictionaryValueType == Constants.ObjectType || (!isArray && dictionaryValueType == null && dictionaryValueReference != null))
                    {
                        if (dictionaryValueReference == null)
                        {
                            if (selectedSchema?.Properties != null && selectedSchema.Properties.Count > 0)
                            {
                                dictionaryValueReference = $"{apiObjKey}_{apiPropKey}_dictionary_object";
                                kwfModels.AddObjectModelToDictionary(metadata, dictionaryValueReference, selectedSchema.AdditionalProperties);
                            }
                            else
                            {
                                var dicType = BuildDictionaryTypeStr(selectedSchema?.AdditionalProperties, metadata);
                                dictionaryValueType = dicType.type;
                                dictionaryValueReference = dicType.reference;
                                dictionaryValueIsEnum = dicType.isEnum;
                            }
                        }
                    } 
                    else if (dictionaryValueType == Constants.ArrayType)
                    {
                        dictionaryValueIsArray = true;
                        dictionaryValueType = isArray ? property.Items?.AdditionalProperties?.Items?.Type : property.AdditionalProperties?.Items?.Type;
                        dictionaryValueReference = isArray ? property.Items?.AdditionalProperties?.Items?.Reference?.Id : property.AdditionalProperties?.Items?.Reference?.Id;

                        if (dictionaryValueReference != null && metadata.Enums != null && !metadata.Enums.ContainsKey(dictionaryValueReference))
                        {
                            dictionaryValueIsEnum = true;
                        }
                        else if (property.AdditionalProperties?.Items?.Enum != null && property.AdditionalProperties?.Enum.Count > 0)
                        {
                            //add reference for the enum
                            if (metadata.Enums == null)
                            {
                                metadata.Enums = new Dictionary<string, List<string>>();
                            }

                            dictionaryValueReference = $"{apiObjKey}_{apiPropKey}_dictionary_array_enum";
                            metadata.Enums.AddEnumToDictionary(dictionaryValueReference, property.AdditionalProperties.Items.Enum);
                        }
                        else if (dictionaryValueType == Constants.ObjectType &&
                                dictionaryValueReference == null &&
                                property.AdditionalProperties?.Items?.Properties != null &&
                                property.AdditionalProperties?.Items.Properties.Count > 0)
                        {
                            dictionaryValueReference = $"{apiObjKey}_{apiPropKey}_dictionary_array_object";
                            kwfModels.AddObjectModelToDictionary(metadata, dictionaryValueReference, property.AdditionalProperties.Items);
                        }
                        else if (isArray && dictionaryValueType == Constants.ObjectType && property.Items?.AdditionalProperties != null)
                        {
                            var dicType = BuildDictionaryTypeStr(property.Items?.AdditionalProperties, metadata);
                            dictionaryValueType = dicType.type;
                            dictionaryValueReference = dicType.reference;
                            dictionaryValueIsEnum = dicType.isEnum;
                        }
                        else if (property.AdditionalProperties?.Items?.AdditionalProperties != null)
                        {
                            var dicType = BuildDictionaryTypeStr(property.AdditionalProperties?.Items?.AdditionalProperties, metadata, true);
                            dictionaryValueType = dicType.type;
                            dictionaryValueReference = dicType.reference;
                            dictionaryValueIsEnum = dicType.isEnum;
                        }
                        else if (isArray) 
                        {
                            var typeBuilder = new StringBuilder();
                            var dicType = BuildDictionaryType(typeBuilder, property.Items!.AdditionalProperties, metadata);
                            dictionaryValueType = typeBuilder.ToString();
                            dictionaryValueReference = dicType.reference;
                            dictionaryValueIsEnum = dicType.isEnum;
                        }
                        else
                        {
                            var dicType = BuildDictionaryTypeStr(property.AdditionalProperties, metadata);
                            dictionaryValueType = dicType.type;
                            dictionaryValueReference = dicType.reference;
                            dictionaryValueIsEnum = dicType.isEnum;
                        }
                    }
                }
            }

            return new KwfModelProperty
            {
                Name = apiPropKey,
                Type = type ?? Constants.stringType,
                Format = format,
                Description = property.Description,
                IsRequired = apiObject.Required != null && apiObject.Required.Any(r => r == apiPropKey),
                IsEnum = isEnum,
                IsObject = isObject,
                IsArray = isArray,
                IsDate = property.Format != null && property.Format.Equals(Constants.DateTimeFormat, StringComparison.InvariantCultureIgnoreCase),
                IsDictionary = isDictionary,
                Reference = reference,
                ExampleValue = sampleValue ?? example,
                ExampleValueDictionary = exampleValueDictionary,
                ExampleValueArray = arrayExamples,
                NestedArrayProperty = nestedArrayProperty,
                DictionaryValueType = dictionaryValueType,
                DictionaryValueReference = dictionaryValueReference,
                DictionaryValueIsArray = dictionaryValueIsArray,
                DictionaryValueIsEnum = dictionaryValueIsEnum
            };
        }

        private static (string type, string? reference, bool isEnum) BuildDictionaryTypeStr(OpenApiSchema? additionalProperties, KwfOpenApiMetadata metadata, bool parentIsArray = false)
        {
            var typeBuilder = new StringBuilder("Dictionary<");
            var (reference, isEnum) = BuildDictionaryType(typeBuilder, additionalProperties, metadata, parentIsArray);
            typeBuilder.Append(">");

            return (typeBuilder.ToString(), reference, isEnum);
        }

        private static (string? reference, bool isEnum) BuildDictionaryType(StringBuilder typeBuilder, OpenApiSchema? additionalProperties, KwfOpenApiMetadata metadata, bool parentIsArray = false, int recursiveLevel = 1)
        {
            var additionalProps = additionalProperties;
            string? reference = null;
            bool isEnum = false;

            while (additionalProps != null && (additionalProps.Type == null || additionalProps.Reference?.Id == null))
            {
                var terminated = false;
                if (additionalProps.Reference?.Id != null)
                {
                    typeBuilder.Append("Dictionary<");
                    typeBuilder.Append(additionalProps.Reference.Id);
                    reference = additionalProps.Reference.Id;
                    isEnum = metadata.Enums != null && metadata.Enums.ContainsKey(reference);
                    for (int i = 1; i < recursiveLevel; i++)
                    {
                        typeBuilder.Append("[]");
                    }
                }
                else 
                {
                    if (additionalProps.Type == Constants.ArrayType)
                    {
                        if (additionalProps.Items != null)
                        {
                            if (additionalProps.Items.Reference?.Id != null)
                            {
                                typeBuilder.Append("Dictionary<");
                                typeBuilder.Append(additionalProps.Items.Reference.Id);
                                reference = additionalProps.Items.Reference.Id;
                                isEnum = metadata.Enums != null && metadata.Enums.ContainsKey(reference);
                                for (int i = 0; i < recursiveLevel; i++)
                                {
                                    typeBuilder.Append("[]");
                                }
                            }
                            else if (additionalProps.Items.AdditionalProperties != null)
                            {
                                var subStrBulder = new StringBuilder();
                                var recursiveType = BuildDictionaryType(subStrBulder, additionalProps.Items.AdditionalProperties, metadata, true);
                                typeBuilder.Append(subStrBulder.ToString());
                                reference = recursiveType.reference;
                                isEnum = recursiveType.isEnum;
                                terminated = true;
                            }
                            else if (additionalProps.Items.Items != null)
                            {
                                var subStrBulder = new StringBuilder();
                                var recursiveType = BuildDictionaryType(subStrBulder, additionalProps.Items.Items, metadata, false, recursiveLevel + 2);
                                typeBuilder.Append(subStrBulder.ToString());
                                reference = recursiveType.reference;
                                isEnum = recursiveType.isEnum;
                                terminated = true;
                            }
                            else
                            {
                                typeBuilder.Append("Dictionary<");
                                typeBuilder.Append(additionalProps.Items.Type ?? "*");
                                typeBuilder.Append("[]");
                            }
                        }
                        else
                        {
                            typeBuilder.Append("[]");
                        }
                    }
                    else
                    {
                        typeBuilder.Append("Dictionary<");
                        typeBuilder.Append(additionalProps.Type ?? "*");
                    }
                }
                if (!terminated)
                {
                    typeBuilder.Append(">");
                }
                additionalProps = additionalProps.AdditionalProperties;
            }
            if (parentIsArray)
            {
                typeBuilder.Append("[]");
            }
            
            return (reference, isEnum);
        }
    }
}
