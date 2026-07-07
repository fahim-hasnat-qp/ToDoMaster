/**
 * Minimal, typed, token-based DI container.
 *
 * Why not a big DI library? A Todo PWA needs swappability (Local vs Remote vs
 * mock repos) and lazy singletons — not decorators/reflection. This keeps bundle
 * size tiny while honoring Dependency Inversion: features depend on tokens
 * (interfaces), never concrete classes.
 */

export interface Token<T> {
  readonly key: symbol;
  /** phantom type carrier — never read at runtime */
  readonly _type?: T;
}

export function createToken<T>(description: string): Token<T> {
  return { key: Symbol(description) };
}

type Factory<T> = (c: Container) => T;

export class Container {
  private factories = new Map<symbol, Factory<unknown>>();
  private singletons = new Map<symbol, unknown>();

  /** Register a lazily-instantiated singleton. */
  register<T>(token: Token<T>, factory: Factory<T>): void {
    this.factories.set(token.key, factory as Factory<unknown>);
  }

  /** Override an existing registration (used in tests). Clears any cached instance. */
  override<T>(token: Token<T>, factory: Factory<T>): void {
    this.factories.set(token.key, factory as Factory<unknown>);
    this.singletons.delete(token.key);
  }

  resolve<T>(token: Token<T>): T {
    if (this.singletons.has(token.key)) {
      return this.singletons.get(token.key) as T;
    }
    const factory = this.factories.get(token.key);
    if (!factory) {
      throw new Error(
        `No provider registered for token ${token.key.description ?? '(anonymous)'}`,
      );
    }
    const instance = factory(this);
    this.singletons.set(token.key, instance);
    return instance as T;
  }

  reset(): void {
    this.singletons.clear();
  }
}

export const container = new Container();
