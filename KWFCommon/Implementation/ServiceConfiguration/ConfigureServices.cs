namespace KWFCommon.Implementation.ServiceConfiguration
{
    using System;
    using System.Text.Json;

    using KWFCommon.Implementation.Configuration;
    using KWFCommon.Abstractions.Constants;
    using KWFCommon.Implementation.Exception;
    using KWFJson.Configuration;

    using Microsoft.AspNetCore.Builder;
    using Microsoft.AspNetCore.Routing;
    using Microsoft.Extensions.Configuration;

    public static class ConfigureServices
    {
        public static IApplicationBuilder UseKWFCommon(
            this WebApplication webApp,
            Action<IApplicationBuilder>? configureAuth,
            Action<IApplicationBuilder, IConfiguration, JsonSerializerOptions>? configureMiddlewares,
            Action<IServiceProvider, IConfiguration, JsonSerializerOptions>? configureApplicationServices,
            Action<IEndpointRouteBuilder, IConfiguration, JsonSerializerOptions>? configureEndpoints,
            bool isDev)
        {
            IApplicationBuilder app = webApp;
            if (app.ApplicationServices.GetService(typeof(AppConfiguration)) is not AppConfiguration apiConfig)
            {
                throw new ArgumentNullException(ApiConstants.AppConfiguration_Key, "Missing App Configuration");
            }

            var serializerOpt = (app.ApplicationServices.GetService(typeof(KWFJsonConfiguration)) is KWFJsonConfiguration jsonOptions
                                    ? jsonOptions
                                    : new KWFJsonConfiguration(isDev))
                                .GetJsonSerializerOptions();
            if (apiConfig.LocalizationConfiguration is not null) app.UseLocalization(apiConfig.LocalizationConfiguration);
            
            app.UseExceptionHandlerMidleware(serializerOpt, isDev);
            
            if (apiConfig.KestrelConfiguration?.HasHttpsAvailable ?? false) app.UseHttpsRedirection();

            app.UseStatusCodeHandler(serializerOpt, isDev);
            app.UseCorsConfigurator(apiConfig.CorsConfiguration, isDev);

            if (apiConfig.OpenApiSettings is not null)
            {
                app.UseOpenApi(apiConfig.OpenApiSettings);
            }

            if (configureAuth is not null) configureAuth(app);
            if (configureMiddlewares is not null) configureMiddlewares(app, webApp.Configuration, serializerOpt);
            if (configureApplicationServices is not null) configureApplicationServices(app.ApplicationServices, webApp.Configuration, serializerOpt);
            if (configureEndpoints is not null) configureEndpoints(webApp, webApp.Configuration, serializerOpt);

            return app;
        }
    }
}
