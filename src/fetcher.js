import fs from "node:fs/promises";
import path from "node:path";

const USER_AGENT =
	"FlyRankInternshipA9/1.0 (+https://github.com/mehocatic/scraper)";
const TIMEOUT_MS = 10_000;
const DELAY_MS = 600;
const RETRY_WAIT_MS = 2000;
const CACHE_DIR = "cache";

export const stats = { pagesFetched: 0, cacheHits: 0 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let lastRequestAt = 0;
async function politeWait() {
	const elapsed = Date.now() - lastRequestAt;
	if (elapsed < DELAY_MS) await sleep(DELAY_MS - elapsed);
	lastRequestAt = Date.now();
}

function cacheFileFor(url) {
	const { pathname } = new URL(url);
	return path.join(CACHE_DIR, pathname.replace(/^\//, "").replaceAll("/", "-"));
}

async function fetchOnce(url) {
	await politeWait();
	const res = await fetch(url, {
		headers: { "User-Agent": USER_AGENT },
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});

	if (res.status !== 200) {
		const err = new Error(`HTTP ${res.status} for ${url}`);
		err.status = res.status;
		throw err;
	}
	return res.text();
}

function isRetryable(err) {
	return err.name === "TimeoutError" || (err.status >= 500 && err.status < 600);
}

async function fetchWithRetry(url) {
	try {
		return await fetchOnce(url);
	} catch (err) {
		if (!isRetryable(err)) throw err;
		console.warn(`RETRY ${url} (${err.message})`);
		await sleep(RETRY_WAIT_MS);
		return fetchOnce(url);
	}
}

export async function getPage(url) {
	const file = cacheFileFor(url);

	try {
		const [html, info] = await Promise.all([
			fs.readFile(file, "utf8"),
			fs.stat(file),
		]);
		stats.cacheHits++;
		console.log(`CACHE HIT ${url} (${Buffer.byteLength(html)} bytes)`);
		return { html, fetchedAt: info.mtime.toISOString() };
	} catch (err) {
		if (err.code !== "ENOENT") throw err;
	}

	const html = await fetchWithRetry(url);
	await fs.mkdir(CACHE_DIR, { recursive: true });
	await fs.writeFile(file, html, "utf8");
	stats.pagesFetched++;
	console.log(`FETCH ${url} (${Buffer.byteLength(html)} bytes)`);
	return { html, fetchedAt: new Date().toISOString() };
}
