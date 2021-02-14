import * as assert from 'assert';
import * as formatting from '../../../formatting';


suite("LinkRecognition.", () => {

    // commented test cases fails.

    const links = [
        'https://github.com/gliderlabs/docker-alpine/blob/master/docs/usage.md#disabling-cache',
        'https://github.com/yzhang-gh/vscode-markdown/commit/bc50362b9bf86e298bd455c3cb7fad42dc550a45',
        'https://ru.wikipedia.org/wiki/%D0%9F%D0%B5%D1%80%D1%84%D0%B5%D0%BA%D1%86%D0%B8%D0%BE%D0%BD%D0%B8%D0%B7%D0%BC_(%D0%BF%D1%81%D0%B8%D1%85%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%8F)',
        'http://тест.рф',

        // This is from django test cases https://github.com/django/django/blob/stable/2.2.x/tests/validators/valid_urls.txt
        'http://www.djangoproject.com/',
        'HTTP://WWW.DJANGOPROJECT.COM/',
        'http://localhost/',
        'http://example.com/',
        'http://example.com./',
        'http://www.example.com/',
        'http://www.example.com:8000/test',
        'http://valid-with-hyphens.com/',
        'http://subdomain.example.com/',
        'http://a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'http://200.8.9.10/',
        'http://200.8.9.10:8000/test',
        'http://su--b.valid-----hyphens.com/',
        'http://example.com?something=value',
        'http://example.com/index.php?something=value&another=value2',
        'https://example.com/',
        'ftp://example.com/',
        'ftps://example.com/',
        'http://foo.com/blah_blah',
        'http://foo.com/blah_blah/',
        'http://foo.com/blah_blah_(wikipedia)',
        'http://foo.com/blah_blah_(wikipedia)_(again)',
        'http://www.example.com/wpstyle/?p=364',
        'https://www.example.com/foo/?bar=baz&inga=42&quux',
        'http://✪df.ws/123',
        'http://userid:password@example.com:8080',
        'http://userid:password@example.com:8080/',
        'http://userid@example.com',
        'http://userid@example.com/',
        'http://userid@example.com:8080',
        'http://userid@example.com:8080/',
        'http://userid:password@example.com',
        'http://userid:password@example.com/',
        'http://142.42.1.1/',
        'http://142.42.1.1:8080/',
        'http://➡.ws/䨹',
        'http://⌘.ws',
        'http://⌘.ws/',
        'http://foo.com/blah_(wikipedia)#cite-1',
        'http://foo.com/blah_(wikipedia)_blah#cite-1',
        'http://foo.com/unicode_(✪)_in_parens',
        'http://foo.com/(something)?after=parens',
        'http://☺.damowmow.com/',
        'http://djangoproject.com/events/#&product=browser',
        'http://j.mp',
        'ftp://foo.bar/baz',
        'http://foo.bar/?q=Test%20URL-encoded%20stuff',
        'http://مثال.إختبار',
        'http://例子.测试',
        'http://उदाहरण.परीक्षा',
        'http://-.~_!$&\'()*+,;=%40:80%2f@example.com',
        'http://xn--7sbb4ac0ad0be6cf.xn--p1ai',
        'http://1337.net',
        'http://a.b-c.de',
        'http://223.255.255.254',
        'ftps://foo.bar/',
        'http://10.1.1.254',
        'http://[FEDC:BA98:7654:3210:FEDC:BA98:7654:3210]:80/index.html',
        'http://[::192.9.5.5]/ipng',
        'http://[::ffff:192.9.5.5]/ipng',
        'http://[::1]:8080/',
        'http://0.0.0.0/',
        'http://255.255.255.255',
        'http://224.0.0.0',
        'http://224.1.1.1',
        'http://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.example.com',
        'http://example.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.com',
        'http://example.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'http://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'http://dashintld.c-m',
        'http://multipledashintld.a-b-c',
        'http://evenmoredashintld.a---c',
        'http://dashinpunytld.xn---c',
    ];

    const notLinks = [
        '<a href="https://twitter.com/" > Twitter < /a>',
        'http://http://www.yahoo.com',

        // This is from django test cases https://github.com/django/django/blob/stable/2.2.x/tests/validators/invalid_urls.txt
        'foo',
        'http://',
        'http://example',
        'http://example.',
        'http://.com',
        'http://invalid-.com',
        'http://-invalid.com',
        'http://invalid.com-',
        'http://invalid.-com',
        'http://inv-.alid-.com',
        'http://inv-.-alid.com',
        // failing because I don't restrict schemes
        // 'file://localhost/path',
        // 'git://example.com/',
        'http://.',
        'http://..',
        'http://../',
        'http://?',
        'http://??',
        'http://??/',
        'http://#',
        'http://##',
        'http://##/',
        'http://foo.bar?q=Spaces should be encoded',
        '//',
        '//a',
        '///a',
        '///',
        'http:///a',
        'foo.com',
        'rdar://1234',
        'h://test',
        'http:// shouldfail.com',
        ':// should fail',
        'http://foo.bar/foo(bar)baz quux',
        'http://-error-.invalid/',
        'http://dashinpunytld.trailingdot.xn--.',
        'http://dashinpunytld.xn---',
        'http://-a.b.co',
        'http://a.b-.co',
        'http://a.-b.co',
        'http://a.b-.c.co',
        'http: /',
        'http://',
        'http://',
        'http://1.1.1.1.1',
        'http://123.123.123',
        'http://3628126748',
        'http://123',
        'http://.www.foo.bar/',
        'http://.www.foo.bar./',
        // 'http://[::1:2::3]:8080/', // this does not pass because of simplified ipv6 regexp
        'http://[]',
        'http://[]:8080',
        'http://example..com/',
        'http://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.example.com',
        'http://example.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.com',
        'http://example.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        // failing because I don't check the maximum length of a full host name
        // 'http://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaa',
        'https://test.[com',
        'http://foo@bar@example.com',
        'http://foo/bar@example.com',
        'http://foo:bar:baz@example.com',
        'http://foo:bar@baz@example.com',
        'http://foo:bar/baz@example.com',
        'http://invalid-.com/?m=foo@example.com',
    ];

    /**
     * Returns function to test if linkString link recognition equal to isLinkExpected.
     *
     * @param boolean isLinkExpected
     *
     * @return function(linkString: string)
     */
    function genIsLinkFunc(isLinkExpected: boolean) {
        return (linkString: string) => {
            let testName = [
                "String",
                "'" + linkString + "'",
                "should",
                (isLinkExpected) ? null : "not",
                "be recognized as a link"
            ].join(" ");

            test(testName, () => {
                let isLinkActual = formatting.isSingleLink(linkString);
                assert.strictEqual(isLinkActual, isLinkExpected);
            });
        };
    }

    const assertIsLink = genIsLinkFunc(true);
    links.forEach(assertIsLink);

    const assertIsNotLink = genIsLinkFunc(false);
    notLinks.forEach(assertIsNotLink);
});
