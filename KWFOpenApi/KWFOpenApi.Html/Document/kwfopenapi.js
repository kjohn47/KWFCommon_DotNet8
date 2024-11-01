const DefaultSelectedMedia = "Json";
const DefaultSelectedStatusCode = "200";
var ModelReferences = {
    Enums: null,
    Models: null
};
var CachedEndpointMetadata = {};
var CurrentSelectedMetadata = {
    ReqSelectedMedia: DefaultSelectedMedia,
    ReqMediaTypes: {},
    ReqSamples: {},
    ReqObjRef: {},
    ReqQueryParams: [],
    ReqRouteParams: [],
    ReqHeaderParams: [],
    RespSelectedMedia: DefaultSelectedMedia,
    RespSelectedStatus: DefaultSelectedStatusCode,
    RespSamples: {},
    RespObjRef: {},
    EndpointId: undefined,
    EndpointRoute: undefined,
    EndpointMethod: undefined
};
var LoadedRequests = {};
var LoadedResponses = {};
var LoadedRequestParams = {};
function CacheModelReferences(modelsJson, enumsJson) {
    ModelReferences = {
        "Enums": JSON.parse(enumsJson),
        "Models": JSON.parse(modelsJson)
    };
}
function ExpandEndpointGroup(group_div, endpoint_div_id) {
    let toggled = group_div.getAttribute("kwf-toggled");
    let groupDiv = document.getElementById(endpoint_div_id);
    if (toggled === "false") {
        group_div.setAttribute("kwf-toggled", "true");
        groupDiv.style.setProperty("display", "block");
        groupDiv.style.setProperty("visibility", "visible");
    }
    else {
        group_div.setAttribute("kwf-toggled", "false");
        groupDiv.style.setProperty("display", "none");
        groupDiv.style.setProperty("visibility", "hidden");
    }
}
function SelectEndpoint(endpoint_id) {
    if (CurrentSelectedMetadata.EndpointId === endpoint_id) {
        return;
    }
    var requestBox = document.getElementById("request_box");
    var currentRouteParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-route-params[]");
    var currentQueryParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-query-params[]");
    var currentHeaderParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-header-params[]");
    SavePreviousRequestParamsState(currentRouteParamsInputs, currentQueryParamsInputs, currentHeaderParamsInputs);
    SavePreviousRequestBodyState(requestBox);
    CurrentSelectedMetadata.EndpointId = endpoint_id;
    CurrentSelectedMetadata.ReqRouteParams = [];
    CurrentSelectedMetadata.ReqQueryParams = [];
    CurrentSelectedMetadata.ReqHeaderParams = [];
    CurrentSelectedMetadata.ReqSamples = {};
    CurrentSelectedMetadata.ReqMediaTypes = {};
    CurrentSelectedMetadata.ReqObjRef = {};
    CurrentSelectedMetadata.RespSamples = {};
    CurrentSelectedMetadata.RespObjRef = {};
    var cachedMetadata = CachedEndpointMetadata[endpoint_id];
    var hasRequestBody = false;
    if (cachedMetadata !== null && cachedMetadata !== undefined) {
        CurrentSelectedMetadata.EndpointRoute = cachedMetadata.EndpointRoute;
        CurrentSelectedMetadata.EndpointMethod = cachedMetadata.EndpointMethod;
        hasRequestBody = CurrentSelectedMetadata.EndpointMethod !== "GET" && CurrentSelectedMetadata.EndpointMethod !== "DELETE";
        CurrentSelectedMetadata.ReqRouteParams = cachedMetadata.ReqRouteParams;
        CurrentSelectedMetadata.ReqQueryParams = cachedMetadata.ReqQueryParams;
        CurrentSelectedMetadata.ReqHeaderParams = cachedMetadata.ReqHeaderParams;
        if (hasRequestBody) {
            CurrentSelectedMetadata.ReqSamples = cachedMetadata.ReqSamples;
            CurrentSelectedMetadata.ReqMediaTypes = cachedMetadata.ReqMediaTypes;
            CurrentSelectedMetadata.ReqObjRef = cachedMetadata.ReqObjRef;
        }
    }
    else {
        CurrentSelectedMetadata.EndpointRoute = document.getElementsByName("endpoint_route_" + endpoint_id)[0].getAttribute("value");
        CurrentSelectedMetadata.EndpointMethod = document.getElementsByName("endpoint_method_" + endpoint_id)[0].getAttribute("value");
        hasRequestBody = CurrentSelectedMetadata.EndpointMethod !== "GET" && CurrentSelectedMetadata.EndpointMethod !== "DELETE";
        var routeParams = document.getElementsByName("endpoint_route_params_" + endpoint_id + "[]");
        var queryParams = document.getElementsByName("endpoint_query_params_" + endpoint_id + "[]");
        var headerParams = document.getElementsByName("endpoint_header_params_" + endpoint_id + "[]");
        CurrentSelectedMetadata.ReqRouteParams = GetParamsArray(routeParams);
        CurrentSelectedMetadata.ReqQueryParams = GetParamsArray(queryParams);
        CurrentSelectedMetadata.ReqHeaderParams = GetParamsArray(headerParams);
        if (hasRequestBody) {
            var reqSamples = document.getElementsByName("request_sample_" + endpoint_id + "[]");
            if (reqSamples !== null && reqSamples !== undefined && reqSamples.length > 0) {
                reqSamples.forEach(reqSample => {
                    var sampleKey = reqSample.getAttribute("kwf-media-type");
                    CurrentSelectedMetadata.ReqSamples[sampleKey] = reqSample.getAttribute("value");
                    CurrentSelectedMetadata.ReqMediaTypes[sampleKey] = reqSample.getAttribute("kwf-media-type-name");
                    CurrentSelectedMetadata.ReqObjRef[sampleKey] = reqSample.getAttribute("kwf-obj_ref");
                });
            }
        }
        CachedEndpointMetadata[endpoint_id] = {
            ReqMediaTypes: { ...CurrentSelectedMetadata.ReqMediaTypes },
            ReqSamples: { ...CurrentSelectedMetadata.ReqSamples },
            ReqObjRef: { ...CurrentSelectedMetadata.ReqObjRef },
            ReqQueryParams: [...CurrentSelectedMetadata.ReqQueryParams],
            ReqRouteParams: [...CurrentSelectedMetadata.ReqRouteParams],
            ReqHeaderParams: [...CurrentSelectedMetadata.ReqHeaderParams],
            RespSamples: { ...CurrentSelectedMetadata.RespSamples },
            RespObjRef: { ...CurrentSelectedMetadata.RespObjRef },
            EndpointRoute: CurrentSelectedMetadata.EndpointRoute,
            EndpointMethod: CurrentSelectedMetadata.EndpointMethod
        };
    }
    FillLoadedRequests(hasRequestBody);
    FillRequestParamForm();
    FillRequestBodyForm(hasRequestBody, requestBox);
}
function FillLoadedRequests(hasBody) {
    if (!hasBody) {
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
    if (CurrentSelectedMetadata.ReqSamples !== null &&
        CurrentSelectedMetadata.ReqSamples !== undefined &&
        Object.keys(CurrentSelectedMetadata.ReqSamples).length > 0) {
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
            LoadedRequests[endpoint_id].body[sampleReqKey] = sampleRequest;
        }
    }
    else {
        CurrentSelectedMetadata.ReqMediaTypes[CurrentSelectedMetadata.ReqSelectedMedia] = "application/json";
        if (currentRequest === null || currentRequest === undefined) {
            currentRequest = {
                body: {},
                media: CurrentSelectedMetadata.ReqSelectedMedia
            };
            LoadedRequests[endpoint_id] = currentRequest;
        }
        if (currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === null || currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === undefined) {
            var sampleReqKey = DefaultSelectedMedia;
            var sampleRequest = "\"\"";
            LoadedRequests[endpoint_id].media = sampleReqKey;
            LoadedRequests[endpoint_id].body[sampleReqKey] = sampleRequest;
        }
    }
}
function FillRequestBodyForm(hasBody, requestBox) {
    var reqRefBody = document.getElementById("req-obj-ref-item");
    var requestSelectedMediaSelect = document.getElementById("request_selected_media");
    var reloadSample = document.getElementsByName("reload_request_sample")[0];
    if (hasBody) {
        requestBox.removeAttribute("readonly");
        requestBox.classList.remove("textbox-readonly");
        requestBox.value = LoadedRequests[CurrentSelectedMetadata.EndpointId]?.body[CurrentSelectedMetadata.ReqSelectedMedia];
        reqRefBody.innerHTML = CurrentSelectedMetadata.ReqObjRef[CurrentSelectedMetadata.ReqSelectedMedia];
        reqRefBody.setAttribute("kwf-req-obj-ref", CurrentSelectedMetadata.ReqObjRef[CurrentSelectedMetadata.ReqSelectedMedia]);
        reloadSample.removeAttribute("disabled");
        requestSelectedMediaSelect.removeAttribute("disabled");
        var mediaTypesAvailable = Object.keys(CurrentSelectedMetadata.ReqMediaTypes);
        mediaTypesAvailable.forEach(type => {
            var mediaOption = document.createElement("option");
            mediaOption.value = type;
            mediaOption.innerHTML = CurrentSelectedMetadata.ReqMediaTypes[type];
            mediaOption.selected = type == CurrentSelectedMetadata.ReqSelectedMedia;
            requestSelectedMediaSelect.append(mediaOption);
        });
    }
    else {
        requestBox.value = "";
        requestBox.classList.add("textbox-readonly");
        requestBox.setAttribute("readonly", "");
        requestSelectedMediaSelect.innerHTML = "";
        reqRefBody.innerHTML = "";
        reqRefBody.removeAttribute("kwf-req-obj-ref");
        reloadSample.setAttribute("disabled", "");
        requestSelectedMediaSelect.setAttribute("disabled", "");
    }
    var endpointDataDiv = document.getElementById("api-selected-endpoint-data");
    endpointDataDiv.innerHTML = "[" + CurrentSelectedMetadata.EndpointMethod + "] => " + CurrentSelectedMetadata.EndpointRoute;
}
function FillRequestParamForm() {
    var containerDiv = document.getElementById("req-params-container");
    var inputsDiv = document.getElementById("req-params-container-inputs");
    containerDiv.classList.add("hidden-container");
    inputsDiv.innerHTML = "";
    var hasRouteParams = CurrentSelectedMetadata.ReqRouteParams !== null && CurrentSelectedMetadata.ReqRouteParams !== undefined && CurrentSelectedMetadata.ReqRouteParams.length > 0;
    var hasQueryParams = CurrentSelectedMetadata.ReqQueryParams !== null && CurrentSelectedMetadata.ReqQueryParams !== undefined && CurrentSelectedMetadata.ReqQueryParams.length > 0;
    var hasHeaderParams = CurrentSelectedMetadata.ReqHeaderParams !== null && CurrentSelectedMetadata.ReqHeaderParams !== undefined && CurrentSelectedMetadata.ReqHeaderParams.length > 0;
    if (hasRouteParams || hasQueryParams || hasHeaderParams) {
        if (hasRouteParams) {
            var routeParamsContainer = CreateReqParamsInputs("Route", CurrentSelectedMetadata.ReqRouteParams, (LoadedRequestParams && LoadedRequestParams[CurrentSelectedMetadata.EndpointId]?.RouteParams));
            inputsDiv.appendChild(routeParamsContainer);
        }
        if (hasQueryParams) {
            var queryParamsContainer = CreateReqParamsInputs("Query", CurrentSelectedMetadata.ReqQueryParams, (LoadedRequestParams && LoadedRequestParams[CurrentSelectedMetadata.EndpointId]?.QueryParams));
            inputsDiv.appendChild(queryParamsContainer);
        }
        if (hasHeaderParams) {
            var headerParamsContainer = CreateReqParamsInputs("Header", CurrentSelectedMetadata.ReqHeaderParams, (LoadedRequestParams && LoadedRequestParams[CurrentSelectedMetadata.EndpointId]?.HeaderParams));
            inputsDiv.appendChild(headerParamsContainer);
        }
        containerDiv.classList.remove("hidden-container");
    }
}
function CreateReqParamsInputs(paramsType, reqParams, loadedParams) {
    var paramsContainer = document.createElement("div");
    paramsContainer.classList.add("req-params-container");
    paramsContainer.innerHTML = paramsType + ":<br />";
    reqParams.forEach(rp => {
        var loadedParamsValue = null;
        if (loadedParams !== null && loadedParams !== undefined) {
            loadedParamsValue = loadedParams[rp.Name];
        }
        var paramInputGroupDiv = document.createElement("div");
        var paramNameDiv = document.createElement("div");
        var inputDiv = document.createElement("div");
        paramNameDiv.classList.add("request-param-name");
        paramNameDiv.innerHTML = rp.IsRequired ? rp.Name + " <small>(Required)</small>" : rp.Name;
        paramInputGroupDiv.appendChild(paramNameDiv);
        inputDiv.classList.add("request-param-input");
        if (rp.IsArray) {
        }
        else if (rp.IsEnum) {
        }
        else {
            var paramInput = document.createElement("input");
            paramInput.setAttribute("type", "text");
            paramInput.setAttribute("name", CurrentSelectedMetadata.EndpointId + "-" + paramsType.toLowerCase() + "-params[]");
            paramInput.setAttribute("kwf-param-name", rp.Name);
            if (loadedParamsValue !== null && loadedParamsValue !== undefined) {
                paramInput.setAttribute("value", loadedParamsValue);
            }
            if (rp.IsRequired) {
                paramInput.setAttribute("required", "");
            }
            inputDiv.appendChild(paramInput);
        }
        paramInputGroupDiv.appendChild(inputDiv);
        paramsContainer.appendChild(paramInputGroupDiv);
    });
    return paramsContainer;
}
function ReloadRequestSample() {
    if (CurrentSelectedMetadata !== null &&
        CurrentSelectedMetadata !== undefined &&
        CurrentSelectedMetadata.EndpointMethod !== null &&
        CurrentSelectedMetadata.EndpointMethod !== undefined &&
        CurrentSelectedMetadata.EndpointMethod !== "GET" &&
        CurrentSelectedMetadata.EndpointMethod !== "DELETE") {
        var requestBox = document.getElementById("request_box");
        requestBox.value = CurrentSelectedMetadata.ReqSamples[CurrentSelectedMetadata.ReqSelectedMedia];
    }
}
function ChangeReqMediaType(mediaTypeSelect) {
    var mediaType = mediaTypeSelect.value;
    if (CurrentSelectedMetadata === null ||
        CurrentSelectedMetadata === undefined ||
        mediaType == CurrentSelectedMetadata.ReqSelectedMedia) {
        return;
    }
    if (CurrentSelectedMetadata.EndpointMethod === null ||
        CurrentSelectedMetadata.EndpointMethod === undefined ||
        CurrentSelectedMetadata.EndpointMethod === "GET" ||
        CurrentSelectedMetadata.EndpointMethod === "DELETE") {
        return;
    }
    var requestBox = document.getElementById("request_box");
    var reqRefBody = document.getElementById("req-obj-ref-item");
    SavePreviousRequestBodyState(requestBox);
    CurrentSelectedMetadata.ReqSelectedMedia = mediaType;
    var requestsForEndpoint = LoadedRequests[CurrentSelectedMetadata.EndpointId];
    if (requestsForEndpoint === null || requestsForEndpoint === undefined) {
        LoadedRequests[CurrentSelectedMetadata.EndpointId] = {
            media: mediaType,
            body: {}
        };
        requestsForEndpoint = LoadedRequests[CurrentSelectedMetadata.EndpointId];
    }
    var stateForMediaType = requestsForEndpoint.body[mediaType];
    if (stateForMediaType === null || stateForMediaType === undefined) {
        var sampleReq = CurrentSelectedMetadata.ReqSamples[mediaType];
        if (sampleReq === null || sampleReq === undefined) {
            sampleReq = "\"\"";
        }
        LoadedRequests[CurrentSelectedMetadata.EndpointId].body[mediaType] = sampleReq;
    }
    reqRefBody.innerHTML = CurrentSelectedMetadata.ReqObjRef[mediaType];
    reqRefBody.setAttribute("kwf-req-obj-ref", CurrentSelectedMetadata.ReqObjRef[mediaType]);
    requestBox.removeAttribute("readonly");
    requestBox.classList.remove("textbox-readonly");
    requestBox.value = LoadedRequests[CurrentSelectedMetadata.EndpointId]?.body[mediaType];
}
function SavePreviousRequestBodyState(requestBox) {
    if (CurrentSelectedMetadata.EndpointId === null || CurrentSelectedMetadata.EndpointId === undefined) {
        return;
    }
    var prevReqState = LoadedRequests[CurrentSelectedMetadata.EndpointId];
    if (prevReqState === null || prevReqState === undefined) {
        LoadedRequests[CurrentSelectedMetadata.EndpointId] = {
            body: {},
            media: ""
        };
    }
    LoadedRequests[CurrentSelectedMetadata.EndpointId].body[CurrentSelectedMetadata.ReqSelectedMedia] = requestBox.value;
    LoadedRequests[CurrentSelectedMetadata.EndpointId].media = CurrentSelectedMetadata.ReqSelectedMedia;
}
function SavePreviousRequestParamsState(routeParams, queryParams, headerParams) {
    if ((CurrentSelectedMetadata.EndpointId === null || CurrentSelectedMetadata.EndpointId === undefined) ||
        ((routeParams === null || routeParams === undefined || routeParams.length === 0) &&
            (queryParams === null || queryParams === undefined || queryParams.length === 0) &&
            (headerParams === null || headerParams === undefined || headerParams.length === 0))) {
        return;
    }
    var requestParams = LoadedRequestParams[CurrentSelectedMetadata.EndpointId];
    if (requestParams === null || requestParams === undefined) {
        LoadedRequestParams[CurrentSelectedMetadata.EndpointId] = {
            "RouteParams": {},
            "QueryParams": {},
            "HeaderParams": {}
        };
    }
    if (routeParams !== null && routeParams !== undefined) {
        routeParams.forEach(x => {
            var { paramName, paramValue } = GetParamNameAndValue(x);
            if (paramName !== null && paramName !== undefined) {
                LoadedRequestParams[CurrentSelectedMetadata.EndpointId].RouteParams[paramName] = paramValue;
            }
        });
    }
    if (queryParams !== null && queryParams !== undefined) {
        queryParams.forEach(x => {
            var { paramName, paramValue } = GetParamNameAndValue(x);
            if (paramName !== null && paramName !== undefined) {
                LoadedRequestParams[CurrentSelectedMetadata.EndpointId].QueryParams[paramName] = paramValue;
            }
        });
    }
    if (headerParams !== null && headerParams !== undefined) {
        headerParams.forEach(x => {
            var { paramName, paramValue } = GetParamNameAndValue(x);
            if (paramName !== null && paramName !== undefined) {
                LoadedRequestParams[CurrentSelectedMetadata.EndpointId].HeaderParams[paramName] = paramValue;
            }
        });
    }
}
function GetParamNameAndValue(reqParam) {
    var paramName = reqParam.getAttribute("kwf-param-name");
    var isArray = reqParam.hasAttribute("kwf-param-is-array");
    var paramValue = null;
    if (paramName !== null && paramName !== undefined) {
        if (isArray) {
        }
        else {
            paramValue = reqParam.value;
        }
    }
    return { paramName, paramValue };
}
function GetParamsArray(paramsItems) {
    var returnArray = [];
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
function GetBoolFromString(strValue) {
    return (strValue !== null && strValue !== undefined && strValue.toLowerCase() === "true") ? true : false;
}
