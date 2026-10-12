import { Input } from "@/components/ui/input";
import { cleanPort, imageProblem } from "@/lib/docker-image";

export type DockerImageValues = { image: string; port: string };

/** Image and port fields shared by the add-service and add-project dialogs. */
export function DockerImageFields({
  values,
  onChange,
  autoFocus = true,
}: {
  values: DockerImageValues;
  onChange: (v: DockerImageValues) => void;
  autoFocus?: boolean;
}) {
  const problem = imageProblem(values.image);
  return (
    <>
      <label className="block text-xs text-muted-foreground">
        Image
        <Input
          autoFocus={autoFocus}
          value={values.image}
          onChange={(e) => onChange({ ...values, image: e.target.value.trim() })}
          placeholder="nginx:latest or ghcr.io/acme/app:1.0"
          spellCheck={false}
          autoCapitalize="off"
          aria-invalid={!!problem}
          className="mt-1 h-9 font-mono text-sm"
        />
        {problem ? (
          <span className="mt-1 block text-[11px] text-destructive">{problem}</span>
        ) : (
          <span className="mt-1 block text-[11px]">
            Public images from Docker Hub, GHCR or any registry. Private registries aren't supported
            yet.
          </span>
        )}
      </label>
      <label className="block text-xs text-muted-foreground">
        Port <span className="text-muted-foreground/70">(optional)</span>
        <Input
          inputMode="numeric"
          value={values.port}
          onChange={(e) => onChange({ ...values, port: cleanPort(e.target.value) })}
          placeholder="Detected from the image"
          className="mt-1 h-9 w-48 font-mono text-sm"
        />
      </label>
    </>
  );
}
