# Polite Scraper (FlyRank A9)

A small, polite scraper that turns the first three catalogue pages of Books to Scrape into clean, validated JSON.

## Target classification

- **Site:** https://books.toscrape.com
- **Why:** toscrape.com describes itself as a sandbox built for practising web scraping. That is the permission this project relies on.
- **Scope:** the first 3 catalogue pages only (60 books). Nothing else on the site is requested.
- **Data collected:** title, price, availability, star rating, description, product URL, plus source page and fetch time.
- **robots.txt:** requested on 2026-09-21 → `404 Not Found`. No robots file found. A missing file is not permission; the sandbox statement is.
- **Why this is appropriate:** the site exists for exactly this purpose, the scope is small, and the scraper identifies itself, waits between requests and caches every page so the site is hit only once.

I will not reuse this code on another site without checking its rules and terms first.
