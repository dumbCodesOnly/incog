# Proxy Integration Architecture

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Pre-Development Blueprint

---

## Executive Summary

The proxy integration architecture enables flexible network configuration through support for multiple proxy protocols including HTTP, HTTPS, SOCKS5, and V2Ray. This document details the proxy configuration management, connection handling, and integration with the account isolation system.

---

## 1. Proxy Protocol Support

### 1.1 Supported Protocols

The Incog browser supports the following proxy protocols:

| Protocol          | Type        | Port           | Authentication    | Encryption  | Use Case                  |
| ----------------- | ----------- | -------------- | ----------------- | ----------- | ------------------------- |
| HTTP              | Standard    | 80, 8080, 3128 | Basic, Digest     | None        | Legacy systems, debugging |
| HTTPS             | Tunneling   | 443, 8443      | Basic, Digest     | TLS         | Secure proxying           |
| SOCKS5            | Tunneling   | 1080, 1081     | Username/Password | None        | Universal protocol        |
| V2Ray VMess       | Encrypted   | Custom         | UUID              | AES-128-GCM | Circumvention, privacy    |
| V2Ray VLESS       | Lightweight | Custom         | UUID              | TLS         | High performance          |
| V2Ray Trojan      | Disguised   | 443            | Password          | TLS         | Evasion, stealth          |
| V2Ray Shadowsocks | Stream      | Custom         | Password          | ChaCha20    | Lightweight, fast         |

### 1.2 Protocol Selection

Users select proxy protocol based on requirements:

**HTTP/HTTPS:** Simple, widely supported, suitable for corporate environments
**SOCKS5:** Universal, supports any protocol, suitable for general use
**V2Ray:** Advanced, encrypted, suitable for circumvention and privacy

---

## 2. Proxy Configuration Management

### 2.1 Configuration Data Model

**Proxy Configuration Schema:**

```typescript
interface ProxyConfig {
  id: string; // UUID
  userId: string; // Foreign key
  name: string; // Encrypted
  type: ProxyType; // HTTP, HTTPS, SOCKS5, V2RAY_*
  host: string; // IP or hostname
  port: number; // 1-65535
  username?: string; // Encrypted
  password?: string; // Encrypted
  v2rayConfig?: V2RayConfig; // JSON, Encrypted
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTestedAt?: Date;
  testResult?: ProxyTestResult;
}

enum ProxyType {
  HTTP = "HTTP",
  HTTPS = "HTTPS",
  SOCKS5 = "SOCKS5",
  V2RAY_VMESS = "V2RAY_VMESS",
  V2RAY_VLESS = "V2RAY_VLESS",
  V2RAY_TROJAN = "V2RAY_TROJAN",
  V2RAY_SHADOWSOCKS = "V2RAY_SHADOWSOCKS",
}

interface ProxyTestResult {
  success: boolean;
  latency: number; // milliseconds
  timestamp: Date;
  error?: string;
}
```

**Database Schema:**

```sql
CREATE TABLE proxy_configs (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  name VARBINARY(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INT NOT NULL,
  username VARBINARY(255),
  password VARBINARY(255),
  v2ray_config LONGTEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_tested_at TIMESTAMP,
  test_result_success BOOLEAN,
  test_result_latency INT,
  test_result_error TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_type (type)
);

CREATE TABLE account_proxy_assignments (
  id VARCHAR(36) PRIMARY KEY,
  account_id VARCHAR(36) NOT NULL,
  proxy_config_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (proxy_config_id) REFERENCES proxy_configs(id),
  UNIQUE KEY unique_account_proxy (account_id)
);
```

### 2.2 Configuration Creation

**Create Proxy Configuration:**

```typescript
export const proxy = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: z.nativeEnum(ProxyType),
        host: z.string().ip().or(z.string().hostname()),
        port: z.number().int().min(1).max(65535),
        username: z.string().optional(),
        password: z.string().optional(),
        v2rayConfig: z
          .object({
            protocol: z.enum(["vmess", "vless", "trojan", "shadowsocks"]),
            server: z.string(),
            port: z.number(),
            uuid: z.string().optional(),
            password: z.string().optional(),
            cipher: z.string().optional(),
            tls: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const proxyId = generateUUID();

      // Encrypt sensitive fields
      const encryptedName = await encryptData(input.name, userKey);
      const encryptedUsername = input.username
        ? await encryptData(input.username, userKey)
        : null;
      const encryptedPassword = input.password
        ? await encryptData(input.password, userKey)
        : null;
      const encryptedV2rayConfig = input.v2rayConfig
        ? await encryptData(JSON.stringify(input.v2rayConfig), userKey)
        : null;

      // Store in database
      await db.insert(proxyConfigs).values({
        id: proxyId,
        userId: user.id,
        name: encryptedName,
        type: input.type,
        host: input.host,
        port: input.port,
        username: encryptedUsername,
        password: encryptedPassword,
        v2rayConfig: encryptedV2rayConfig,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id: proxyId };
    }),
});
```

### 2.3 Configuration Assignment

**Assign Proxy to Account:**

```typescript
export const account = router({
  assignProxy: protectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        proxyConfigId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { accountId, proxyConfigId } = input;

      // Verify user owns account
      const account = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id)))
        .limit(1);

      if (!account.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Verify user owns proxy config (if provided)
      if (proxyConfigId) {
        const proxy = await db
          .select()
          .from(proxyConfigs)
          .where(
            and(
              eq(proxyConfigs.id, proxyConfigId),
              eq(proxyConfigs.userId, user.id)
            )
          )
          .limit(1);

        if (!proxy.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proxy config not found",
          });
        }
      }

      // Update or insert assignment
      await db
        .insert(accountProxyAssignments)
        .values({
          id: generateUUID(),
          accountId,
          proxyConfigId: proxyConfigId || null,
          createdAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: { proxyConfigId: proxyConfigId || null },
        });

      return { success: true };
    }),
});
```

---

## 3. Proxy Connection Management

### 3.1 Connection Pool

**Connection Pool Architecture:**

```typescript
interface ProxyConnection {
  id: string;
  proxyConfigId: string;
  socket: net.Socket;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
  requestCount: number;
}

class ProxyConnectionPool {
  private pools: Map<string, ProxyConnection[]> = new Map();
  private maxConnections: number = 10;
  private idleTimeout: number = 60000; // 1 minute
  private connectionTimeout: number = 10000; // 10 seconds

  async acquire(proxyConfigId: string): Promise<ProxyConnection> {
    // Get pool for proxy config
    let pool = this.pools.get(proxyConfigId);
    if (!pool) {
      pool = [];
      this.pools.set(proxyConfigId, pool);
    }

    // Return idle connection if available
    const idleConnection = pool.find(
      c => !c.isActive && Date.now() - c.lastUsedAt < this.idleTimeout
    );
    if (idleConnection) {
      idleConnection.isActive = true;
      return idleConnection;
    }

    // Create new connection if under limit
    if (pool.length < this.maxConnections) {
      const connection = await this.createConnection(proxyConfigId);
      pool.push(connection);
      return connection;
    }

    // Wait for connection to become available
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const available = pool.find(
          c => !c.isActive && Date.now() - c.lastUsedAt < this.idleTimeout
        );
        if (available) {
          clearInterval(checkInterval);
          available.isActive = true;
          resolve(available);
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("No available connections"));
      }, 30000);
    });
  }

  async release(
    proxyConfigId: string,
    connection: ProxyConnection
  ): Promise<void> {
    connection.isActive = false;
    connection.lastUsedAt = new Date();
    connection.requestCount++;
  }

  private async createConnection(
    proxyConfigId: string
  ): Promise<ProxyConnection> {
    // Get proxy config
    const proxyConfig = await getProxyConfig(proxyConfigId);

    // Create socket based on proxy type
    const socket = await this.createSocket(proxyConfig);

    return {
      id: generateUUID(),
      proxyConfigId,
      socket,
      isActive: true,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      requestCount: 0,
    };
  }

  private async createSocket(config: ProxyConfig): Promise<net.Socket> {
    switch (config.type) {
      case ProxyType.HTTP:
      case ProxyType.HTTPS:
        return this.createHttpSocket(config);
      case ProxyType.SOCKS5:
        return this.createSocks5Socket(config);
      case ProxyType.V2RAY_VMESS:
      case ProxyType.V2RAY_VLESS:
      case ProxyType.V2RAY_TROJAN:
      case ProxyType.V2RAY_SHADOWSOCKS:
        return this.createV2RaySocket(config);
      default:
        throw new Error(`Unsupported proxy type: ${config.type}`);
    }
  }

  private createHttpSocket(config: ProxyConfig): net.Socket {
    const socket = net.createConnection({
      host: config.host,
      port: config.port,
      timeout: this.connectionTimeout,
    });

    return socket;
  }

  private createSocks5Socket(config: ProxyConfig): net.Socket {
    const socket = net.createConnection({
      host: config.host,
      port: config.port,
      timeout: this.connectionTimeout,
    });

    // Implement SOCKS5 handshake
    socket.on("connect", () => {
      const handshake = Buffer.from([0x05, 0x02, 0x00, 0x02]);
      socket.write(handshake);
    });

    return socket;
  }

  private async createV2RaySocket(config: ProxyConfig): Promise<net.Socket> {
    // V2Ray socket creation handled by V2Ray core
    // This is a placeholder for integration
    throw new Error("V2Ray socket creation not yet implemented");
  }
}

const connectionPool = new ProxyConnectionPool();
```

### 3.2 Request Routing

**Route Request Through Proxy:**

```typescript
async function routeRequestThroughProxy(
  request: Request,
  proxyConfig: ProxyConfig
): Promise<Response> {
  // Get connection from pool
  const connection = await connectionPool.acquire(proxyConfig.id);

  try {
    // Route request based on proxy type
    const response = await routeByProxyType(request, proxyConfig, connection);

    return response;
  } catch (error) {
    // Log error
    await logProxyError({
      proxyConfigId: proxyConfig.id,
      error: error.message,
      timestamp: new Date(),
    });

    throw error;
  } finally {
    // Release connection back to pool
    await connectionPool.release(proxyConfig.id, connection);
  }
}

async function routeByProxyType(
  request: Request,
  proxyConfig: ProxyConfig,
  connection: ProxyConnection
): Promise<Response> {
  switch (proxyConfig.type) {
    case ProxyType.HTTP:
    case ProxyType.HTTPS:
      return routeHttpProxy(request, proxyConfig, connection);
    case ProxyType.SOCKS5:
      return routeSocks5Proxy(request, proxyConfig, connection);
    case ProxyType.V2RAY_VMESS:
    case ProxyType.V2RAY_VLESS:
    case ProxyType.V2RAY_TROJAN:
    case ProxyType.V2RAY_SHADOWSOCKS:
      return routeV2RayProxy(request, proxyConfig, connection);
    default:
      throw new Error(`Unsupported proxy type: ${proxyConfig.type}`);
  }
}

async function routeHttpProxy(
  request: Request,
  proxyConfig: ProxyConfig,
  connection: ProxyConnection
): Promise<Response> {
  const url = new URL(request.url);

  // Build proxy request
  const proxyRequest = `${request.method} ${url.pathname}${url.search} HTTP/1.1\r\n`;
  const headers = new Headers(request.headers);
  headers.set("Host", url.hostname);

  // Add proxy authentication if needed
  if (proxyConfig.username && proxyConfig.password) {
    const credentials = btoa(`${proxyConfig.username}:${proxyConfig.password}`);
    headers.set("Proxy-Authorization", `Basic ${credentials}`);
  }

  // Send request through proxy
  connection.socket.write(proxyRequest);
  connection.socket.write(headers.toString());
  connection.socket.write("\r\n");

  if (request.body) {
    connection.socket.write(await request.arrayBuffer());
  }

  // Read response
  return new Promise((resolve, reject) => {
    let responseData = "";

    connection.socket.on("data", chunk => {
      responseData += chunk.toString();
    });

    connection.socket.on("end", () => {
      // Parse HTTP response
      const [statusLine, ...headerLines] = responseData.split("\r\n");
      const [, statusCode, statusText] = statusLine.split(" ");

      const headers = new Headers();
      for (const line of headerLines) {
        if (line.includes(":")) {
          const [key, value] = line.split(":", 2);
          headers.set(key.trim(), value.trim());
        }
      }

      // Extract body
      const bodyStart = responseData.indexOf("\r\n\r\n") + 4;
      const body = responseData.substring(bodyStart);

      resolve(
        new Response(body, {
          status: parseInt(statusCode),
          statusText,
          headers,
        })
      );
    });

    connection.socket.on("error", reject);
  });
}
```

---

## 4. Proxy Testing

### 4.1 Connectivity Testing

**Test Proxy Connection:**

```typescript
export const proxy = router({
  test: protectedProcedure
    .input(
      z.object({
        proxyConfigId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { proxyConfigId } = input;

      // Get proxy config
      const proxyConfig = await db
        .select()
        .from(proxyConfigs)
        .where(
          and(
            eq(proxyConfigs.id, proxyConfigId),
            eq(proxyConfigs.userId, user.id)
          )
        )
        .limit(1);

      if (!proxyConfig.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proxy config not found",
        });
      }

      const startTime = Date.now();

      try {
        // Test connectivity
        const response = await fetch("https://httpbin.org/ip", {
          method: "GET",
          timeout: 10000,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const latency = Date.now() - startTime;

        // Update test result
        await db
          .update(proxyConfigs)
          .set({
            lastTestedAt: new Date(),
            testResultSuccess: true,
            testResultLatency: latency,
            testResultError: null,
          })
          .where(eq(proxyConfigs.id, proxyConfigId));

        return {
          success: true,
          latency,
          error: null,
        };
      } catch (error) {
        const latency = Date.now() - startTime;

        // Update test result
        await db
          .update(proxyConfigs)
          .set({
            lastTestedAt: new Date(),
            testResultSuccess: false,
            testResultLatency: latency,
            testResultError: error.message,
          })
          .where(eq(proxyConfigs.id, proxyConfigId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Proxy test failed: ${error.message}`,
        });
      }
    }),
});
```

### 4.2 Performance Monitoring

**Monitor Proxy Performance:**

```typescript
interface ProxyMetrics {
  proxyConfigId: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  lastUpdated: Date;
}

class ProxyMetricsCollector {
  private metrics: Map<string, ProxyMetrics> = new Map();

  recordRequest(
    proxyConfigId: string,
    latency: number,
    success: boolean
  ): void {
    let metric = this.metrics.get(proxyConfigId);

    if (!metric) {
      metric = {
        proxyConfigId,
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        averageLatency: 0,
        maxLatency: 0,
        minLatency: Infinity,
        lastUpdated: new Date(),
      };
      this.metrics.set(proxyConfigId, metric);
    }

    metric.requestCount++;
    if (success) {
      metric.successCount++;
    } else {
      metric.failureCount++;
    }

    // Update latency stats
    const totalLatency =
      metric.averageLatency * (metric.requestCount - 1) + latency;
    metric.averageLatency = totalLatency / metric.requestCount;
    metric.maxLatency = Math.max(metric.maxLatency, latency);
    metric.minLatency = Math.min(metric.minLatency, latency);
    metric.lastUpdated = new Date();
  }

  getMetrics(proxyConfigId: string): ProxyMetrics | undefined {
    return this.metrics.get(proxyConfigId);
  }
}

const metricsCollector = new ProxyMetricsCollector();
```

---

## 5. V2Ray Integration

### 5.1 V2Ray Configuration

**V2Ray Configuration Model:**

```typescript
interface V2RayConfig {
  protocol: "vmess" | "vless" | "trojan" | "shadowsocks";
  server: string;
  port: number;

  // VMess specific
  uuid?: string;
  alterId?: number;
  security?: "auto" | "none" | "aes-128-gcm" | "chacha20-poly1305";

  // VLESS specific
  flow?: "xtls-rprx-vision" | "xtls-rprx-vision-udp443";

  // Trojan specific
  password?: string;

  // Shadowsocks specific
  cipher?: string;

  // Common
  tls?: boolean;
  sni?: string;
  alpn?: string[];
  allowInsecure?: boolean;
  fingerprint?: string;
}

// Convert to V2Ray JSON config
function toV2RayJson(config: V2RayConfig): object {
  const outbound: any = {
    protocol: config.protocol,
    settings: {
      servers: [
        {
          address: config.server,
          port: config.port,
        },
      ],
    },
  };

  // Add protocol-specific settings
  if (config.protocol === "vmess") {
    outbound.settings.servers[0].users = [
      {
        id: config.uuid,
        alterId: config.alterId || 0,
        security: config.security || "auto",
      },
    ];
  } else if (config.protocol === "vless") {
    outbound.settings.servers[0].users = [
      {
        id: config.uuid,
        flow: config.flow,
      },
    ];
  } else if (config.protocol === "trojan") {
    outbound.settings.servers[0].password = config.password;
  } else if (config.protocol === "shadowsocks") {
    outbound.settings.servers[0].cipher = config.cipher;
    outbound.settings.servers[0].password = config.password;
  }

  // Add TLS settings
  if (config.tls) {
    outbound.streamSettings = {
      network: "tcp",
      security: "tls",
      tlsSettings: {
        serverName: config.sni,
        allowInsecure: config.allowInsecure,
        fingerprint: config.fingerprint,
      },
    };

    if (config.alpn) {
      outbound.streamSettings.tlsSettings.alpn = config.alpn;
    }
  }

  return outbound;
}
```

### 5.2 V2Ray Core Integration

**V2Ray Core Wrapper:**

```typescript
import { spawn } from "child_process";

class V2RayCore {
  private process: ChildProcess | null = null;
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  async start(config: V2RayConfig): Promise<void> {
    // Write config to file
    const v2rayConfig = {
      log: { loglevel: "warning" },
      inbounds: [
        {
          port: 10808,
          protocol: "socks",
          settings: { auth: "noauth" },
        },
      ],
      outbounds: [toV2RayJson(config)],
    };

    await writeFile(this.configPath, JSON.stringify(v2rayConfig, null, 2));

    // Start V2Ray process
    this.process = spawn("v2ray", ["-c", this.configPath]);

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
}
```

---

## 6. Error Handling & Fallback

### 6.1 Proxy Error Handling

**Error Classification:**

```typescript
enum ProxyErrorType {
  CONNECTION_REFUSED = "CONNECTION_REFUSED",
  CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  INVALID_PROTOCOL = "INVALID_PROTOCOL",
  NETWORK_UNREACHABLE = "NETWORK_UNREACHABLE",
  UNKNOWN = "UNKNOWN",
}

function classifyProxyError(error: Error): ProxyErrorType {
  const message = error.message.toLowerCase();

  if (message.includes("connection refused")) {
    return ProxyErrorType.CONNECTION_REFUSED;
  } else if (message.includes("timeout")) {
    return ProxyErrorType.CONNECTION_TIMEOUT;
  } else if (message.includes("authentication")) {
    return ProxyErrorType.AUTHENTICATION_FAILED;
  } else if (message.includes("protocol")) {
    return ProxyErrorType.INVALID_PROTOCOL;
  } else if (message.includes("unreachable")) {
    return ProxyErrorType.NETWORK_UNREACHABLE;
  }

  return ProxyErrorType.UNKNOWN;
}
```

### 6.2 Fallback Strategy

**Fallback to Direct Connection:**

```typescript
async function routeRequestWithFallback(
  request: Request,
  proxyConfig: ProxyConfig | null
): Promise<Response> {
  try {
    if (proxyConfig) {
      // Try proxy first
      return await routeRequestThroughProxy(request, proxyConfig);
    } else {
      // Direct connection
      return await fetch(request);
    }
  } catch (error) {
    // If proxy fails, fall back to direct connection
    if (proxyConfig) {
      console.warn(
        `Proxy failed: ${error.message}, falling back to direct connection`
      );
      return await fetch(request);
    }

    throw error;
  }
}
```

---

## 7. Security Considerations

### 7.1 Credential Protection

**Encrypt Proxy Credentials:**

```typescript
// Store credentials encrypted
const encryptedUsername = await encryptData(username, userKey);
const encryptedPassword = await encryptData(password, userKey);

// Decrypt only when needed
const decryptedUsername = await decryptData(encryptedUsername, userKey);
const decryptedPassword = await decryptData(encryptedPassword, userKey);

// Never log credentials
console.log(`Proxy: ${host}:${port}`); // OK
console.log(`Proxy: ${host}:${port} ${username}:${password}`); // NEVER
```

### 7.2 Proxy Validation

**Validate Proxy Configuration:**

```typescript
function validateProxyConfig(config: ProxyConfig): boolean {
  // Validate host
  if (!isValidHostname(config.host) && !isValidIpAddress(config.host)) {
    return false;
  }

  // Validate port
  if (config.port < 1 || config.port > 65535) {
    return false;
  }

  // Validate protocol-specific settings
  if (config.type === ProxyType.SOCKS5) {
    // SOCKS5 requires port to be open
    if (config.port < 1024) {
      return false; // Privileged port
    }
  }

  return true;
}
```

---

## References

[1] SOCKS Protocol: https://tools.ietf.org/html/rfc1928
[2] HTTP Tunneling: https://tools.ietf.org/html/rfc7230
[3] V2Ray Project: https://www.v2ray.com/
[4] Node.js Net Module: https://nodejs.org/api/net.html
[5] Proxy Best Practices: https://owasp.org/www-community/attacks/Proxy_Abuse

---

**Next Document:** [Database Schema Documentation](../database/01-SCHEMA-DESIGN.md)
