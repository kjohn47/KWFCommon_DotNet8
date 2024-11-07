/// <reference path="Types.ts"/>
/// <reference path="Constants.ts"/>
/// <reference path="KwfOpenApiStates.ts"/>

//Parse and cache enums and models
function CacheModelReferences(modelsJson: string, enumsJson: string) {
    ModelReferences = {
        Enums: JSON.parse(enumsJson),
        Models: JSON.parse(modelsJson)
    };
}

//convert string to bool
function GetBoolFromString(strValue: string): boolean {
    return (strValue !== null && strValue !== undefined && strValue.toLowerCase() === "true") ? true : false;
}

//save last state to request history (LoadedRequests)
function SavePreviousRequestBodyState(requestBoxValue: string) {
    //if no current route selected, return
    if (CurrentSelectedMetadata.EndpointId === null || CurrentSelectedMetadata.EndpointId === undefined || !HasRequestBody()) {
        return;
    }

    //save request body
    var prevReqState = LoadedRequests[CurrentSelectedMetadata.EndpointId];
    if (prevReqState === null || prevReqState === undefined) {
        LoadedRequests[CurrentSelectedMetadata.EndpointId] = {
            body: {},
            media: ""
        }
    }

    LoadedRequests[CurrentSelectedMetadata.EndpointId].body[CurrentSelectedMetadata.ReqSelectedMedia] = requestBoxValue;
    LoadedRequests[CurrentSelectedMetadata.EndpointId].media = CurrentSelectedMetadata.ReqSelectedMedia;
}

//Current selected endpoint has body
function HasRequestBody(): boolean {
    return !(CurrentSelectedMetadata?.EndpointMethod === null ||
            CurrentSelectedMetadata?.EndpointMethod === undefined ||
            CurrentSelectedMetadata.EndpointMethod === GETMethod ||
            CurrentSelectedMetadata.EndpointMethod === DELETEMethod);   
}

//reset current selected state
function ResetCurrentSelected() {
    //load endpoint id to current state
    CurrentSelectedMetadata.EndpointId = null;
    //reset state of objects
    CurrentSelectedMetadata.ReqRouteParams = [];
    CurrentSelectedMetadata.ReqQueryParams = [];
    CurrentSelectedMetadata.ReqHeaderParams = [];

    CurrentSelectedMetadata.ReqSamples = {};
    CurrentSelectedMetadata.ReqMediaTypes = {};
    CurrentSelectedMetadata.ReqObjRef = {};

    CurrentSelectedMetadata.RespSamples = {};
    CurrentSelectedMetadata.RespMediaTypes = {};
    CurrentSelectedMetadata.RespSelectedStatus = null;
    CurrentSelectedMetadata.RespSelectedMedia = null;
}

//upsert endpoint cache
function SetupEndpointCache() {
    if (CurrentSelectedMetadata?.EndpointId === null || CurrentSelectedMetadata?.EndpointId === undefined) {
        return;
    }

    CachedEndpointMetadata[CurrentSelectedMetadata.EndpointId] = {
        ReqMediaTypes: { ...CurrentSelectedMetadata.ReqMediaTypes },
        ReqSamples: { ...CurrentSelectedMetadata.ReqSamples },
        ReqObjRef: { ...CurrentSelectedMetadata.ReqObjRef },
        ReqQueryParams: [...CurrentSelectedMetadata.ReqQueryParams],
        ReqRouteParams: [...CurrentSelectedMetadata.ReqRouteParams],
        ReqHeaderParams: [...CurrentSelectedMetadata.ReqHeaderParams],
        //Response
        RespSamples: { ...CurrentSelectedMetadata.RespSamples },
        RespMediaTypes: { ...CurrentSelectedMetadata.RespMediaTypes },
        RespSelectedStatus: CurrentSelectedMetadata.RespSelectedStatus,
        RespSelectedMedia: CurrentSelectedMetadata.RespSelectedMedia,
        //Meta
        EndpointRoute: CurrentSelectedMetadata.EndpointRoute,
        EndpointMethod: CurrentSelectedMetadata.EndpointMethod
    };
}

//save request params to history (LoadedRequestParams)
//xxxParam is input with name xxxParams[] and has attribute kwf-param-name that represents its name on the request
function SavePreviousRequestParamsState(routeParams: NodeListOf<HTMLInputElement>, queryParams: NodeListOf<HTMLInputElement>, headerParams: NodeListOf<HTMLInputElement>) {
    //if no current route selected, or no data to add, return
    if ((CurrentSelectedMetadata.EndpointId === null || CurrentSelectedMetadata.EndpointId === undefined) ||
        ((routeParams === null || routeParams === undefined || routeParams.length === 0) &&
            (queryParams === null || queryParams === undefined || queryParams.length === 0) &&
            (headerParams === null || headerParams === undefined || headerParams.length === 0))) {
        return;
    }

    //create object for saving state if not set yet
    var requestParams = LoadedRequestParams[CurrentSelectedMetadata.EndpointId];
    if (requestParams === null || requestParams === undefined) {
        LoadedRequestParams[CurrentSelectedMetadata.EndpointId] = {
            "RouteParams": {},
            "QueryParams": {},
            "HeaderParams": {}
        }
    }

    //save route params if exist
    if (routeParams !== null && routeParams !== undefined) {
        routeParams.forEach(x => {
            var { paramName, paramValue } = GetParamNameAndValue(x);
            if (paramName !== null && paramName !== undefined) {
                LoadedRequestParams[CurrentSelectedMetadata.EndpointId].RouteParams[paramName] = paramValue;
            }
        });
    }

    //save query params if exist
    if (queryParams !== null && queryParams !== undefined) {
        queryParams.forEach(x => {
            var { paramName, paramValue } = GetParamNameAndValue(x);
            if (paramName !== null && paramName !== undefined) {
                LoadedRequestParams[CurrentSelectedMetadata.EndpointId].QueryParams[paramName] = paramValue;
            }
        });
    }

    //save header params if exist
    if (headerParams !== null && headerParams !== undefined) {
        headerParams.forEach(x => {
            var { paramName, paramValue } = GetParamNameAndValue(x);
            if (paramName !== null && paramName !== undefined) {
                LoadedRequestParams[CurrentSelectedMetadata.EndpointId].HeaderParams[paramName] = paramValue;
            }
        });
    }
}

//get request param name and value
function GetParamNameAndValue(reqParam: HTMLInputElement): { paramName: string, paramValue: string } {
    var paramName = reqParam.getAttribute("kwf-param-name");
    var isArray = reqParam.hasAttribute("kwf-param-is-array");
    var paramValue = null;

    if (paramName !== null && paramName !== undefined) {
        if (isArray) {
            //TODO - in case of array, do stuff differently
            //if LoadedRequestParams[CurrentSelectedMetadata.EndpointId].RouteParams[name] is null, create first element
            //if LoadedRequestParams[CurrentSelectedMetadata.EndpointId].RouteParams[name] not null, join current with new value splited by ','
        }
        else {
            paramValue = reqParam.value;
        }
    }

    return { paramName, paramValue };
}

//get request params array for specified input array
function GetParamsArray(paramsItems: NodeListOf<HTMLInputElement>): RequestParamMetadataType[] {
    var returnArray: RequestParamMetadataType[] = [];

    if (paramsItems !== null && paramsItems !== undefined && paramsItems.length > 0) {
        paramsItems.forEach(p => {
            var name = p.getAttribute("value");
            var isRequired = GetBoolFromString(p.getAttribute("kwf-isRequired"));
            var isArray = GetBoolFromString(p.getAttribute("kwf-isArray"));
            var isEnum = GetBoolFromString(p.getAttribute("kwf-isEnum"));
            var ref = p.getAttribute("kwf-reference");
            var format = p.getAttribute("kwf-format");
            var enumValues = isEnum && (ref === null || ref === undefined) ? p.getAttribute("kwf-enumValues")?.split(',') : null;

            returnArray.push({
                Name: name,
                IsRequired: isRequired,
                IsArray: isArray,
                IsEnum: isEnum,
                Ref: ref,
                EnumValues: enumValues,
                Format: format
            });
        });
    }

    return returnArray;
}

//setup current selected endpoint from cache return false if cache empty
function SetupCurrentSelectedFromCache(endpoint_id: string): boolean {
    //get cached metadata (if exists)
    var cachedMetadata = CachedEndpointMetadata[endpoint_id];

    //load endpoint metadata to current state
    if (cachedMetadata !== null && cachedMetadata !== undefined) {
        //load endpoint id to current state
        CurrentSelectedMetadata.EndpointId = endpoint_id;
        // load CurrentSelectedMetadata from cached data
        CurrentSelectedMetadata.EndpointRoute = cachedMetadata.EndpointRoute;
        CurrentSelectedMetadata.EndpointMethod = cachedMetadata.EndpointMethod;

        CurrentSelectedMetadata.ReqRouteParams = cachedMetadata.ReqRouteParams;
        CurrentSelectedMetadata.ReqQueryParams = cachedMetadata.ReqQueryParams;
        CurrentSelectedMetadata.ReqHeaderParams = cachedMetadata.ReqHeaderParams;

        //in this case can assign obj references
        if (HasRequestBody()) {
            CurrentSelectedMetadata.ReqSamples = cachedMetadata.ReqSamples;
            CurrentSelectedMetadata.ReqMediaTypes = cachedMetadata.ReqMediaTypes;
            CurrentSelectedMetadata.ReqObjRef = cachedMetadata.ReqObjRef;
        }

        CurrentSelectedMetadata.RespSamples = cachedMetadata.RespSamples;
        CurrentSelectedMetadata.RespMediaTypes = cachedMetadata.RespMediaTypes;
        CurrentSelectedMetadata.RespSelectedMedia = cachedMetadata.RespSelectedMedia;
        CurrentSelectedMetadata.RespSelectedStatus = cachedMetadata.RespSelectedStatus;

        return true;
    }

    return false;
}

//setup current selected endpoint main data
function SetupCurrentSelectedMainData(endpoint_id: string, route: string, method: string) {
    //load endpoint id to current state
    CurrentSelectedMetadata.EndpointId = endpoint_id;
    CurrentSelectedMetadata.EndpointRoute = route;
    CurrentSelectedMetadata.EndpointMethod = method;
}

// setup current selected request params
function SetupCurrentSelectedReqParams(routeParams: NodeListOf<HTMLInputElement>, queryParams: NodeListOf<HTMLInputElement>, headerParams: NodeListOf<HTMLInputElement>) {
    CurrentSelectedMetadata.ReqRouteParams = GetParamsArray(routeParams);
    CurrentSelectedMetadata.ReqQueryParams = GetParamsArray(queryParams);
    CurrentSelectedMetadata.ReqHeaderParams = GetParamsArray(headerParams);
}

//setup current selected request samples
function SetupCurrentSelectedReqSamples(reqSamples: NodeListOf<HTMLInputElement>) {
    if (reqSamples !== null && reqSamples !== undefined && reqSamples.length > 0) {
        //handle requests
        //save request samples to current state
        reqSamples.forEach(reqSample => {
            var sampleKey = reqSample.getAttribute("kwf-media-type");
            CurrentSelectedMetadata.ReqSamples[sampleKey] = reqSample.getAttribute("value");
            CurrentSelectedMetadata.ReqMediaTypes[sampleKey] = reqSample.getAttribute("kwf-media-type-name");
            CurrentSelectedMetadata.ReqObjRef[sampleKey] = reqSample.getAttribute("kwf-obj_ref");
        });
    }
}

//setup current selected response samples
function SetupCurrentSelectedRespSamples(responseSamplesInput: NodeListOf<HTMLInputElement>) {
    var responseSamples: KeyValuePairType<KeyValuePairType<ResponseSampleItem>> = {};
    var responseMediaTypes: StringKeyValuePairType = {};
    if (responseSamplesInput !== null && responseSamplesInput !== undefined && responseSamplesInput.length > 0) {
        responseSamplesInput.forEach(r => {
            var statusCode = r.getAttribute("kwf-status-code");
            if (responseSamples[statusCode] === null || responseSamples[statusCode] === undefined) {
                responseSamples[statusCode] = {};
            }

            var mediaType = r.getAttribute("kwf-media-type");
            var respReference = r.getAttribute("kwf-obj_ref");
            var mediaTypeName = r.getAttribute("kwf-media-type-name");

            if (responseMediaTypes[mediaType] === null || responseMediaTypes[mediaType] === undefined) {
                responseMediaTypes[mediaType] = mediaTypeName;
            }

            responseSamples[statusCode][mediaType] = {
                Body: r.value,
                BodyReference: respReference
            };
        });
    }

    CurrentSelectedMetadata.RespSamples = responseSamples;
    CurrentSelectedMetadata.RespMediaTypes = responseMediaTypes;

    var sampleStatusKeys = Object.keys(CurrentSelectedMetadata.RespSamples);

    if (sampleStatusKeys.includes(DefaultSelectedStatusCode)) {
        CurrentSelectedMetadata.RespSelectedStatus = DefaultSelectedStatusCode;
    }
    else {
        CurrentSelectedMetadata.RespSelectedStatus = sampleStatusKeys[0];
    }

    var selectedRespSampleStatusKeys = Object.keys(CurrentSelectedMetadata.RespSamples[CurrentSelectedMetadata.RespSelectedStatus]);

    if (selectedRespSampleStatusKeys.includes(DefaultSelectedMedia)) {
        CurrentSelectedMetadata.RespSelectedMedia = DefaultSelectedMedia;
    }
    else {
        CurrentSelectedMetadata.RespSelectedMedia = selectedRespSampleStatusKeys[0];
    }
}

//fill LoadedRequests
function SetupLoadedRequests() {
    if (!HasRequestBody()) {
        return;
    }

    var endpoint_id = CurrentSelectedMetadata.EndpointId;
    var currentRequest = LoadedRequests[endpoint_id];

    //has samples
    if (CurrentSelectedMetadata.ReqSamples !== null &&
        CurrentSelectedMetadata.ReqSamples !== undefined &&
        Object.keys(CurrentSelectedMetadata.ReqSamples).length > 0) {
        //save first request from sample to history

        if (currentRequest === null || currentRequest === undefined) {
            var requestMedias = Object.keys(CurrentSelectedMetadata.ReqSamples);
            var reqSelectedMedia = requestMedias.includes(DefaultSelectedMedia) ? DefaultSelectedMedia : requestMedias[0];
            CurrentSelectedMetadata.ReqSelectedMedia = reqSelectedMedia;
        }
        else {
            CurrentSelectedMetadata.ReqSelectedMedia = currentRequest.media;
        }

        if (currentRequest === null || currentRequest === undefined) {
            currentRequest = {
                body: {},
                media: CurrentSelectedMetadata.ReqSelectedMedia
            };
            LoadedRequests[endpoint_id] = currentRequest;
        }

        if (currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === null || currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === undefined) {
            LoadedRequests[endpoint_id].body[CurrentSelectedMetadata.ReqSelectedMedia] = CurrentSelectedMetadata.ReqSamples[CurrentSelectedMetadata.ReqSelectedMedia]
        }
    }
    //no samples, but has body
    else {
        //save first request to history when no sample available
        CurrentSelectedMetadata.ReqSelectedMedia = DefaultSelectedMedia;
        CurrentSelectedMetadata.ReqMediaTypes[CurrentSelectedMetadata.ReqSelectedMedia] = JsonMediaType; //maybe should be plain text?
        if (currentRequest === null || currentRequest === undefined) {
            currentRequest = {
                body: {},
                media: CurrentSelectedMetadata.ReqSelectedMedia
            };
            LoadedRequests[endpoint_id] = currentRequest;
        }

        if (currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === null || currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === undefined) {
            LoadedRequests[endpoint_id].media = CurrentSelectedMetadata.ReqSelectedMedia;
            LoadedRequests[endpoint_id].body[CurrentSelectedMetadata.ReqSelectedMedia] = EmptyRequest
        }
    }
}

//Get Current response for selected
function GetSelectedEndpointResponse(): LoadedResponseItemType {
    var currentResponse = LoadedResponses[CurrentSelectedMetadata.EndpointId];
    if (currentResponse === null || currentResponse === undefined) {
        return null;
    }

    return currentResponse;
}

//Send request using Fetch
async function ExecuteRequest(authorizationSchema?: string, authorizationToken? : string, authorizationHeader?: string): Promise<LoadedResponseItemType> {
    if (CurrentSelectedMetadata?.EndpointRoute === null ||
        CurrentSelectedMetadata?.EndpointRoute === undefined ||
        CurrentSelectedMetadata.EndpointMethod === null ||
        CurrentSelectedMetadata.EndpointMethod === undefined) {
        return;
    }

    var endpointId: string = CurrentSelectedMetadata.EndpointId;
    var method: string = CurrentSelectedMetadata.EndpointMethod;
    var route = CurrentSelectedMetadata.EndpointRoute;
    var success: boolean = false;
    var responseBody: string = null;
    var responseStatus: string = null;
    var responseMediaType: string = null;
    var requestBody: string = null;
    var requestParams = LoadedRequestParams[endpointId];
    var headers: Headers = new Headers();

    if (HasRequestBody()) {
        var savedRequest = LoadedRequests[endpointId];
        requestBody = savedRequest.body[savedRequest.media];
        headers.append(MediaTypeHeader, CurrentSelectedMetadata.ReqMediaTypes[CurrentSelectedMetadata.ReqSelectedMedia]);
    }

    if (authorizationSchema !== null &&
        authorizationSchema !== undefined &&
        authorizationSchema !== "" &&
        authorizationToken !== null &&
        authorizationToken !== undefined &&
        authorizationToken !== "") {
        var authHeader = authorizationHeader !== null && authorizationHeader !== undefined && authorizationHeader !== "" ? authorizationHeader : "Authorization";
        var token = authorizationSchema === "ApiKey" ? authorizationToken : authorizationSchema + " " + authorizationToken;
        headers.append(authHeader, token);
    }

    //replace route params
    if (requestParams?.RouteParams !== null && requestParams?.RouteParams !== undefined) {
        var routeParamsKeys = Object.keys(requestParams.RouteParams);
        if (routeParamsKeys.length > 0) {
            routeParamsKeys.forEach(k => {
                route = route.replace("{" + k + "}", requestParams.RouteParams[k]);
            });            
        }
    }

    //add queryParams TODO
    if (requestParams?.QueryParams !== null && requestParams?.QueryParams !== undefined) {
        var queryParamsKeys = Object.keys(requestParams.QueryParams);
        if (queryParamsKeys.length > 0) {
            var firstParam = true;
            queryParamsKeys.forEach(k => {
                var separator = firstParam ? "?" : "&";
                route = route + separator + k + "=" + requestParams.QueryParams[k];
            });
        }
    }

    //build request header, including auth token
    if (requestParams?.HeaderParams !== null && requestParams?.HeaderParams !== undefined) {
        var headerParamsKeys = Object.keys(requestParams.HeaderParams);
        if (headerParamsKeys.length > 0) {
            headerParamsKeys.forEach(k => {
                headers.append(k, requestParams.HeaderParams[k]);
            });
        }
    }

    try {
        var result = await fetch(
            route,
            {
                body: requestBody,
                method: method,
                headers: headers
                //TODO - headers, auth token
            });

        //TODO - handle according to response header media type
        //binary data
        /*
        var response = StreamToArrayBuffer(result.body);
        */

        // plain/text
        // application/json:
        responseStatus = "" + result.status;       
        responseMediaType = result.headers.get(MediaTypeHeader);

        var responseHeaders = "{\n";
        result.headers.keys().forEach(k => {
            responseHeaders = responseHeaders + "  \"" + k + "\": \"" + result.headers.get(k) + "\",\n";
        })
        responseHeaders = responseHeaders + "}";

        var responseBodyValue = await result.text();
        responseBody = "Headers:\n" + responseHeaders + "\n\nBody:" + "\n" + responseBodyValue;

        success = true;
    }
    catch (error) {
        console.log("Fetch api error occurred:");
        console.log(error);
        return {
            body: "Error occurred on fetch api. Check console logs",
            media: "plain/text",
            status: "500",
            url: route
        }
    }

    if (success) {
        var responseData: LoadedResponseItemType = {
            status: responseStatus,
            body: responseBody,
            media: responseMediaType,
            url: route
        }
        LoadedResponses[endpointId] = responseData;

        return responseData;
    }

    return null;
}

//generate array from http chunks
function ConcatArrayBuffers(chunks: Uint8Array[]): Uint8Array {
    const result = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}

//read http chunks from request
async function StreamToArrayBuffer(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        } else {
            chunks.push(value);
        }
    }
    return ConcatArrayBuffers(chunks);
}

//generate basic token from username and pw
function GenerateBasicToken(username: string, password: string): string {
    return btoa(`${username}:${password}`);
}