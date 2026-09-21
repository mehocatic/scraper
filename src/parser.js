import * as cheerio from "cheerio";

export function parseCatalogue(html, pageUrl) {
	const $ = cheerio.load(html);

	const bookUrls = $("article.product_pod h3 a")
		.map((_, a) => new URL($(a).attr("href"), pageUrl).href)
		.get();

	const nextHref = $("li.next a").attr("href");
	const nextUrl = nextHref ? new URL(nextHref, pageUrl).href : null;

	return { bookUrls, nextUrl };
}
