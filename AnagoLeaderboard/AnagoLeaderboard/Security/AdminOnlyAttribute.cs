using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AnagoLeaderboard.Security
{
    /// <summary>
    /// Gates a route on the caretaker's key: a single shared secret read from configuration and
    /// presented in the <see cref="HeaderName"/> header.
    ///
    /// This is **not** authentication and does not reverse "no authentication, ever". No player
    /// ever signs in, and identity is still the player record taken at its word - what this
    /// protects is the caretaker's toolbox, which no player is meant to reach at all. There is
    /// one key rather than one per person, because there is one caretaker and a key ring nobody
    /// asked for is a user table by another name.
    ///
    /// Four decisions in it worth keeping:
    ///
    /// - **Development passes without a key.** The test panel and Swagger are how these routes
    ///   are actually used while building, and a secret to paste in before every session would
    ///   be typed into a comment inside a week. To exercise the gate itself, run the project
    ///   with `ASPNETCORE_ENVIRONMENT=Production`.
    /// - **It fails closed.** An unconfigured or blank key refuses everything rather than
    ///   waving everything through, so a deploy that forgets the environment variable loses
    ///   the feature instead of publishing it.
    /// - **404, not 401 or 403.** The same reasoning the development-only routes on
    ///   <c>CollectionsController</c> already carry: a route somebody is not meant to reach
    ///   should not announce that it is there. The cost is that a mistyped key looks exactly
    ///   like a mistyped URL, which is worth it for something used a few times a month.
    /// - **A header, not a query parameter.** A query string lands in IIS access logs, in
    ///   browser history and in anything that shows a URL; a header does not.
    ///
    /// An <see cref="IAuthorizationFilter"/> rather than an <c>if</c> at the top of each action,
    /// because a declarative gate cannot be quietly dropped by an edit to the body below it -
    /// and because the failure mode of a missing check here is silent.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public sealed class AdminOnlyAttribute : Attribute, IAuthorizationFilter
    {
        /// <summary>The header carrying the key.</summary>
        public const string HeaderName = "X-Admin-Key";

        /// <summary>
        /// Where the expected key is read from. Supply it as the <c>Admin__Key</c> environment
        /// variable on the server, or through <c>dotnet user-secrets</c> locally - never as a
        /// literal in <c>appsettings.json</c>, which is in the repository.
        /// </summary>
        public const string ConfigurationKey = "Admin:Key";

        public void OnAuthorization(AuthorizationFilterContext context)
        {
            var services = context.HttpContext.RequestServices;

            if (services.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
            {
                return;
            }

            var expected = services.GetRequiredService<IConfiguration>()[ConfigurationKey];

            if (string.IsNullOrWhiteSpace(expected)
                || !Matches(context.HttpContext.Request.Headers[HeaderName].ToString(), expected))
            {
                context.Result = new NotFoundResult();
            }
        }

        /// <summary>
        /// Compares in constant time, over hashes rather than the strings themselves:
        /// <see cref="CryptographicOperations.FixedTimeEquals"/> returns early on a length
        /// mismatch, so hashing first is what stops the comparison leaking how long the key is.
        /// </summary>
        private static bool Matches(string presented, string expected)
        {
            return CryptographicOperations.FixedTimeEquals(
                SHA256.HashData(Encoding.UTF8.GetBytes(presented)),
                SHA256.HashData(Encoding.UTF8.GetBytes(expected)));
        }
    }
}
