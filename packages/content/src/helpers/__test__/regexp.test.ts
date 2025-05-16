import { describe, it, expect } from "vitest";
import { Expressions, Tokens } from "../regexp.js";

describe("Regular Expressions", () => {
	describe("Expressions.link", () => {
		it("should match valid HTTP URLs", () => {
			const text = "Check out https://example.com";
			const matches = Array.from(text.matchAll(Expressions.link));
			expect(matches).toHaveLength(1);
			expect(matches[0][0]).toBe("https://example.com");
		});

		it("should match valid HTTPS URLs with paths and query parameters", () => {
			const text = "Visit https://example.com/path?query=value#fragment";
			const matches = Array.from(text.matchAll(Expressions.link));
			expect(matches).toHaveLength(1);
			expect(matches[0][0]).toBe(
				"https://example.com/path?query=value#fragment",
			);
		});

		it("should match URLs with ports", () => {
			const text = "Server at http://example.com:3000/api";
			const matches = Array.from(text.matchAll(Expressions.link));
			expect(matches).toHaveLength(1);
			expect(matches[0][0]).toBe("http://example.com:3000/api");
		});

		it("should match multiple URLs in text", () => {
			const text = "First https://example.com and second https://test.org/path";
			const matches = Array.from(text.matchAll(Expressions.link));
			expect(matches).toHaveLength(2);
			expect(matches[0][0]).toBe("https://example.com");
			expect(matches[1][0]).toBe("https://test.org/path");
		});
	});

	describe("Expressions.nostrLink", () => {
		it("should match npub links", () => {
			const npub =
				"npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6";
			const text = `Check out ${npub}`;
			const matches = Array.from(text.matchAll(Expressions.nostrLink));
			expect(matches).toHaveLength(1);
			expect(matches[0][1]).toBe(npub);
		});

		it("should match note links", () => {
			const note =
				"note1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqsrjtey";
			const text = `Check out ${note}`;
			const matches = Array.from(text.matchAll(Expressions.nostrLink));
			expect(matches).toHaveLength(1);
			expect(matches[0][1]).toBe(note);
		});

		it("should match nprofile links", () => {
			const nprofile =
				"nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdakp7qgzwaehxw309aex2mrp0yhxummnw3ezuamfdejsygrwv3jx2mtedfhk6tcpzamhxue69uhkummnw3ezuamfdejsygrwv3jx2mtedfhk6tcpzamhxue69uhkzemp9qy";
			const text = `Check out ${nprofile}`;
			const matches = Array.from(text.matchAll(Expressions.nostrLink));
			expect(matches).toHaveLength(1);
			expect(matches[0][1]).toBe(nprofile);
		});

		it("should match nevent links", () => {
			const nevent =
				"nevent1qvzqqqqqqypzqwlsccluhy6xxsr6l9a9uhhxf75g85g8a709tprjcn4e42h053vaqyd8wumn8ghj7urewfsk66ty9enxjct5dfskvtnrdakj7qgmwaehxw309aex2mrp0yh8wetnw3jhymnzw33jucm0d5hsqgqqqrzq4vghcurgc2p3k70xka03m0wsvhwh244gh2f8tnk6dl49vgx9mgmd";
			const text = `Check out ${nevent}`;
			const matches = Array.from(text.matchAll(Expressions.nostrLink));
			expect(matches).toHaveLength(1);
			expect(matches[0][1]).toBe(nevent);
		});

		it("should match naddr links", () => {
			const naddr =
				"naddr1qqjx2wtzx93rycmz94nrqvf3956rqep3943xgvec956xxvnxxucxze33v93rvq3qeaz6dwsnvwkha5sn5puwwyxjgy26uusundrm684lg3vw4ma5c2jsxpqqqpmxw6td7rf";
			const text = `Check out ${naddr}`;
			const matches = Array.from(text.matchAll(Expressions.nostrLink));
			expect(matches).toHaveLength(1);
			expect(matches[0][1]).toBe(naddr);
		});

		it("should match nostr: prefixed links", () => {
			const text =
				"Check out nostr:npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6";
			const matches = Array.from(text.matchAll(Expressions.nostrLink));
			expect(matches).toHaveLength(1);
			expect(matches[0][1]).toBe(
				"npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6",
			);
		});
	});

	describe("Expressions.emoji", () => {
		it("should match emoji shortcodes", () => {
			const text = "Hello :smile: world :thumbsup:";
			const matches = Array.from(text.matchAll(Expressions.emoji));
			expect(matches).toHaveLength(2);
			expect(matches[0][1]).toBe("smile");
			expect(matches[1][1]).toBe("thumbsup");
		});

		it("should match emoji shortcodes with underscores and hyphens", () => {
			const text = "Hello :smiling_face: and :thumbs-up:";
			const matches = Array.from(text.matchAll(Expressions.emoji));
			expect(matches).toHaveLength(2);
			expect(matches[0][1]).toBe("smiling_face");
			expect(matches[1][1]).toBe("thumbs-up");
		});

		it("should match emoji shortcodes with numbers", () => {
			const text = "Hello :smile123: world :thumbs2up:";
			const matches = Array.from(text.matchAll(Expressions.emoji));
			expect(matches).toHaveLength(2);
			expect(matches[0][1]).toBe("smile123");
			expect(matches[1][1]).toBe("thumbs2up");
		});
	});

	describe("Expressions.hashtag", () => {
		it("should match simple hashtags", () => {
			const text = "Hello #world and #nostr";
			const matches = Array.from(text.matchAll(Expressions.hashtag));
			expect(matches).toHaveLength(2);
			expect(matches[0][1]).toBe("world");
			expect(matches[1][1]).toBe("nostr");
		});

		it("should match hashtags with numbers", () => {
			const text = "Hello #world2023 and #nostr42";
			const matches = Array.from(text.matchAll(Expressions.hashtag));
			expect(matches).toHaveLength(2);
			expect(matches[0][1]).toBe("world2023");
			expect(matches[1][1]).toBe("nostr42");
		});

		it("should match hashtags at the beginning of text", () => {
			const text = "#hello world";
			const matches = Array.from(text.matchAll(Expressions.hashtag));
			expect(matches).toHaveLength(1);
			expect(matches[0][1]).toBe("hello");
		});

		it("should not match hashtags within words", () => {
			const text = "word#hashtag is not a hashtag";
			const matches = Array.from(text.matchAll(Expressions.hashtag));
			expect(matches).toHaveLength(0);
		});

		it("should match non-Latin hashtags", () => {
			const text = "Hello #世界 and #привет";
			const matches = Array.from(text.matchAll(Expressions.hashtag));
			expect(matches).toHaveLength(2);
			expect(matches[0][1]).toBe("世界");
			expect(matches[1][1]).toBe("привет");
		});
	});
});

describe("Token Regular Expressions", () => {
	describe("Tokens.link", () => {
		it("should match links surrounded by whitespace", () => {
			const text = "Check out https://example.com and https://test.org";
			const matches = Array.from(text.matchAll(Tokens.link));
			expect(matches).toHaveLength(2);
			expect(matches[0][0].trim()).toBe("https://example.com");
			expect(matches[1][0].trim()).toBe("https://test.org");
		});

		it("should match links at the beginning of text", () => {
			const text = "https://example.com is a website";
			const matches = Array.from(text.matchAll(Tokens.link));
			expect(matches).toHaveLength(1);
			expect(matches[0][0].trim()).toBe("https://example.com");
		});

		it("should match links at the end of text", () => {
			const text = "Visit https://example.com";
			const matches = Array.from(text.matchAll(Tokens.link));
			expect(matches).toHaveLength(1);
			expect(matches[0][0].trim()).toBe("https://example.com");
		});
	});

	describe("Tokens.nostrLink", () => {
		it("should match nostr links surrounded by whitespace", () => {
			const npub =
				"npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6";
			const text = `Check out ${npub} and more`;
			const matches = Array.from(text.matchAll(Tokens.nostrLink));
			expect(matches).toHaveLength(1);
			expect(matches[0][0].trim()).toBe(npub);
		});
	});

	describe("Tokens.emoji", () => {
		it("should match emoji shortcodes surrounded by whitespace", () => {
			const text = "Hello :smile: world :thumbsup: end";
			const matches = Array.from(text.matchAll(Tokens.emoji));
			expect(matches).toHaveLength(2);
			expect(matches[0][0].trim()).toBe(":smile:");
			expect(matches[1][0].trim()).toBe(":thumbsup:");
		});
	});

	describe("Tokens.hashtag", () => {
		it("should match hashtags surrounded by whitespace", () => {
			const text = "Hello #world and #nostr end";
			const matches = Array.from(text.matchAll(Tokens.hashtag));
			expect(matches).toHaveLength(2);
			expect(matches[0][0].trim()).toBe("#world");
			expect(matches[1][0].trim()).toBe("#nostr");
		});
	});
});
