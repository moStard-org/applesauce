import { subscribeSpyTo } from "@hirez_io/observer-spy";
import { EventStore } from "applesauce-core";
import { EventFactory } from "applesauce-factory";
import { generateSecretKey } from "nostr-tools";
import { beforeEach, describe, expect, it } from "vitest";

import { FakeUser } from "../../__tests__/fake-user.js";
import { WalletBlueprint } from "../../blueprints/wallet.js";
import { lockWallet, unlockWallet } from "../../helpers/wallet.js";
import { WalletModel } from "../wallet.js";

const user = new FakeUser();
const factory = new EventFactory({ signer: user });

let eventStore: EventStore;
beforeEach(() => {
  eventStore = new EventStore();
});

describe("WalletModel", () => {
  it("it should update when event is unlocked", async () => {
    const wallet = await user.signEvent(await factory.create(WalletBlueprint, [], generateSecretKey()));
    lockWallet(wallet);
    eventStore.add(wallet);

    const spy = subscribeSpyTo(eventStore.model(WalletModel, await user.getPublicKey()));

    await unlockWallet(wallet, user);

    expect(spy.getValues()).toEqual([
      expect.objectContaining({ locked: true }),
      expect.objectContaining({ locked: false }),
    ]);
  });
});
