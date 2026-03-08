export function formatCertIssuedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function maskVerificationCode(code: string): string {
  if (code.length <= 8) return code;
  return `${code.slice(0, 8)}...`;
}
