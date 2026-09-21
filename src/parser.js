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

export function parseBook(html, { productUrl, sourcePage, fetchedAt }) {
	const $ = cheerio.load(html);
	const main = $(".product_main");

	const ratingClass = main.find("p.star-rating").attr("class") ?? "";
	const rating =
		ratingClass.split(/\s+/).find((c) => c && c !== "star-rating") ?? null;

	const description = $("#product_description").next("p").text().trim();

	return {
		title: main.find("h1").text().trim(),
		product_url: productUrl,
		price_text: main.find("p.price_color").first().text().trim(),
		availability_text: main
			.find("p.availability")
			.text()
			.replace(/\s+/g, " ")
			.trim(),
		rating_text: rating,
		description: description || null,
		source_page: sourcePage,
		fetched_at: fetchedAt,
	};
}
