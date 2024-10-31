const DefaultSelectedMedia = "Json";
const DefaultSelectedStatusCode = "200";

//Models and enums
var ModelReferences = {} //obj

/*
ModelReferences: {
  "Enums": {
    "EnumRef": ["enum item 1", "enum item 2"]
  },
  "Models": {
    "ModelRef": [KwfModelProperty {}]
  }
}
*/

//dictionary with all cached endpoint id metadata
var CachedEndpointMetadata = {} //dictionary<str[endpointId], obj>
/*
{
    EndpointRoute: str,
    EndpointMethod: str,
    ReqMediaTypes, dictionary<string, string> [mediaType => mediaType MIME]
    ReqObjRef, dictionary<string, string> [mediaType => model ref]
    ReqSamples, dictionary<string, string> [mediaType => sample body]
    ReqQueryParams[], [{Name: string, IsRequired: bool, IsArray: bool, IsEnum: bool, Ref: string, EnumValues: []}]
    ReqRouteParams[], [{Name: string, IsRequired: bool, IsArray: bool, IsEnum: bool, Ref: string, EnumValues: []}]
    ReqHeaderParams[] [{Name: string, IsRequired: bool, IsArray: bool, IsEnum: bool, Ref: string, EnumValues: []}]
    RespSamples,
    RespObjRef
}
*/

//current state
var CurrentSelectedMetadata =
{
    //Request
    ReqSelectedMedia: DefaultSelectedMedia, //string
    ReqMediaTypes: {}, //dictionary<string, string> [mediaType => mediaType MIME]
    ReqSamples: {}, //dictionary<string, string> [mediaType => sample body]
    ReqObjRef: {}, //dictionary<string, string> [mediaType => model ref]
    ReqQueryParams: [], //[{Name: string, IsRequired: bool, IsArray: bool, IsEnum: bool, Ref: string, EnumValues: []}]
    ReqRouteParams: [], //[{Name: string, IsRequired: bool, IsArray: bool, IsEnum: bool, Ref: string, EnumValues: []}]
    ReqHeaderParams: [], //[{Name: string, IsRequired: bool, IsArray: bool, IsEnum: bool, Ref: string, EnumValues: []}]
    //Response
    RespSelectedMedia: DefaultSelectedMedia, //string
    RespSelectedStatus: DefaultSelectedStatusCode, //string (200, 400, 404, 500)
    RespSamples: {}, //dictionary<string, string> [mediaType => sample body]
    RespObjRef: {}, //dictionary<string, string> [mediaType => model ref]
    //Meta
    EndpointId: undefined, //string
    EndpointRoute: undefined, //string
    EndpointMethod: undefined //string (GET | POST | PUT | DELETE)
}

/*
ReqMediaTypes: {
    "Json": "application/json"
}

ReqSamples: {
    "Json": "{\n\"Property\":\"Value\"\n}"
}

ReqObjRef: {
    "Json": "ObjectModelReference"
}

ReqQueryParams: (same as below)
ReqRouteParams: (same as below)
ReqHeaderParams: [
    {
        "Name": "Param name",
        "IsRequired": bool,
        "IsArray": bool,
        "IsEnum": bool,
        "Ref": "reference to enum in ModelReferences.EnumRef",
        "EnumValues": [string]
    }
]

RespSamples: {
    "StatusCode": "{\n\"Property\":\"Value\"\n}"
}

RespObjRef: {
    "StatusCode": "ObjectModelReference"
}
*/

//request box text states for all endpoints and media types
var LoadedRequests = {}; //dictionary<string, dictionary<string>>
//last recieved response from endpoint
var LoadedResponses = {}; //dictionary<string: {statusCode: string, response: string}>
//last used request parameters
var LoadedRequestParams = {}; //dictionary<string, {RouteParams: dictionary<string, string>, QueryParams: dictionary<string, string>, HeaderParams: dictionary<string, string>}>
/* 
LoadedRequests: {
  "EndpointId": {
    "MediaType": "{prop:val}" => currently saved request
  }  
}

LoadedResponses: {
  "EndpointId": {
    "statusCode": "200",
    "response" : "{string json}"
  }  
}

LoadedRequestParams: {
    "EndpointId": {
        "RouteParams": {
          "ParamName": "Value"  
        },
        "QueryParams": {
          "ParamName": "Value"  
        },
        "HeaderParams": {
          "ParamName": "Value"  
        }
    }
}
*/

//Parse and cache enums and models
function CacheModelReferences(modelsJson, enumsJson) {
    ModelReferences = {
        "Enums": JSON.parse(enumsJson),
        "Models": JSON.parse(modelsJson)
    };
}

//show or hide endpoints from group
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

//switch context when selecting new endpoint on list
function SelectEndpoint(endpoint_id) {
    if (CurrentSelectedMetadata.EndpointId === endpoint_id) {
        return;
    }

    var requestBox = document.getElementById("request_box");
    var currentRouteParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-route-params[]");
    var currentQueryParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-query-params[]");
    var currentHeaderParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-header-params[]");
    //save previous state - CurrentSelectedMetadata should be previous endpoint
    SavePreviousRequestParamsState(currentRouteParamsInputs, currentQueryParamsInputs, currentHeaderParamsInputs);
    SavePreviousRequestBodyState(requestBox);

    //load endpoint id to current state
    CurrentSelectedMetadata.EndpointId = endpoint_id;
    //reset state of objects
    CurrentSelectedMetadata.ReqRouteParams = [];
    CurrentSelectedMetadata.ReqQueryParams = [];
    CurrentSelectedMetadata.ReqHeaderParams = [];

    CurrentSelectedMetadata.ReqSamples = {};
    CurrentSelectedMetadata.ReqMediaTypes = {};
    CurrentSelectedMetadata.ReqObjRef = {};

    CurrentSelectedMetadata.RespSamples = {};
    CurrentSelectedMetadata.RespObjRef = {};

    //get cached metadata (if exists)
    var cachedMetadata = CachedEndpointMetadata[endpoint_id];
    var hasRequestBody = false;

    //load endpoint metadata to current state
    if (cachedMetadata !== null && cachedMetadata !== undefined) {
        // load CurrentSelectedMetadata from cached data
        CurrentSelectedMetadata.EndpointRoute = cachedMetadata.EndpointRoute;
        CurrentSelectedMetadata.EndpointMethod = cachedMetadata.EndpointMethod;
        hasRequestBody = CurrentSelectedMetadata.EndpointMethod !== "GET" && CurrentSelectedMetadata.EndpointMethod !== "DELETE";

        CurrentSelectedMetadata.ReqRouteParams = cachedMetadata.ReqRouteParams;
        CurrentSelectedMetadata.ReqQueryParams = cachedMetadata.ReqQueryParams;
        CurrentSelectedMetadata.ReqHeaderParams = cachedMetadata.ReqHeaderParams;

        //in this case can assign obj references
        if (hasRequestBody) {
            CurrentSelectedMetadata.ReqSamples = cachedMetadata.ReqSamples;
            CurrentSelectedMetadata.ReqMediaTypes = cachedMetadata.ReqMediaTypes;
            CurrentSelectedMetadata.ReqObjRef = cachedMetadata.ReqObjRef;
        }
    }
    else {
        //endpoint metadata
        CurrentSelectedMetadata.EndpointRoute = document.getElementsByName("endpoint_route_" + endpoint_id)[0].getAttribute("value");
        CurrentSelectedMetadata.EndpointMethod = document.getElementsByName("endpoint_method_" + endpoint_id)[0].getAttribute("value");
        hasRequestBody = CurrentSelectedMetadata.EndpointMethod !== "GET" && CurrentSelectedMetadata.EndpointMethod !== "DELETE";

        //endpoint request params
        var routeParams = document.getElementsByName("endpoint_route_params_" + endpoint_id + "[]");
        var queryParams = document.getElementsByName("endpoint_query_params_" + endpoint_id + "[]");
        var headerParams = document.getElementsByName("endpoint_header_params_" + endpoint_id + "[]");
        CurrentSelectedMetadata.ReqRouteParams = GetParamsArray(routeParams);
        CurrentSelectedMetadata.ReqQueryParams = GetParamsArray(queryParams);
        CurrentSelectedMetadata.ReqHeaderParams = GetParamsArray(headerParams);

        //endpoint request body sample
        if (hasRequestBody) {
            var reqSamples = document.getElementsByName("request_sample_" + endpoint_id + "[]");
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

        //cache selected endpoint data, copy obj from curr state
        CachedEndpointMetadata[endpoint_id] = {
            ReqMediaTypes: { ...CurrentSelectedMetadata.ReqMediaTypes },
            ReqSamples: { ...CurrentSelectedMetadata.ReqSamples },
            ReqObjRef: { ...CurrentSelectedMetadata.ReqObjRef },
            ReqQueryParams: [ ...CurrentSelectedMetadata.ReqQueryParams ],
            ReqRouteParams: [...CurrentSelectedMetadata.ReqRouteParams ],
            ReqHeaderParams: [ ...CurrentSelectedMetadata.ReqHeaderParams ],
            //Response
            RespSamples: { ...CurrentSelectedMetadata.RespSamples },
            RespObjRef: { ...CurrentSelectedMetadata.RespObjRef },
            //Meta
            EndpointRoute: CurrentSelectedMetadata.EndpointRoute,
            EndpointMethod: CurrentSelectedMetadata.EndpointMethod
        };
    }

    //only map requests if conditions met
    FillLoadedRequests(hasRequestBody);
    FillRequestParamForm();
    FillRequestBodyForm(hasRequestBody, requestBox);
}

//fill LoadedRequests
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
        CurrentSelectedMetadata.ReqMediaTypes[CurrentSelectedMetadata.ReqSelectedMedia] = "application/json"; //maybe should be plain text?
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
            LoadedRequests[endpoint_id].body[sampleReqKey] = sampleRequest
        }
    }
}

//fill request form
function FillRequestBodyForm(hasBody, requestBox) {
    //get req body for current media type selected
    //check if box is disable, enable it
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
        })
    }
    //no object reference, no request sample, and no request, get and delete - no request body
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
    endpointDataDiv.innerHTML = "[" + CurrentSelectedMetadata.EndpointMethod + "] => " + CurrentSelectedMetadata.EndpointRoute
}

//fill request parameters form
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

//create inputs div for request params
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
        //TODO - check loaded params for inputs inserted
        if (rp.isArray) {
            //TODO, box with + and - button
            //split values by ','
        }
        else if (rp.isEnum) {
            //TODO, select - option -> from ref if not null, or build from enumValues
        }
        else {
            var routeInput = document.createElement("input");
            routeInput.setAttribute("type", "text");
            routeInput.setAttribute("name", CurrentSelectedMetadata.EndpointId + "-" + paramsType.toLowerCase() +"-params[]");
            routeInput.setAttribute("kwf-param-name", rp.Name);

            if (loadedParamsValue !== null && loadedParamsValue !== undefined) {
                routeInput.setAttribute("value", loadedParamsValue);
            }

            if (rp.IsRequired) {
                routeInput.setAttribute("required", "");
            }

            inputDiv.appendChild(routeInput);
        }

        paramInputGroupDiv.appendChild(inputDiv);
        paramsContainer.appendChild(paramInputGroupDiv);
    });

    return paramsContainer;
}

//reload sample to request body box
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

//change request media type, if more than one
function ChangeReqMediaType(mediaTypeSelect) {
    var mediaType = mediaTypeSelect.value;

    //nothing selected or same media type, no change
    if (CurrentSelectedMetadata === null ||
        CurrentSelectedMetadata === undefined ||
        mediaType == CurrentSelectedMetadata.ReqSelectedMedia) {
            return;
    }

    //get and delete have no request body. no change
    if (CurrentSelectedMetadata.EndpointMethod === null ||
        CurrentSelectedMetadata.EndpointMethod === undefined ||
        CurrentSelectedMetadata.EndpointMethod === "GET" ||
        CurrentSelectedMetadata.EndpointMethod === "DELETE") {
            return;
    }

    var requestBox = document.getElementById("request_box");
    // save to request states
    SavePreviousRequestBodyState(requestBox);

    CurrentSelectedMetadata.ReqSelectedMedia = mediaType;
    var requestsForEndpoint = LoadedRequests[CurrentSelectedMetadata.EndpointId];
    if (requestsForEndpoint === null || requestsForEndpoint === undefined) {
        LoadedRequests[CurrentSelectedMetadata.EndpointId] = {
            media: mediaType,
            body: {}
        }

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

//save last state to request history (LoadedRequests)
function SavePreviousRequestBodyState(requestBox) {
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

    LoadedRequests[CurrentSelectedMetadata.EndpointId].body[CurrentSelectedMetadata.ReqSelectedMedia] = requestBox.value;
    LoadedRequests[CurrentSelectedMetadata.EndpointId].media = CurrentSelectedMetadata.ReqSelectedMedia;
}

//save request params to history (LoadedRequestParams)
//xxxParam is input with name xxxParams[] and has attribute kwf-param-name that represents its name on the request
function SavePreviousRequestParamsState(routeParams, queryParams, headerParams) {
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
function GetParamNameAndValue(reqParam) {
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
function GetParamsArray(paramsItems) {
    var returnArray = [];

    if (paramsItems !== null && paramsItems !== undefined && paramsItems.length > 0) {
        paramsItems.forEach(p => {
            var name = p.getAttribute("value");
            var isRequired = GetBoolFromString(p.getAttribute("kwf-isRequired"));
            var isArray = GetBoolFromString(p.getAttribute("kwf-isArray"));
            var isEnum = GetBoolFromString(p.getAttribute("kwf-isEnum"));
            var ref = p.getAttribute("kwf-reference");
            var enumValues = isEnum && (ref === null || ref === undefined) ? rp.getAttribute("kwf-enumValues")?.split(',') : null;

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

//convert string to bool
function GetBoolFromString(strValue) {
    return (strValue !== null && strValue !== undefined && strValue.toLowerCase() === "true") ? true : false;
}