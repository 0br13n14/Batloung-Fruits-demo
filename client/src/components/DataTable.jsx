import { LoadingMessage } from './LoadingMessage'

export function DataTable({
  columns,
  rows = [],
  rowKey = 'id',
  loading = false,
  error = '',
  emptyMessage = 'No records found.',
  onRetry,
}) {
  if (loading) {
    return (
      <div className="table-state">
        <LoadingMessage message="Loading records..." />
      </div>
    )
  }
  if (error) {
    return (
      <div className="table-state table-state--error" role="alert">
        <p>{error}</p>
        {onRetry && (
          <button className="button button--secondary" type="button" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    )
  }
  if (rows.length === 0) {
    return <div className="table-state">{emptyMessage}</div>
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.numeric ? 'text-right' : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row[rowKey] ?? index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.numeric ? 'text-right' : undefined}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
