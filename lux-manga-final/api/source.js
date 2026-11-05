import { source } from '../worker/api.js';

export function POST(request) {
  return source(request);
}
