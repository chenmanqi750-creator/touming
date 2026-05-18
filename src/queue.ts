export interface QueueClaim {
  deviceId: string;
  queuePosition: number;
  totalDevices: number;
  assignedAt: string;
  lastSeen: string;
}

export async function claimQueue(deviceId: string): Promise<QueueClaim> {
  const response = await fetch('/api/queue/claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceId }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to claim queue slot (${response.status})`);
  }

  return response.json();
}
