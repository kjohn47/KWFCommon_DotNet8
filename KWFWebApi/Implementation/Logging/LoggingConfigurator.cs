namespace KWFWebApi.Implementation.Logging
{
    using KWFCommon.Abstractions.Constants;

    using KWFWebApi.Abstractions.Constants;
    using KWFWebApi.Abstractions.Logging;

    using Microsoft.AspNetCore.Builder;
    using Microsoft.AspNetCore.HttpLogging;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Logging;
    using System.Runtime.InteropServices;

    public static class LoggingConfigurator
    {
        public static IServiceCollection AddLogging(
            this IServiceCollection services,
            IConfiguration configuration,
            string? customConfigurationKey = null)
        {
            return AddLoggingInternal(services, configuration, null, false, customConfigurationKey);
        }

        public static IServiceCollection AddLogging(
            this IServiceCollection services,
            IConfiguration configuration,
            IEnumerable<KwfLoggerProviderBuilder>? additionalProviders,
            string? customConfigurationKey = null)
        {
            return AddLoggingInternal(services, configuration, additionalProviders, false, customConfigurationKey);
        }

        public static IServiceCollection AddLogging(
            this IServiceCollection services,
            IConfiguration configuration,
            bool isDev,
            string? customConfigurationKey = null)
        {
            return AddLoggingInternal(services, configuration, null, isDev, customConfigurationKey);
        }

        public static IServiceCollection AddLogging(
            this IServiceCollection services,
            IConfiguration configuration,
            IEnumerable<KwfLoggerProviderBuilder>? additionalProviders,
            bool isDev,
            string? customConfigurationKey = null)
        {
            return AddLoggingInternal(services, configuration, additionalProviders, isDev, customConfigurationKey);
        }

        private static IServiceCollection AddLoggingInternal(
            IServiceCollection services,
            IConfiguration configuration,
            IEnumerable<KwfLoggerProviderBuilder>? additionalProviders,
            bool isDev,
            string? customConfigurationKey)
        {
            var config = configuration.GetSection(customConfigurationKey ?? LoggingConstants.Configuration_Key).Get<LoggingConfiguration>();

            if (!isDev && !(config?.EnableApiLogs ?? false))
            {
                services.AddLogging(l =>
                {
                    l.ClearProviders();
                });

                return services;
            }

            services.AddLogging(l =>
            {
                l.ClearProviders();
                l.AddConfiguration(configuration.GetSection(ApiConstants.Logging_Key));
                if (config?.Providers is not null)
                {
                    if (config.Providers.Any(x => x.Equals(nameof(LoggingProviderEnum.Console)))) l.AddConsole();
                    if (config.Providers.Any(x => x.Equals(nameof(LoggingProviderEnum.Debug)))) l.AddDebug();
                    if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                    {
                        if (config.Providers.Any(x => x.Equals(nameof(LoggingProviderEnum.Event)))) l.AddEventLog();
                    }
                    if (config.Providers.Any(x => x.Equals(nameof(LoggingProviderEnum.EventSource)))) l.AddEventSourceLogger();

                    if (additionalProviders is not null)
                    {
                        foreach (var provider in additionalProviders)
                        {
                            if (config.Providers.Any(x => x.Equals(provider.ProviderName))) provider.AddProvider(l);
                        }
                    }
                }
            });

            if ((isDev || (config?.EnableApiLogs ?? false)) && (config?.EnableHttpLogs ?? false))
            {
                services.AddHttpLogging(o =>
                {
                    o.LoggingFields = HttpLoggingFields.All;
                });
            }

            return services;
        }

        public static IApplicationBuilder UseLogging(
            this IApplicationBuilder app,
            IConfiguration configuration,
            bool isDev,
            string? customConfigurationKey = null)
        {
            return UseLoggingInternal(app, configuration, isDev, customConfigurationKey);
        }

        public static IApplicationBuilder UseLogging(
            this IApplicationBuilder app,
            IConfiguration configuration,
            string? customConfigurationKey = null)
        {
            return UseLoggingInternal(app, configuration, false, customConfigurationKey);
        }

        public static IApplicationBuilder UseLoggingInternal(
            IApplicationBuilder app,
            IConfiguration configuration,
            bool isDev,
            string? customConfigurationKey)
        {
            var config = configuration.GetSection(customConfigurationKey ?? LoggingConstants.Configuration_Key).Get<LoggingConfiguration>();

            if ((isDev || (config?.EnableApiLogs ?? false)) && (config?.EnableHttpLogs ?? false))
            {
                app.UseHttpLogging();
            }

            return app;
        }
    }
}
