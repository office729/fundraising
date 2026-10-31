import { Fragment } from "react";

// Text scurt din dicționar cu accente: **îngroșat** și __cursiv__. Nu interpretează HTML.
export function Rich({ text, boldClassName }: { text: string; boldClassName?: string }) {
  const parti = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return (
    <>
      {parti.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <b key={i} className={boldClassName}>
            {p.slice(2, -2)}
          </b>
        ) : p.startsWith("__") && p.endsWith("__") ? (
          <i key={i}>{p.slice(2, -2)}</i>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
