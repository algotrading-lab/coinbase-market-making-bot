import WebSocket from 'ws';
import type { Logger } from '../config/logger.js';
import type { Bbo } from './types.js';

const WS_URL = 'wss://advanced-trade-ws.coinbase.com';

/** Stream L2 updates and derive best bid/offer. */
export function streamBbo(productId: string, log: Logger, onBbo: (b: Bbo) => void): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;
  let bids = new Map<string, number>();
  let asks = new Map<string, number>();

  const best = (): Bbo | null => {
    const bidEntries = [...bids.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
    const askEntries = [...asks.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
    if (!bidEntries.length || !askEntries.length) return null;
    const bid = Number(bidEntries[0][0]);
    const ask = Number(askEntries[0][0]);
    return {
      bid,
      ask,
      bidSize: bidEntries[0][1],
      askSize: askEntries[0][1],
      ts: Date.now(),
    };
  };

  const connect = () => {
    if (stopped) return;
    ws = new WebSocket(WS_URL);
    ws.on('open', () => {
      ws?.send(
        JSON.stringify({
          type: 'subscribe',
          channel: 'level2',
          product_ids: [productId],
        }),
      );
      log.info('L2 websocket connected', { productId });
    });
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.channel !== 'l2_data' || !msg.events) return;
        for (const ev of msg.events) {
          for (const u of ev.updates ?? []) {
            const price = u.price_level;
            const size = Number(u.new_quantity);
            const book = u.side === 'bid' ? bids : asks;
            if (size === 0) book.delete(price);
            else book.set(price, size);
          }
        }
        const b = best();
        if (b) onBbo(b);
      } catch (e) {
        log.error('L2 parse error', { err: String(e) });
      }
    });
    ws.on('close', () => {
      if (!stopped) setTimeout(connect, 2000);
    });
  };

  connect();
  return () => {
    stopped = true;
    ws?.close();
  };
}

/** Simulation fallback when WS unavailable. */
export function syntheticBboStream(log: Logger, onBbo: (b: Bbo) => void): () => void {
  let mid = 60_000;
  const id = setInterval(() => {
    mid += (Math.random() - 0.5) * 20;
    onBbo({ bid: mid - 5, ask: mid + 5, bidSize: 0.5, askSize: 0.5, ts: Date.now() });
  }, 1000);
  log.info('using synthetic BBO stream (simulation)');
  return () => clearInterval(id);
}
