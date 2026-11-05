import { image } from '../worker/api.js';

export function GET(request) {
  return image(request);
}
