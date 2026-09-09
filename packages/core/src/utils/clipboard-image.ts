export type CopyShareImageStatus = "copied" | "unsupported" | "denied" | "failed";

export interface CopyShareImageEnvironment {
  fetchImage: (url: string) => Promise<{ ok: boolean; blob: () => Promise<Blob> }>;
  writeItems: (items: Array<Record<string, Blob>>) => Promise<void>;
}

function resolveDefaultEnvironment(): CopyShareImageEnvironment | null {
  const scope = globalThis as unknown as {
    fetch?: typeof fetch;
    navigator?: Navigator | undefined;
    ClipboardItem?: new (data: Record<string, Blob>) => ClipboardItem;
  };

  if (
    typeof scope.fetch !== "function" ||
    !scope.navigator?.clipboard ||
    typeof scope.navigator.clipboard.write !== "function" ||
    typeof scope.ClipboardItem !== "function"
  ) {
    return null;
  }

  const fetchImpl = scope.fetch.bind(scope);
  const clipboard = scope.navigator.clipboard;
  const Item = scope.ClipboardItem;

  return {
    fetchImage: (url) => fetchImpl(url),
    writeItems: (items) => clipboard.write(items.map((data) => new Item(data))),
  };
}

/**
 * Downloads a share-card PNG and places it on the system clipboard as an
 * image, so it can be pasted (Ctrl+V) into editors like the X composer.
 * The environment is injectable for tests; pass `null` to force "unsupported".
 */
export async function copyShareImageToClipboard(
  imageUrl: string,
  environment: CopyShareImageEnvironment | null = resolveDefaultEnvironment(),
): Promise<CopyShareImageStatus> {
  if (!environment) {
    return "unsupported";
  }

  let response: { ok: boolean; blob: () => Promise<Blob> };
  try {
    response = await environment.fetchImage(imageUrl);
  } catch {
    return "failed";
  }

  if (!response.ok) {
    return "failed";
  }

  let blob: Blob;
  try {
    blob = await response.blob();
  } catch {
    return "failed";
  }

  if (blob.size === 0) {
    return "failed";
  }

  try {
    await environment.writeItems([{ [blob.type || "image/png"]: blob }]);
  } catch (error) {
    return error instanceof DOMException && error.name === "NotAllowedError"
      ? "denied"
      : "failed";
  }

  return "copied";
}
