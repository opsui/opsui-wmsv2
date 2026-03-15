export function isPublicV1Route(path: string): boolean {
  return path.startsWith('/auth') || /^\/skus\/netsuite-image(?:\/|$)/.test(path);
}
