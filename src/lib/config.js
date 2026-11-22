/**
 * Every backend URL the app uses is built here from env variables
 * (see .env.local / .env.example). Nothing else in the code hardcodes a URL.
 *
 * NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them.
 */
function required(name, value) {
  if (!value) {
    throw new Error(`Missing env variable ${name}. Copy .env.example to .env.local and set it.`);
  }
  return value.replace(/\/+$/, "");
}
export const apiUrl = required("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL);
const strategiesPath = process.env.NEXT_PUBLIC_API_STRATEGIES_PATH ?? "/strategies";
const tradesPath = process.env.NEXT_PUBLIC_API_TRADES_PATH ?? "/trades";
export const endpoints = {
  health: apiUrl + (process.env.NEXT_PUBLIC_API_HEALTH_PATH ?? "/health"),
  strategies: apiUrl + strategiesPath,
  strategy: (id) => `${apiUrl}${strategiesPath}/${id}`,
  trades: apiUrl + tradesPath,
  trade: (id) => `${apiUrl}${tradesPath}/${id}`,
  tradeImages: (id) => `${apiUrl}${tradesPath}/${id}/images`,
  tradeImage: (id, imageId) => `${apiUrl}${tradesPath}/${id}/images/${imageId}`,
};
/** Image URLs come back from the backend as paths (e.g. /api/uploads/...); make them absolute. */
export const assetUrl = (path) => new URL(path, apiUrl).href;
