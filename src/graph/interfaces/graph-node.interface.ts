export interface Vulnerability {
  file: string;
  severity: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface GraphNode {
  name: string;
  kind: string;
  language?: string;
  path?: string;
  publicExposed?: boolean;
  vulnerabilities?: Vulnerability[];
  metadata?: Record<string, unknown>;
}
