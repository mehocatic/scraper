function parsePrice(text) {
	const n = Number.parseFloat(String(text ?? "").replace(/[^0-9.]/g, ""));
	return Number.isFinite(n) ? n : null;
}

export function normalize(raw) {
	return { ...raw, price_gbp: parsePrice(raw.price_text) };
}
