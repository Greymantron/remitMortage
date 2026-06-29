import { describe, expect, it } from "@jest/globals";

describe("Next.js content security policy headers", () => {
  it("applies a CSP header to all routes and restricts sources correctly", async () => {
    const { default: nextConfig } = await import("../next.config");

    expect(typeof nextConfig.headers).toBe("function");

    const headers = await nextConfig.headers();
    const cspHeader = headers.find(
      (header) => header.key.toLowerCase() === "content-security-policy"
    );

    expect(cspHeader).toBeDefined();
    expect(cspHeader?.value).toContain("default-src 'self'");
    expect(cspHeader?.value).toContain("script-src 'self'");
    expect(cspHeader?.value).toContain("connect-src 'self'");
    expect(cspHeader?.value).toContain("img-src 'self'");
    expect(cspHeader?.value).toContain("https://ipfs.io");
    expect(cspHeader?.value).toContain("https://cloudflare-ipfs.com");
    expect(cspHeader?.value).toContain("https://gateway.pinata.cloud");
    expect(cspHeader?.value).toContain("https://horizon-testnet.stellar.org");
    expect(cspHeader?.value).toContain("https://soroban-testnet.stellar.org");
    expect(cspHeader?.value).not.toContain("'unsafe-inline'");
    expect(cspHeader?.value).not.toContain("unsafe-eval");
  });
});
