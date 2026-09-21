import fs from "node:fs/promises";
import { getPage, stats } from "./fetcher.js";
import { parseCatalogue, parseBook } from "./parser.js";
import { normalize } from "./normalize.js";
import { BookSchema } from "./schema.js";

const START_URL = "https://books.toscrape.com/catalogue/page-1.html";
const MAX_PAGES = 3;
const BROKEN_URL =
	"https://books.toscrape.com/catalogue/this-book-does-not-exist_0/index.html";

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
	const startedAt = new Date();

	const { sourceOf, discovered, pages, failed } = await discover();
	console.log(
		`catalogue_pages=${pages} discovered=${discovered} unique_urls=${sourceOf.size}`,
	);

	if (process.argv.includes("--test-broken")) {
		sourceOf.set(BROKEN_URL, START_URL);
		console.log(`TEST: added broken URL ${BROKEN_URL}`);
	}

	const books = new Map();
	const errors = [];
	let detailPages = 0;

	for (const [url, sourcePage] of sourceOf) {
		try {
			const { html, fetchedAt } = await getPage(url);
			const raw = parseBook(html, { productUrl: url, sourcePage, fetchedAt });
			detailPages++;

			const record = normalize(raw);

			const result = BookSchema.safeParse(record);
			if (result.success) {
				books.set(url, result.data);
			} else {
				errors.push({
					product_url: url,
					reason: result.error.issues
						.map((i) => `${i.path.join(".")}: ${i.message}`)
						.join("; "),
					record,
				});
			}
		} catch (err) {
			failed.push({ url, error: err.message });
			console.warn(`FAILED ${url}: ${err.message}`);
		}
	}

	console.log(
		`detail_pages=${detailPages} valid=${books.size} invalid=${errors.length} failed=${failed.length}`,
	);

	await fs.mkdir("output", { recursive: true });
	await fs.writeFile(
		"output/books.json",
		JSON.stringify([...books.values()], null, 2),
	);
	await fs.writeFile("output/errors.json", JSON.stringify(errors, null, 2));

	const finishedAt = new Date();
	const report = {
		started_at: startedAt.toISOString(),
		finished_at: finishedAt.toISOString(),
		duration_ms: finishedAt - startedAt,
		catalogue_pages: pages,
		unique_urls: sourceOf.size,
		pages_fetched: stats.pagesFetched,
		cache_hits: stats.cacheHits,
		valid_records: books.size,
		invalid_records: errors.length,
		failed_pages: failed.length,
		failures: failed,
	};

	await fs.writeFile("output/run-report.json", JSON.stringify(report, null, 2));
	console.log(report);
}

main();
