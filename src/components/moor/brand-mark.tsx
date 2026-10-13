/** The Morline mark (same paths as the favicon), drawn in the current text colour. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5 14.8Q5 11 8.14 8.85L11.36 6.65Q14.5 4.5 14.5 8.3V14.2Q14.5 18 11.36 20.15L8.14 22.35Q5 24.5 5 20.7Z" />
      <path d="M17.5 17.8Q17.5 14 20.64 11.85L23.86 9.65Q27 7.5 27 11.3V17.2Q27 21 23.86 23.15L20.64 25.35Q17.5 27.5 17.5 23.7Z" />
    </svg>
  );
}
