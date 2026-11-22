import axios from "axios";
import { apiUrl, endpoints } from "./config";

/** Shared axios instance for every backend call. */
export const http = axios.create({
  baseURL: apiUrl,
  headers: { "Content-Type": "application/json" },
});

/** Turn axios errors into a plain Error carrying the backend's `detail` message. */
function toError(err) {
  const res = err.response;
  if (!res) return err instanceof Error ? err : new Error(String(err));
  let detail = res.statusText;
  const body = res.data;
  if (body && typeof body === "object") {
    detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
  }
  return new Error(detail || `Request failed (${res.status})`);
}

// Overrides the instance's JSON default so axios sends FormData as-is;
// the browser then fills in the multipart boundary itself.
const MULTIPART = { "Content-Type": "multipart/form-data" };

async function request(config) {
  try {
    const res = await http.request(config);
    return res.status === 204 ? undefined : res.data;
  } catch (err) {
    throw toError(err);
  }
}

export const api = {
  health: () => request({ url: endpoints.health }),
  listStrategies: () => request({ url: endpoints.strategies }),
  createStrategy: (data) => request({ url: endpoints.strategies, method: "POST", data }),
  updateStrategy: (id, data) => request({ url: endpoints.strategy(id), method: "PUT", data }),
  deleteStrategy: (id) => request({ url: endpoints.strategy(id), method: "DELETE" }),

  listTrades: (params) => request({ url: endpoints.trades, params }),
  /** `data` is a FormData with strategy_id, outcome, taken_at, symbol, notes and `images` files. */
  createTrade: (data) => request({ url: endpoints.trades, method: "POST", data, headers: MULTIPART }),
  updateTrade: (id, data) => request({ url: endpoints.trade(id), method: "PUT", data }),
  deleteTrade: (id) => request({ url: endpoints.trade(id), method: "DELETE" }),
  addTradeImages: (id, files) => {
    const data = new FormData();
    files.forEach((f) => data.append("images", f));
    return request({ url: endpoints.tradeImages(id), method: "POST", data, headers: MULTIPART });
  },
  deleteTradeImage: (id, imageId) =>
    request({ url: endpoints.tradeImage(id, imageId), method: "DELETE" }),
};
