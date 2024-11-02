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
    if (CurrentSelectedMetadata.EndpointId === null || CurrentSelectedMetadata.EndpointId === undefined) {
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
    CurrentSelectedMetadata.RespObjRef = {};
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
        RespObjRef: { ...CurrentSelectedMetadata.RespObjRef },
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
            var enumValues = isEnum && (ref === null || ref === undefined) ? p.getAttribute("kwf-enumValues")?.split(',') : null;

            returnArray.push({
                Name: name,
                IsRequired: isRequired,
                IsArray: isArray,
                IsEnum: isEnum,
                Ref: ref,
                EnumValues: enumValues
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

//fill LoadedRequests
function SetupLoadedRequests() {
    if (!HasRequestBody()) {
        return;
    }

    var endpoint_id = CurrentSelectedMetadata.EndpointId;
    var currentRequest = LoadedRequests[endpoint_id];
    if (currentRequest === null || currentRequest === undefined) {
        CurrentSelectedMetadata.ReqSelectedMedia = DefaultSelectedMedia;
    }
    else {
        CurrentSelectedMetadata.ReqSelectedMedia = currentRequest.media;
    }

    //has samples
    if (CurrentSelectedMetadata.ReqSamples !== null &&
        CurrentSelectedMetadata.ReqSamples !== undefined &&
        Object.keys(CurrentSelectedMetadata.ReqSamples).length > 0) {
        //save first request from sample to history
        if (currentRequest === null || currentRequest === undefined) {
            currentRequest = {
                body: {},
                media: CurrentSelectedMetadata.ReqSelectedMedia
            };
            LoadedRequests[endpoint_id] = currentRequest;
        }

        if (currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === null || currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === undefined) {
            var sampleReqKey = DefaultSelectedMedia;
            var sampleRequest = CurrentSelectedMetadata.ReqSamples[sampleReqKey];

            if (sampleRequest === null || sampleRequest === undefined) {
                sampleReqKey = Object.keys(CurrentSelectedMetadata.ReqSamples)[0];
                sampleRequest = CurrentSelectedMetadata.ReqSamples[sampleReqKey];
            }

            LoadedRequests[endpoint_id].media = sampleReqKey;
            LoadedRequests[endpoint_id].body[sampleReqKey] = sampleRequest
        }
    }
    //no samples, but has body
    else {
        //save first request to history when no sample available
        CurrentSelectedMetadata.ReqMediaTypes[CurrentSelectedMetadata.ReqSelectedMedia] = JsonMediaType; //maybe should be plain text?
        if (currentRequest === null || currentRequest === undefined) {
            currentRequest = {
                body: {},
                media: CurrentSelectedMetadata.ReqSelectedMedia
            };
            LoadedRequests[endpoint_id] = currentRequest;
        }

        if (currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === null || currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === undefined) {
            LoadedRequests[endpoint_id].media = DefaultSelectedMedia;
            LoadedRequests[endpoint_id].body[sampleReqKey] = EmptyRequest
        }
    }
}