export async function triggerMessageEmailNotificationDispatch(params: {
  messageId: string;
  accessToken: string;
}) {
  try {
    const response = await fetch("/api/messages/notifications/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({ messageId: params.messageId }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      console.error(
        "Message email notification dispatch failed:",
        payload?.message ?? `HTTP ${response.status}`
      );
    }
  } catch {
    console.error("Message email notification dispatch failed: network error");
  }
}
