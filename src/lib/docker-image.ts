// Mirrors the server's validation (src/engine/image-ref.js) so the form can explain a bad
// reference before anything is sent.
const REF =
  /^[a-z0-9][a-z0-9._-]*(?::[0-9]{1,5})?(?:\/[a-z0-9][a-z0-9._-]*)*(?::[A-Za-z0-9_][A-Za-z0-9._-]{0,127})?(?:@sha256:[a-f0-9]{64})?$/;

export const isValidImageRef = (ref: string) =>
  ref.length > 0 && ref.length <= 255 && !ref.startsWith("-") && REF.test(ref);

/** "ghcr.io/acme/billing-api:1.2" -> "billing-api" */
export function defaultNameFromImage(ref: string) {
  const last = ref.split("@")[0]!.split("/").pop() ?? "";
  return (
    last
      .split(":")[0]!
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "service"
  );
}

export const cleanPort = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 5);

export function imageProblem(image: string): string | null {
  const v = image.trim();
  if (!v) return null;
  if (/\s/.test(v)) return "An image reference can't contain spaces.";
  if (!isValidImageRef(v))
    return "Use the form name:tag, for example ghcr.io/acme/app:1.0 (lowercase).";
  return null;
}
