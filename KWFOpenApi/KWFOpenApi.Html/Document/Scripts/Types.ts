type KeyValuePairType<T> = {
    [key: string]: T
};

type StringKeyValuePairType = KeyValuePairType<string>;

type RequestParamMetadataType = {
    Name: string,
    IsRequired: boolean,
    IsArray: boolean,
    IsEnum: boolean,
    Ref?: string,
    EnumValues?: string[],
    Format?: string
};

type ResponseSampleItem = {
    Body: string;
    BodyReference: string;
}

type EndpointMetadataType = {
    ReqMediaTypes: StringKeyValuePairType, //dictionary<string, string> [mediaType => mediaType MIME]
    ReqSamples: StringKeyValuePairType, //dictionary<string, string> [mediaType => sample body]
    ReqObjRef: StringKeyValuePairType, //dictionary<string, string> [mediaType => model ref]
    ReqQueryParams: RequestParamMetadataType[], //[{Name: string, IsRequired: bool, IsArray: bool, IsEnum: bool, Ref: string, EnumValues: []}]
    ReqRouteParams: RequestParamMetadataType[], //[{Name: string, IsRequired: bool, IsArray: bool, IsEnum: bool, Ref: string, EnumValues: []}]
    ReqHeaderParams: RequestParamMetadataType[], //[{Name: string, IsRequired: bool, IsArray: bool, IsEnum: bool, Ref: string, EnumValues: []}]
    //Response
    RespMediaTypes: StringKeyValuePairType, //dictionary<string, string> [mediaType => mediaType MIME]
    RespSamples: KeyValuePairType<KeyValuePairType<ResponseSampleItem>>, //dictionary<string, dictionary<string, string>> [status code => mediaType => sample body]
    RespSelectedStatus: string;
    RespSelectedMedia: string;
    //Meta
    EndpointRoute: string, //string
    EndpointMethod: string //string (GET | POST | PUT | DELETE)
};

type CurrentSelectedMetadataType = EndpointMetadataType & {
    ReqSelectedMedia: string, //string
    RespSelectedMedia: string, //string
    RespSelectedStatus: string, //string (200, 400, 404, 500)
    EndpointId: string, //string
};

type KwfModelPropertyType = {
    Name: string,
    Reference?: string,
    Description?: string,
    Type: string,
    Format?: string,
    IsRequired: boolean,
    IsEnum: boolean,
    IsObject: boolean,
    IsArray: boolean,
    IsDate: boolean,
    IsDictionary: boolean,
    NestedArrayProperty?: KwfModelPropertyType
}

type ModelReferencesType = {
    Enums: KeyValuePairType<string[]>,
    Models: KeyValuePairType<KwfModelPropertyType[]>
};

type CachedEndpointMetadataType = KeyValuePairType<EndpointMetadataType>;

type RequestParamStateType = {
    RouteParams: StringKeyValuePairType,
    QueryParams: StringKeyValuePairType,
    HeaderParams: StringKeyValuePairType
}

type LoadedRequestParamsType = KeyValuePairType<RequestParamStateType>;

type LoadedRequestItemType = {
    media: string,
    body: StringKeyValuePairType
}

type LoadedRequestsType = KeyValuePairType<LoadedRequestItemType>;

type LoadedResponseItemType = {
    status: string,
    media: string,
    body: string,
    url: string
}

type LoadedResponsesType = KeyValuePairType<LoadedResponseItemType>;