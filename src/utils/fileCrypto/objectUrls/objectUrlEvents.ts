export type ObjectUrlRevokeListener = (revokedId: string) => void;
const objectUrlRevokeListeners = new Set<ObjectUrlRevokeListener>();

export function onObjectUrlRevoked(listener: ObjectUrlRevokeListener): () => void {
  objectUrlRevokeListeners.add(listener);
  return () => {
    objectUrlRevokeListeners.delete(listener);
  };
}

export function notifyObjectUrlRevoked(id: string) {
  objectUrlRevokeListeners.forEach((listener) => {
    try {
      listener(id);
    } catch {}
  });
}
