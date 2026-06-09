const PRIORITY_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

export function getTopPriorityNotifications(notifications, topN = 10) {
  return [...notifications]
    .map((notification) => {
      const type = notification.type || notification.Type || 'Event'
      const timestamp = notification.createdAt || notification.Timestamp
      const weight = PRIORITY_WEIGHTS[type] ?? 0
      
      const normalizedTimestamp = typeof timestamp === 'string' && timestamp.includes(' ') && !timestamp.includes('T')
        ? timestamp.replace(' ', 'T')
        : timestamp;
      const time = new Date(normalizedTimestamp).getTime() || 0
      return { ...notification, priorityScore: weight * 1000000000000 + time }
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, topN)
}

export function sortNotificationsByRecency(notifications) {
  return [...notifications].sort((a, b) => {
    const timeA = a.createdAt || a.Timestamp;
    const timeB = b.createdAt || b.Timestamp;
    
    const normA = typeof timeA === 'string' && timeA.includes(' ') && !timeA.includes('T') ? timeA.replace(' ', 'T') : timeA;
    const normB = typeof timeB === 'string' && timeB.includes(' ') && !timeB.includes('T') ? timeB.replace(' ', 'T') : timeB;
    
    return new Date(normB).getTime() - new Date(normA).getTime();
  })
}
