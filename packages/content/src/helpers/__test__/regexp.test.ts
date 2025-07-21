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

    it("should match nostr: prefixed links", () => {
      const text = "Check out nostr:npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6";
      const matches = Array.from(text.matchAll(Expressions.nostrLink));
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe("npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6");
    });

    it("should match nostr links in URLs", () => {
      const text =
        "https://npub1wyuh3scfgzqmxn709a2fzuemps389rxnk7nfgege6s847zze3tuqfl87ez.nsite.lol/n/nevent1qvzqqqqqqypzp022u0n8u2vkf4y5zu3xrhz989wgna4a9em5vshrvcf8zuwlhq04qyghwumn8ghj7mn0wd68ytnhd9hx2tcppemhxue69uhkummn9ekx7mp0qqsz7ck33xzlpcf2338ufrarks2cxqzk2rp925qe38wvlevhxv9pg6syy7gc7";
      const matches = Array.from(text.matchAll(Expressions.nostrLink));
      expect(matches).toHaveLength(2);
      expect(matches).toEqual([
        expect.arrayContaining(["npub1wyuh3scfgzqmxn709a2fzuemps389rxnk7nfgege6s847zze3tuqfl87ez"]),
        expect.arrayContaining([
          "nevent1qvzqqqqqqypzp022u0n8u2vkf4y5zu3xrhz989wgna4a9em5vshrvcf8zuwlhq04qyghwumn8ghj7mn0wd68ytnhd9hx2tcppemhxue69uhkummn9ekx7mp0qqsz7ck33xzlpcf2338ufrarks2cxqzk2rp925qe38wvlevhxv9pg6syy7gc7",
        ]),
      ]);
    });
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

    it("should not match hashtags in URLs", () => {
      const text =
        "testing urls wss://relay.damus.io ircs://irc.zeronode.net:6697/#nostr https://github.com/hzrd149/applesauce?tab=readme-ov-file#running-tests";
      const matches = Array.from(text.matchAll(Expressions.hashtag));
      expect(matches).toHaveLength(0);
    });
  });

  describe("Expressions.lightning", () => {
    it("should match lightning invoices", () => {
      const invoice =
        "lnbc100n1p5pjxjk9qypqqqdqqxqrrsssp54ttukd5xxy2nmdzf864yjereuf9v3pyzl66hpqgxa0e8fvlzf6aspp5z6twjtwde82ec7wfcqw2m63v48r6fyw78753wxh7zjlvuru7tapsp6c9lq6m4d55u9jkxuqpepdknnzznfu05wl73swyn52z3pnkzyxrlkqf3t5jkw2hq7ukasuh5wgazvfwkkzrf0aqk4k0zluzu4rx8wqq8sut0l";
      const text = `Pay with ${invoice}`;
      const matches = Array.from(text.matchAll(Expressions.lightning));
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe(invoice);
    });

    it("should match lightning: prefixed invoices", () => {
      const invoice =
        "lnbc100n1p5pjxjk9qypqqqdqqxqrrsssp54ttukd5xxy2nmdzf864yjereuf9v3pyzl66hpqgxa0e8fvlzf6aspp5z6twjtwde82ec7wfcqw2m63v48r6fyw78753wxh7zjlvuru7tapsp6c9lq6m4d55u9jkxuqpepdknnzznfu05wl73swyn52z3pnkzyxrlkqf3t5jkw2hq7ukasuh5wgazvfwkkzrf0aqk4k0zluzu4rx8wqq8sut0l";
      const text = `Pay with lightning:${invoice}`;
      const matches = Array.from(text.matchAll(Expressions.lightning));
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe(invoice);
    });

    it("should be case insensitive", () => {
      const invoice =
        "lnbc100n1p5pjxjk9qypqqqdqqxqrrsssp54ttukd5xxy2nmdzf864yjereuf9v3pyzl66hpqgxa0e8fvlzf6aspp5z6twjtwde82ec7wfcqw2m63v48r6fyw78753wxh7zjlvuru7tapsp6c9lq6m4d55u9jkxuqpepdknnzznfu05wl73swyn52z3pnkzyxrlkqf3t5jkw2hq7ukasuh5wgazvfwkkzrf0aqk4k0zluzu4rx8wqq8sut0l".toUpperCase();
      const text = `Pay with ${invoice}`;
      const matches = Array.from(text.matchAll(Expressions.lightning));
      expect(matches).toHaveLength(1);
      expect(matches[0][1].toUpperCase()).toBe(invoice.toUpperCase());
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

  describe("Tokens.nostrLink", () => {
    it("should match nostr links surrounded by whitespace", () => {
      const npub = "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6";
      const text = `Check out ${npub} and more`;
      const matches = Array.from(text.matchAll(Tokens.nostrLink));
      expect(matches).toHaveLength(1);
      expect(matches[0][0].trim()).toBe(npub);
    });

    it("should not match links in URLs", async () => {
      const text =
        "Checkout my app https://zap.stream/naddr1qqjx2wtzx93rycmz94nrqvf3956rqep3943xgvec956xxvnxxucxze33v93rvq3qeaz6dwsnvwkha5sn5puwwyxjgy26uusundrm684lg3vw4ma5c2jsxpqqqpmxw6td7rf";
      const matches = Array.from(text.matchAll(Tokens.nostrLink));
      expect(matches).toHaveLength(0);
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
