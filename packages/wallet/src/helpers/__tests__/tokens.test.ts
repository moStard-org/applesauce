import { describe, expect, it } from "vitest";
import { EventFactory } from "applesauce-factory";

import { FakeUser } from "../../__tests__/fake-user.js";
import { WalletTokenBlueprint } from "../../blueprints/tokens.js";
import { decodeTokenFromEmojiString, dumbTokenSelection, encodeTokenToEmoji, unlockTokenContent } from "../tokens.js";
import { HiddenContentSymbol, unixNow } from "applesauce-core/helpers";

const user = new FakeUser();
const factory = new EventFactory({ signer: user });

describe("dumbTokenSelection", () => {
  it("should select old tokens first", async () => {
    const a = await user.signEvent(
      await factory.create(WalletTokenBlueprint, {
        mint: "https://money.com",
        proofs: [{ secret: "A", C: "A", id: "A", amount: 100 }],
      }),
    );
    await unlockTokenContent(a, user);

    const bDraft = await factory.create(WalletTokenBlueprint, {
      mint: "https://money.com",
      proofs: [{ secret: "B", C: "B", id: "B", amount: 50 }],
    });
    bDraft.created_at -= 60 * 60 * 7;
    const b = await user.signEvent(bDraft);
    await unlockTokenContent(b, user);

    expect(dumbTokenSelection([a, b], 40).events).toEqual([b]);
  });

  it("should select enough tokens to total min amount", async () => {
    const a = await user.signEvent(
      await factory.create(WalletTokenBlueprint, {
        mint: "https://money.com",
        proofs: [{ secret: "A", C: "A", id: "A", amount: 100 }],
      }),
    );
    await unlockTokenContent(a, user);

    const bDraft = await factory.create(WalletTokenBlueprint, {
      mint: "https://money.com",
      proofs: [{ secret: "B", C: "B", id: "B", amount: 50 }],
    });
    bDraft.created_at -= 60 * 60 * 7;
    const b = await user.signEvent(bDraft);
    await unlockTokenContent(b, user);

    expect(dumbTokenSelection([a, b], 120).events).toEqual(expect.arrayContaining([a, b]));
  });

  it("should throw if not enough funds", async () => {
    const a = await user.signEvent(
      await factory.create(WalletTokenBlueprint, {
        mint: "https://money.com",
        proofs: [{ secret: "A", C: "A", id: "A", amount: 100 }],
      }),
    );
    await unlockTokenContent(a, user);

    expect(() => dumbTokenSelection([a], 120)).toThrow();
  });

  it("should ignore locked tokens", async () => {
    const a = await user.signEvent(
      await factory.create(WalletTokenBlueprint, {
        mint: "https://money.com",
        proofs: [{ secret: "A", C: "A", id: "A", amount: 100 }],
      }),
    );
    await unlockTokenContent(a, user);

    const bDraft = await factory.create(WalletTokenBlueprint, {
      mint: "https://money.com",
      proofs: [{ secret: "B", C: "B", id: "B", amount: 50 }],
    });
    bDraft.created_at -= 60 * 60 * 7;
    const b = await user.signEvent(bDraft);

    // manually remove the hidden content to lock it again
    Reflect.deleteProperty(b, HiddenContentSymbol);

    expect(dumbTokenSelection([a, b], 20).events).toEqual([a]);
  });

  it("should ignore duplicate proofs", async () => {
    const a = await user.signEvent(
      await factory.create(WalletTokenBlueprint, {
        mint: "https://money.com",
        proofs: [{ secret: "A", C: "A", id: "A", amount: 100 }],
      }),
    );

    // create a second event with the same proofs
    const b = await user.signEvent(
      await factory.create(WalletTokenBlueprint, {
        mint: "https://money.com",
        proofs: [{ secret: "A", C: "A", id: "A", amount: 100 }],
      }),
    );

    expect(() => dumbTokenSelection([a, b], 150)).toThrow();
  });

  it("should include duplicate token events and ignore duplicate proofs", async () => {
    const A = { secret: "A", C: "A", id: "A", amount: 100 };
    const a = await user.signEvent({
      ...(await factory.create(WalletTokenBlueprint, {
        mint: "https://money.com",
        proofs: [A],
      })),
      // make event older
      created_at: unixNow() - 100,
    });

    // create a second event with the same proofs
    const a2 = await user.signEvent({
      ...(await factory.create(WalletTokenBlueprint, {
        mint: "https://money.com",
        proofs: [A],
      })),
      // make event older
      created_at: a.created_at - 200,
    });

    const B = { secret: "B", C: "B", id: "B", amount: 50 };
    const b = await user.signEvent(
      await factory.create(WalletTokenBlueprint, {
        mint: "https://money.com",
        proofs: [B],
      }),
    );

    const result = dumbTokenSelection([a, a2, b], 150);

    expect(result.events.map((e) => e.id)).toEqual(expect.arrayContaining([a.id, a2.id, b.id]));
    expect(result.proofs).toEqual([A, B]);
  });
});

describe("encodeTokenToEmoji", () => {
  it("should encode token into emoji string", () => {
    const token =
      "cashuBo2FteBtodHRwczovL3Rlc3RudXQuY2FzaHUuc3BhY2VhdWNzYXRhdIGiYWlIAJofKTJT5B5hcIGkYWEBYXN4QDdlZDBkMzk3NGQ5ZWM2OTc2YTAzYmZmYjdkMTA4NzIzZTBiMDRjMzRhNDc3MjlmNjMwOGJlODc3OTA2NTY0NDVhY1ghA36iYyOHCe4CnTxzORbcXFVeAbkMUFE6FqPWInujnAOcYWSjYWVYIJmHRwCQ0Uopkd3P5xb0MdcWQEaZz9hXWtcn-FMhZj8LYXNYIF4X9ybXxg5Pp0KSowfu4y_Aovo9iy3TXlLSaKyVJzz2YXJYIC_UFkoC5U9BpSgBTGUQgsjfz_emv5xykDiavZUfRN8E";
    expect(encodeTokenToEmoji(token).length).toBeGreaterThan(token.length);
  });
});

const emoji =
  "🥜󠅓󠅑󠅣󠅘󠅥󠄲󠅟󠄢󠄶󠅤󠅕󠄲󠅤󠅟󠅔󠄸󠅂󠅧󠅓󠅪󠅟󠅦󠄼󠄣󠅂󠅜󠅓󠄣󠅂󠅥󠅔󠅈󠅁󠅥󠅉󠄢󠄶󠅪󠅑󠄸󠅅󠅥󠅓󠄣󠄲󠅘󠅉󠄢󠅆󠅘󠅔󠅇󠄾󠅪󠅉󠅈󠅂󠅘󠅔󠄹󠄷󠅙󠅉󠅇󠅜󠄹󠄱󠄺󠅟󠅖󠄻󠅄󠄺󠅄󠄥󠄲󠄥󠅘󠅓󠄹󠄷󠅛󠅉󠅇󠄵󠄲󠅉󠅈󠄾󠄤󠅁󠄴󠅔󠅜󠅊󠄴󠄲󠅛󠄽󠅪󠅛󠄣󠄾󠄷󠅁󠄥󠅊󠅇󠄽󠄢󠄿󠅄󠅓󠄢󠅉󠅄󠄱󠅪󠅉󠅝󠅊󠅝󠅉󠅚󠅔󠅛󠄽󠅄󠄱󠄤󠄾󠅪󠄹󠅪󠅊󠅄󠄲󠅙󠄽󠄴󠅂󠅚󠄽󠅪󠅂󠅘󠄾󠄴󠅓󠄣󠄽󠅚󠅜󠅝󠄾󠅚󠄽󠅧󠄿󠄷󠄺󠅜󠄿󠄴󠅓󠄣󠄿󠅄󠄱󠄢󠄾󠅄󠅉󠄠󠄾󠄴󠅆󠅘󠅉󠄡󠅗󠅘󠄱󠄣󠄦󠅙󠅉󠅩󠄿󠄸󠄳󠅕󠄤󠄳󠅞󠅄󠅨󠅪󠄿󠅂󠅒󠅓󠅈󠄶󠅆󠅕󠄱󠅒󠅛󠄽󠅅󠄶󠄵󠄦󠄶󠅡󠅀󠅇󠄹󠅞󠅥󠅚󠅞󠄱󠄿󠅓󠅉󠅇󠅃󠅚󠅉󠅇󠅆󠅉󠄹󠄺󠅝󠄸󠅂󠅧󠄳󠅁󠄠󠅅󠅟󠅠󠅛󠅔󠄣󠅀󠄥󠅨󠅒󠄠󠄽󠅔󠅓󠅇󠅁󠄵󠅑󠅊󠅪󠄩󠅘󠅈󠅇󠅤󠅓󠅞󠄝󠄶󠄽󠅘󠅊󠅚󠄨󠄼󠅉󠅈󠄾󠅉󠄹󠄶󠄤󠅈󠄩󠅩󠅒󠅈󠅨󠅗󠄥󠅀󠅠󠄠󠄻󠅃󠅟󠅧󠅖󠅥󠄤󠅩󠅏󠄱󠅟󠅦󠅟󠄩󠅙󠅩󠄣󠅄󠅈󠅜󠄼󠅃󠅑󠄻󠅩󠅆󠄺󠅪󠅪󠄢󠅉󠅈󠄺󠅉󠄹󠄳󠅏󠅅󠄶󠅛󠅟󠄳󠄥󠅅󠄩󠄲󠅠󠅃󠅗󠄲󠅄󠄷󠅅󠅁󠅗󠅣󠅚󠅖󠅪󠅏󠅕󠅝󠅦󠄥󠅨󠅩󠅛󠄴󠅙󠅑󠅦󠅊󠅅󠅖󠅂󠄾󠄨󠄵";
describe("decodeTokenFromEmojiString", () => {
  it("should decode single emoji", () => {
    expect(decodeTokenFromEmojiString(emoji)).toEqual(
      expect.objectContaining({
        mint: "https://testnut.cashu.space",
        proofs: [expect.any(Object)],
        unit: "sat",
      }),
    );
  });

  it("should decode an emoji in text", () => {
    expect(
      decodeTokenFromEmojiString("the money is in the emoji, " + emoji + " you can redeem it using cashu.me"),
    ).toEqual(
      expect.objectContaining({
        mint: "https://testnut.cashu.space",
        proofs: [expect.any(Object)],
        unit: "sat",
      }),
    );
  });
});
