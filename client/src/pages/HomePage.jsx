import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataTable } from '../components/DataTable'
import { LoadingMessage } from '../components/LoadingMessage'
import { StatusBadge } from '../components/StatusBadge'
import { ORDER_STATUSES, ROLES } from '../constants'
import { useAuth } from '../context/useAuth'
import { api } from '../services/api'
import { formatCurrency, formatDate } from '../utils/formatters'

const initialDashboard = {
  summary: {},
  sales_by_fruit: [],
  orders_by_status: [],
  recent_orders: [],
}

const adminCards = [
  { key: 'total_fruits', label: 'Total fruits' },
  { key: 'total_suppliers', label: 'Total suppliers' },
  { key: 'total_registered_vendors', label: 'Registered vendors' },
  { key: 'available_stock', label: 'Available stock (boxes)' },
  { key: 'total_orders', label: 'Total orders' },
  { key: 'pending_orders', label: 'Pending orders' },
  { key: 'completed_orders', label: 'Completed orders' },
  {
    key: 'sales_value',
    label: 'Sales value',
    format: formatCurrency,
  },
]

const salesCards = [
  { key: 'total_fruits', label: 'Total fruits' },
  { key: 'total_registered_vendors', label: 'Registered vendors' },
  { key: 'available_stock', label: 'Available stock (boxes)' },
  { key: 'total_orders', label: 'Total orders' },
  { key: 'pending_orders', label: 'Pending orders' },
  { key: 'completed_orders', label: 'Completed orders' },
]

function countOrders(orders, status) {
  return orders.filter((order) => order.status === status).length
}

async function loadSalesDashboard(signal) {
  const [fruitsResponse, vendorsResponse, stockResponse, ordersResponse] =
    await Promise.all([
      api.get('/fruits?status=Active', { signal }),
      api.get('/vendors', { signal }),
      api.get('/stock', { signal }),
      api.get('/orders', { signal }),
    ])
  const orders = ordersResponse.orders

  return {
    ...initialDashboard,
    summary: {
      total_fruits: fruitsResponse.fruits.length,
      total_registered_vendors: vendorsResponse.vendors.length,
      available_stock: stockResponse.stock.reduce(
        (total, item) => total + Number(item.quantity_available),
        0,
      ),
      total_orders: orders.length,
      pending_orders: countOrders(orders, ORDER_STATUSES.PENDING),
      completed_orders: countOrders(orders, ORDER_STATUSES.COMPLETED),
    },
    recent_orders: [...orders]
      .sort(
        (first, second) =>
          new Date(second.order_date) - new Date(first.order_date) ||
          Number(second.id) - Number(first.id),
      )
      .slice(0, 10),
  }
}

export function HomePage() {
  const { user } = useAuth()
  const isAdministrator = user.role === ROLES.ADMINISTRATOR
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState({
    requestKey: '',
    dashboard: initialDashboard,
    error: '',
  })
  const requestKey = `${isAdministrator ? ROLES.ADMINISTRATOR : ROLES.SALES}:${revision}`
  const isLoading = result.requestKey !== requestKey
  const dashboard = isLoading ? initialDashboard : result.dashboard
  const error = isLoading ? '' : result.error
  const cards = isAdministrator ? adminCards : salesCards
  const salesChartData = dashboard.sales_by_fruit.filter(
    (fruit) => Number(fruit.sales_value) > 0,
  )

  useEffect(() => {
    const controller = new AbortController()
    const request = isAdministrator
      ? api.get('/dashboard', { signal: controller.signal })
      : loadSalesDashboard(controller.signal)

    request
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey, dashboard: data, error: '' })
        }
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey, dashboard: initialDashboard, error: loadError.message })
        }
      })
    return () => controller.abort()
  }, [isAdministrator, requestKey])

  const recentOrderColumns = [
    { key: 'id', header: 'Order' },
    { key: 'vendor_name', header: 'Vendor' },
    {
      key: 'order_date',
      header: 'Date',
      render: (order) => formatDate(order.order_date),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: 'total_amount',
      header: 'Order value',
      numeric: true,
      render: (order) => formatCurrency(order.total_amount),
    },
  ]

  return (
    <section aria-labelledby="dashboard-heading" className="management-page dashboard-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 id="dashboard-heading">Dashboard</h2>
          <p className="page-description">Current fruit distribution activity.</p>
        </div>
      </div>

      {error && (
        <div className="table-state table-state--error" role="alert">
          <p>{error}</p>
          <button
            className="button button--secondary"
            onClick={() => setRevision((current) => current + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="table-state">
          <LoadingMessage message="Loading dashboard..." />
        </div>
      ) : !error ? (
        <>
          <div aria-label="Dashboard summary" className="dashboard-summary">
            {cards.map(({ key, label, format }) => (
              <article className="summary-card" key={key}>
                <h3>{label}</h3>
                <p>{format ? format(dashboard.summary[key] ?? 0) : dashboard.summary[key] ?? 0}</p>
              </article>
            ))}
          </div>

          {isAdministrator && (
            <div className="dashboard-charts">
              <section aria-labelledby="sales-chart-heading" className="dashboard-panel">
                <h3 id="sales-chart-heading">Sales by fruit</h3>
                {salesChartData.length ? (
                  <div className="dashboard-chart">
                    <ResponsiveContainer height="100%" width="100%">
                      <BarChart data={salesChartData} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
                        <CartesianGrid stroke="#d8dfda" vertical={false} />
                        <XAxis
                          angle={-30}
                          dataKey="fruit_name"
                          height={64}
                          interval={0}
                          textAnchor="end"
                          tick={{ fill: '#26332d', fontSize: 11 }}
                        />
                        <YAxis tick={{ fill: '#26332d', fontSize: 12 }} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="sales_value" fill="#287450" name="Sales value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="chart-empty">No sales data found.</p>
                )}
              </section>

              <section aria-labelledby="status-chart-heading" className="dashboard-panel">
                <h3 id="status-chart-heading">Orders by status</h3>
                {dashboard.orders_by_status.length ? (
                  <div className="dashboard-chart">
                    <ResponsiveContainer height="100%" width="100%">
                      <BarChart data={dashboard.orders_by_status} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
                        <CartesianGrid stroke="#d8dfda" vertical={false} />
                        <XAxis
                          angle={-30}
                          dataKey="status"
                          height={72}
                          interval={0}
                          textAnchor="end"
                          tick={{ fill: '#26332d', fontSize: 10 }}
                        />
                        <YAxis allowDecimals={false} tick={{ fill: '#26332d', fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="order_count" fill="#4c8a68" name="Orders" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="chart-empty">No order status data found.</p>
                )}
              </section>
            </div>
          )}

          <section aria-labelledby="recent-orders-heading" className="dashboard-panel">
            <h3 id="recent-orders-heading">Recent orders</h3>
            <DataTable
              columns={recentOrderColumns}
              emptyMessage="No recent orders found."
              rows={dashboard.recent_orders}
            />
          </section>
        </>
      ) : null}
    </section>
  )
}
