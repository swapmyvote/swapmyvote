// Test-only cookie helpers.
//
// Assigning to document.cookie is the only way to seed or clear a cookie in
// jsdom — the Cookie Store API that Biome's noDocumentCookie rule suggests is
// not implemented there (nor in Safari/Firefox). Suppress the rule once here
// instead of at every call site.

export function setTestCookie(name: string, value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: jsdom implements no Cookie Store API
  document.cookie = `${name}=${value}; path=/`;
}

export function clearTestCookie(name: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: jsdom implements no Cookie Store API
  document.cookie = `${name}=; path=/; max-age=0`;
}
