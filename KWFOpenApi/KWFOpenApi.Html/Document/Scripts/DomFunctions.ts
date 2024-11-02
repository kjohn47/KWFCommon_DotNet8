/// <reference path="Types.ts"/>
/// <reference path="Constants.ts"/>
/// <reference path="KwfOpenApiStates.ts"/>
/// <reference path="Functions.ts"/>

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
    SavePreviousRequestBodyState(requestBox.value);

    //reset state of objects
    ResetCurrentSelected();

    //load endpoint metadata to current state
    if (!SetupCurrentSelectedFromCache(endpoint_id)) {
        //endpoint metadata
        var route = document.getElementsByName("endpoint_route_" + endpoint_id)[0].getAttribute("value") as string;
        var method = document.getElementsByName("endpoint_method_" + endpoint_id)[0].getAttribute("value") as string;
        SetupCurrentSelectedMainData(endpoint_id, route, method);

        //endpoint request params
        var routeParams = document.getElementsByName("endpoint_route_params_" + endpoint_id + "[]") as NodeListOf<HTMLInputElement>;
        var queryParams = document.getElementsByName("endpoint_query_params_" + endpoint_id + "[]") as NodeListOf<HTMLInputElement>;
        var headerParams = document.getElementsByName("endpoint_header_params_" + endpoint_id + "[]") as NodeListOf<HTMLInputElement>;
        SetupCurrentSelectedReqParams(routeParams, queryParams, headerParams);

        //endpoint request body sample
        if (HasRequestBody()) {
            var reqSamples = document.getElementsByName("request_sample_" + endpoint_id + "[]") as NodeListOf<HTMLInputElement>;
            SetupCurrentSelectedReqSamples(reqSamples);
        }

        //cache selected endpoint data, copy obj from curr state
        SetupEndpointCache();
    }

    //only map requests if conditions met
    SetupLoadedRequests();
    FillRequestParamForm();
    FillRequestBodyForm(HasRequestBody(), requestBox);
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
    if (HasRequestBody()) {
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
    if (HasRequestBody()) {
        return;
    }

    var requestBox = document.getElementById("request_box") as HTMLInputElement;
    var reqRefBody = document.getElementById("req-obj-ref-item");
    // save to request states
    SavePreviousRequestBodyState(requestBox.value);

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