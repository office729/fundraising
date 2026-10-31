// Text cu fragmente îngroșate marcate **așa** în dicționar (fără HTML în șiruri traduse).
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((parte, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="text-[var(--ci-text)]">
            {parte}
          </strong>
        ) : (
          parte
        ),
      )}
    </>
  );
}
