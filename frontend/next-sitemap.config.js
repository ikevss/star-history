module.exports = {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.star-history.com',
    outDir: 'out',
    generateRobotsTxt: true,
    robotsTxtOptions: {
        policies: [
            { userAgent: '*', disallow: '/_next/' },
            { userAgent: '*', disallow: '/embed' },
        ],
    },
};
  