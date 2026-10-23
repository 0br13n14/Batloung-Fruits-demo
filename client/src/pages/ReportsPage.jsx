import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { LoadingMessage } from '../components/LoadingMessage'
import { buildQuery } from '../hooks/useApiList'
import { api } from '../services/api'
import { formatCurrency, formatDate } from '../utils/formatters'

const reports = {
  'available-stock': {
    label: 'Available stock',
    columns: [
      { key: 'fruit_name', header: 'Fruit' },
      { key: 'box_size', header: 'Box size' },
      { key: 'quantity_available', header: 'Available boxes', numeric: true },
    ],
    totals: [{ key: 'quantity_available', label: 'Available boxes' }],
  },
  'sales-by-fruit': {
    label: 'Sales by fruit',
    columns: [
      { key: 'fruit_name', header: 'Fruit' },
      { key: 'boxes_sold', header: 'Boxes sold', numeric: true },
      { key: 'sales_value', header: 'Sales value', numeric: true, currency: true },
    ],
    totals: [
      { key: 'boxes_sold', label: 'Boxes sold' },
      { key: 'sales_value', label: 'Sales value', currency: true },
    ],
  },
  'sales-by-box-size': {
    label: 'Sales by box size',
    columns: [
      { key: 'box_size', header: 'Box size' },
      { key: 'boxes_sold', header: 'Boxes sold', numeric: true },
      { key: 'sales_value', header: 'Sales value', numeric: true, currency: true },
    ],
    totals: [
      { key: 'boxes_sold', label: 'Boxes sold' },
      { key: 'sales_value', label: 'Sales value', currency: true },
    ],
  },
  'sales-by-vendor': {
    label: 'Sales by vendor',
    columns: [
      { key: 'vendor_name', header: 'Vendor' },
      { key: 'boxes_sold', header: 'Boxes sold', numeric: true },
      { key: 'sales_value', header: 'Sales value', numeric: true, currency: true },
    ],
    totals: [
      { key: 'boxes_sold', label: 'Boxes sold' },
      { key: 'sales_value', label: 'Sales value', currency: true },
    ],
  },
  'purchases-by-province': {
    label: 'Purchases by province',
    columns: [
      { key: 'province_name', header: 'Province' },
      { key: 'boxes_purchased', header: 'Boxes purchased', numeric: true },
      { key: 'total_cost', header: 'Purchase cost', numeric: true, currency: true },
    ],
    totals: [
      { key: 'boxes_purchased', label: 'Boxes purchased' },
      { key: 'total_cost', label: 'Purchase cost', currency: true },
    ],
  },
  'pending-orders': {
    label: 'Pending orders',
    columns: [
      { key: 'id', header: 'Order' },
      { key: 'vendor_name', header: 'Vendor' },
      { key: 'order_date', header: 'Date', date: true },
      { key: 'status', header: 'Status' },
      { key: 'total_amount', header: 'Order value', numeric: true, currency: true },
    ],
    totals: [{ key: 'total_amount', label: 'Order value', currency: true }],
    orderCount: true,
  },
  'completed-orders': {
    label: 'Completed orders',
    columns: [
      { key: 'id', header: 'Order' },
      { key: 'vendor_name', header: 'Vendor' },
      { key: 'order_date', header: 'Date', date: true },
      { key: 'status', header: 'Status' },
      { key: 'total_amount', header: 'Order value', numeric: true, currency: true },
    ],
    totals: [{ key: 'total_amount', label: 'Order value', currency: true }],
    orderCount: true,
  },
  'total-sales-by-date': {
    label: 'Total sales by date',
    columns: [
      { key: 'sale_date', header: 'Date', date: true },
      { key: 'sales_value', header: 'Sales value', numeric: true, currency: true },
    ],
    totals: [{ key: 'sales_value', label: 'Sales value', currency: true }],
    dateFilter: true,
  },
}

function getCellValue(row, column) {
  const value = row[column.key]
  if (value == null) return '—'
  if (column.currency) return formatCurrency(value)
  if (column.date) return formatDate(value)
  return value
}

function escapeCsvCell(value) {
  const text = String(value ?? '')
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safeText.replaceAll('"', '""')}"`
}

function exportReport(reportName, report, rows) {
  const csv = [
    report.columns.map(({ header }) => escapeCsvCell(header)).join(','),
    ...rows.map((row) =>
      report.columns.map((column) => escapeCsvCell(row[column.key])).join(','),
    ),
  ].join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${reportName}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function ReportsPage() {
  const [reportName, setReportName] = useState('available-stock')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [result, setResult] = useState({ requestKey: '', rows: [], error: '' })
  const currentReport = reports[reportName]
  const query = useMemo(
    () => buildQuery(currentReport.dateFilter ? { from, to } : {}),
    [currentReport.dateFilter, from, to],
  )
  const requestKey = `${reportName}?${query}`
  const isLoading = result.requestKey !== requestKey
  const rows = isLoading ? [] : result.rows
  const error = isLoading ? '' : result.error

  useEffect(() => {
    const controller = new AbortController()
    api
      .get(`/reports/${reportName}${query ? `?${query}` : ''}`, {
        signal: controller.signal,
      })
      .then((response) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey, rows: response.data, error: '' })
        }
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError' && !controller.signal.aborted) {
          setResult({ requestKey, rows: [], error: requestError.message })
        }
      })

    return () => controller.abort()
  }, [query, reportName, requestKey])

  const columns = currentReport.columns.map((column) => ({
    ...column,
    render: (row) => getCellValue(row, column),
  }))
  const totals = currentReport.totals.map(({ key, label, currency }) => {
    const total = rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0)
    return { label, value: currency ? formatCurrency(total) : total }
  })

  return (
    <section aria-labelledby="reports-heading" className="management-page reports-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Administrator workspace</p>
          <h2 id="reports-heading">Reports</h2>
          <p className="page-description">Review and export distribution reports.</p>
        </div>
        <div className="report-actions">
          <button className="button button--secondary" onClick={() => window.print()} type="button">
            Print
          </button>
          <button
            className="button button--primary"
            disabled={isLoading || Boolean(error)}
            onClick={() => exportReport(reportName, currentReport, rows)}
            type="button"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="report-controls">
        <FormField label="Report" name="report-name">
          <select
            onChange={(event) => setReportName(event.target.value)}
            value={reportName}
          >
            {Object.entries(reports).map(([name, report]) => (
              <option key={name} value={name}>{report.label}</option>
            ))}
          </select>
        </FormField>
        {currentReport.dateFilter && (
          <>
            <FormField label="From" name="report-from">
              <input
                onChange={(event) => setFrom(event.target.value)}
                type="date"
                value={from}
              />
            </FormField>
            <FormField label="To" name="report-to">
              <input
                onChange={(event) => setTo(event.target.value)}
                type="date"
                value={to}
              />
            </FormField>
          </>
        )}
      </div>

      <section aria-live="polite" aria-labelledby="current-report-heading" className="report-result">
        <h3 id="current-report-heading">{currentReport.label}</h3>
        {isLoading ? (
          <div className="table-state"><LoadingMessage message="Loading report..." /></div>
        ) : (
          <DataTable
            columns={columns}
            emptyMessage="No report data found."
            error={error}
            rows={rows}
          />
        )}
        {!isLoading && !error && (
          <div aria-label="Report totals" className="report-totals">
            {currentReport.orderCount && (
              <p><strong>Orders:</strong> {rows.length}</p>
            )}
            {totals.map(({ label, value }) => (
              <p key={label}><strong>{label} total:</strong> {value}</p>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
