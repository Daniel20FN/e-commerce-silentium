/**
 * Tests that build loopback request URLs (http://localhost:3124/...) rely on
 * the one mode where the OAuth origin follows the request: `next dev`
 * (NODE_ENV=development). Jest runs with NODE_ENV=test, which correctly uses
 * the configured public origin instead, so these suites opt in explicitly.
 * Reflect.set is used (not jest.replaceProperty) so suites calling
 * jest.restoreAllMocks() keep the setting for the whole file.
 */
export function enableLocalDevelopmentOrigin(): void {
  const original = process.env.NODE_ENV;
  beforeAll(() => {
    Reflect.set(process.env, "NODE_ENV", "development");
  });
  afterAll(() => {
    if (original === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", original);
  });
}
