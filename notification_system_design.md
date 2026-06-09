# Notification System Design & Contract

---

## Stage 1: REST API Design and Contract

### Core Actions
The notification platform supports the following primary actions to manage and deliver notifications:
- **Create notification**: Publish a new notification for a targeted logged-in user.
- **Fetch notifications**: Retrieve all notifications for a specific user.
- **Fetch unread count**: Get the count of unread notifications for a user.
- **Mark a notification as read**: Update the read status of a specific notification to true.
- **Subscribe to real-time notifications**: Open a persistent connection to receive live updates.

### REST API Endpoints

#### `POST /api/notifications`
- **Purpose**: Creates a new notification for a specific user and pushes it to active real-time subscribers.
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
  ```json
  {
    "userId": "student-1024",
    "title": "Placement Update",
    "message": "A new placement has been posted.",
    "type": "Placement"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": "k4x1q1ema-7f3b2",
    "userId": "student-1024",
    "title": "Placement Update",
    "message": "A new placement has been posted.",
    "type": "Placement",
    "read": false,
    "status": "pending",
    "createdAt": "2026-06-09T10:00:00.000Z",
    "updatedAt": "2026-06-09T10:00:00.000Z"
  }
  ```

#### `GET /api/users/:userId/notifications`
- **Purpose**: Retrieves the list of all notifications for a user, sorted by recency.
- **Headers**:
  - `Accept: application/json`
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "k4x1q1ema-7f3b2",
      "userId": "student-1024",
      "title": "Placement Update",
      "message": "A new placement has been posted.",
      "type": "Placement",
      "read": false,
      "status": "pending",
      "createdAt": "2026-06-09T10:00:00.000Z",
      "updatedAt": "2026-06-09T10:00:00.000Z"
    }
  ]
  ```

#### `GET /api/users/:userId/notifications/unread-count`
- **Purpose**: Retrieves the current count of unread notifications for a user. Used to update badges in the UI.
- **Headers**:
  - `Accept: application/json`
- **Response `200 OK`**:
  ```json
  {
    "userId": "student-1024",
    "unreadCount": 5
  }
  ```

#### `PATCH /api/notifications/:notificationId/read`
- **Purpose**: Marks a specific notification as read.
- **Headers**:
  - `Accept: application/json`
- **Response `200 OK`**:
  ```json
  {
    "id": "k4x1q1ema-7f3b2",
    "userId": "student-1024",
    "read": true,
    "updatedAt": "2026-06-09T10:02:00.000Z"
  }
  ```

### Real-Time Notification Mechanism
To deliver notifications instantly to active users, the platform utilizes **Server-Sent Events (SSE)**.
- **Endpoint**: `GET /api/notifications/stream?userId=student-1024`
- **Response Headers**:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- **SSE Events Published**:
  - `notification.created`: Fired when a new notification is generated.
  - `notification.update`: Fired when an existing notification is modified (e.g., marked as read).

---

## Stage 2: Persistent Storage Choice and Schema

### Recommended Database: PostgreSQL (Relational)
A relational database (specifically **PostgreSQL**) is chosen for the persistent storage of notifications for the following reasons:
1. **ACID Compliance**: Ensuring consistent states for the `read` flag (true/false) is critical to prevent unread counts from drifting.
2. **Structured Query Patterns**: Notifications are relational by nature and tied to a unique user (`user_id`). Relational indexes allow fast filtering and sorting.
3. **Compound Index Support**: Efficient sorting by timestamps (`created_at`) combined with status filtering is best optimized using B-Tree compound indexes.

### Database Schema (SQL)
```sql
CREATE TABLE notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'Info',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for user dashboard query (filter by user_id and sort by created_at desc)
CREATE INDEX idx_notifications_userid_createdat 
  ON notifications (user_id, created_at DESC);

-- Indexing for unread badge counts (filter by user_id and unread status)
CREATE INDEX idx_notifications_userid_read 
  ON notifications (user_id, read) 
  WHERE read = FALSE;

-- Indexing for type filtering and analytics
CREATE INDEX idx_notifications_type_createdat 
  ON notifications (type, created_at DESC);
```

### Potential Data Volume Concerns
As notification volume grows into millions of rows:
1. **Slow Scans**: Querying older notifications requires scanning deep into indices.
2. **Write Amplification**: Every insert requires updating three separate indexes, reducing write throughput.
3. **Large Payloads**: Returning thousands of notifications in a single request crashes the network.

### Proposed Scalability Solutions
- **Keyset Pagination**: Avoid `OFFSET` queries; use cursor-based pagination using the last seen ID and timestamp.
- **Caching**: Store unread counts in Redis and decrement/increment them atomically instead of hitting PostgreSQL on every request.
- **Partitioning**: Partition the `notifications` table by range of `created_at` (e.g., monthly partitions) or list partition by `user_id` hash.
- **Data Archiving/Pruning**: Keep only the last 30 days of notifications in the active table. Move older entries to a cold data store or delete them.

### SQL Queries Corresponding to Stage 1 APIs

#### 1. Create Notification (`POST /api/notifications`)
```sql
INSERT INTO notifications (id, user_id, title, message, type, read, status, created_at, updated_at)
VALUES ('k4x1q1ema-7f3b2', 'student-1024', 'Placement Update', 'A new placement has been posted.', 'Placement', FALSE, 'pending', NOW(), NOW());
```

#### 2. Fetch User Notifications (`GET /api/users/:userId/notifications`)
```sql
SELECT id, title, message, type, read, status, created_at
FROM notifications
WHERE user_id = 'student-1024'
ORDER BY created_at DESC
LIMIT 50;
```

#### 3. Fetch Unread Count (`GET /api/users/:userId/notifications/unread-count`)
```sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = 'student-1024'
  AND read = FALSE;
```

#### 4. Mark Notification as Read (`PATCH /api/notifications/:notificationId/read`)
```sql
UPDATE notifications
SET read = TRUE, updated_at = NOW()
WHERE id = 'k4x1q1ema-7f3b2'
RETURNING id, user_id, read, updated_at;
```

---

## Stage 3: Query Accuracy and Performance

### Analysis of the Slow Query
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

#### 1. Is the Query Accurate?
- **No, syntactically and structurally inaccurate**:
  - The query uses column names `studentID`, `isRead`, and `createdAt`. If mapping to the Stage 2 database schema, the columns should be `user_id`, `read`, and `created_at` respectively.
  - Using `SELECT *` is an anti-pattern because it fetches unnecessary column data (like the text message payload) which increases CPU, memory, and network utilization.

#### 2. Why is the Query Slow?
- **Table Scan**: There is no index covering the combination of `(studentID, isRead, createdAt)`. The database engine performs a Sequential Scan (reads all 5,000,000 notifications in the table to filter).
- **Sort Overhead (Filesort)**: The database is forced to load matches into memory or write temporary files to sort them by `createdAt ASC` because there is no pre-sorted index structure.

#### 3. Recommended Optimization
Create a composite B-Tree index covering the filter and sort columns:
```sql
CREATE INDEX idx_notifications_student_unread_createdat
  ON notifications (studentID, isRead, createdAt ASC);
```
Rewrite the query to fetch only the required columns:
```sql
SELECT id, title, type, createdAt
FROM notifications
WHERE studentID = 1042
  AND isRead = false
ORDER BY createdAt ASC;
```

#### 4. Computation Cost Comparison
- **Without Index**: $O(N)$ where $N$ is the total number of records in the table (5,000,000). The engine must read every row.
- **With Index**: $O(\log N + R)$ where $N$ is the number of rows in the index, and $R$ is the matching row count (usually very small, e.g., <50). It performs a highly efficient index seek.

#### 5. Is "Indexing Every Column" Effective?
- **No, this is highly counterproductive advice**:
  - **Write Penalty**: Every single insert/update operation will require updates to every index. This severely degrades write throughput.
  - **Storage Overhead**: Index files will exceed the size of the data table itself, filling up disk space and pushing hot data out of RAM cache.
  - **Suboptimal Execution**: The optimizer will only choose one index per table scan for this query. The rest of the indexes remain unused and waste system resources.

### Find Placement Recipients Query (Last 7 Days)

Using the Stage 2 schema:
```sql
SELECT DISTINCT user_id
FROM notifications
WHERE type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

Using the column names specified in the Stage 3 prompt:
```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL '7 days';
```

---

## Stage 4: Reducing Database Load on Page Load

### Bottleneck Analysis
Fetching notifications on every single page load generates hundreds of query executions per second under high traffic. 

### Suggested Performance Strategies

| Strategy | Implementation | Tradeoffs & Challenges |
| :--- | :--- | :--- |
| **Cursor-based Keyset Pagination** | Client queries notifications older than the last seen item (`createdAt < last_timestamp`). Limit results to 10 or 20. | **Pro**: Low DB memory overhead, works instantly.<br>**Con**: Disallows jumping to arbitrary pages in history. |
| **Caching Layer (Redis)** | Cache the unread count and the first page of notifications for each user. | **Pro**: DB queries are bypassed, sub-millisecond loads.<br>**Con**: Requires cache invalidation triggers on status changes. |
| **Real-Time Push (SSE / WebSocket)** | Client opens a persistent channel once. When a notification is created, the server pushes it. | **Pro**: Eliminates repeated polling requests entirely.<br>**Con**: High server connection state memory. |
| **Active/Archived Partitioning** | Separate the active notifications (last 30 days) from archived tables. | **Pro**: Keeps active indices tiny, keeping queries fast.<br>**Con**: Increases DB admin and query routing complexity. |

---

## Stage 5: Reliable Bulk Notification Design

### Shortcomings of the Naive Implementation
```python
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    send_email(student_id, message)  # calls Email API
    save_to_db(student_id, message)  # DB insert
    push_to_app(student_id, message) # SSE push
```
1. **Blocking & Slow**: Sequential calls for 50,000 students will block execution. If each iteration takes 100ms, the process takes **83 minutes**!
2. **Tight Coupling**: External network calls (Email API) are grouped with fast local operations (DB saves).
3. **No Error Isolation**: If student #10,000 fails, the loop crashes, leaving the remaining 40,000 notifications unsent.
4. **Idempotency Issues**: There is no way to know who already received notifications, leading to duplicate sends.

### The Case of the 200 Failed Emails: What Now?
- The execution halts midway, leaving a partially processed system.
- Some students have received both notifications, some only the in-app push, and 200 have a DB record but no email.
- **Resolution**:
  - We must query the logs to find the exact list of students who failed.
  - We run a recovery script *specifically* targeting the failures.
  - In a queue-based system, these failed messages are automatically placed in a **Dead-Letter Queue (DLQ)** for safe retry.

### Should DB Saves and Email Sends Happen Together?
- **Absolutely not**.
- **Why**: DB persistence is fast and transactional, while sending email relies on external web APIs that are slow, rate-limited, and prone to temporary outages. Doing both synchronously creates an unreliable bottleneck. The database should record the "intent" of the notification immediately, and a queue worker should execute the external API calls asynchronously.

### Redesigned Queue-Based Architecture (Pseudocode)

```python
# Producer API
function notify_all(student_ids: array, message: string):
  # 1. Create a single batch tracker record in DB
  batch_id = db.create_batch_job(message, total_recipients = student_ids.length)
  
  # 2. Chunk student IDs to publish batch items quickly
  for student_id in student_ids:
    queue.publish("notification_jobs", {
      "batch_id": batch_id,
      "student_id": student_id,
      "message": message,
      "channels": ["email", "app"],
      "retry_count": 0
    })

# Asynchronous Consumer (Running on Worker Node)
function process_notification_job(job):
  try:
    # 1. Record notification in DB (if not already recorded)
    notification_id = db.save_notification_idempotent(
      user_id = job.student_id, 
      message = job.message, 
      batch_id = job.batch_id
    )
    
    # 2. Send real-time in-app notification
    if "app" in job.channels:
      sse_push_service.send(job.student_id, {
        "id": notification_id,
        "message": job.message
      })
      
    # 3. Attempt external email send
    if "email" in job.channels:
      email_service.send_email(job.student_id, job.message)
      
    db.mark_job_success(job.batch_id, job.student_id)
    job.ack() # Remove job from queue
    
  except TemporaryNetworkError as e:
    if job.retry_count < 3:
      job.retry_count += 1
      queue.publish_with_delay("notification_jobs", job, delay = 60) # Exponential backoff
      job.ack()
    else:
      # Exceeded retries, isolate job
      queue.publish("notification_jobs_dlq", job)
      db.mark_job_failed(job.batch_id, job.student_id, reason = str(e))
      job.ack()
      
  except Exception as e:
    # Critical error, move straight to DLQ
    queue.publish("notification_jobs_dlq", job)
    db.mark_job_failed(job.batch_id, job.student_id, reason = str(e))
    job.ack()
```

---

## Stage 6: Priority Inbox and Top-N Notifications

### Priority Scoring Logic
To surface the most critical unread notifications first, a composite priority score is computed for each notification based on two metrics:
1. **Type Weight**:
   - `Placement`: 3 (Highest)
   - `Result`: 2
   - `Event`: 1
   - `Other` (e.g., Info): 0
2. **Timestamp Recency**: The Epoch millisecond timestamp of the notification's creation.

The final Priority Score is calculated as:
$$\text{Priority Score} = (\text{Weight} \times 10^{12}) + \text{Timestamp (ms)}$$

*By multiplying the weight by $10^{12}$ (1,000,000,000,000), we ensure that weight dominates the primary comparison, while the timestamp acts as the secondary tie-breaker (recency) when weights are equal.*

### Efficient Top-N Maintenance Algorithm (Streaming)
Instead of sorting the entire dataset (which runs in $O(M \log M)$ where $M$ is millions of incoming items), we maintain a **Min-Heap** of size $N$ in memory:
1. Initialize a Min-Heap of size $N$.
2. For each incoming notification:
   - Calculate its priority score.
   - If the heap has fewer than $N$ items, push the notification.
   - If the heap contains exactly $N$ items, compare the score with the root element of the heap (the minimum priority element in the top-$N$ list).
   - If the incoming notification's score is **greater** than the root score, extract the root element (discard it) and insert the new notification.
   - If the score is less than or equal to the root, discard the new notification.
3. This algorithm guarantees that the heap always contains the top $N$ elements, maintaining a time complexity of **$O(\log N)$** per incoming notification.
