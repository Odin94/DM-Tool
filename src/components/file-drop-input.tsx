import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDropInput({
  label,
  accept,
  disabled = false,
  onFile,
}: {
  label: string;
  accept: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  function receive(files: FileList | null) {
    if (disabled || !files?.length) return;
    if (files.length !== 1) {
      setError("Choose one file at a time.");
      return;
    }
    const file = files[0]!;
    const valid = accept
      .split(",")
      .some((rule) =>
        rule.startsWith(".")
          ? file.name.toLowerCase().endsWith(rule)
          : rule.endsWith("/*")
            ? file.type.startsWith(rule.slice(0, -1))
            : file.type === rule,
      );
    if (!valid) {
      setError(`Choose a supported file (${accept}).`);
      return;
    }
    setError("");
    onFile(file);
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        className={cn(
          "flex w-full cursor-pointer items-center justify-center gap-3 rounded-md border border-dashed border-border bg-background px-4 py-5 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
          dragging && "border-primary bg-secondary",
        )}
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          receive(e.dataTransfer.files);
        }}
        aria-label={label}
      >
        <Upload className="size-5 shrink-0 text-muted-foreground" />
        <span>
          <span className="block font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">
            Drop a file here, or click to browse
          </span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-label={`${label} file`}
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          receive(e.target.files);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
