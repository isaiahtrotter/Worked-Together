declare global {
  interface Window {
    __updateNetworkWidgetOwner?: (patch: Record<string, unknown>) => void;
    __updateNetworkWidgetConnection?: (id: string, patch: Record<string, unknown>) => void;
    __updateNetworkWidgetConnectionEndorsement?: (
      id: string,
      fromId: string,
      fromName: string,
      fromAvatarUrl: string | null,
      text: string,
    ) => void;
  }
}

export function updateOwnerPreview(patch: Record<string, unknown>) {
  window.__updateNetworkWidgetOwner?.(patch);
}

export function updateConnectionPreview(id: string, patch: Record<string, unknown>) {
  window.__updateNetworkWidgetConnection?.(id, patch);
}

export function updateConnectionEndorsementPreview(
  id: string,
  fromId: string,
  fromName: string,
  fromAvatarUrl: string | null,
  text: string,
) {
  window.__updateNetworkWidgetConnectionEndorsement?.(id, fromId, fromName, fromAvatarUrl, text);
}
