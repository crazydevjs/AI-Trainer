export interface CdnProvider {
  name: string;
  resolve(path: string): string;
  purge(path: string): Promise<void>;
}
