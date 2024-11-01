/// <reference path="Types.ts"/>
/// <reference path="Constants.ts"/>

//Models and enums
var ModelReferences: ModelReferencesType = {
    Enums: null,
    Models: null
};

//dictionary with all cached endpoint id metadata
var CachedEndpointMetadata: CachedEndpointMetadataType = {} //dictionary<str[endpointId], obj>

//current state
var CurrentSelectedMetadata: CurrentSelectedMetadataType =
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

//request box text states for all endpoints and media types
var LoadedRequests: LoadedRequestsType = {}; //media: string, body: dictionary<string, dictionary<string>>
//last recieved response from endpoint
var LoadedResponses: LoadedResponsesType = {}; //dictionary<string: {statusCode: string, response: string}>
//last used request parameters
var LoadedRequestParams: LoadedRequestParamsType = {}; //dictionary<string, {RouteParams: dictionary<string, string>, QueryParams: dictionary<string, string>, HeaderParams: dictionary<string, string>}>
