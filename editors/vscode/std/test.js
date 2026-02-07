export async function assert(condition, message) {
  if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
}
export async function assertEqual(actual, expected, message) {
  if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
    }
}
export async function assertEqualStr(actual, expected, message) {
  if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}. Expected "${expected}", got "${actual}"`);
    }
}
export async function assertApprox(actual, expected, epsilon, message) {
  if (Math.abs(actual - expected) > epsilon) {
      throw new Error(`Assertion failed: ${message}. Expected ${expected} (±${epsilon}), got ${actual}`);
    }
}
export async function assertEqualBool(actual, expected, message) {
  if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
    }
}
export async function assertNull(value, message) {
  if (value !== null) {
      throw new Error(`Assertion failed: ${message}. Expected null, got ${JSON.stringify(value)}`);
    }
}
export async function assertNotNull(value, message) {
  if (value === null) {
      throw new Error(`Assertion failed: ${message}. Expected non-null value`);
    }
}
export async function assertLen(arr, expected, message) {
  if (arr.length !== expected) {
      throw new Error(`Assertion failed: ${message}. Expected length ${expected}, got ${arr.length}`);
    }
}
export async function assertContains(str, substr, message) {
  if (!str.includes(substr)) {
      throw new Error(`Assertion failed: ${message}. Expected "${str}" to contain "${substr}"`);
    }
}
export async function assertFalse(condition, message) {
  if (condition) {
      throw new Error(`Assertion failed: ${message}. Expected false, got true`);
    }
}
export class TestResult {
  constructor(name, passed, errorMsg) {
    this.name = name;
    this.passed = passed;
    this.errorMsg = errorMsg;
  }

}
export async function runTest(name, testFn) {
  try {
      await testFn();
      return new TestResult(name, true, "");
    } catch (e) {
      return new TestResult(name, false, e.message || String(e));
    }
}
export async function printResults(results) {
  let passed = 0;
    let failed = 0;

    console.log("\n=== Test Results ===\n");

    for (const r of results) {
      if (r.passed) {
        console.log(`✓ ${r.name}`);
        passed++;
      } else {
        console.log(`✗ ${r.name}`);
        console.log(`  Error: ${r.errorMsg}`);
        failed++;
      }
    }

    console.log(`\n${passed} passed, ${failed} failed, ${passed + failed} total`);

    if (failed > 0) {
      process.exitCode = 1;
    }
}
export async function test(name, testFn) {
  try {
      await testFn();
      console.log(`✓ ${name}`);
      return true;
    } catch (e) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${e.message || String(e)}`);
      return false;
    }
}
export async function fail(message) {
  throw new Error(message);
}
export async function skip(reason) {
  console.log(`⊘ Skipped: ${reason}`);
}