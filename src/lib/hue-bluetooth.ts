// Hue GATT characteristic definitions verified against https://github.com/flip-dots/HueBLE.
// Experimental: this is not a published/supported Signify third-party Bluetooth API.
const serviceId = "932c32bd-0000-47a2-835a-a8d455b859dd";
const characteristicId = (suffix: string) => `932c32bd-${suffix}-47a2-835a-a8d455b859dd`;
interface Characteristic {
  writeValueWithResponse(value: Uint8Array): Promise<void>;
}
interface Service {
  getCharacteristic(uuid: string): Promise<Characteristic>;
}
interface Device extends EventTarget {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<{ getPrimaryService(uuid: string): Promise<Service> }>;
    disconnect(): void;
  };
}
interface Bluetooth {
  requestDevice(options: {
    filters: { services: string[] }[];
    optionalServices: string[];
  }): Promise<Device>;
}
export function bluetoothAvailable() {
  return typeof navigator !== "undefined" && window.isSecureContext && "bluetooth" in navigator;
}
export class HueBluetooth {
  private device: Device | undefined;
  private power: Characteristic | undefined;
  private brightness: Characteristic | undefined;
  private temperature: Characteristic | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  private state = { name: "", connected: false, temperature: false };
  snapshot = () => this.state;
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  private changed() {
    this.listeners.forEach((callback) => callback());
  }
  async connect() {
    if (!bluetoothAvailable())
      throw new Error(
        "Open this app in Chrome or Edge over HTTPS to use Bluetooth, or use a Hue Bridge in the desktop app.",
      );
    const bluetooth = (navigator as Navigator & { bluetooth: Bluetooth }).bluetooth;
    // Must remain directly in the click gesture, before any await.
    const device = await bluetooth.requestDevice({
      filters: [{ services: ["0000fe0f-0000-1000-8000-00805f9b34fb"] }],
      optionalServices: [serviceId],
    });
    this.disconnect();
    this.device = device;
    device.addEventListener("gattserverdisconnected", () => {
      if (this.device === device) this.disconnect();
    });
    try {
      const server = await device.gatt?.connect();
      if (!server) throw new Error("This device has no Bluetooth GATT connection.");
      const service = await server.getPrimaryService(serviceId);
      this.power = await service.getCharacteristic(characteristicId("0002"));
      this.brightness = await service.getCharacteristic(characteristicId("0003"));
      this.temperature = await service
        .getCharacteristic(characteristicId("0004"))
        .catch(() => undefined);
      this.state = {
        name: device.name ?? "Hue light",
        connected: true,
        temperature: !!this.temperature,
      };
      this.changed();
    } catch (error) {
      this.disconnect();
      throw error;
    }
  }
  disconnect() {
    const device = this.device;
    this.device = undefined;
    this.power = this.brightness = this.temperature = undefined;
    this.state = { name: "", connected: false, temperature: false };
    device?.gatt?.disconnect();
    this.changed();
  }
  apply(value: { power: boolean; brightness: number; temperature?: number | undefined }) {
    const device = this.device;
    const operation = this.queue.then(async () => {
      if (!device?.gatt?.connected || this.device !== device || !this.power || !this.brightness)
        throw new Error("Connect your Hue Bluetooth light first.");
      await this.power.writeValueWithResponse(new Uint8Array([value.power ? 1 : 0]));
      if (!value.power) return;
      await this.brightness.writeValueWithResponse(
        new Uint8Array([Math.round((Math.max(1, Math.min(100, value.brightness)) * 254) / 100)]),
      );
      if (value.temperature !== undefined) {
        if (!this.temperature)
          throw new Error("This light does not support adjustable white temperature.");
        const mired = Math.round(Math.max(153, Math.min(500, 1000000 / value.temperature)));
        await this.temperature.writeValueWithResponse(new Uint8Array([mired & 255, mired >> 8]));
      }
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}
export const hueBluetooth = new HueBluetooth();
