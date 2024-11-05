namespace KWFAuthentication.Implementation.Jwt
{
    using KWFAuthentication.Abstractions.Constants;
    using KWFAuthentication.Implementation.Configuration;

    using KWFCommon.Abstractions.Constants;

    using Microsoft.AspNetCore.Authentication.JwtBearer;
    using Microsoft.AspNetCore.Http;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.IdentityModel.Tokens;

    using System.Linq;
    using System.Net;
    using System.Text;

    public static class AuthenticationInjector
    {
        public static IServiceCollection AddBearerAuthentication(
            this IServiceCollection services,
            IConfiguration configuration,
            string? customConfigurationKey)
        {
            if (configuration.GetSection(customConfigurationKey ?? AuthConstants.BearerConfigurationKey).Get<BearerConfiguration>() is not BearerConfiguration bearerConfiguration)
            {
                throw new ArgumentNullException(nameof(BearerConfiguration), "Bearer Configuration must be set on json setting");
            }

            return services.AddBearerAuthentication(bearerConfiguration);
        }

        public static IServiceCollection AddBearerAuthentication(
            this IServiceCollection services,
            BearerConfiguration configuration)
        {
            if (string.IsNullOrEmpty(configuration.TokenIdentifier))
            {
                throw new Exception("Missing token identifier setting");
            }

            if (string.IsNullOrEmpty(configuration.TokenKey))
            {
                throw new Exception("Missing token key setting");
            }

            services.AddAuthentication(o =>
            {
                o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(x =>
            {
                x.IncludeErrorDetails = true;
                x.SaveToken = true;
                x.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration.TokenKey)),
                    ValidateIssuer = configuration.HasIssuer,
                    ValidateAudience = configuration.HasAudience,
                    ValidateLifetime = configuration.TokenValidateLife,
                    ValidIssuers = configuration.GetMultipleIssuers,
                    ValidIssuer = configuration.GetSingleIssuer,
                    ValidAudiences = configuration.GetMultipleAudiences,
                    ValidAudience = configuration.GetSingleAudience,
                    ClockSkew = new TimeSpan(0, 0, 30)
                };
                x.Events = new JwtBearerEvents
                {
                    OnMessageReceived = ctx =>
                    {
                        if (ctx.Request.Headers.ContainsKey(configuration.TokenIdentifier))
                        {
                            var bearerToken = ctx.Request.Headers[configuration.TokenIdentifier].ElementAt(0);
                            if (string.IsNullOrEmpty(bearerToken))
                            {
                                return Task.CompletedTask;
                            }

                            var token = bearerToken.StartsWith($"{KwfJwtConstants.Bearer} ", StringComparison.OrdinalIgnoreCase) ? bearerToken[(KwfJwtConstants.Bearer.Length + 1)..] : bearerToken;
                            ctx.Token = token;
                            return Task.CompletedTask;
                        }

                        ctx.NoResult();
                        return Task.CompletedTask;
                    },
                    OnChallenge = ctx =>
                    {
                        if (ctx.AuthenticateFailure != null)
                        {
                            ctx.HandleResponse();

                            ctx.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                            if (ctx.AuthenticateFailure is SecurityTokenInvalidSignatureException)
                            {
                                ctx.Response.Headers.Append(RestConstants.AuthenticateHeader, ErrorConstants.AuthSignatureErrorCode);
                                return Task.CompletedTask;
                            }
                            
                            if (ctx.AuthenticateFailure is SecurityTokenExpiredException || ctx.AuthenticateFailure is SecurityTokenNoExpirationException)
                            {
                                ctx.Response.Headers.Append(RestConstants.AuthenticateHeader, ErrorConstants.AuthExpiredErrorCode);
                                return Task.CompletedTask;
                            }

                            ctx.Response.Headers.Append(RestConstants.AuthenticateHeader, ErrorConstants.AuthDefaultErrorCode);
                        }

                        return Task.CompletedTask;
                    },
                    OnTokenValidated = ctx =>
                    {
                        return Task.CompletedTask;
                    }
                };
            });

            return services;
        }
    }
}
