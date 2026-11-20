export class CloudReadState {
  private parts = new Map<string, { fromCache: boolean; hasPendingWrites: boolean }>();
  private profile = false;
  constructor(private knownComplete = false) {}
  observe(part: string, metadata = { fromCache: false, hasPendingWrites: false }, exists?: boolean) {
    this.parts.set(part, metadata);
    if (part === 'profile') this.profile = exists === true;
    const complete = this.parts.size === 3 && this.profile;
    const cached = [...this.parts.values()].some(value => value.fromCache);
    if (complete && !cached) this.knownComplete = true;
    return { available: complete && this.knownComplete, cached, pending: [...this.parts.values()].some(value => value.hasPendingWrites), error: '', confirmed: complete && !cached };
  }
}
