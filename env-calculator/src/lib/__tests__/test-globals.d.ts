declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;

interface TestExpectation {
  not: TestExpectation;
  toBe(value: unknown): void;
  toBeCloseTo(value: number, precision?: number): void;
  toContain(value: string): void;
  toHaveProperty(value: string): void;
}

declare function expect(value: unknown): TestExpectation;
