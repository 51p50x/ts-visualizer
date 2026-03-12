/** Base entity with common fields */
abstract class Entity {
  id: string;
  createdAt: Date;
}

/** Adds audit tracking fields */
abstract class AuditableEntity extends Entity {
  updatedAt: Date;
  /** Who last updated this entity */
  updatedBy: string;
}

interface Loggable {
  /** Log a message */
  log(message: string): void;
}

interface Serializable {
  /** Serialize to string */
  serialize(): string;
  /** Deserialize from string */
  deserialize(data: string): void;
}

class BaseService extends AuditableEntity implements Loggable {
  protected logger: Console;

  log(message: string): void {
    this.logger.log(message);
  }
}

interface Cacheable<T> {
  ttl: number;
  getCacheKey(): string;
  fromCache(key: string): T | null;
}

type UserRole = 'admin' | 'editor' | 'viewer';

type UserMetadata = {
  lastLogin: Date;
  preferences: Record<string, unknown>;
  role: UserRole;
};

/**
 * Main user service — 5 levels of inheritance.
 * Entity → AuditableEntity → BaseService → UserService
 * Also implements Serializable and Cacheable<UserService>.
 */
class UserService extends BaseService implements Serializable, Cacheable<UserService> {
  username: string;
  email: string;
  readonly isActive: boolean;
  ttl: number;

  constructor(username: string, email: string) {
    super();
    this.username = username;
    this.email = email;
    this.isActive = true;
    this.ttl = 3600;
  }

  /** Override: custom log format */
  override log(message: string): void {
    this.logger.log(`[UserService] ${message}`);
  }

  serialize(): string {
    return JSON.stringify({ username: this.username, email: this.email });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.username = parsed.username;
    this.email = parsed.email;
  }

  getCacheKey(): string {
    return `user:${this.username}`;
  }

  fromCache(key: string): UserService | null {
    return null;
  }

  private async fetchProfile(): Promise<Record<string, unknown>> {
    return {};
  }

  static create(username: string, email: string): UserService {
    return new UserService(username, email);
  }
}
