namespace KWFCommon.Implementation.DependencyInjection
{
    using KWFCommon.Abstractions.Constants;
    using KWFCommon.Implementation.Configuration;
    using KWFCommon.Implementation.Kestrel;

    using KWFJson.Configuration;

    using Microsoft.AspNetCore.Builder;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.DependencyInjection.Extensions;

    using System;
    using System.Text.Json;

    public static class AddDependencies
    {
        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            string? customConfigurationKey,
            Action<IServiceCollection, IConfiguration>? registerAuth,
            Action<IServiceCollection, IConfiguration, JsonSerializerOptions>? registerApplicationServices,
            bool isDev)
        {
            var services = applicationBuilder.Services;
            var configuration = applicationBuilder.Configuration;

            if (configuration.GetSection(customConfigurationKey ?? ApiConstants.AppConfiguration_Key)
                .Get<AppConfiguration>() is not AppConfiguration appConfiguration)
            {
                throw new ArgumentNullException(nameof(AppConfiguration), "App configuration must be set on json setting");
            }

            var jsonSettings = new KWFJsonConfiguration(isDev);
            var jsonOpt = jsonSettings.GetJsonSerializerOptions();

            if (appConfiguration.KestrelConfiguration is not null)
            {
                applicationBuilder.WebHost.ConfigureKestrel(appConfiguration.KestrelConfiguration, isDev);
                if (appConfiguration.KestrelConfiguration.HasHttpsAvailable)
                {
                    services.AddHttpsRedirection(opt =>
                    {
                        opt.HttpsPort = appConfiguration.KestrelConfiguration.HttpsPort;
                    });
                }
            }

            services.Configure<JsonOptions>(options =>
            {
                foreach (var converter in jsonOpt.Converters)
                {
                    options.JsonSerializerOptions.Converters.Add(converter);
                }

                options.JsonSerializerOptions.PropertyNamingPolicy = jsonOpt.PropertyNamingPolicy;
                options.JsonSerializerOptions.DefaultIgnoreCondition = jsonOpt.DefaultIgnoreCondition;
                options.JsonSerializerOptions.AllowTrailingCommas = jsonOpt.AllowTrailingCommas;
                options.JsonSerializerOptions.WriteIndented = jsonOpt.WriteIndented;
            });

            services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
            {
                foreach (var converter in jsonOpt.Converters)
                {
                    options.SerializerOptions.Converters.Add(converter);
                }

                options.SerializerOptions.PropertyNamingPolicy = jsonOpt.PropertyNamingPolicy;
                options.SerializerOptions.DefaultIgnoreCondition = jsonOpt.DefaultIgnoreCondition;
                options.SerializerOptions.AllowTrailingCommas = jsonOpt.AllowTrailingCommas;
                options.SerializerOptions.WriteIndented = jsonOpt.WriteIndented;
            });

            services.AddAppConfiguration(appConfiguration);
            services.TryAddSingleton(jsonSettings);
            services.AddCors();
            services.AddEndpointsApiExplorer();
            if (appConfiguration.OpenApiSettings is not null) services.AddOpenApi(appConfiguration.OpenApiSettings);
            if (registerAuth is not null) registerAuth(services, configuration);
            if (registerApplicationServices is not null) registerApplicationServices(services, configuration, jsonOpt);

            return services;
        }
    }
}
