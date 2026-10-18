import { useCallback, useEffect, useRef, useState } from "react";
import { prepareVehiclePhoto, uploadImage } from "@/lib/data";
import { UPLOAD_CONCURRENCY, errorMessage } from "./model";

/** `progress` is null while the file is being prepared, then 0–1 while it is sent. */
export type UploadState =
  { status: "working"; progress: number | null } | { status: "error"; message: string };

/**
 * Upload state keyed by target (brand slug, content field…). The state lives in
 * the caller, so an upload keeps reporting even if the row showing it re-renders.
 */
export function useUploads() {
  const [states, setStates] = useState<Record<string, UploadState>>({});
  const set = useCallback(
    (key: string, state: UploadState | null) =>
      setStates((current) => {
        const next = { ...current };
        if (state) next[key] = state;
        else delete next[key];
        return next;
      }),
    [],
  );
  const run = useCallback(
    async <T>(
      key: string,
      task: (report: (progress: number) => void) => Promise<T>,
    ): Promise<T | undefined> => {
      set(key, { status: "working", progress: null });
      try {
        const result = await task((progress) => set(key, { status: "working", progress }));
        set(key, null);
        return result;
      } catch (error) {
        set(key, { status: "error", message: errorMessage(error, "Envoi impossible.") });
        return undefined;
      }
    },
    [set],
  );
  const clear = useCallback((key: string) => set(key, null), [set]);
  const busy = Object.values(states).filter((state) => state.status === "working").length;
  return { states, run, clear, busy };
}

export type PhotoUpload = {
  id: string;
  name: string;
  file: File;
  preview: string;
  status: "queued" | "working" | "error";
  progress: number | null;
  error?: string | undefined;
};

/**
 * Vehicle photo queue: each file is cropped, resized and sent to storage, at
 * most UPLOAD_CONCURRENCY at a time. Finished URLs go to `onUploaded`; results
 * arriving after the form is closed are dropped (the orphan cleanup removes them).
 */
export function usePhotoQueue(onUploaded: (url: string) => void) {
  const [items, setItems] = useState<PhotoUpload[]>([]);
  const started = useRef(new Set<string>());
  const alive = useRef(true);
  const callback = useRef(onUploaded);
  const latest = useRef(items);

  useEffect(() => {
    callback.current = onUploaded;
    latest.current = items;
  });

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      latest.current.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, []);

  const patch = useCallback(
    (id: string, change: Partial<PhotoUpload>) =>
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...change } : item)),
      ),
    [],
  );

  const remove = useCallback((id: string) => {
    setItems((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return current.filter((entry) => entry.id !== id);
    });
  }, []);

  useEffect(() => {
    const active = items.filter((item) => item.status === "working").length;
    const next = items
      .filter((item) => item.status === "queued" && !started.current.has(item.id))
      .slice(0, Math.max(0, UPLOAD_CONCURRENCY - active));
    for (const item of next) {
      started.current.add(item.id);
      patch(item.id, { status: "working", progress: null, error: undefined });
      void (async () => {
        try {
          const blob = await prepareVehiclePhoto(item.file);
          const url = await uploadImage("vehicle", blob, {
            onProgress: (progress) => patch(item.id, { progress }),
          });
          if (!alive.current) return;
          callback.current(url);
          remove(item.id);
        } catch (error) {
          patch(item.id, {
            status: "error",
            error: errorMessage(error, "Envoi de la photo impossible."),
          });
        } finally {
          started.current.delete(item.id);
        }
      })();
    }
  }, [items, patch, remove]);

  const add = useCallback((files: File[]) => {
    setItems((current) => [
      ...current,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        file,
        preview: URL.createObjectURL(file),
        status: "queued" as const,
        progress: null,
      })),
    ]);
  }, []);

  const retry = useCallback(
    (id: string) => patch(id, { status: "queued", progress: null, error: undefined }),
    [patch],
  );

  const active = items.filter((item) => item.status !== "error").length;
  const failed = items.length - active;
  return { items, add, retry, remove, active, failed };
}

/**
 * Open/close state for a dialog acting on one item. The item is kept after
 * closing so the dialog content does not vanish during the exit animation.
 */
export function useDialogTarget<T>() {
  const [state, setState] = useState<{ isOpen: boolean; target: T | null }>({
    isOpen: false,
    target: null,
  });
  const open = useCallback((target: T) => setState({ isOpen: true, target }), []);
  const onOpenChange = useCallback(
    (isOpen: boolean) => setState((current) => ({ ...current, isOpen })),
    [],
  );
  return { ...state, open, onOpenChange };
}
