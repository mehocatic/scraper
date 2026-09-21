import { getPage } from "./fetcher.js";
import { parseCatalogue, parseBook } from "./parser.js";

const START_URL = "https://books.toscrape.com/catalogue/page-1.html";
const MAX_PAGES = 3;

async function discover() {
	const sourceOf = new Map();
	let discovered = 0;
	let pages = 0;
	let pageUrl = START_URL;
	const failed = [];

	while (pageUrl && pages < MAX_PAGES) {
		try {
			const { html } = await getPage(pageUrl);
			const { bookUrls, nextUrl } = parseCatalogue(html, pageUrl);

			discovered += bookUrls.length;
			for (const url of bookUrls) {
				if (!sourceOf.has(url)) sourceOf.set(url, pageUrl);
			}

			pageUrl = nextUrl;
			pages++;
		} catch (err) {
			failed.push({ url: pageUrl, error: err.message });
			console.warn(`FAILED ${pageUrl}: ${err.message}`);
			break;
		}
	}

	return { sourceOf, discovered, pages, failed };
}

async function main() {
	const { sourceOf, discovered, pages } = await discover();
	console.log(
		`catalogue_pages=${pages} discovered=${discovered} unique_urls=${sourceOf.size}`,
	);

	let detailPages = 0;

	for (const [url, sourcePage] of sourceOf) {
		const { html, fetchedAt } = await getPage(url);
		const raw = parseBook(html, { productUrl: url, sourcePage, fetchedAt });
		detailPages++;

		if (detailPages === 1) console.log(raw);
	}

	console.log(`detail_pages=${detailPages}`);
}

main();
