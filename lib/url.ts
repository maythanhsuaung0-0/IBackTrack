/** No shared "new chat" key: unsaved / temporary chats must not mix. */
export function conversationKey(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com')
      return null;
    const match = url.pathname.match(
      /^(?:\/g\/[^/]+)?\/c\/([a-zA-Z0-9-]+)\/?$/,
    );
    return match ? `chatgpt:${match[1]}` : null;
  } catch {
    return null;
  }
}
