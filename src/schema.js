import { z } from "zod";
export const BookSchema = z.object({
	title: z.string().min(1),
	product_url: z.url().startsWith("https://"),
	price_text: z.string().min(1),
	price_gbp: z.number().nonnegative(),
	availability_text: z.string().min(1),
	rating_text: z.enum(["One", "Two", "Three", "Four", "Five"]),
	description: z.string().nullable(),
	source_page: z.url(),
	fetched_at: z.iso.datetime(),
});
