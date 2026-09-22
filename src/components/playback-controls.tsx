import { useEffect, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import type { AudioEngine } from "@/lib/audio";
import { Button } from "./ui/button";

const time = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
export function PlaybackControls({
  engine,
  instanceId,
  name,
  report,
}: {
  engine: AudioEngine;
  instanceId: string;
  name: string;
  report: (p: Promise<unknown>) => void;
}) {
  const [progress, setProgress] = useState(() => engine.progress(instanceId));
  useEffect(() => {
    const timer = window.setInterval(() => setProgress(engine.progress(instanceId)), 200);
    return () => window.clearInterval(timer);
  }, [engine, instanceId]);
  return (
    <div className="space-y-1 px-2 py-2" aria-label={`${name} playback`}>
      <input
        className="w-full cursor-pointer accent-current"
        type="range"
        aria-label={`Seek ${name}`}
        min={0}
        max={progress.duration || 1}
        step={0.1}
        disabled={!progress.duration}
        value={progress.position}
        onChange={(e) => {
          engine.seek(instanceId, Number(e.target.value));
          setProgress(engine.progress(instanceId));
        }}
      />
      <div className="flex items-center gap-1">
        <span className="mr-auto text-[11px] tabular-nums">
          {time(progress.position)} / {progress.duration ? time(progress.duration) : "Streaming"}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label={`${progress.paused ? "Resume" : "Pause"} ${name}`}
          onClick={() => report(engine.togglePause(instanceId))}
        >
          {progress.paused ? <Play /> : <Pause />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label={`Stop ${name}`}
          onClick={() => engine.stop(instanceId)}
        >
          <Square />
        </Button>
      </div>
    </div>
  );
}
