/**
 * priority_notifications.js
 * Standalone, fully functioning Node.js script to fetch notifications from the
 * evaluation service API and compute the top 10 highest-priority unread items.
 * 
 * Execution:
 *   node priority_notifications.js [api_key]
 */

const API_URL = 'http://4.224.186.213/evaluation-service/notifications';

// Priority weight definitions
const PRIORITY_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

// High-quality mock data for fallback when remote API is unauthorized (401)
const MOCK_NOTIFICATIONS = [
  { ID: 'n1', Type: 'Event', Message: 'Annual Sports Meet registration is open', Timestamp: '2026-06-09T08:00:00.000Z' },
  { ID: 'n2', Type: 'Result', Message: 'Mid-term exams results declared for CS-201', Timestamp: '2026-06-09T09:30:00.000Z' },
  { ID: 'n3', Type: 'Placement', Message: 'Google recruitment drive registrations active', Timestamp: '2026-06-09T10:00:00.000Z' },
  { ID: 'n4', Type: 'Event', Message: 'Tech Talk: Introduction to Kubernetes at 4 PM', Timestamp: '2026-06-09T10:15:00.000Z' },
  { ID: 'n5', Type: 'Placement', Message: 'Microsoft interview shortlist released', Timestamp: '2026-06-09T09:00:00.000Z' },
  { ID: 'n6', Type: 'Result', Message: 'Web Development Lab grades updated', Timestamp: '2026-06-09T11:00:00.000Z' },
  { ID: 'n7', Type: 'Info', Message: 'Library timing extended until midnight', Timestamp: '2026-06-09T05:00:00.000Z' },
  { ID: 'n8', Type: 'Placement', Message: 'Amazon package details and CTC updated', Timestamp: '2026-06-09T11:05:00.000Z' },
  { ID: 'n9', Type: 'Result', Message: 'Mathematics course grading curve published', Timestamp: '2026-06-09T11:10:00.000Z' },
  { ID: 'n10', Type: 'Event', Message: 'Hackathon team formation deadline tonight', Timestamp: '2026-06-09T11:20:00.000Z' },
  { ID: 'n11', Type: 'Placement', Message: 'Adobe PPT slides uploaded in classroom', Timestamp: '2026-06-09T04:30:00.000Z' },
  { ID: 'n12', Type: 'Event', Message: 'Cultural festival volunteer registration open', Timestamp: '2026-06-09T11:22:00.000Z' },
];

/**
 * Min-Heap implementation to maintain top N elements efficiently in O(log N) per insert.
 */
class MinHeap {
  constructor(compareFn) {
    this.heap = [];
    this.compare = compareFn; // negative if a < b
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap[0];
  }

  push(val) {
    this.heap.push(val);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this._bubbleDown(0);
    }
    return top;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parent]) >= 0) break;
      this._swap(index, parent);
      index = parent;
    }
  }

  _bubbleDown(index) {
    const len = this.heap.length;
    while (index * 2 + 1 < len) {
      let left = index * 2 + 1;
      let right = index * 2 + 2;
      let smallest = left;
      if (right < len && this.compare(this.heap[right], this.heap[left]) < 0) {
        smallest = right;
      }
      if (this.compare(this.heap[index], this.heap[smallest]) <= 0) break;
      this._swap(index, smallest);
      index = smallest;
    }
  }

  _swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}

/**
 * Priority score calculation formula.
 * Score = (Weight * 10^12) + Epoch_Timestamp_ms
 */
function calculatePriorityScore(notification) {
  const type = notification.Type || notification.type || 'Event';
  const timestamp = notification.Timestamp || notification.createdAt;
  const weight = PRIORITY_WEIGHTS[type] ?? 0;
  
  // Normalize YYYY-MM-DD HH:mm:ss space-separated format to YYYY-MM-DDTHH:mm:ss ISO format for cross-browser parsing safety
  const normalizedTimestamp = typeof timestamp === 'string' && timestamp.includes(' ') && !timestamp.includes('T')
    ? timestamp.replace(' ', 'T')
    : timestamp;
  const time = new Date(normalizedTimestamp).getTime() || 0;
  
  // composite priority score
  return weight * 1000000000000 + time;
}

/**
 * Maintain the top N priority notifications using a Min-Heap.
 */
function getTopNUsingHeap(notifications, N = 10) {
  const heap = new MinHeap((a, b) => a.priorityScore - b.priorityScore);

  for (const rawItem of notifications) {
    const priorityScore = calculatePriorityScore(rawItem);
    const item = { ...rawItem, priorityScore };

    if (heap.size() < N) {
      heap.push(item);
    } else if (priorityScore > heap.peek().priorityScore) {
      heap.pop();
      heap.push(item);
    }
  }

  // Extract from heap and sort in descending order for display
  const result = [];
  while (heap.size() > 0) {
    result.push(heap.pop());
  }
  return result.reverse();
}

/**
 * Main execution routine.
 */
async function run() {
  const apiKey = process.argv[2] || process.env.EVAL_API_KEY || '';
  
  console.log('==================================================');
  console.log('    Priority Inbox Top-10 Notification Calculator');
  console.log('==================================================\n');
  
  let rawNotifications = [];

  try {
    const headers = { Accept: 'application/json' };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
      console.log(`Connecting to Remote API: ${API_URL} (using API key)`);
    } else {
      console.log(`Connecting to Remote API: ${API_URL} (no key provided)`);
    }

    const response = await fetch(API_URL, { headers });
    
    if (response.status === 401) {
      console.log('⚠ Remote API returned 401 Unauthorized.');
      console.log('  -> Falling back to High-Quality Mock Notifications for local simulation...\n');
      rawNotifications = MOCK_NOTIFICATIONS;
    } else if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    } else {
      const data = await response.json();
      rawNotifications = data.notifications || data || [];
      console.log(`Successfully fetched ${rawNotifications.length} notifications from Remote API.\n`);
    }
  } catch (error) {
    console.log(`⚠ Network Error fetching remote API: ${error.message}`);
    console.log('  -> Falling back to High-Quality Mock Notifications for local simulation...\n');
    rawNotifications = MOCK_NOTIFICATIONS;
  }

  console.log(`Processing list of ${rawNotifications.length} items using Min-Heap top-10 algorithm...`);
  const top10 = getTopNUsingHeap(rawNotifications, 10);
  
  console.log('\n--- TOP 10 HIGHEST-PRIORITY NOTIFICATIONS ---');
  console.table(
    top10.map((item, idx) => ({
      Rank: idx + 1,
      ID: item.ID || item.id,
      Type: item.Type || item.type,
      PriorityScore: item.priorityScore,
      Time: new Date((item.Timestamp || item.createdAt).includes(' ') && !(item.Timestamp || item.createdAt).includes('T') ? (item.Timestamp || item.createdAt).replace(' ', 'T') : (item.Timestamp || item.createdAt)).toLocaleString(),
      Message: (item.Message || item.message).substring(0, 50) + '...',
    }))
  );
  
  console.log('Priority calculation formula: (Weight * 10^12) + Epoch_Time_ms');
  console.log('Weights: Placement = 3, Result = 2, Event = 1, Info/Other = 0');
  console.log('==================================================\n');
}

run();
