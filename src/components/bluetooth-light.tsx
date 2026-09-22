import { useState, useSyncExternalStore } from "react";
import { bluetoothAvailable, hueBluetooth } from "@/lib/hue-bluetooth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function BluetoothLight() {
  const state = useSyncExternalStore(
    hueBluetooth.subscribe,
    hueBluetooth.snapshot,
    hueBluetooth.snapshot,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [brightness, setBrightness] = useState(75);
  const [temperature, setTemperature] = useState(3000);
  const run = (promise: Promise<unknown>) => {
    setBusy(true);
    setError("");
    void promise.catch((e) => setError(String(e))).finally(() => setBusy(false));
  };
  return (
    <section className="space-y-3 rounded-md bg-muted p-4">
      <h3 className="text-sm font-bold">Single light · Bluetooth (experimental)</h3>
      <p className="text-xs text-muted-foreground">
        For Bluetooth-capable Hue lights nearby. Put the light in pairing mode and accept any system
        pairing request. Support varies by model and firmware.
      </p>
      {!bluetoothAvailable() ? (
        <p className="text-sm">
          Bluetooth is unavailable in this runtime. Open in Chrome or Edge over HTTPS, or use the
          desktop bridge connection below.
        </p>
      ) : state.connected ? (
        <>
          <p className="text-sm">Connected to {state.name}</p>
          <label className="block text-sm">
            Brightness · {brightness}%
            <Input
              aria-label="Bluetooth brightness"
              type="range"
              min={1}
              max={100}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
            />
          </label>
          {state.temperature && (
            <label className="block text-sm">
              White temperature · {temperature} K
              <Input
                aria-label="Bluetooth white temperature"
                type="range"
                min={2000}
                max={6500}
                step={100}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() =>
                run(
                  hueBluetooth.apply({
                    power: true,
                    brightness,
                    ...(state.temperature ? { temperature } : {}),
                  }),
                )
              }
            >
              Apply light
            </Button>
            <Button
              variant="quiet"
              disabled={busy}
              onClick={() => run(hueBluetooth.apply({ power: false, brightness }))}
            >
              Turn off
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => hueBluetooth.disconnect()}>
              Disconnect
            </Button>
          </div>
        </>
      ) : (
        <Button disabled={busy} onClick={() => run(hueBluetooth.connect())}>
          {busy ? "Connecting…" : "Connect a Hue light"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error} Try pairing again with the light nearby and other Bluetooth controllers
          disconnected.
        </p>
      )}
    </section>
  );
}
