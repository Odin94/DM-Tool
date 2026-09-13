// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FileDropInput } from "./file-drop-input";
afterEach(cleanup);
describe("file drop input", () => {
  it("accepts dropped audio and sends exactly one file to the importer", () => {
    const onFile = vi.fn();
    render(<FileDropInput label="Import media" accept="audio/*" onFile={onFile} />);
    const file = new File(["wav"], "test.wav", { type: "audio/wav" });
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { files: [file] } });
    expect(onFile).toHaveBeenCalledExactlyOnceWith(file);
  });
  it("uses the same validation for browse and drop, and rejects unsupported files", () => {
    const onFile = vi.fn();
    render(<FileDropInput label="Import media" accept="audio/*" onFile={onFile} />);
    fireEvent.change(screen.getByLabelText("Import media file"), {
      target: { files: [new File(["text"], "wrong.txt", { type: "text/plain" })] },
    });
    expect(screen.getByRole("alert").textContent).toContain("supported file");
    expect(onFile).not.toHaveBeenCalled();
    const file = new File(["wav"], "test.wav", { type: "audio/wav" });
    fireEvent.change(screen.getByLabelText("Import media file"), { target: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });
  it("blocks multiple files and ignores drops while an import is pending", () => {
    const onFile = vi.fn();
    const file = new File(["wav"], "test.wav", { type: "audio/wav" });
    const { rerender } = render(<FileDropInput label="Import" accept="audio/*" onFile={onFile} />);
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { files: [file, file] } });
    expect(screen.getByRole("alert").textContent).toContain("one file");
    rerender(<FileDropInput label="Import" accept="audio/*" disabled onFile={onFile} />);
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { files: [file] } });
    expect(onFile).not.toHaveBeenCalled();
  });
});
