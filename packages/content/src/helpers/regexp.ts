export const Expressions = {
  get link() {
    return /https?:\/\/([a-zA-Z0-9\.\-]+\.[a-zA-Z]+(?::\d+)?)([\/\?#][\p{L}\p{N}\p{M}&\.-\/\?=#\-@%\+_,:!~*]*)?/gu;
  },
  get cashu() {
    return /(?:cashu:\/{0,2})?(cashu(?:A|B)[A-Za-z0-9_-]{100,10000}={0,3})/gi;
  },
  get nostrLink() {
    return /(?:nostr:)?((npub|note|nprofile|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58,})/gi;
  },
  get emoji() {
    return /:([a-zA-Z0-9_-]+):/gi;
  },
  get hashtag() {
    return /(?<=^|[^\p{L}#])#([\p{L}\p{N}\p{M}]+)/gu;
  },
  get lightning() {
    return /(?:lightning:)?(LNBC[A-Za-z0-9]+)/gim;
  },
};

/** A list of Regular Expressions that match tokens surrounded by whitespace to avoid matching in URLs */
export const Tokens = {
  get link() {
    return new RegExp(`\\b${Expressions.link.source}\\b`, "gu");
  },
  get cashu() {
    return new RegExp(`\\b${Expressions.cashu.source}\\b`, "gi");
  },
  get nostrLink() {
    return new RegExp(`\\b${Expressions.nostrLink.source}\\b`, "gi");
  },
  get emoji() {
    return Expressions.emoji;
  },
  get hashtag() {
    return Expressions.hashtag;
  },
  get lightning() {
    return new RegExp(`\\b${Expressions.lightning.source}\\b`, "gim");
  },
};
