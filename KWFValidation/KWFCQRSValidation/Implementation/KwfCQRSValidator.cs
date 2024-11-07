namespace KWFValidation.KWFCQRSValidation.Implementation
{
    using FluentValidation;

    using KWFCommon.Abstractions.CQRS;
    using KWFCommon.Abstractions.Models;
    using KWFCommon.Implementation.CQRS;
    using KWFCommon.Implementation.Models;

    using KWFValidation.KWFCQRSValidation.Interfaces;

    using System.Net;
    using System.Threading.Tasks;

    public abstract class KwfCQRSValidator<TInput> : AbstractValidator<TInput>, IKwfCQRSValidator<TInput> where TInput : ICQRSRequest
    {
        private readonly string _errorCode;
        private readonly string _errorMessage;
        private readonly HttpStatusCode _httpStatusCode;

        public KwfCQRSValidator(HttpStatusCode? httpStatusCode = null, CascadeMode? validationMode = null) 
            : this("KWFVALIDATIONERR", $"{nameof(TInput)} fields failed validation", httpStatusCode, validationMode)
        {
        }

        public KwfCQRSValidator(string errorCode, string errorMessage, HttpStatusCode? httpStatusCode = null, CascadeMode? validationMode = null)
        {
            RuleLevelCascadeMode = validationMode.HasValue ? validationMode.Value : CascadeMode.Continue;
            ClassLevelCascadeMode = RuleLevelCascadeMode;
            _errorCode = errorCode;
            _errorMessage = errorMessage;
            _httpStatusCode = httpStatusCode?? HttpStatusCode.PreconditionFailed;
        }

        public async Task<INullableObject<ICQRSValidationError>> ValidateRequestAsync(TInput request, CancellationToken? cancellationToken = null)
        {
            var validationResult = await this.ValidateAsync(request);

            if (validationResult.IsValid)
            {
                return NullableObject<ICQRSValidationError>.EmptyResult();
            }

            if (this.RuleLevelCascadeMode.Equals(CascadeMode.Stop) || this.ClassLevelCascadeMode.Equals(CascadeMode.Stop))
            {
                var error = validationResult.Errors.First();
                return NullableObject<ICQRSValidationError>
                    .FromResult(CQRSValidationError
                        .Initialize(_errorCode, _errorMessage)
                        .AddValidationError(error.PropertyName, error.ErrorCode, error.ErrorMessage));
            }

            return NullableObject<ICQRSValidationError>
                    .FromResult(CQRSValidationError
                        .Initialize(_errorCode, _errorMessage, _httpStatusCode)
                        .AddValidationErrorRange(
                            validationResult.Errors
                            .Select(x  => new PropertyValidationError(x.PropertyName, x.ErrorCode, x.ErrorMessage))));
        }
    }
}
