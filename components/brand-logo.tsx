// Brand mark: the World Cup emblem we use as the favicon, shown in place of the
// old "26" text badge in the header, auth, and setup screens. Served from
// /brand-logo.png (a copy of the app icon).
export function BrandLogo({ size = 46 }: { size?: number }) {
  return (
    <img
      src="/brand-logo.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ borderRadius: 13, display: "block", flex: "0 0 auto" }}
    />
  );
}
