import { EventStore } from "applesauce-core";
import { getSeenRelays, unixNow } from "applesauce-core/helpers";
import { TimelineLoader } from "applesauce-loaders";
import { RelayPool } from "applesauce-relay";
import { useEffect, useMemo, useRef, useState } from "react";

const pool = new RelayPool();

const COLORS = ["red", "green", "blue", "orange", "purple", "darkcyan"];

export default function TimelineExample() {
  const now = useMemo(() => unixNow(), []);
  const [limit, setLimit] = useState(50);
  const [frame, setFrame] = useState(60 * 60);
  const [relays, _setRelays] = useState([
    "wss://nostrue.com/",
    "wss://nos.lol/",
    "wss://nostr.bitcoiner.social/",
    "wss://relay.damus.io/",
    "wss://nostrelites.org/",
    "wss://nostr.wine/",
  ]);
  useEffect(() => {
    if (ctx.current) ctx.current.canvas.height = relays.length * 32;
  }, [relays]);

  const [seconds, setSeconds] = useState(0);

  const loader = useMemo(() => {
    console.log(`Creating filter with`, relays, limit);

    return new TimelineLoader(
      (relays, filters) => pool.request(relays, filters),
      TimelineLoader.simpleFilterMap(relays, [{ kinds: [1] }]),
      { limit },
    );
  }, [relays, limit]);

  // clear the canvas when loader
  useEffect(() => {
    if (ctx.current) {
      ctx.current.clearRect(0, 0, ctx.current.canvas.width, ctx.current.canvas.height);
      ctx.current.canvas.width = frame;
    }
  }, [loader, frame]);

  useEffect(() => {
    loader.next(now - seconds);
  }, [seconds, loader, now]);

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    if (canvas.current) ctx.current = canvas.current.getContext("2d");
  }, []);

  const store = useMemo(() => new EventStore(), []);

  useEffect(() => {
    console.log("Subscribing to loader");
    const sub = loader.subscribe((event) => {
      const from = Array.from(getSeenRelays(event) || [])[0];
      if (!from) return;
      store.add(event);

      if (ctx.current) {
        ctx.current.fillStyle = COLORS[relays.indexOf(from)] || "black";
        ctx.current.fillRect(now - event.created_at, relays.indexOf(from) * 32, 1, 32);
      }
    });

    return () => sub.unsubscribe();
  }, [loader, now, relays]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="join">
        <button className="btn join-item" onClick={() => setFrame(60 * 60)}>
          1 Hour
        </button>
        <button className="btn join-item" onClick={() => setFrame(2 * 60 * 60)}>
          2 Hours
        </button>
        <button className="btn join-item" onClick={() => setLimit(50)}>
          50
        </button>
        <button className="btn join-item" onClick={() => setLimit(100)}>
          100
        </button>
        <button className="btn join-item" onClick={() => setLimit(200)}>
          200
        </button>
      </div>

      <div className="flex flex-row gap-2 text-sm p-1">
        {relays.map((relay, i) => (
          <code key={relay} style={{ color: COLORS[i] }}>
            {relay}
          </code>
        ))}
      </div>

      <canvas
        width={frame}
        height={relays.length * 32}
        style={{ width: "100%" }}
        ref={canvas}
        className="border border-base-300"
      />

      <input
        type="range"
        className="range w-full"
        min={0}
        max={frame}
        value={seconds}
        onInput={(e) => {
          const v = parseInt(e.currentTarget.value);
          if (Number.isFinite(v)) setSeconds(v);
        }}
      />

      <p className="text-sm">scroll: {seconds}s</p>
    </div>
  );
}
