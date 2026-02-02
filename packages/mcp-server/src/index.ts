/**
 * WMS MCP Dev Accelerator Server
 *
 * This is a workspace stub package. The actual implementation is in tools/mcp-server.
 *
 * @version 1.0.0
 */

// Stub export for workspace compatibility
export const MCP_SERVER_VERSION = '1.0.0';

export interface MCPServerConfig {
  name: string;
  version: string;
}

export function createMCPServer(config: MCPServerConfig): void {
  // Actual implementation is in tools/mcp-server
  // eslint-disable-next-line no-console
  console.log(`MCP Server ${config.name} v${config.version} (stub)`);
}
