namespace KWFOpenApi.Metadata
{
    using System.IO;
    using System.Net;

    using Microsoft.OpenApi.Any;
    using Microsoft.OpenApi.Models;
    using Microsoft.OpenApi.Readers;

    using KWFOpenApi.Metadata.Extensions;
    using KWFOpenApi.Metadata.Models;

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

        private static IEnumerable<AuthorizationType> GetAuthorizationType(this OpenApiDocument document)
        {
            if (document?.Components?.SecuritySchemes != null && document.Components.SecuritySchemes.Count > 0)
            {
                var schemes = new List<AuthorizationType>();
                foreach (var securitySchemes in document.Components.SecuritySchemes)
                {
                    switch (securitySchemes.Key)
                    {
                        case "bearer":
                        case "bearerAuth":
                        case "Bearer":
                        case "BearerAuth":
                            {
                                if (!schemes.Any(s => s == AuthorizationType.Bearer))
                                {
                                    schemes.Add(AuthorizationType.Bearer);
                                }
                                break;
                            }
                        case "basic":
                        case "Basic":
                            {
                                if (!schemes.Any(s => s == AuthorizationType.Basic))
                                {
                                    schemes.Add(AuthorizationType.Basic);
                                }
                                break;
                            }
                        case "apiKey":
                        case "ApiKey":
                            {
                                if (!schemes.Any(s => s == AuthorizationType.ApiKey))
                                {
                                    schemes.Add(AuthorizationType.ApiKey);
                                }
                                break;
                            }
                        default:
                            {
                                if (!schemes.Any(s => s == AuthorizationType.Other))
                                {
                                    schemes.Add(AuthorizationType.Other);
                                }
                                break;
                            }
                    }
                }

                return schemes;
            }

            return [AuthorizationType.None];
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
                        Summary = operation.Value.Summary
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

            kwfModels.Add(apiObjKey, properties);
        }

        private static void AddPropertyToList(this List<KwfModelProperty> properties, Dictionary<string, List<KwfModelProperty>> kwfModels, KwfOpenApiMetadata metadata, string apiObjKey, OpenApiSchema apiObject, string apiPropKey, OpenApiSchema property)
        {
            var kwfProp = GenerateKwfProperty(kwfModels, metadata, apiObjKey, apiObject, apiPropKey, property);
            properties.Add(kwfProp);
        }

        private static KwfModelProperty GenerateKwfProperty(Dictionary<string, List<KwfModelProperty>> kwfModels, KwfOpenApiMetadata metadata, string apiObjKey, OpenApiSchema apiObject, string apiPropKey, OpenApiSchema property)
        {
            var type = property.Type;
            var isEnum = (property.Enum != null && property.Enum.Count > 0) || (property.Reference?.Id != null && metadata.Enums != null && metadata.Enums.ContainsKey(property.Reference.Id));
            var isObject = !isEnum && (property.Type == Constants.ObjectType || property.Reference?.Id != null);
            var isArray = property.Type == Constants.ArrayType;
            var isDictionary = false;
            string? reference = null;
            string? example = null;
            string? format = null;
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

                if (reference == null)
                {
                    if (property.Items?.Enum != null && property.Items.Enum.Count > 0)
                    {
                        if (metadata.Enums != null && property.Items.Reference?.Id != null && metadata.Enums.ContainsKey(property.Items.Reference.Id))
                        {
                            reference = property.Items.Reference.Id;
                        }
                        else //anonymous enum
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
                        reference = property.Items?.Reference?.Id;
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

            if (isDictionary &&
                property.Example != null &&
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
                ExampleValue = example,
                ExampleValueDictionary = exampleValueDictionary,
                ExampleValueArray = arrayExamples,
                NestedArrayProperty = nestedArrayProperty
            };
        }
    }
}
