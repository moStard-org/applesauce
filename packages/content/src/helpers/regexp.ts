export const Expressions = {
  get url() {
    return /(?:https?|wss?|ircs?|s?ftp):\/\/([a-zA-Z0-9\.\-]+\.[a-zA-Z]+(?::\d+)?)([\/\?#][\p{L}\p{N}\p{M}&\.-\/\?=#\-@%\+_,:!~*]*)?/gu;
  },
  get link() {
    return /https?:\/\/([a-zA-Z0-9\.\-]+\.[a-zA-Z]+(?::\d+)?)([\/\?#][\p{L}\p{N}\p{M}&\.-\/\?=#\-@%\+_,:!~*]*)?/gu;
  },
  get nostrLink() {
    return /(?:nostr:)?((npub|note|nprofile|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58,})/gi;
  },
  get emoji() {
    return /:([a-zA-Z0-9_-]+):/gi;
  },
  get hashtag() {
    // NOTE: cant use \b here because it uses \w which only matches latin letters
    return /(?<=^|[^\p{L}#\/])#([\p{L}\p{N}\p{M}]+)(?=\p{Z}|$|\s)/gu;
  },
};

/** A list of Regular Expressions that match tokens surrounded by whitespace to avoid matching in URLs */
export const Tokens = {
  get url() {
    return Expressions.url;
  },
  get link() {
    return Expressions.link;
  },
  get nostrLink() {
    return new RegExp(
      `(?<=\\s|^)${Expressions.nostrLink.source}(?=\\s|$)`,
      "gi",
    );
  },
  get emoji() {
    return Expressions.emoji;
  },
  get hashtag() {
    return Expressions.hashtag;
  },
};
