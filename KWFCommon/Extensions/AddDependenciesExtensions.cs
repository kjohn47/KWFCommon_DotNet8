namespace KWFCommon.Extensions
{
    using KWFCommon.Implementation.DependencyInjection;

    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;

    using System;
    using System.Text.Json;
    using Microsoft.AspNetCore.Builder;

    public static class AddDependenciesExtensions
    {
        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            string? customConfigurationKey,
            Action<IServiceCollection, IConfiguration> registerAuth,
            Action<IServiceCollection, IConfiguration, JsonSerializerOptions> registerApplicationServices,
            bool isDev)
        {
            return AddDependencies.AddKWFCommon(applicationBuilder, customConfigurationKey, registerAuth, registerApplicationServices, isDev);
        }

        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            string? customConfigurationKey,
            Action<IServiceCollection, IConfiguration> registerAuth,
            Action<IServiceCollection, IConfiguration, JsonSerializerOptions> registerApplicationServices)
        {
            return AddDependencies.AddKWFCommon(applicationBuilder, customConfigurationKey, registerAuth, registerApplicationServices, false);
        }

        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            string? customConfigurationKey,
            Action<IServiceCollection, IConfiguration> registerAuth,
            bool isDev)
        {
            return AddDependencies.AddKWFCommon(applicationBuilder, customConfigurationKey, registerAuth, null, isDev);
        }

        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            string? customConfigurationKey,
            Action<IServiceCollection, IConfiguration> registerAuth)
        {
            return AddDependencies.AddKWFCommon(applicationBuilder, customConfigurationKey, registerAuth, null, false);
        }

        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            string? customConfigurationKey,
            Action<IServiceCollection, IConfiguration, JsonSerializerOptions> registerApplicationServices,
            bool isDev)
        {
            return AddDependencies.AddKWFCommon(applicationBuilder, customConfigurationKey, null, registerApplicationServices, isDev);
        }

        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            string? customConfigurationKey,
            Action<IServiceCollection, IConfiguration, JsonSerializerOptions> registerApplicationServices)
        {
            return AddDependencies.AddKWFCommon(applicationBuilder, customConfigurationKey, null, registerApplicationServices, false);
        }

        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            Action<IServiceCollection, IConfiguration> registerAuth,
            Action<IServiceCollection, IConfiguration, JsonSerializerOptions> registerApplicationServices,
            bool isDev)
        {            
            return AddDependencies.AddKWFCommon(applicationBuilder, null, registerAuth, registerApplicationServices, isDev);
        }

        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            Action<IServiceCollection, IConfiguration> registerAuth,
            Action<IServiceCollection, IConfiguration, JsonSerializerOptions> registerApplicationServices)
        {
            return AddDependencies.AddKWFCommon(applicationBuilder, null, registerAuth, registerApplicationServices, false);
        }

        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            Action<IServiceCollection, IConfiguration> registerAuth,
            bool isDev)
        {
            return AddDependencies.AddKWFCommon(applicationBuilder, null, registerAuth, null, isDev);
        }

        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            Action<IServiceCollection, IConfiguration> registerAuth)
        {
            return AddDependencies.AddKWFCommon(applicationBuilder, null, registerAuth, null, false);
        }

        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            Action<IServiceCollection, IConfiguration, JsonSerializerOptions> registerApplicationServices,
            bool isDev)
        {
            return AddDependencies.AddKWFCommon(applicationBuilder, null, null, registerApplicationServices, isDev);
        }

        public static IServiceCollection AddKWFCommon(
            this WebApplicationBuilder applicationBuilder,
            Action<IServiceCollection, IConfiguration, JsonSerializerOptions> registerApplicationServices)
        {
            return AddDependencies.AddKWFCommon(applicationBuilder, null, null, registerApplicationServices, false);
        }
    }
}
