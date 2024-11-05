namespace KWFAuthentication.Implementation.Context
{
    using KWFAuthentication.Abstractions.Constants;
    using KWFAuthentication.Abstractions.Context;
    using KWFAuthentication.Abstractions.Identity;

    using Microsoft.AspNetCore.Http;

    using System.Security.Claims;

    public sealed class UserContextAccessor : IUserContextAccessor
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public UserContextAccessor(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public IUserContext GetContext()
        {
            var user = _httpContextAccessor?.HttpContext?.User;

            if (user?.Identity != null && user.Identity.IsAuthenticated && user.Claims != null && user.Claims.Any())
            {
                return new UserContext(
                    user.Claims.GetGuidFromClaim(KwfJwtConstants.UserId),
                    user.Claims.GetGuidFromClaim(KwfJwtConstants.SessionId),
                    user.Claims.FirstOrDefault(x => x.Type.Equals(KwfJwtConstants.Username))?.Value ?? throw new ArgumentNullException(KwfJwtConstants.Username, "Value cannot be empty"),
                    user.Claims.GetClaimValue(ClaimTypes.Name) ?? string.Empty,
                    user.Claims.GetClaimValue(KwfJwtConstants.Surname) ?? string.Empty,
                    user.Claims.GetClaimValue(KwfJwtConstants.LanguageCode) ?? string.Empty,
                    user.Claims.GetClaimValuesList(ClaimTypes.Role),
                    (user.Claims.GetClaimValue(KwfJwtConstants.Status) ?? string.Empty).GetUserStatusValue(),
                    user.Claims.GetDateFromClaimUnixTime(KwfJwtConstants.ExpireTicks));
            }

            return new UserContext();
        }
    }
}
