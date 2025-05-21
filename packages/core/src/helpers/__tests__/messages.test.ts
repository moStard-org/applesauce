import { describe, it, expect } from "vitest";
import { groupMessageEvents } from "../messages.js";
import { FakeUser } from "../../__tests__/fixtures.js";

describe("groupMessageEvents", () => {
  // Create fake users for testing
  const alice = new FakeUser();
  const bob = new FakeUser();

  it("should group messages from the same pubkey within buffer time", () => {
    const messages = [
      alice.event({ created_at: 1000, content: "Message 1" }),
      alice.event({ created_at: 1100, content: "Message 2" }),
      bob.event({ created_at: 1200, content: "Message from Bob" }),
      alice.event({ created_at: 1300, content: "Message 3" }),
    ];

    const groups = groupMessageEvents(messages, 120);

    expect(groups.length).toBe(3);
    expect(groups[0].length).toBe(2); // alice's first two messages
    expect(groups[0][0].pubkey).toBe(alice.pubkey);
    expect(groups[1].length).toBe(1); // bob's message
    expect(groups[1][0].pubkey).toBe(bob.pubkey);
    expect(groups[2].length).toBe(1); // alice's last message
    expect(groups[2][0].pubkey).toBe(alice.pubkey);
  });

  it("should maintain ascending order within groups when messages are in ascending order", () => {
    const messages = [
      alice.event({ created_at: 1000, content: "First" }),
      alice.event({ created_at: 1100, content: "Second" }),
      alice.event({ created_at: 1200, content: "Third" }),
    ];

    const groups = groupMessageEvents(messages, 300);

    expect(groups.length).toBe(1);
    expect(groups[0].length).toBe(3);
    expect(groups[0][0].created_at).toBe(1000);
    expect(groups[0][1].created_at).toBe(1100);
    expect(groups[0][2].created_at).toBe(1200);
  });

  it("should maintain descending order within groups when messages are in descending order", () => {
    const messages = [
      alice.event({ created_at: 1200, content: "Third" }),
      alice.event({ created_at: 1100, content: "Second" }),
      alice.event({ created_at: 1000, content: "First" }),
    ];

    const groups = groupMessageEvents(messages, 300);

    expect(groups.length).toBe(1);
    expect(groups[0].length).toBe(3);
    expect(groups[0][0].created_at).toBe(1200);
    expect(groups[0][1].created_at).toBe(1100);
    expect(groups[0][2].created_at).toBe(1000);
  });

  it("should create new groups when buffer time is exceeded", () => {
    const messages = [
      alice.event({ created_at: 1000, content: "First group" }),
      alice.event({ created_at: 1400, content: "Second group - 1" }), // > 300 seconds from first
      alice.event({ created_at: 1450, content: "Second group - 2" }),
    ];

    const groups = groupMessageEvents(messages, 300);

    expect(groups.length).toBe(2);
    expect(groups[0].length).toBe(1);
    expect(groups[1].length).toBe(2);
  });

  it("should handle empty messages array", () => {
    const groups = groupMessageEvents([], 300);
    expect(groups.length).toBe(0);
  });

  it("should use default buffer time of 5 minutes when not specified", () => {
    const fiveMinutes = 5 * 60;
    const messages = [
      alice.event({ created_at: 1000, content: "First group - 1" }),
      alice.event({ created_at: 1000 + fiveMinutes - 1, content: "First group - 2" }), // Just under 5 minutes
      alice.event({ created_at: 1000 + fiveMinutes + 1, content: "Second group" }), // Just over 5 minutes
    ];

    const groups = groupMessageEvents(messages);

    expect(groups.length).toBe(2);
    expect(groups[0].length).toBe(2);
    expect(groups[1].length).toBe(1);
  });

  it("should separate messages from different users even if within buffer time", () => {
    const messages = [
      alice.event({ created_at: 1000, content: "Alice 1" }),
      bob.event({ created_at: 1030, content: "Bob 1" }),
      alice.event({ created_at: 1060, content: "Alice 2" }),
      bob.event({ created_at: 1090, content: "Bob 2" }),
    ];

    const groups = groupMessageEvents(messages, 300);

    expect(groups.length).toBe(4);
    expect(groups[0][0].pubkey).toBe(alice.pubkey);
    expect(groups[1][0].pubkey).toBe(bob.pubkey);
    expect(groups[2][0].pubkey).toBe(alice.pubkey);
    expect(groups[3][0].pubkey).toBe(bob.pubkey);
  });
});
