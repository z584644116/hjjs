declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;

interface TestExpectation {
  not: TestExpectation;
  toBe(value: unknown): void;
  toBeCloseTo(value: number, precision?: number): void;
  toContain(value: string): void;
  toEqual(value: unknown): void;
  toHaveLength(length: number): void;
  toHaveProperty(value: string): void;
  toMatch(value: RegExp | string): void;
  toBeDefined(): void;
  toBeGreaterThan(value: number): void;
  toBeGreaterThanOrEqual(value: number): void;
  toBeLessThan(value: number): void;
  toBeLessThanOrEqual(value: number): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
}

declare function expect(value: unknown): TestExpectation;
