namespace KWFWebApi.Implementation.Endpoint
{
    using KWFAuthentication.Abstractions.Constants;

    using KWFCommon.Implementation.Models;
    using KWFWebApi.Abstractions.Endpoint;

    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Builder;
    using Microsoft.AspNetCore.Http;
    using Microsoft.AspNetCore.Routing;

    using System;
    using System.Linq;
    using System.Text;

    internal sealed class KwfEndpointBuilder : IKwfEndpointBuilder, IKwfEndpointInitialize
    {
        private readonly IEndpointRouteBuilder _appBuilder;
        private string[]? _roles;
        private List<KwfRouteBuilder> _routes;

        private KwfEndpointBuilder(IEndpointRouteBuilder appBuilder)
        {
            _appBuilder = appBuilder;
            BaseUrl = string.Empty;
            _routes = new List<KwfRouteBuilder>();
        }

        public string BaseUrl { get; private set; }

        /// <summary>
        /// Add MapGet
        /// </summary>
        /// <typeparam name="TResp">Type of Response</typeparam>
        /// <param name="routeBuilder">The Route builder</param>
        /// <returns>IKwfEndpointBuilder</returns>
        public IKwfEndpointBuilder AddGet<TResp>(Func<IKwfRouteBuilder, IKwfRouteBuilderResult> routeBuilder)
        {
            var configuration = new KwfRouteBuilder(HttpMethodEnum.Get, typeof(TResp));
            routeBuilder(configuration);
            _routes.Add(configuration);
            return this;
        }

        /// <summary>
        /// Add MapPost
        /// </summary>
        /// <typeparam name="TResp">Type of Response</typeparam>
        /// <param name="routeBuilder">The Route builder</param>
        /// <returns>IKwfEndpointBuilder</returns>
        public IKwfEndpointBuilder AddPost<TResp>(Func<IKwfRouteBuilder, IKwfRouteBuilderResult> routeBuilder)
        {
            var configuration = new KwfRouteBuilder(HttpMethodEnum.Post, typeof(TResp));
            routeBuilder(configuration);
            _routes.Add(configuration);
            return this;
        }

        /// <summary>
        /// Add MapPut
        /// </summary>
        /// <typeparam name="TResp">Type of Response</typeparam>
        /// <param name="routeBuilder">The Route builder</param>
        /// <returns>IKwfEndpointBuilder</returns>
        public IKwfEndpointBuilder AddPut<TResp>(Func<IKwfRouteBuilder, IKwfRouteBuilderResult> routeBuilder)
        {
            var configuration = new KwfRouteBuilder(HttpMethodEnum.Put, typeof(TResp));
            routeBuilder(configuration);
            _routes.Add(configuration);
            return this;
        }

        /// <summary>
        /// Add MapDelete
        /// </summary>
        /// <typeparam name="TResp">Type of Response</typeparam>
        /// <param name="routeBuilder">The Route builder</param>
        /// <returns>IKwfEndpointBuilder</returns>
        public IKwfEndpointBuilder AddDelete<TResp>(Func<IKwfRouteBuilder, IKwfRouteBuilderResult> routeBuilder)
        {
            var configuration = new KwfRouteBuilder(HttpMethodEnum.Delete, typeof(TResp));
            routeBuilder(configuration);
            _routes.Add(configuration);
            return this;
        }

        public IKwfRouteStatusBuilder AddGet<TResp>(string? route = null)
        {
            var configuration = new KwfRouteBuilder(HttpMethodEnum.Get, typeof(TResp));
            _routes.Add(configuration);
            return string.IsNullOrEmpty(route) ? configuration : configuration.SetRoute(route);
        }

        public IKwfRouteStatusBuilder AddPost<TResp>(string? route = null)
        {
            var configuration = new KwfRouteBuilder(HttpMethodEnum.Post, typeof(TResp));
            _routes.Add(configuration);
            return string.IsNullOrEmpty(route) ? configuration : configuration.SetRoute(route);
        }

        public IKwfRouteStatusBuilder AddPut<TResp>(string? route = null)
        {
            var configuration = new KwfRouteBuilder(HttpMethodEnum.Put, typeof(TResp));
            _routes.Add(configuration);
            return string.IsNullOrEmpty(route) ? configuration : configuration.SetRoute(route);
        }

        public IKwfRouteStatusBuilder AddDelete<TResp>(string? route = null)
        {
            var configuration = new KwfRouteBuilder(HttpMethodEnum.Delete, typeof(TResp));
            _routes.Add(configuration);
            return string.IsNullOrEmpty(route) ? configuration : configuration.SetRoute(route);
        }

        public void Build()
        {
            var groupRouteBuilder = _appBuilder.MapGroup(BaseUrl);
            foreach(var route in _routes)
            {
                AddRouteMethod(route, groupRouteBuilder);
            }
        }

        /// <summary>
        /// Initialize endpoint global settings
        /// </summary>
        /// <param name="endpoint">The route pattern</param>
        /// <returns>IKwfEndpointBuilder</returns>
        public IKwfEndpointBuilder InitializeEndpoint(string endpoint)
        {
            BaseUrl = endpoint.EndsWith('/') ? endpoint[0..^1] : endpoint;
            return this;
        }

        /// <summary>
        /// Initialize endpoint global settings
        /// </summary>
        /// <param name="endpoint">The route pattern</param>
        /// <param name="requireAuthorization">The global Require authorized user flag</param>
        /// <returns>IKwfEndpointBuilder</returns>
        public IKwfEndpointBuilder InitializeEndpoint(string endpoint, bool requireAuthorization)
        {
            if (requireAuthorization) _roles = Array.Empty<string>();
            return InitializeEndpoint(endpoint);
        }

        /// <summary>
        /// Initialize endpoint global settings
        /// </summary>
        /// <param name="endpoint">The route pattern</param>
        /// <param name="globalAuthorizationPolicy">The global roles authorized for this endpoint</param>
        /// <returns>IKwfEndpointBuilder</returns>
        public IKwfEndpointBuilder InitializeEndpoint(string endpoint, params string[] globalAuthorizationRoles)
        {
            _roles = globalAuthorizationRoles;
            return InitializeEndpoint(endpoint);
        }

        /// <summary>
        /// Initialize endpoint global settings
        /// </summary>
        /// <param name="endpoint">The route pattern</param>
        /// <param name="globalAuthorizationPolicy">The Global Authorization Policy from PoliciesEnum</param>
        /// <returns></returns>
        public IKwfEndpointBuilder InitializeEndpoint(string endpoint, PoliciesEnum globalAuthorizationPolicy)
        {
            return InitializeEndpoint(endpoint, Policies.GetPolicyName(globalAuthorizationPolicy));
        }

        private string BuildRoute(string? route)
        {
            return $"{BaseUrl}/{route}";
        }

        private void AddRouteMethod(KwfRouteBuilder configuration, RouteGroupBuilder routeGroupBuilder)
        {
            var route = configuration?.Route ?? string.Empty;
            if (configuration?.Action is null)
            {
                throw new ArgumentNullException(nameof(configuration), $"Configuration or action must be set for endpoint {BaseUrl}/{route}");
            }

            var map = configuration.HttpMethod switch
            {
                HttpMethodEnum.Get => routeGroupBuilder.MapGet(route, configuration.Action),
                HttpMethodEnum.Post => routeGroupBuilder.MapPost(route, configuration.Action),
                HttpMethodEnum.Put => routeGroupBuilder.MapPut(route, configuration.Action),
                HttpMethodEnum.Delete => routeGroupBuilder.MapDelete(route, configuration.Action),
                _ => throw new NotImplementedException()
            };

            map.WithName(GetOperationId(configuration))
               .ConfigureKwfRoute(
                                configuration.ResponseType,
                                BaseUrl,
                                configuration.SuccessHttpCodes,
                                configuration.ErrorHttpCodes,
                                configuration.Roles ?? (configuration.RemoveGlobalRoles ? null : _roles));
        }

        private string GetOperationId(KwfRouteBuilder routeBuilder)
        {
            var split = BuildRoute(routeBuilder.Route).Split(new[] { '.', '-', '[', ']', '{', '}', '/', '\\', '(', ')' }, StringSplitOptions.RemoveEmptyEntries);
            var stringBuilder = new StringBuilder();
            stringBuilder.Append(routeBuilder.HttpMethod.GetMethodName());
            foreach (var s in split)
            {
                stringBuilder.Append(s[0].ToString().ToUpperInvariant());
                if (s.Length > 1)
                {
                    stringBuilder.Append(s[1..]);
                }
            }

            return stringBuilder.ToString();
        }

        public static KwfEndpointBuilder CreateEndpointBuilder(IEndpointRouteBuilder builder)
        {
            return new KwfEndpointBuilder(builder);
        }
    }

    internal static class KwfResponseHandlerExtensions
    {
        private static int[] _handledSuccessCodes = new[] { 200, 204 };
        private static int[] _handledErrorCodes = new[] { 400, 401, 403, 404, 412, 500, 501, 503 };

        internal static RouteHandlerBuilder ProducesError(this RouteHandlerBuilder builder, int[]? customCodes, bool hasAuthorize)
        {
            if (customCodes is not null && customCodes.Length > 0)
            {
                foreach (var code in customCodes.Distinct().Where(c => !_handledErrorCodes.Contains(c)))
                {
                    builder.Produces<ErrorResult>(code);
                }
            }

            builder.Produces<ErrorResult>(400)
                   .Produces<ErrorResult>(404)
                   .Produces<ErrorResult>(412)
                   .Produces<ErrorResult>(500)
                   .Produces<ErrorResult>(501)
                   .Produces<ErrorResult>(503);

            if (hasAuthorize)
            {
                builder.Produces<ErrorResult>(401)
                       .Produces<ErrorResult>(403);
            }

            return builder;
        }

        internal static RouteHandlerBuilder ProducesSuccess(this RouteHandlerBuilder builder, Type respType, int[]? customCodes)
        {
            if (customCodes is not null && customCodes.Length > 0)
            {
                foreach (var code in customCodes.Distinct().Where(c => !_handledSuccessCodes.Contains(c)))
                {
                    builder.Produces(code, respType);
                }

                if (customCodes.Any(c => c.Equals(204)))
                {
                    builder.Produces(204);
                }
            }

            return builder
                .Produces(200, respType);
        }

        internal static TBuilder RequireKwfAuthorization<TBuilder>(this TBuilder builder, params string[]? roles) where TBuilder : IEndpointConventionBuilder
        {
            if (roles is null)
            {
                return builder;
            }

            if (roles.Length == 0)
            {
                return builder.RequireAuthorization();
            }

            if (roles.Length == 1 && Policies.GetRolesList().Any(x => x.Equals(roles[0])))
            {
                return builder.RequireAuthorization(roles[0]);
            }

            var rolesList = new StringBuilder();
            foreach (var role in roles.Where(x => !x.Equals(Policies.Administrator)))
            {
                rolesList.Append(role)
                         .Append(',');
            }

            rolesList.Append(Policies.Administrator);

            return builder.RequireAuthorization(
                new AuthorizeAttribute()
                {
                    Roles = rolesList.ToString()
                });
        }

        internal static RouteHandlerBuilder ConfigureKwfRoute(this RouteHandlerBuilder builder, Type respType, string baseUrl, int[]? httpSuccessCodes, int[]? httpErrorCodes, params string[]? roles)
        {
            return builder.WithTags(baseUrl)
                          .ProducesError(httpErrorCodes, roles is not null)
                          .ProducesSuccess(respType, httpSuccessCodes)
                          .RequireKwfAuthorization(roles);
        }
    }
}
