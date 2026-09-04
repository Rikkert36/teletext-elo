using AnagoLeaderboard.Services;
using Microsoft.Extensions.Configuration;

namespace UnitTests
{
    /// <summary>
    /// Which file a request for a photo resolves to.
    ///
    /// Worth pinning because every branch here is a *silent* one: picking the wrong file
    /// still returns a photo of the right player, so a broken rule shows up as the album
    /// being slow again, or as a replaced photo that does not change, and neither of
    /// those looks like a bug in this class.
    /// </summary>
    public class AvatarTests
    {
        private string _basePath;
        private AvatarStorage _storage;

        private const string Id = "11111111-2222-3333-4444-555555555555";

        [SetUp]
        public void Setup()
        {
            _basePath = Path.Combine(Path.GetTempPath(), "avatar-tests-" + Guid.NewGuid().ToString("n"));

            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["FileSystem:BasePath"] = _basePath
                })
                .Build();

            _storage = new AvatarStorage(configuration);
            _storage.EnsureDirectories();
        }

        [TearDown]
        public void TearDown()
        {
            if (Directory.Exists(_basePath)) Directory.Delete(_basePath, recursive: true);
        }

        /// The photo, and a copy of it written a second later so it is unambiguously newer.
        private void WriteAvatar(byte[] original, byte[]? variant = null, int width = 512)
        {
            var avatar = _storage.AvatarPath(Id)!;
            File.WriteAllBytes(avatar, original);

            if (variant == null) return;

            var path = _storage.AvatarVariantPath(Id, width)!;
            File.WriteAllBytes(path, variant);
            File.SetLastWriteTimeUtc(path, File.GetLastWriteTimeUtc(avatar).AddSeconds(1));
        }

        [Test]
        public void NoWidthAsksForTheOriginal()
        {
            WriteAvatar(new byte[900], new byte[100]);

            Assert.That(_storage.ResolveAvatar(Id).Length, Is.EqualTo(900));
        }

        [Test]
        public void AWidthTakesTheCopy()
        {
            WriteAvatar(new byte[900], new byte[100]);

            Assert.That(_storage.ResolveAvatar(Id, 512).Length, Is.EqualTo(100));
        }

        [Test]
        public void AMissingCopyFallsBackToTheOriginal()
        {
            // Nothing generates these on request, so this is the ordinary state of a photo
            // uploaded a second ago — and of one small enough that no copy is ever written.
            WriteAvatar(new byte[900]);

            Assert.That(_storage.ResolveAvatar(Id, 512).Length, Is.EqualTo(900));
        }

        [Test]
        public void ACopyOlderThanThePhotoIsNotServed()
        {
            WriteAvatar(new byte[900], new byte[100]);

            // The photo replaced, with the generator not yet finished: the copy on disk is
            // of the *previous* face, and serving it would keep handing that out.
            var avatar = _storage.AvatarPath(Id)!;
            File.SetLastWriteTimeUtc(avatar, DateTime.UtcNow.AddMinutes(5));

            Assert.That(_storage.ResolveAvatar(Id, 512).Length, Is.EqualTo(900));
        }

        [Test]
        public void APlayerWithNoPhotoGetsTheFallbackAtEveryWidth()
        {
            File.WriteAllBytes(_storage.FallbackAvatarPath, new byte[42]);

            Assert.That(_storage.ResolveAvatar(Id).Length, Is.EqualTo(42));
            Assert.That(_storage.ResolveAvatar(Id, 512).Length, Is.EqualTo(42));
        }

        [Test]
        public void AnIdThatCouldEscapeTheDirectoryResolvesToTheFallback()
        {
            File.WriteAllBytes(_storage.FallbackAvatarPath, new byte[42]);

            Assert.That(_storage.ResolveAvatar("../productiondata.db", 512).Length, Is.EqualTo(42));
        }

        [TestCase(1, 512)]
        [TestCase(512, 512)]
        [TestCase(513, 1024)]
        [TestCase(1024, 1024)]
        // Past the largest there is: the caller still gets the sharpest copy kept rather
        // than an error, which is what lets a surface ask for what it needs without
        // knowing the list.
        [TestCase(99999, 1024)]
        public void AWidthSnapsUpToOneThatExists(int asked, int expected)
        {
            Assert.That(AvatarStorage.NearestVariantWidth(asked), Is.EqualTo(expected));
        }
    }
}
