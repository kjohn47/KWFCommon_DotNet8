﻿//Parse and cache enums and models
function CacheModelReferences(modelsJson: string, enumsJson: string) {
    ModelReferences = {
        "Enums": JSON.parse(enumsJson),
        "Models": JSON.parse(modelsJson)
    };
}

//show or hide endpoints from group
function ExpandEndpointGroup(group_div: HTMLElement, endpoint_div_id: string) {
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
function SelectEndpoint(endpoint_id: string) {
    if (CurrentSelectedMetadata.EndpointId === endpoint_id) {
        return;
    }

    var requestBox = document.getElementById("request_box") as HTMLInputElement;
    var currentRouteParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-route-params[]") as NodeListOf<HTMLInputElement>;
    var currentQueryParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-query-params[]") as NodeListOf<HTMLInputElement>;
    var currentHeaderParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-header-params[]") as NodeListOf<HTMLInputElement>;
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
        CurrentSelectedMetadata.EndpointRoute = document.getElementsByName("endpoint_route_" + endpoint_id)[0].getAttribute("value") as string;
        CurrentSelectedMetadata.EndpointMethod = document.getElementsByName("endpoint_method_" + endpoint_id)[0].getAttribute("value") as string;
        hasRequestBody = CurrentSelectedMetadata.EndpointMethod !== "GET" && CurrentSelectedMetadata.EndpointMethod !== "DELETE";

        //endpoint request params
        var routeParams = document.getElementsByName("endpoint_route_params_" + endpoint_id + "[]") as NodeListOf<HTMLInputElement>;
        var queryParams = document.getElementsByName("endpoint_query_params_" + endpoint_id + "[]") as NodeListOf<HTMLInputElement>;
        var headerParams = document.getElementsByName("endpoint_header_params_" + endpoint_id + "[]") as NodeListOf<HTMLInputElement>;
        CurrentSelectedMetadata.ReqRouteParams = GetParamsArray(routeParams);
        CurrentSelectedMetadata.ReqQueryParams = GetParamsArray(queryParams);
        CurrentSelectedMetadata.ReqHeaderParams = GetParamsArray(headerParams);

        //endpoint request body sample
        if (hasRequestBody) {
            var reqSamples = document.getElementsByName("request_sample_" + endpoint_id + "[]") as NodeListOf<HTMLInputElement>;
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

    //only map requests if conditions met
    FillLoadedRequests(hasRequestBody);
    FillRequestParamForm();
    FillRequestBodyForm(hasRequestBody, requestBox);
}

//fill LoadedRequests
function FillLoadedRequests(hasBody: boolean) {
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
function FillRequestBodyForm(hasBody: boolean, requestBox: HTMLInputElement) {
    //get req body for current media type selected
    //check if box is disable, enable it
    var reqRefBody = document.getElementById("req-obj-ref-item");
    var requestSelectedMediaSelect = document.getElementById("request_selected_media") as HTMLSelectElement;
    var reloadSample = document.getElementsByName("reload_request_sample")[0] as HTMLInputElement;

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
            var mediaOption = document.createElement("option") as HTMLOptionElement;
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
function CreateReqParamsInputs(paramsType: string, reqParams: RequestParamMetadataType[], loadedParams: StringKeyValuePairType) {
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
        if (rp.IsArray) {
            //TODO, box with + and - button
            //split values by ','
        }
        else if (rp.IsEnum) {
            //TODO, select - option -> from ref if not null, or build from enumValues
        }
        else {
            var paramInput = document.createElement("input") as HTMLInputElement;
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

//reload sample to request body box
function ReloadRequestSample() {
    if (CurrentSelectedMetadata !== null &&
        CurrentSelectedMetadata !== undefined &&
        CurrentSelectedMetadata.EndpointMethod !== null &&
        CurrentSelectedMetadata.EndpointMethod !== undefined &&
        CurrentSelectedMetadata.EndpointMethod !== "GET" &&
        CurrentSelectedMetadata.EndpointMethod !== "DELETE") {
        var requestBox = document.getElementById("request_box") as HTMLInputElement;
        requestBox.value = CurrentSelectedMetadata.ReqSamples[CurrentSelectedMetadata.ReqSelectedMedia];
    }
}

//change request media type, if more than one
function ChangeReqMediaType(mediaTypeSelect: HTMLSelectElement) {
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

    var requestBox = document.getElementById("request_box") as HTMLInputElement;
    var reqRefBody = document.getElementById("req-obj-ref-item");
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
function SavePreviousRequestBodyState(requestBox: HTMLInputElement) {
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
function GetParamsArray(paramsItems: NodeListOf<HTMLInputElement>): RequestParamMetadataType[]{
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

//convert string to bool
function GetBoolFromString(strValue: string): boolean {
    return (strValue !== null && strValue !== undefined && strValue.toLowerCase() === "true") ? true : false;
}