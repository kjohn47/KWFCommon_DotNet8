namespace Sample.FunctionalTests.WeatherForecastEndpointTests
{
    using KWFCommon.Abstractions.Models;

    using Microsoft.VisualStudio.TestTools.UnitTesting;

    using Sample.SampleApi.Queries.WeatherMemoryCache;

    using System.Net;
    using System.Runtime.Intrinsics.X86;
    using System.Threading.Tasks;

    [TestClass]
    public class GetWeatherTests : BaseFunctionalTests
    {
        private const string weatherSummaryTest = "TestSummary";
        protected override string BearerToken => string.Empty;

        protected override string BearerTokenHeader => string.Empty;

        protected override string UrlFormat => "WeatherForecastEndpoint/get-weather/{0}";

        [TestMethod]
        public async Task ShouldReturnWeather()
        {
            // Add service response mock
            _weatherSumariesServiceMock!
                .Setup(x => x.GetSumaries())
                .Returns(Task<string[]>.FromResult(new[] { weatherSummaryTest }));

            // Call service endpoint
            var (status, response) = await GetAsync<WeatherForecastQueryResponse>(string.Empty);

            // Assert result
            Assert.AreEqual(HttpStatusCode.OK, status);
            Assert.IsNotNull(response);
            Assert.IsTrue(response?.ForecastResults?.Count() > 0);
            foreach (var item in response!.ForecastResults!)
            {
                Assert.AreEqual(weatherSummaryTest, item.Summary);
            }

        }

        [DataTestMethod]
        [DataRow("1", "Summary0")]
        [DataRow("2", "Summary1")]
        [DataRow("3", "Summary2")]
        [DataRow("4", "Summary3")]
        [DataRow("5", "Summary4")]
        public async Task ShouldReturnWeatherForId(string id, string summaryValue)
        {
            // Add service response mock
            _weatherSumariesServiceMock!
                .Setup(x => x.GetSumaries())
                .Returns(Task<string[]>.FromResult(new[] { summaryValue }));

            // Call service endpoint
            var (status, response) = await GetAsync<WeatherForecastQueryResponse>(id);

            // Assert result
            Assert.AreEqual(HttpStatusCode.OK, status);
            Assert.IsNotNull(response);
            Assert.IsTrue(response?.ForecastResults?.Count() == 1);
            Assert.AreEqual(summaryValue, response!.ForecastResults!.First().Summary);
        }

        [DataTestMethod]
        [DataRow("0")]
        [DataRow("6")]
        [DataRow("17")]
        [DataRow("100")]
        public async Task ShouldReturnErrorForOutOfRangeId(string id)
        {
            // Add service response mock
            _weatherSumariesServiceMock!
                .Setup(x => x.GetSumaries())
                .Returns(Task<string[]>.FromResult(new[] { weatherSummaryTest }));

            // Call service endpoint
            var (status, response) = await GetAsync<KWFCommon.Implementation.Models.ErrorResult>(id);

            // Assert result
            Assert.AreEqual(HttpStatusCode.BadRequest, status);
            Assert.IsNotNull(response);
            Assert.AreEqual("INVID", response!.ErrorCode);
            Assert.AreEqual(ErrorTypeEnum.Validation, response!.ErrorType);
            Assert.AreEqual(HttpStatusCode.BadRequest, response!.HttpStatusCode);
        }
    }
}
