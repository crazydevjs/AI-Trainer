export interface ApiKeyRecord {
  id: string;
  hash: string;
  createdAt: number;
  lastUsedAt: number | null;
  revoked: boolean;
}

export interface SignedPayload<T> {
  payload: T;
  expiresAt: number;
}
