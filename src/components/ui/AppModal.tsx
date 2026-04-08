import { X } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
import { cn } from "@/lib/cn";

type AppModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function AppModal({
  open,
  title,
  onClose,
  children,
  footer,
  className,
}: AppModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    }
    if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cn(
        "w-[min(100%,28rem)] max-h-[min(90dvh,32rem)] overflow-hidden rounded-2xl border border-jkl-border bg-white p-0 text-jkl-ink shadow-xl backdrop:bg-black/40",
        className,
      )}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="flex max-h-[min(90dvh,32rem)] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-jkl-border px-4 py-3">
          <h2 id={titleId} className="text-base font-bold leading-snug">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-jkl-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-jkl-border px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </dialog>
  );
}
