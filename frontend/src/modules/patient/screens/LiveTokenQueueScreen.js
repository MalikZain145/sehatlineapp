// LiveTokenQueueScreen — now shows the REAL live queue.
//
// The old version generated a fake queue: 20–50 random patients with random
// names, CDA card numbers, phone numbers and wait times (Math.random), and
// stored them on the phone. Every "View Queue" button in the app still
// navigates here, so this screen now simply renders the real backend-driven
// Live Queue (tokenService.getQueuesSummary + my active token).
import LiveQueueScreen from './LiveQueueScreen';

export default LiveQueueScreen;
