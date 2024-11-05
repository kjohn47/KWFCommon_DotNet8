const DefaultSelectedMedia = "Json";
const DefaultSelectedStatusCode = "OK";
const JsonMediaType = "application/json";
const GETMethod = "GET";
const POSTMethod = "POST";
const PUTMethod = "PUT";
const DELETEMethod = "DELETE";
const MediaTypeHeader = "Content-Type";
const EmptyRequest = "\"\"";
const ModelsInputName = "kwf-metadata-models";
const EnumsInputName = "kwf-metadata-enums";
const RequestBodyBoxId = "request_box";
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
    RespMediaTypes: {},
    EndpointId: undefined,
    EndpointRoute: undefined,
    EndpointMethod: undefined
};
var LoadedRequests = {};
var LoadedResponses = {};
var LoadedRequestParams = {};
function CacheModelReferences(modelsJson, enumsJson) {
    ModelReferences = {
        Enums: JSON.parse(enumsJson),
        Models: JSON.parse(modelsJson)
    };
}
function GetBoolFromString(strValue) {
    return (strValue !== null && strValue !== undefined && strValue.toLowerCase() === "true") ? true : false;
}
function SavePreviousRequestBodyState(requestBoxValue) {
    if (CurrentSelectedMetadata.EndpointId === null || CurrentSelectedMetadata.EndpointId === undefined || !HasRequestBody()) {
        return;
    }
    var prevReqState = LoadedRequests[CurrentSelectedMetadata.EndpointId];
    if (prevReqState === null || prevReqState === undefined) {
        LoadedRequests[CurrentSelectedMetadata.EndpointId] = {
            body: {},
            media: ""
        };
    }
    LoadedRequests[CurrentSelectedMetadata.EndpointId].body[CurrentSelectedMetadata.ReqSelectedMedia] = requestBoxValue;
    LoadedRequests[CurrentSelectedMetadata.EndpointId].media = CurrentSelectedMetadata.ReqSelectedMedia;
}
function HasRequestBody() {
    return !(CurrentSelectedMetadata?.EndpointMethod === null ||
        CurrentSelectedMetadata?.EndpointMethod === undefined ||
        CurrentSelectedMetadata.EndpointMethod === GETMethod ||
        CurrentSelectedMetadata.EndpointMethod === DELETEMethod);
}
function ResetCurrentSelected() {
    CurrentSelectedMetadata.EndpointId = null;
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
        RespSamples: { ...CurrentSelectedMetadata.RespSamples },
        RespMediaTypes: { ...CurrentSelectedMetadata.RespMediaTypes },
        RespSelectedStatus: CurrentSelectedMetadata.RespSelectedStatus,
        RespSelectedMedia: CurrentSelectedMetadata.RespSelectedMedia,
        EndpointRoute: CurrentSelectedMetadata.EndpointRoute,
        EndpointMethod: CurrentSelectedMetadata.EndpointMethod
    };
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
function SetupCurrentSelectedFromCache(endpoint_id) {
    var cachedMetadata = CachedEndpointMetadata[endpoint_id];
    if (cachedMetadata !== null && cachedMetadata !== undefined) {
        CurrentSelectedMetadata.EndpointId = endpoint_id;
        CurrentSelectedMetadata.EndpointRoute = cachedMetadata.EndpointRoute;
        CurrentSelectedMetadata.EndpointMethod = cachedMetadata.EndpointMethod;
        CurrentSelectedMetadata.ReqRouteParams = cachedMetadata.ReqRouteParams;
        CurrentSelectedMetadata.ReqQueryParams = cachedMetadata.ReqQueryParams;
        CurrentSelectedMetadata.ReqHeaderParams = cachedMetadata.ReqHeaderParams;
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
function SetupCurrentSelectedMainData(endpoint_id, route, method) {
    CurrentSelectedMetadata.EndpointId = endpoint_id;
    CurrentSelectedMetadata.EndpointRoute = route;
    CurrentSelectedMetadata.EndpointMethod = method;
}
function SetupCurrentSelectedReqParams(routeParams, queryParams, headerParams) {
    CurrentSelectedMetadata.ReqRouteParams = GetParamsArray(routeParams);
    CurrentSelectedMetadata.ReqQueryParams = GetParamsArray(queryParams);
    CurrentSelectedMetadata.ReqHeaderParams = GetParamsArray(headerParams);
}
function SetupCurrentSelectedReqSamples(reqSamples) {
    if (reqSamples !== null && reqSamples !== undefined && reqSamples.length > 0) {
        reqSamples.forEach(reqSample => {
            var sampleKey = reqSample.getAttribute("kwf-media-type");
            CurrentSelectedMetadata.ReqSamples[sampleKey] = reqSample.getAttribute("value");
            CurrentSelectedMetadata.ReqMediaTypes[sampleKey] = reqSample.getAttribute("kwf-media-type-name");
            CurrentSelectedMetadata.ReqObjRef[sampleKey] = reqSample.getAttribute("kwf-obj_ref");
        });
    }
}
function SetupCurrentSelectedRespSamples(responseSamplesInput) {
    var responseSamples = {};
    var responseMediaTypes = {};
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
        CurrentSelectedMetadata.ReqMediaTypes[CurrentSelectedMetadata.ReqSelectedMedia] = JsonMediaType;
        if (currentRequest === null || currentRequest === undefined) {
            currentRequest = {
                body: {},
                media: CurrentSelectedMetadata.ReqSelectedMedia
            };
            LoadedRequests[endpoint_id] = currentRequest;
        }
        if (currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === null || currentRequest.body[CurrentSelectedMetadata.ReqSelectedMedia] === undefined) {
            LoadedRequests[endpoint_id].media = DefaultSelectedMedia;
            LoadedRequests[endpoint_id].body[sampleReqKey] = EmptyRequest;
        }
    }
}
function GetSelectedEndpointResponse() {
    var currentResponse = LoadedResponses[CurrentSelectedMetadata.EndpointId];
    if (currentResponse === null || currentResponse === undefined) {
        return null;
    }
    return currentResponse;
}
async function ExecuteRequest(authorizationSchema, authorizationToken, authorizationHeader) {
    if (CurrentSelectedMetadata?.EndpointRoute === null ||
        CurrentSelectedMetadata?.EndpointRoute === undefined ||
        CurrentSelectedMetadata.EndpointMethod === null ||
        CurrentSelectedMetadata.EndpointMethod === undefined) {
        return;
    }
    var endpointId = CurrentSelectedMetadata.EndpointId;
    var method = CurrentSelectedMetadata.EndpointMethod;
    var route = CurrentSelectedMetadata.EndpointRoute;
    var success = false;
    var responseBody = null;
    var responseStatus = null;
    var responseMediaType = null;
    var requestBody = null;
    var requestParams = LoadedRequestParams[endpointId];
    var headers = new Headers();
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
    if (requestParams?.RouteParams !== null && requestParams?.RouteParams !== undefined) {
        var routeParamsKeys = Object.keys(requestParams.RouteParams);
        if (routeParamsKeys.length > 0) {
            routeParamsKeys.forEach(k => {
                route = route.replace("{" + k + "}", requestParams.RouteParams[k]);
            });
        }
    }
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
    if (requestParams?.HeaderParams !== null && requestParams?.HeaderParams !== undefined) {
        var headerParamsKeys = Object.keys(requestParams.HeaderParams);
        if (headerParamsKeys.length > 0) {
            headerParamsKeys.forEach(k => {
                headers.append(k, requestParams.HeaderParams[k]);
            });
        }
    }
    console.log("Endpoint");
    console.log(route);
    console.log("Req body");
    console.log(requestBody);
    try {
        var result = await fetch(route, {
            body: requestBody,
            method: method,
            headers: headers
        });
        responseStatus = "" + result.status;
        responseMediaType = result.headers.get(MediaTypeHeader);
        responseBody = await result.text();
        success = true;
    }
    catch (error) {
        console.log("Fetch api error occurred:");
        console.log(error);
        return {
            body: "Error occurred on fetch api. Check console logs",
            media: "plain/text",
            status: "500"
        };
    }
    if (success) {
        var responseData = {
            status: responseStatus,
            body: responseBody,
            media: responseMediaType
        };
        LoadedResponses[endpointId] = responseData;
        return responseData;
    }
    return null;
}
function ConcatArrayBuffers(chunks) {
    const result = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}
async function StreamToArrayBuffer(stream) {
    const chunks = [];
    const reader = stream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        else {
            chunks.push(value);
        }
    }
    return ConcatArrayBuffers(chunks);
}
function GenerateBasicToken(username, password) {
    return btoa(`${username}:${password}`);
}
function FetchAndCacheModelsAndEnums() {
    var modelsInput = document.getElementsByName(ModelsInputName)[0];
    var enumsInput = document.getElementsByName(EnumsInputName)[0];
    CacheModelReferences(modelsInput.value, enumsInput.value);
}
function ExpandDivGroup(group_div, hidden_div_id) {
    let toggled = group_div.getAttribute("kwf-toggled");
    let groupDiv = document.getElementById(hidden_div_id);
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
    group_div.blur();
}
function GetRequestInputs() {
    var requestBox = document.getElementById(RequestBodyBoxId);
    var currentRouteParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-route-params[]");
    var currentQueryParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-query-params[]");
    var currentHeaderParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-header-params[]");
    return {
        requestBox,
        currentRouteParamsInputs,
        currentQueryParamsInputs,
        currentHeaderParamsInputs
    };
}
function SelectEndpoint(endpoint_id, endpoint_div) {
    var previousSelectedDiv = document.getElementsByClassName("api-path-endpoint focused_element");
    if (previousSelectedDiv !== null && previousSelectedDiv !== undefined && previousSelectedDiv.length > 0) {
        Array.prototype.forEach.call(previousSelectedDiv, d => {
            d.classList.remove("focused_element");
        });
    }
    endpoint_div.classList.add("focused_element");
    if (CurrentSelectedMetadata.EndpointId === endpoint_id) {
        return;
    }
    var { requestBox, currentRouteParamsInputs, currentQueryParamsInputs, currentHeaderParamsInputs } = GetRequestInputs();
    SavePreviousRequestParamsState(currentRouteParamsInputs, currentQueryParamsInputs, currentHeaderParamsInputs);
    SavePreviousRequestBodyState(requestBox.value);
    ResetCurrentSelected();
    if (!SetupCurrentSelectedFromCache(endpoint_id)) {
        var route = document.getElementsByName("endpoint_route_" + endpoint_id)[0].getAttribute("value");
        var method = document.getElementsByName("endpoint_method_" + endpoint_id)[0].getAttribute("value");
        SetupCurrentSelectedMainData(endpoint_id, route, method);
        var routeParams = document.getElementsByName("endpoint_route_params_" + endpoint_id + "[]");
        var queryParams = document.getElementsByName("endpoint_query_params_" + endpoint_id + "[]");
        var headerParams = document.getElementsByName("endpoint_header_params_" + endpoint_id + "[]");
        SetupCurrentSelectedReqParams(routeParams, queryParams, headerParams);
        if (HasRequestBody()) {
            var reqSamples = document.getElementsByName("request_sample_" + endpoint_id + "[]");
            SetupCurrentSelectedReqSamples(reqSamples);
        }
        var responseSamplesInput = document.getElementsByName("response_sample_" + endpoint_id + "[]");
        SetupCurrentSelectedRespSamples(responseSamplesInput);
        SetupEndpointCache();
    }
    SetupLoadedRequests();
    FillRequestParamForm();
    FillRequestBodyForm(HasRequestBody(), requestBox);
    FillResponseData(GetSelectedEndpointResponse());
    FillResponseSample();
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
    endpointDataDiv.innerHTML = "<b style=\"display:contents\">[" + CurrentSelectedMetadata.EndpointMethod + "]</b> => " + CurrentSelectedMetadata.EndpointRoute;
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
    paramsContainer.innerHTML = paramsType + ":";
    var paramsContainerItems = document.createElement("div");
    paramsContainerItems.classList.add("req-params-container-items");
    reqParams.forEach(rp => {
        var loadedParamsValue = null;
        if (loadedParams !== null && loadedParams !== undefined) {
            loadedParamsValue = loadedParams[rp.Name];
        }
        var paramInputGroupDiv = document.createElement("div");
        paramInputGroupDiv.classList.add("req-params-container-items-group");
        var paramNameDiv = document.createElement("div");
        var inputDiv = document.createElement("div");
        paramNameDiv.classList.add("request-param-name");
        var paramNameValue = rp.Name;
        var hasFormat = (rp.Format !== null && rp.Format !== undefined);
        var isMultipleAttribute = rp.IsRequired && hasFormat;
        if (rp.IsRequired || hasFormat) {
            paramNameValue = paramNameValue + " <small>(";
            if (rp.IsRequired) {
                paramNameValue = paramNameValue + "Required";
            }
            if (isMultipleAttribute) {
                paramNameValue = paramNameValue + " | ";
            }
            if (hasFormat) {
                paramNameValue = paramNameValue + rp.Format;
            }
            paramNameValue = paramNameValue + ")</small>";
        }
        paramNameDiv.innerHTML = paramNameValue;
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
            paramInput.setAttribute("style", "width:100%");
            if (loadedParamsValue !== null && loadedParamsValue !== undefined) {
                paramInput.setAttribute("value", loadedParamsValue);
            }
            if (rp.IsRequired) {
                paramInput.setAttribute("required", "");
            }
            inputDiv.appendChild(paramInput);
        }
        paramInputGroupDiv.appendChild(inputDiv);
        paramsContainerItems.appendChild(paramInputGroupDiv);
    });
    paramsContainer.appendChild(paramsContainerItems);
    return paramsContainer;
}
function FillResponseSample() {
    var responseSampleDiv = document.getElementById("request-response-sample-container");
    responseSampleDiv.style.setProperty("display", "block");
    responseSampleDiv.style.setProperty("visibility", "visible");
    var currentSelectedRespSample = CurrentSelectedMetadata.RespSamples[CurrentSelectedMetadata.RespSelectedStatus][CurrentSelectedMetadata.RespSelectedMedia];
    var availableRespStatus = Object.keys(CurrentSelectedMetadata.RespSamples);
    var availableRespMediaTypes = Object.keys(CurrentSelectedMetadata.RespSamples[CurrentSelectedMetadata.RespSelectedStatus]);
    var respStatusSelect = document.getElementsByName("response-sample-status-select")[0];
    var respMediaSelect = document.getElementsByName("response-sample-media-select")[0];
    respStatusSelect.removeAttribute("disabled");
    respMediaSelect.removeAttribute("disabled");
    respStatusSelect.innerHTML = "";
    respMediaSelect.innerHTML = "";
    availableRespStatus.forEach(status => {
        var statusOption = document.createElement("option");
        statusOption.value = status;
        statusOption.innerHTML = status;
        statusOption.selected = status == CurrentSelectedMetadata.RespSelectedStatus;
        respStatusSelect.append(statusOption);
    });
    availableRespMediaTypes.forEach(type => {
        var mediaOption = document.createElement("option");
        mediaOption.value = type;
        mediaOption.innerHTML = CurrentSelectedMetadata.RespMediaTypes[type];
        mediaOption.selected = type == CurrentSelectedMetadata.RespSelectedMedia;
        respMediaSelect.append(mediaOption);
    });
    var respObjRefDiv = document.getElementById("response-sample-obj-ref");
    respObjRefDiv.setAttribute("kwf-req-obj-ref", currentSelectedRespSample.BodyReference);
    respObjRefDiv.innerHTML = currentSelectedRespSample.BodyReference;
    var respBodyText = document.getElementsByName("kwf-response-sample-body")[0];
    respBodyText.value = currentSelectedRespSample.Body;
}
function ReloadRequestSample() {
    if (HasRequestBody()) {
        var requestBox = document.getElementById(RequestBodyBoxId);
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
    if (HasRequestBody()) {
        return;
    }
    var requestBox = document.getElementById(RequestBodyBoxId);
    var reqRefBody = document.getElementById("req-obj-ref-item");
    SavePreviousRequestBodyState(requestBox.value);
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
function ChangeResponseSampleStatus(statusSelect) {
    var statusCode = statusSelect.value;
    if (CurrentSelectedMetadata === null ||
        CurrentSelectedMetadata === undefined ||
        statusCode === CurrentSelectedMetadata.RespSelectedStatus) {
        return;
    }
    CurrentSelectedMetadata.RespSelectedStatus = statusCode;
    var availableRespMediaTypes = Object.keys(CurrentSelectedMetadata.RespSamples[CurrentSelectedMetadata.RespSelectedStatus]);
    var respMediaSelect = document.getElementsByName("response-sample-media-select")[0];
    respMediaSelect.innerHTML = "";
    respMediaSelect.removeAttribute("disabled");
    if (!availableRespMediaTypes.includes(CurrentSelectedMetadata.RespSelectedMedia)) {
        if (availableRespMediaTypes.includes(DefaultSelectedMedia)) {
            CurrentSelectedMetadata.RespSelectedMedia = DefaultSelectedMedia;
        }
        else {
            CurrentSelectedMetadata.RespSelectedMedia = availableRespMediaTypes[0];
        }
    }
    CachedEndpointMetadata[CurrentSelectedMetadata.EndpointId].RespSelectedStatus = CurrentSelectedMetadata.RespSelectedStatus;
    CachedEndpointMetadata[CurrentSelectedMetadata.EndpointId].RespSelectedMedia = CurrentSelectedMetadata.RespSelectedMedia;
    availableRespMediaTypes.forEach(type => {
        var mediaOption = document.createElement("option");
        mediaOption.value = type;
        mediaOption.innerHTML = CurrentSelectedMetadata.RespMediaTypes[type];
        mediaOption.selected = type == CurrentSelectedMetadata.RespSelectedMedia;
        respMediaSelect.append(mediaOption);
    });
    var currentSelectedRespSample = CurrentSelectedMetadata.RespSamples[CurrentSelectedMetadata.RespSelectedStatus][CurrentSelectedMetadata.RespSelectedMedia];
    var respObjRefDiv = document.getElementById("response-sample-obj-ref");
    respObjRefDiv.setAttribute("kwf-req-obj-ref", currentSelectedRespSample.BodyReference);
    respObjRefDiv.innerHTML = currentSelectedRespSample.BodyReference;
    var respBodyText = document.getElementsByName("kwf-response-sample-body")[0];
    respBodyText.value = currentSelectedRespSample.Body;
}
function ChangeResponseSampleMedia(mediaTypeSelect) {
    var mediaType = mediaTypeSelect.value;
    if (CurrentSelectedMetadata === null ||
        CurrentSelectedMetadata === undefined ||
        mediaType === CurrentSelectedMetadata.RespSelectedMedia) {
        return;
    }
    CurrentSelectedMetadata.RespSelectedMedia = mediaType;
    CachedEndpointMetadata[CurrentSelectedMetadata.EndpointId].RespSelectedMedia = CurrentSelectedMetadata.RespSelectedMedia;
    var currentSelectedRespSample = CurrentSelectedMetadata.RespSamples[CurrentSelectedMetadata.RespSelectedStatus][CurrentSelectedMetadata.RespSelectedMedia];
    var respObjRefDiv = document.getElementById("response-sample-obj-ref");
    respObjRefDiv.setAttribute("kwf-req-obj-ref", currentSelectedRespSample.BodyReference);
    respObjRefDiv.innerHTML = currentSelectedRespSample.BodyReference;
    var respBodyText = document.getElementsByName("kwf-response-sample-body")[0];
    respBodyText.value = currentSelectedRespSample.Body;
}
async function SendRequest(button) {
    SetButtonSending(button);
    var { requestBox, currentRouteParamsInputs, currentQueryParamsInputs, currentHeaderParamsInputs } = GetRequestInputs();
    var validationError = false;
    var currentEndpointId = CurrentSelectedMetadata.EndpointId;
    var selectedSchema = null;
    var authHeader = null;
    var authToken = null;
    var authSelect = document.getElementsByName("kwf-authorization-method");
    if (authSelect !== null && authSelect !== undefined && authSelect.length > 0) {
        selectedSchema = authSelect[0].selectedOptions[0].value;
        authHeader = authSelect[0].selectedOptions[0].getAttribute("kwf-header-name");
        if (selectedSchema === "Other") {
            selectedSchema = "ApiKey";
        }
        if (selectedSchema === "Basic") {
            var usernameInput = document.getElementsByName("auth-Basic-username-input")[0];
            var passwordInput = document.getElementsByName("auth-Basic-password-input")[0];
            authToken = GenerateBasicToken(usernameInput.value, passwordInput.value);
        }
        else {
            var tokenInput = document.getElementsByName("auth-" + selectedSchema + "-input")[0];
            authToken = tokenInput.value;
        }
    }
    currentRouteParamsInputs !== null && currentRouteParamsInputs !== undefined && currentRouteParamsInputs.length > 0 && currentRouteParamsInputs.forEach(x => {
        if (!x.reportValidity()) {
            if (!validationError) {
                x.focus();
                validationError = true;
            }
        }
    });
    currentQueryParamsInputs !== null && currentQueryParamsInputs !== undefined && currentQueryParamsInputs.length > 0 && currentQueryParamsInputs.forEach(x => {
        if (!x.reportValidity()) {
            if (!validationError) {
                x.focus();
                validationError = true;
            }
        }
    });
    currentHeaderParamsInputs !== null && currentHeaderParamsInputs !== undefined && currentHeaderParamsInputs.length > 0 && currentHeaderParamsInputs.forEach(x => {
        if (!x.reportValidity()) {
            if (!validationError) {
                x.focus();
                validationError = true;
            }
        }
    });
    if (validationError) {
        ResetButtonSending(button);
        return;
    }
    SavePreviousRequestParamsState(currentRouteParamsInputs, currentQueryParamsInputs, currentHeaderParamsInputs);
    SavePreviousRequestBodyState(requestBox.value);
    var response = await ExecuteRequest(selectedSchema, authToken, authHeader);
    if (currentEndpointId === CurrentSelectedMetadata.EndpointId) {
        FillResponseData(response);
    }
    ResetButtonSending(button);
}
function SetButtonSending(button) {
    button.value = "Sending...";
    button.disabled = true;
    button.classList.add("api-request-send-button-sending");
}
function ResetButtonSending(button) {
    button.disabled = false;
    button.value = "Send";
    button.classList.remove("api-request-send-button-sending");
}
function FillResponseData(response) {
    var responseMediaDiv = document.getElementById("response-media-type");
    var responseStatusDiv = document.getElementById("response-status");
    var responseResultTA = document.getElementById("response-result-body");
    if (response !== null && response !== undefined) {
        responseMediaDiv.innerHTML = "MediaType: " + (response.media !== null ? response.media : "");
        responseStatusDiv.innerHTML = "Status Code: " + response.status;
        responseResultTA.value = response.body;
        return;
    }
    responseMediaDiv.innerHTML = "MediaType:";
    responseStatusDiv.innerHTML = "Status Code:";
    responseResultTA.value = "";
}
function FocusOnModelReference(refObjDiv) {
    refObjDiv.blur();
    if (!refObjDiv.hasAttribute("kwf-req-obj-ref")) {
        return;
    }
    var ref = refObjDiv.getAttribute("kwf-req-obj-ref");
    if (ref === null || ref === undefined) {
        return;
    }
    var objectContainer = document.getElementById("model-objects-container");
    if (objectContainer !== null && objectContainer !== undefined) {
        var toggled = objectContainer.getAttribute("kwf-toggled");
        if (toggled === "false") {
            ExpandDivGroup(objectContainer, "object-items-container");
        }
        var objectItem = document.getElementById("kwf-object-item-" + ref);
        if (objectItem !== null && objectItem !== undefined) {
            toggled = objectItem.getAttribute("kwf-toggled");
            if (toggled === "false") {
                ExpandDivGroup(objectItem, "kwf-object-item-" + ref + "-properties");
            }
            objectItem.scrollIntoView();
            objectItem.focus();
        }
    }
}
function FocusOnModelOrEnumReference(refObjDiv) {
    if (!refObjDiv.hasAttribute("kwf-req-obj-ref")) {
        return;
    }
    var ref = refObjDiv.getAttribute("kwf-req-obj-ref");
    if (ref === null || ref === undefined) {
        return;
    }
    if (!refObjDiv.hasAttribute("kwf-is-ref-enum") || refObjDiv.getAttribute("kwf-is-ref-enum") === "false") {
        FocusOnModelReference(refObjDiv);
        return;
    }
    var enumContainer = document.getElementById("model-enums-container");
    if (enumContainer !== null && enumContainer !== undefined) {
        var toggled = enumContainer.getAttribute("kwf-toggled");
        if (toggled === "false") {
            ExpandDivGroup(enumContainer, "enum-items-container");
        }
        var enumItem = document.getElementById("kwf-enum-item-" + ref);
        if (enumItem !== null && enumItem !== undefined) {
            toggled = enumItem.getAttribute("kwf-toggled");
            if (toggled === "false") {
                ExpandDivGroup(enumItem, "kwf-enum-item-" + ref + "-values");
            }
            enumItem.scrollIntoView();
            enumItem.focus();
        }
    }
}
function SelectAuthorizationForm(selectInput) {
    var selectedValue = selectInput.selectedOptions[0].value;
    var selectedHeaderName = selectInput.selectedOptions[0].getAttribute("kwf-header-name");
    var forms = document.getElementsByClassName("auth-form-type auth-form-inputs");
    if (selectedValue === "Other") {
        selectedValue = "ApiKey";
    }
    var headerNameDiv = document.getElementById("auth-selected-header-name-" + selectedValue);
    headerNameDiv.innerHTML = "(" + selectedHeaderName + ")";
    if (forms !== null && forms !== undefined && forms.length > 0) {
        Array.prototype.forEach.call(forms, f => {
            var selectedForm = f;
            if (!selectedForm.classList.contains("hidden-container")) {
                if (selectedForm.getAttribute("kwf-auth-form-type") !== selectedValue) {
                    selectedForm.classList.add("hidden-container");
                }
            }
            else {
                if (selectedForm.getAttribute("kwf-auth-form-type") === selectedValue) {
                    selectedForm.classList.remove("hidden-container");
                }
            }
        });
    }
}
