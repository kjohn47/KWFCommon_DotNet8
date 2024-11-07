/// <reference path="Types.ts"/>
/// <reference path="Constants.ts"/>
/// <reference path="KwfOpenApiStates.ts"/>
/// <reference path="Functions.ts"/>

//Fetch and cache models and enums
function FetchAndCacheModelsAndEnums() {
    var modelsInput = document.getElementsByName(ModelsInputName)[0] as HTMLInputElement;
    var enumsInput = document.getElementsByName(EnumsInputName)[0] as HTMLInputElement;
    CacheModelReferences(modelsInput.value, enumsInput.value);
}

//show or hide endpoints from group
function ExpandDivGroup(group_div: HTMLElement, hidden_div_id: string) {
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

//get request inputs
function GetRequestInputs(): { requestBox: HTMLInputElement, currentRouteParamsInputs: NodeListOf<HTMLInputElement>, currentQueryParamsInputs: NodeListOf<HTMLInputElement>, currentHeaderParamsInputs: NodeListOf<HTMLInputElement> } {
    var requestBox = document.getElementById(RequestBodyBoxId) as HTMLInputElement;
    var currentRouteParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-route-params[]") as NodeListOf<HTMLInputElement>;
    var currentQueryParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-query-params[]") as NodeListOf<HTMLInputElement>;
    var currentHeaderParamsInputs = document.getElementsByName(CurrentSelectedMetadata.EndpointId + "-header-params[]") as NodeListOf<HTMLInputElement>;

    return {
        requestBox,
        currentRouteParamsInputs,
        currentQueryParamsInputs,
        currentHeaderParamsInputs
    }
}

//switch context when selecting new endpoint on list
function SelectEndpoint(endpoint_id: string, endpoint_div: HTMLElement) {
    var previousSelectedDiv = document.getElementsByClassName("api-path-endpoint focused_element") as HTMLCollectionOf<HTMLElement>;

    if (previousSelectedDiv !== null && previousSelectedDiv !== undefined && previousSelectedDiv.length > 0) {
        Array.prototype.forEach.call(previousSelectedDiv, d => {
            (d as HTMLElement).classList.remove("focused_element");
        });
    }

    endpoint_div.classList.add("focused_element");

    if (CurrentSelectedMetadata.EndpointId === endpoint_id) {
        return;
    }

    //we want the previous selected inputs before setup new selected endpoints
    var { requestBox, currentRouteParamsInputs, currentQueryParamsInputs, currentHeaderParamsInputs } = GetRequestInputs();
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

        //setup response samples
        var responseSamplesInput = document.getElementsByName("response_sample_" + endpoint_id + "[]") as NodeListOf<HTMLInputElement>;
        SetupCurrentSelectedRespSamples(responseSamplesInput);

        //cache selected endpoint data, copy obj from curr state
        SetupEndpointCache();
    }

    //only map requests if conditions met
    SetupLoadedRequests();
    FillRequestParamForm();
    FillRequestBodyForm(HasRequestBody(), requestBox);
    FillResponseData(GetSelectedEndpointResponse());

    //fill response sample
    FillResponseSample();
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
        requestSelectedMediaSelect.innerHTML = "";
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
    endpointDataDiv.innerHTML = "<b style=\"display:contents\">[" + CurrentSelectedMetadata.EndpointMethod + "]</b> => " + CurrentSelectedMetadata.EndpointRoute
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
        //TODO: build string in better way so | is not added if only format is available

        var paramNameValue = rp.Name;
        var hasFormat = (rp.Format !== null && rp.Format !== undefined)
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
        //TODO - check loaded params for inputs inserted
        if (rp.IsArray) {
            //TODO, box with + and - button
            //split values by ','
            //if is enum - build select - option with add button
            //if not enum, inputs with add button - kwf attributes with cloning settings
        }
        else if (rp.IsEnum) {
            //TODO, select - option -> from ref if not null, or build from enumValues
            //if is enum - build select - option
        }
        else {
            var paramInput = document.createElement("input") as HTMLInputElement;
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

//fill response sample
function FillResponseSample() {
    var responseSampleDiv = document.getElementById("request-response-sample-container");
    responseSampleDiv.style.setProperty("display", "block");
    responseSampleDiv.style.setProperty("visibility", "visible");

    var currentSelectedRespSample = CurrentSelectedMetadata.RespSamples[CurrentSelectedMetadata.RespSelectedStatus][CurrentSelectedMetadata.RespSelectedMedia];
    var availableRespStatus = Object.keys(CurrentSelectedMetadata.RespSamples);
    var availableRespMediaTypes = Object.keys(CurrentSelectedMetadata.RespSamples[CurrentSelectedMetadata.RespSelectedStatus]);

    var respStatusSelect = document.getElementsByName("response-sample-status-select")[0] as HTMLSelectElement;
    var respMediaSelect = document.getElementsByName("response-sample-media-select")[0] as HTMLSelectElement;
    respStatusSelect.removeAttribute("disabled");
    respMediaSelect.removeAttribute("disabled");
    respStatusSelect.innerHTML = "";
    respMediaSelect.innerHTML = "";

    availableRespStatus.forEach(status => {
        var statusOption = document.createElement("option") as HTMLOptionElement;
        statusOption.value = status;
        statusOption.innerHTML = status;
        statusOption.selected = status == CurrentSelectedMetadata.RespSelectedStatus;
        respStatusSelect.append(statusOption);
    })

    availableRespMediaTypes.forEach(type => {
        var mediaOption = document.createElement("option") as HTMLOptionElement;
        mediaOption.value = type;
        mediaOption.innerHTML = CurrentSelectedMetadata.RespMediaTypes[type];
        mediaOption.selected = type == CurrentSelectedMetadata.RespSelectedMedia;
        respMediaSelect.append(mediaOption);
    })

    var respObjRefDiv = document.getElementById("response-sample-obj-ref");
    respObjRefDiv.setAttribute("kwf-req-obj-ref", currentSelectedRespSample.BodyReference);
    respObjRefDiv.innerHTML = currentSelectedRespSample.BodyReference;

    var respBodyText = document.getElementsByName("kwf-response-sample-body")[0] as HTMLInputElement;
    respBodyText.value = currentSelectedRespSample.Body;
}

//reload sample to request body box
function ReloadRequestSample() {
    if (HasRequestBody()) {
        var requestBox = document.getElementById(RequestBodyBoxId) as HTMLInputElement;
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

    var requestBox = document.getElementById(RequestBodyBoxId) as HTMLInputElement;
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

//change response sample status code
function ChangeResponseSampleStatus(statusSelect: HTMLSelectElement) {
    var statusCode = statusSelect.value;
    //nothing selected or same status
    if (CurrentSelectedMetadata === null ||
        CurrentSelectedMetadata === undefined ||
        statusCode === CurrentSelectedMetadata.RespSelectedStatus) {
        return;
    }

    CurrentSelectedMetadata.RespSelectedStatus = statusCode;
    var availableRespMediaTypes = Object.keys(CurrentSelectedMetadata.RespSamples[CurrentSelectedMetadata.RespSelectedStatus]);

    var respMediaSelect = document.getElementsByName("response-sample-media-select")[0] as HTMLSelectElement;
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

    //update cache
    CachedEndpointMetadata[CurrentSelectedMetadata.EndpointId].RespSelectedStatus = CurrentSelectedMetadata.RespSelectedStatus;
    CachedEndpointMetadata[CurrentSelectedMetadata.EndpointId].RespSelectedMedia = CurrentSelectedMetadata.RespSelectedMedia;

    //reset media select box
    availableRespMediaTypes.forEach(type => {
        var mediaOption = document.createElement("option") as HTMLOptionElement;
        mediaOption.value = type;
        mediaOption.innerHTML = CurrentSelectedMetadata.RespMediaTypes[type];
        mediaOption.selected = type == CurrentSelectedMetadata.RespSelectedMedia;
        respMediaSelect.append(mediaOption);
    })

    var currentSelectedRespSample = CurrentSelectedMetadata.RespSamples[CurrentSelectedMetadata.RespSelectedStatus][CurrentSelectedMetadata.RespSelectedMedia];

    var respObjRefDiv = document.getElementById("response-sample-obj-ref");
    respObjRefDiv.setAttribute("kwf-req-obj-ref", currentSelectedRespSample.BodyReference);
    respObjRefDiv.innerHTML = currentSelectedRespSample.BodyReference;

    var respBodyText = document.getElementsByName("kwf-response-sample-body")[0] as HTMLInputElement;
    respBodyText.value = currentSelectedRespSample.Body;
}

//change response sample media type
function ChangeResponseSampleMedia(mediaTypeSelect: HTMLSelectElement) {
    var mediaType = mediaTypeSelect.value;
    //nothing selected or same status
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

    var respBodyText = document.getElementsByName("kwf-response-sample-body")[0] as HTMLInputElement;
    respBodyText.value = currentSelectedRespSample.Body;
}

async function SendRequest(button: HTMLButtonElement) {
    //update all states before calling the fetch
    SetButtonSending(button);
    var { requestBox, currentRouteParamsInputs, currentQueryParamsInputs, currentHeaderParamsInputs } = GetRequestInputs();
    var validationError = false;
    var currentEndpointId = CurrentSelectedMetadata.EndpointId;
    var selectedSchema = null;
    var authHeader = null;
    var authToken = null;

    var authSelect = document.getElementsByName("kwf-authorization-method");
    if (authSelect !== null && authSelect !== undefined && authSelect.length > 0) {
        selectedSchema = (authSelect[0] as HTMLSelectElement).selectedOptions[0].value;
        authHeader = (authSelect[0] as HTMLSelectElement).selectedOptions[0].getAttribute("kwf-header-name");

        if (selectedSchema === "Other") {
            selectedSchema = "ApiKey";
        }

        if (selectedSchema === "Basic") {
            // generate from user and pw
            var usernameInput = document.getElementsByName("auth-Basic-username-input")[0] as HTMLInputElement;
            var passwordInput = document.getElementsByName("auth-Basic-password-input")[0] as HTMLInputElement;
            authToken = GenerateBasicToken(usernameInput.value, passwordInput.value);
        }
        else {
            var tokenInput = document.getElementsByName("auth-" + selectedSchema + "-input")[0] as HTMLInputElement;
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

function SetButtonSending(button: HTMLButtonElement) {
    button.value = "Sending...";
    button.disabled = true;
    button.classList.add("api-request-send-button-sending");
}

function ResetButtonSending(button: HTMLButtonElement) {
    button.disabled = false;
    button.value = "Send";
    button.classList.remove("api-request-send-button-sending");
}

//fill response data
function FillResponseData(response: LoadedResponseItemType) {
    var requestUrl = document.getElementById("response-request-url");
    var responseMediaDiv = document.getElementById("response-media-type");
    var responseStatusDiv = document.getElementById("response-status");
    var responseResultTA = document.getElementById("response-result-body") as HTMLInputElement;

    if (response !== null && response !== undefined) {
        requestUrl.innerHTML = "Url: " + response.url;
        responseMediaDiv.innerHTML = "MediaType: " + (response.media !== null ? response.media : "");
        responseStatusDiv.innerHTML = "Status Code: " + response.status;
        responseResultTA.value = response.body;

        return;
    }

    responseMediaDiv.innerHTML = "MediaType:";
    responseStatusDiv.innerHTML = "Status Code:";
    responseResultTA.value = "";
}

//focus on model for request object
function FocusOnModelReference(refObjDiv: HTMLElement) {
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

//focus on model for request object
function FocusOnModelOrEnumReference(refObjDiv: HTMLElement) {
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

//change auth form
function SelectAuthorizationForm(selectInput: HTMLSelectElement) {
    var selectedValue = selectInput.selectedOptions[0].value;
    var selectedHeaderName = selectInput.selectedOptions[0].getAttribute("kwf-header-name");
    var forms = document.getElementsByClassName("auth-form-type auth-form-inputs") as HTMLCollectionOf<HTMLElement>;
    if (selectedValue === "Other") {
        selectedValue = "ApiKey";
    }

    var headerNameDiv = document.getElementById("auth-selected-header-name-" + selectedValue);
    headerNameDiv.innerHTML = "(" + selectedHeaderName + ")"

    if (forms !== null && forms !== undefined && forms.length > 0) {
        Array.prototype.forEach.call(forms, f => {
            var selectedForm = (f as HTMLElement)
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