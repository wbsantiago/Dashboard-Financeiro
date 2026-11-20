type Handler = () => boolean | void;
const handlers: { handler: Handler; priority: number }[] = [];

/** Only the frontmost active surface handles one Android back press. */
export function registerBackHandler(handler: Handler, priority = 100) {
  const entry = { handler, priority };
  handlers.push(entry);
  return () => { const index = handlers.indexOf(entry); if (index !== -1) handlers.splice(index, 1); };
}

export function handleAppBack(): boolean {
  const front = handlers.reduce<typeof handlers[number] | undefined>((best, entry) =>
    !best || entry.priority >= best.priority ? entry : best, undefined);
  return front ? front.handler() !== false : false;
}
