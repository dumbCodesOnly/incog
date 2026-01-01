# Development Guardrails

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Pre-Development Blueprint

---

## Executive Summary

This document establishes coding standards, security best practices, testing requirements, performance benchmarks, and deployment procedures to ensure consistent, secure, and maintainable development of the Incog browser application.

---

## 1. Code Organization & Naming Conventions

### 1.1 File Organization

**Directory Structure:**

```
project/
├── client/                    # Frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page-level components
│   │   ├── hooks/             # Custom hooks
│   │   ├── contexts/          # React contexts
│   │   ├── lib/               # Utilities and helpers
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/                # Static assets
│   └── index.html
├── server/                    # Backend application
│   ├── routers.ts             # tRPC routers
│   ├── db.ts                  # Database queries
│   ├── auth.logout.test.ts    # Tests
│   └── _core/                 # Framework code
├── drizzle/                   # Database schema
│   └── schema.ts
├── shared/                    # Shared code
│   ├── const.ts               # Constants
│   └── types.ts               # Shared types
├── docs/                      # Documentation
├── package.json
└── tsconfig.json
```

### 1.2 Naming Conventions

**Files:**

- Components: PascalCase (e.g., `AccountCard.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_TIMEOUT.ts`)
- Tests: `*.test.ts` or `*.spec.ts`

**Variables & Functions:**

- Variables: camelCase (e.g., `accountId`, `isLoading`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- Functions: camelCase (e.g., `createAccount()`)
- Types/Interfaces: PascalCase (e.g., `Account`, `ProxyConfig`)
- Enums: PascalCase (e.g., `ProxyType`)

**React Components:**

- Functional components: PascalCase (e.g., `function AccountCard()`)
- Props interfaces: `{ComponentName}Props` (e.g., `AccountCardProps`)
- State setters: `set{PropertyName}` (e.g., `setIsLoading`)

---

## 2. Security Best Practices

### 2.1 Input Validation

**MUST validate all user input:**

```typescript
import { z } from "zod";

// Define schema
const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

// Validate in tRPC procedure
export const account = router({
  create: protectedProcedure
    .input(createAccountSchema)
    .mutation(async ({ input }) => {
      // Input is automatically validated
      return createAccount(input);
    }),
});
```

### 2.2 Output Encoding

**MUST encode output to prevent XSS:**

```typescript
// HTML encoding
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Use in React (automatic escaping)
function AccountCard({ account }: { account: Account }) {
  return <h3>{account.name}</h3>;  // Automatically escaped
}
```

### 2.3 Authentication & Authorization

**MUST check authentication for protected procedures:**

```typescript
export const account = router({
  create: protectedProcedure // Requires authentication
    .input(createAccountSchema)
    .mutation(async ({ ctx, input }) => {
      // ctx.user is guaranteed to exist
      return createAccount(ctx.user.id, input);
    }),
});

export const admin = router({
  deleteUser: adminProcedure // Requires admin role
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // ctx.user.role === 'admin'
      return deleteUser(input.userId);
    }),
});
```

### 2.4 Sensitive Data Handling

**MUST encrypt sensitive data:**

```typescript
// Encrypt before storage
const encryptedPassword = await encryptData(password, userKey);
await db.insert(users).values({ password: encryptedPassword });

// Decrypt only when needed
const decryptedPassword = await decryptData(encryptedPassword, userKey);

// NEVER log sensitive data
console.log(`User: ${user.name}`); // OK
console.log(`Password: ${password}`); // NEVER
```

### 2.5 CSRF Protection

**CSRF tokens are automatically handled by tRPC:**

```typescript
// No manual CSRF token handling needed
// tRPC handles CSRF protection automatically
```

### 2.6 SQL Injection Prevention

**MUST use parameterized queries:**

```typescript
// Good: Using Drizzle ORM (parameterized)
const user = await db.select().from(users).where(eq(users.id, userId)); // Parameter is safe

// Bad: String concatenation (NEVER)
const query = `SELECT * FROM users WHERE id = ${userId}`; // VULNERABLE
```

---

## 3. Testing Requirements

### 3.1 Unit Testing

**All business logic MUST have unit tests:**

```typescript
describe("createAccount", () => {
  it("should create account with valid input", async () => {
    const account = await createAccount(1, {
      name: "Test Account",
      description: "Test",
    });

    expect(account.id).toBeDefined();
    expect(account.name).toBe("Test Account");
  });

  it("should throw error with invalid input", async () => {
    await expect(createAccount(1, { name: "" })).rejects.toThrow(
      "Name is required"
    );
  });
});
```

**Test Coverage Requirements:**

| Component      | Coverage |
| -------------- | -------- |
| Business logic | 80%+     |
| Utilities      | 90%+     |
| API procedures | 70%+     |
| UI components  | 50%+     |

### 3.2 Integration Testing

**Critical user flows MUST have integration tests:**

```typescript
describe("Account Switching Flow", () => {
  it("should switch accounts without data loss", async () => {
    // Create two accounts
    const account1 = await createAccount(userId, { name: "Account 1" });
    const account2 = await createAccount(userId, { name: "Account 2" });

    // Switch to account 1
    await switchAccount(account1.id);

    // Set data in account 1
    await setData("key1", "value1");

    // Switch to account 2
    await switchAccount(account2.id);

    // Switch back to account 1
    await switchAccount(account1.id);

    // Verify data is restored
    const value = await getData("key1");
    expect(value).toBe("value1");
  });
});
```

### 3.3 Running Tests

**Run tests before committing:**

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/account.test.ts

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch
```

---

## 4. Performance Benchmarks

### 4.1 Performance Targets

| Metric              | Target            | Tool                    |
| ------------------- | ----------------- | ----------------------- |
| Initial Page Load   | < 3s              | Lighthouse              |
| API Response Time   | < 200ms (p95)     | Custom monitoring       |
| Database Query Time | < 50ms (p95)      | Query profiling         |
| Bundle Size         | < 500KB (gzipped) | Webpack Bundle Analyzer |
| Lighthouse Score    | > 90              | Lighthouse              |
| Time to Interactive | < 2s              | Lighthouse              |

### 4.2 Performance Monitoring

**Monitor performance in production:**

```typescript
// Measure API response time
const startTime = performance.now();
const response = await fetch("/api/trpc/account.list");
const duration = performance.now() - startTime;

console.log(`API call took ${duration}ms`);

if (duration > 200) {
  // Log performance warning
  await logPerformanceWarning({
    endpoint: "account.list",
    duration,
    threshold: 200,
  });
}
```

### 4.3 Bundle Size Analysis

**Analyze bundle size:**

```bash
# Generate bundle analysis
pnpm build

# View bundle contents
npx webpack-bundle-analyzer dist/assets/index.*.js
```

---

## 5. Code Quality Standards

### 5.1 Linting

**Use ESLint to enforce code quality:**

```bash
# Run linter
pnpm lint

# Fix linting errors
pnpm lint --fix
```

**ESLint Configuration:**

```json
{
  "extends": ["eslint:recommended", "plugin:security/recommended"],
  "rules": {
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "security/detect-non-literal-regexp": "warn"
  }
}
```

### 5.2 Type Checking

**Use TypeScript strict mode:**

```bash
# Check types
pnpm check
```

**TypeScript Configuration:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

### 5.3 Code Formatting

**Use Prettier for consistent formatting:**

```bash
# Format code
pnpm format

# Check formatting
pnpm format --check
```

---

## 6. Logging & Monitoring

### 6.1 Logging Standards

**Use structured logging:**

```typescript
// Good: Structured logging
logger.info("Account created", {
  userId: user.id,
  accountId: account.id,
  timestamp: new Date().toISOString(),
});

// Bad: Unstructured logging
console.log(`Account ${account.id} created for user ${user.id}`);
```

**Log Levels:**

| Level    | Use Case                | Example                                  |
| -------- | ----------------------- | ---------------------------------------- |
| DEBUG    | Detailed debugging info | Variable values, function entry/exit     |
| INFO     | General information     | User actions, system events              |
| WARN     | Warning conditions      | Deprecated API usage, performance issues |
| ERROR    | Error conditions        | Failed operations, exceptions            |
| CRITICAL | Critical failures       | System down, data corruption             |

### 6.2 Error Logging

**Log all errors with context:**

```typescript
try {
  await createAccount(userId, input);
} catch (error) {
  logger.error("Failed to create account", {
    userId,
    input,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to create account",
  });
}
```

### 6.3 Performance Logging

**Log performance metrics:**

```typescript
const startTime = performance.now();

try {
  const result = await expensiveOperation();
  const duration = performance.now() - startTime;

  logger.info("Expensive operation completed", {
    operation: "expensiveOperation",
    duration,
    result: result.id,
  });

  return result;
} catch (error) {
  const duration = performance.now() - startTime;

  logger.error("Expensive operation failed", {
    operation: "expensiveOperation",
    duration,
    error: error.message,
  });

  throw error;
}
```

---

## 7. Deployment Checklist

### 7.1 Pre-Deployment

- [ ] All tests pass (`pnpm test`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Type checking passes (`pnpm check`)
- [ ] Code is formatted (`pnpm format`)
- [ ] Documentation is updated
- [ ] Database migrations are tested
- [ ] Environment variables are configured
- [ ] Security audit is completed

### 7.2 Deployment Steps

1. **Create Release Branch:**

   ```bash
   git checkout -b release/v1.0.0
   ```

2. **Update Version:**

   ```bash
   npm version minor
   ```

3. **Build Application:**

   ```bash
   pnpm build
   ```

4. **Run Tests:**

   ```bash
   pnpm test
   ```

5. **Deploy to Staging:**

   ```bash
   git push origin release/v1.0.0
   # Trigger CI/CD pipeline
   ```

6. **Smoke Tests:**
   - Test critical user flows
   - Verify API responses
   - Check database connectivity

7. **Deploy to Production:**
   ```bash
   git merge release/v1.0.0 main
   git tag v1.0.0
   git push origin main --tags
   ```

### 7.3 Post-Deployment

- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Verify user-facing features work
- [ ] Check logs for errors
- [ ] Monitor database performance
- [ ] Verify backups are working

---

## 8. Git Workflow

### 8.1 Branch Naming

**Use descriptive branch names:**

```
feature/account-switching
bugfix/proxy-connection-timeout
docs/api-documentation
chore/update-dependencies
```

### 8.2 Commit Messages

**Use clear, descriptive commit messages:**

```
feat: Add account switching functionality

- Implement account.switch tRPC procedure
- Add AccountSwitcher component
- Update session isolation logic
- Add tests for account switching

Closes #123
```

**Format:**

```
<type>: <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 8.3 Pull Request Process

1. Create feature branch from `main`
2. Make changes and commit
3. Push to remote
4. Create pull request with description
5. Request code review
6. Address review comments
7. Merge to `main`
8. Delete feature branch

---

## 9. Documentation Standards

### 9.1 Code Comments

**Write clear, concise comments:**

```typescript
// Good: Explains why, not what
// Retry failed requests with exponential backoff
// to handle temporary network issues
async function retryWithBackoff(fn: () => Promise<T>) {
  // ...
}

// Bad: Explains obvious code
// Increment counter
counter++;
```

### 9.2 Function Documentation

**Document public functions:**

```typescript
/**
 * Create a new account for the user.
 *
 * @param userId - The ID of the user creating the account
 * @param input - Account creation input
 * @param input.name - Account name (1-100 characters)
 * @param input.description - Optional account description
 * @returns The created account
 * @throws {ValidationError} If input is invalid
 * @throws {DatabaseError} If database operation fails
 *
 * @example
 * const account = await createAccount(1, {
 *   name: 'Work Account',
 *   description: 'For work-related browsing'
 * });
 */
async function createAccount(
  userId: number,
  input: CreateAccountInput
): Promise<Account> {
  // ...
}
```

### 9.3 README Files

**Maintain README for each module:**

```markdown
# Account Management

Handles account creation, modification, deletion, and switching.

## Features

- Create unlimited accounts
- Switch between accounts
- Protect accounts with biometric auth
- Assign proxies to accounts

## Usage

See [API Documentation](../api/01-TRPC-API-CONTRACTS.md) for detailed API contracts.
```

---

## 10. Security Audit Checklist

- [ ] All user input is validated
- [ ] All output is encoded
- [ ] Authentication is enforced
- [ ] Authorization is checked
- [ ] Sensitive data is encrypted
- [ ] SQL injection is prevented
- [ ] XSS is prevented
- [ ] CSRF is prevented
- [ ] Secrets are not logged
- [ ] Error messages don't leak information
- [ ] Dependencies are up to date
- [ ] Security headers are configured
- [ ] HTTPS is enforced
- [ ] Cookies are secure
- [ ] Rate limiting is implemented

---

## References

[1] OWASP Secure Coding Practices: https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/
[2] Google TypeScript Style Guide: https://google.github.io/styleguide/tsguide.html
[3] Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security/
[4] Testing Best Practices: https://testingjavascript.com/

---

**Next Document:** [PWA-to-APK Packaging Guide](./02-PWA-TO-APK-GUIDE.md)
