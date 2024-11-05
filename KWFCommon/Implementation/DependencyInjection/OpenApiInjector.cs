namespace KWFCommon.Implementation.DependencyInjection
{
    using KWFCommon.Implementation.Configuration;
    using KWFOpenApi.Html.Swagger.DependencyInjection;

    using Microsoft.Extensions.DependencyInjection;

    public static class OpenApiInjector
    {
        public static IServiceCollection AddOpenApi(this IServiceCollection services, OpenApiSettings configuration)
        {
            if (!configuration.UseDocumentation)
            {
                return services;
            }

            if (string.IsNullOrEmpty(configuration.ApiName))
            {
                throw new ArgumentNullException(configuration.ApiName);
            }

            services.AddSwaggerGen(option =>
            {
                option.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                    Description = "Place Access Bearer JWT Token",
                    Name = configuration.BearerHeaderKey,
                    Type = configuration.BearerHeaderKey == "Authorization" ? Microsoft.OpenApi.Models.SecuritySchemeType.Http : Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                    Scheme = "bearer"
                });

                option.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
                   {
                       new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                       {
                            Reference = new Microsoft.OpenApi.Models.OpenApiReference
                            {
                                Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                       },
                       new List<string>()
                   }
                });

                option.SwaggerDoc(configuration.ApiName, new Microsoft.OpenApi.Models.OpenApiInfo
                {
                    Version = $"v{configuration.ApiVersion}",
                    Title = configuration.ApiName,
                    Description = string.Format("{0} API Swagger", configuration.ApiName)
                });
            });

            //to replace with openApi on net9 - this only necessary for UI
            if (!configuration.UseUI)
            {
                return services;
            }

            services.AddKwfSwaggerOpenApiProvider(configuration.ApiName, $"swagger/{configuration.ApiName}/swagger.json");

            return services;
        }
    }
}
