import type { Item, Method } from "../domain/types"

export function Explanation({
  item,
  method,
}: {
  item: Item
  method: Method | undefined
}) {
  const { why, rows, steps, trap } = item.explanation
  return (
    <section className="at-explain" aria-label="How to solve it">
      <h3>How to solve it</h3>
      <p>{why}</p>
      {rows.length > 0 && (
        <dl className="at-rows">
          {rows.map((row, i) => (
            <div key={i}>
              <dt>{row.label}</dt>
              <dd>{row.cells.join(", ")}</dd>
            </div>
          ))}
        </dl>
      )}
      {steps.length > 0 && (
        <ul>
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
      {trap && (
        <p className="at-trap">
          <strong>Trap:</strong> {trap}
        </p>
      )}
      {method && (
        <details className="at-method">
          <summary>Method: {method.name}</summary>
          <ol>
            {method.method.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ol>
          {method.example && <p>Example: {method.example}</p>}
        </details>
      )}
    </section>
  )
}
