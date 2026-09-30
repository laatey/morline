import { Toaster as Sonner } from "sonner";
import { AlertCircle, Check, Info, Loader2, TriangleAlert } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Morline notifications: compact, monochrome pill with a single status glyph. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-center"
      gap={6}
      offset={20}
      visibleToasts={3}
      duration={3200}
      icons={{
        success: <Check className="h-3.5 w-3.5 text-score" />,
        error: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
        warning: <TriangleAlert className="h-3.5 w-3.5 text-score-mid" />,
        info: <Info className="h-3.5 w-3.5 text-muted-foreground" />,
        loading: <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-2.5 rounded-xl border bg-popover/95 px-3.5 py-2.5 text-popover-foreground shadow-[0_12px_40px_-12px_oklch(0_0_0/0.6)] backdrop-blur-md sm:w-auto sm:max-w-[380px]",
          title: "text-[13px] font-medium leading-snug",
          description: "text-xs text-muted-foreground",
          icon: "flex shrink-0 items-center",
          actionButton: "ml-auto shrink-0 rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background",
          cancelButton: "shrink-0 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
