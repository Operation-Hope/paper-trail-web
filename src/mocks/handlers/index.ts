import { passthroughHandlers } from './passthrough';
import { politicianHandlers } from './politicians'; 
// import { voteHandlers } from '../data/factories/vote'; // 👈 You can comment this out

export const handlers = [
  ...passthroughHandlers,
  ...politicianHandlers,
  // If this array is empty or commented out, MSW won't intercept the vote API
];

export default handlers;