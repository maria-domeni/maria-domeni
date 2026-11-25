/** Marca do Domeni: um caderno com a letra D e um marcador. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="flex-none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="var(--label)" />
      <rect x="4" y="4" width="11" height="56" rx="5" fill="var(--bg)" opacity="0.14" />
      <path
        fillRule="evenodd"
        fill="var(--bg)"
        d="M23 17h11.5c9.4 0 15.5 6.1 15.5 15s-6.1 15-15.5 15H23V17zm7 6.4v17.2h4.1c5.3 0 8.6-3.3 8.6-8.6s-3.3-8.6-8.6-8.6H30z"
      />
      <path d="M44 4h7v13l-3.5-2.8L44 17z" fill="var(--accent)" />
    </svg>
  );
}
