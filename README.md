# Polite Scraper (FlyRank A9)

A small, polite scraper that turns the first three catalogue pages of Books to Scrape into 60 clean, schema-validated JSON records, and ends every run with a report.

## Target classification

- **Site:** https://books.toscrape.com
- **Why:** toscrape.com describes itself as a sandbox built for practising web scraping. That is the permission this project relies on.
- **Scope:** the first 3 catalogue pages only (60 books). Nothing else on the site is requested.
- **Data collected:** title, price, availability, star rating, description, product URL, plus source page and fetch time.
- **robots.txt:** requested on 2026-09-21 → `404 Not Found`. No robots file found. A missing file is not permission; the sandbox statement is.
- **Why this is appropriate:** the site exists for exactly this purpose, the scope is small, and the scraper identifies itself, waits between requests and caches every page so the site is hit only once.

I will not reuse this code on another site without checking its rules and terms first.

## Quick start

Requires **Node.js 20+** (tested on Node 24).

```bash
git clone https://github.com/mehocatic/scraper.git
cd scraper
npm install
npm start
```

Output appears in `output/`: `books.json`, `errors.json`, `run-report.json`.
The first run takes about 40 seconds (63 requests with a polite delay); every run after that reads from the local cache and finishes in under a second.

To test failure handling (adds one deliberately broken URL):

```bash
npm run test:broken
```

## Lane

JavaScript: Node.js built-in `fetch`, [Cheerio](https://cheerio.js.org/) for HTML parsing, [Zod](https://zod.dev/) for schema validation.

## Pipeline

| Step      | File                     | What it does                                                                       |
| --------- | ------------------------ | ---------------------------------------------------------------------------------- |
| Fetch     | `src/fetcher.js`         | Polite HTTP with cache, delay, timeout, status check, one retry                    |
| Discover  | `src/index.js`           | Follows the site's own "next" link through 3 catalogue pages, dedupes 60 book URLs |
| Extract   | `src/parser.js`          | Pulls 8 raw fields from the product area of each book page                         |
| Normalize | `src/normalize.js`       | `"£51.77"` → `51.77`, raw text kept alongside                                      |
| Validate  | `src/schema.js`          | Zod schema; failing records go to `errors.json` with a reason                      |
| Store     | `output/books.json`      | Keyed by canonical URL, file rewritten each run (idempotent)                       |
| Report    | `output/run-report.json` | Counts, cache hits, failures, duration                                             |

## Record schema

| Field               | Type           | Notes                                                   |
| ------------------- | -------------- | ------------------------------------------------------- |
| `title`             | string         | required, non-empty                                     |
| `product_url`       | URL            | required, `https://`, canonical identity of the record  |
| `price_text`        | string         | raw value from the page, e.g. `"£51.77"`                |
| `price_gbp`         | number         | normalized, ≥ 0                                         |
| `availability_text` | string         | e.g. `"In stock (22 available)"`                        |
| `rating_text`       | enum           | `One` / `Two` / `Three` / `Four` / `Five`               |
| `description`       | string \| null | `null` when the page has no description, never invented |
| `source_page`       | URL            | catalogue page where the book was found (provenance)    |
| `fetched_at`        | ISO datetime   | when the page was actually downloaded (provenance)      |

## Politeness rules

- **User-agent:** `FlyRankInternshipA9/1.0 (+https://github.com/mehocatic/scraper)`
- **Delay:** at least 600 ms between real requests (cached pages skip the delay)
- **Timeout:** 10 seconds per request
- **Status check:** only `200` is treated as a page; anything else is a failed fetch
- **Cache:** every page is saved to `cache/` and never requested again while developing
- **Retry:** one retry after 2 s, only for timeouts and `5xx`. Never for `404` or `403`

## Sample run report

First run on a fresh clone (no cache, 63 real requests):

```json
{
	"started_at": "2026-09-21T13:00:40.668Z",
	"finished_at": "2026-09-21T13:01:18.439Z",
	"duration_ms": 37771,
	"catalogue_pages": 3,
	"unique_urls": 60,
	"pages_fetched": 63,
	"cache_hits": 0,
	"valid_records": 60,
	"invalid_records": 0,
	"failed_pages": 0,
	"failures": []
}
```

Clean run (from cache):

```json
{
	"started_at": "2026-09-21T12:55:41.776Z",
	"finished_at": "2026-09-21T12:55:41.939Z",
	"duration_ms": 163,
	"catalogue_pages": 3,
	"unique_urls": 60,
	"pages_fetched": 0,
	"cache_hits": 63,
	"valid_records": 60,
	"invalid_records": 0,
	"failed_pages": 0,
	"failures": []
}
```

Failure test (`npm run test:broken`): the broken page is logged and skipped, all 60 good records survive:

```json
{
	"started_at": "2026-09-21T12:56:09.404Z",
	"finished_at": "2026-09-21T12:56:10.132Z",
	"duration_ms": 728,
	"catalogue_pages": 3,
	"unique_urls": 61,
	"pages_fetched": 0,
	"cache_hits": 63,
	"valid_records": 60,
	"invalid_records": 0,
	"failed_pages": 1,
	"failures": [
		{
			"url": "https://books.toscrape.com/catalogue/this-book-does-not-exist_0/index.html",
			"error": "HTTP 404 for https://books.toscrape.com/catalogue/this-book-does-not-exist_0/index.html"
		}
	]
}
```

## Why no browser

Everything I needed was already in the HTML the server sent back. The prices, titles and descriptions are right there in the page source, with no JavaScript filling them in later. A headless browser would have meant more startup time, more memory and more moving parts, all to get the same data a simple HTTP request already gives me. So I kept it simple.

## Ethics note

For me, scraping politely comes down to a few simple habits. If a site offers an official API, I use that instead, because it's the way the owner actually wants their data shared. I never try to get around logins, paywalls or blocks. If a server says no, I take that as the answer. I collect only what I need for the task, I say who I am in every request, and I go slowly enough that the site barely notices I was there.

## Limitations

- Selectors are tied to the current HTML structure. If the site changes its markup, extraction breaks, and schema validation will catch it, but it won't fix it.
- Descriptions are stored exactly as they appear on the page, including the site's own duplicated text and trailing `...more`. Cleaning them was out of scope.
- Retry is a single fixed-delay attempt; there is no exponential backoff or `Retry-After` handling (planned for A16).
