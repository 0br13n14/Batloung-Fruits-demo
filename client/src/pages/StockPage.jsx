import { useState } from 'react'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { Modal } from '../components/Modal'
import { SearchFilterBar } from '../components/SearchFilterBar'
import { useApiList, buildQuery, getServerFieldErrors } from '../hooks/useApiList'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { api } from '../services/api'
import { formatCurrency } from '../utils/formatters'

function localDateString() {
  const now = new Date()
  const offsetNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return offsetNow.toISOString().slice(0, 10)
}

const makeEmptyPurchase = () => ({
  supplier_id: '',
  product_id: '',
  quantity_boxes: '',
  unit_cost: '',
  purchase_date: localDateString(),
})

export function StockPage() {
  const [search, setSearch] = useState('')
  const [fruitId, setFruitId] = useState('')
  const [boxSizeId, setBoxSizeId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(makeEmptyPurchase)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const debouncedSearch = useDebouncedValue(search)
  const query = buildQuery({
    search: debouncedSearch.trim(),
    fruit: fruitId,
    boxSize: boxSizeId,
  })
  const {
    rows: stock,
    isLoading,
    error,
    refresh,
  } = useApiList('/stock', 'stock', query)
  const {
    rows: suppliers,
    isLoading: suppliersLoading,
    error: suppliersError,
  } = useApiList('/suppliers', 'suppliers')
  const {
    rows: products,
    isLoading: productsLoading,
    error: productsError,
  } = useApiList('/products', 'products')
  const {
    rows: fruits,
    isLoading: fruitsLoading,
    error: fruitsError,
  } = useApiList('/fruits', 'fruits')
  const {
    rows: boxSizes,
    isLoading: boxSizesLoading,
    error: boxSizesError,
  } = useApiList('/box-sizes', 'boxSizes')

  function openPurchaseModal() {
    setForm(makeEmptyPurchase())
    setFieldErrors({})
    setFormError('')
    setIsModalOpen(true)
  }

  function validateForm() {
    const errors = {}
    if (!form.supplier_id) errors.supplier_id = 'Choose a supplier.'
    if (!form.product_id) errors.product_id = 'Choose a product.'
    if (!Number.isInteger(Number(form.quantity_boxes)) || Number(form.quantity_boxes) < 1) {
      errors.quantity_boxes = 'Enter a positive whole number of boxes.'
    }
    if (form.unit_cost === '' || !Number.isFinite(Number(form.unit_cost)) || Number(form.unit_cost) < 0) {
      errors.unit_cost = 'Enter a valid non-negative unit cost.'
    }
    if (!form.purchase_date) errors.purchase_date = 'Choose a purchase date.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function recordPurchase(event) {
    event.preventDefault()
    if (!validateForm()) return
    setIsSaving(true)
    setFormError('')
    try {
      await api.post('/stock', {
        supplier_id: Number(form.supplier_id),
        product_id: Number(form.product_id),
        quantity_boxes: Number(form.quantity_boxes),
        unit_cost: Number(form.unit_cost),
        purchase_date: form.purchase_date,
      })
      setIsModalOpen(false)
      refresh()
    } catch (saveError) {
      setFieldErrors(getServerFieldErrors(saveError))
      setFormError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const columns = [
    { key: 'fruit_name', header: 'Fruit' },
    { key: 'box_size', header: 'Box size' },
    { key: 'quantity_per_box', header: 'Quantity per box', numeric: true },
    { key: 'quantity_available', header: 'Available boxes', numeric: true },
    {
      key: 'selling_price',
      header: 'Selling price',
      numeric: true,
      render: (record) => formatCurrency(record.selling_price),
    },
  ]

  return (
    <section className="management-page" aria-labelledby="stock-heading">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2 id="stock-heading">Stock</h2>
          <p className="page-description">Available boxes by product. Incoming purchases increase stock.</p>
        </div>
        <button className="button button--primary" onClick={openPurchaseModal} type="button">Record incoming stock</button>
      </div>
      <SearchFilterBar
        filters={[
          {
            name: 'fruit',
            label: 'Fruit',
            value: fruitId,
            options: [
              { value: '', label: 'All fruits' },
              ...fruits.map((fruit) => ({ value: String(fruit.id), label: fruit.name })),
            ],
          },
          {
            name: 'boxSize',
            label: 'Box size',
            value: boxSizeId,
            options: [
              { value: '', label: 'All box sizes' },
              ...boxSizes.map((boxSize) => ({ value: String(boxSize.id), label: boxSize.name })),
            ],
          },
        ]}
        onFilterChange={(name, value) => {
          if (name === 'fruit') setFruitId(value)
          if (name === 'boxSize') setBoxSizeId(value)
        }}
        onSearchChange={setSearch}
        searchLabel="Search stock"
        searchValue={search}
      />
      {(fruitsError || boxSizesError) && (
        <div className="form-message form-message--error" role="alert">
          {[fruitsError, boxSizesError].filter(Boolean).join(' ')}
        </div>
      )}
      <DataTable
        columns={columns}
        emptyMessage="No stock records found."
        error={error}
        loading={isLoading || fruitsLoading || boxSizesLoading}
        onRetry={refresh}
        rows={stock}
      />

      <Modal
        footer={
          <>
            <button className="button button--secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</button>
            <button
              className="button button--primary"
              disabled={isSaving || suppliersLoading || productsLoading || Boolean(suppliersError || productsError)}
              form="stock-form"
              type="submit"
            >
              {isSaving ? 'Recording...' : 'Record incoming stock'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record incoming stock"
      >
        <form className="record-form" id="stock-form" noValidate onSubmit={recordPurchase}>
          {formError && <div className="form-message form-message--error" role="alert">{formError}</div>}
          {suppliersError && <div className="form-message form-message--error" role="alert">{suppliersError}</div>}
          {productsError && <div className="form-message form-message--error" role="alert">{productsError}</div>}
          <FormField error={fieldErrors.supplier_id} label="Supplier" name="supplier_id" required>
            <select onChange={(event) => setForm((current) => ({ ...current, supplier_id: event.target.value }))} value={form.supplier_id}>
              <option value="">Choose a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name} — {supplier.province_name}</option>
              ))}
            </select>
          </FormField>
          <FormField error={fieldErrors.product_id} label="Product" name="product_id" required>
            <select onChange={(event) => setForm((current) => ({ ...current, product_id: event.target.value }))} value={form.product_id}>
              <option value="">Choose a product</option>
              {products.filter((product) => product.is_active).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.fruit_name} — {product.box_size} ({product.quantity_per_box} per box)
                </option>
              ))}
            </select>
          </FormField>
          <FormField error={fieldErrors.quantity_boxes} label="Number of boxes" name="quantity_boxes" required>
            <input min="1" onChange={(event) => setForm((current) => ({ ...current, quantity_boxes: event.target.value }))} type="number" value={form.quantity_boxes} />
          </FormField>
          <FormField error={fieldErrors.unit_cost} label="Unit cost per box (M)" name="unit_cost" required>
            <input min="0" onChange={(event) => setForm((current) => ({ ...current, unit_cost: event.target.value }))} step="0.01" type="number" value={form.unit_cost} />
          </FormField>
          <FormField error={fieldErrors.purchase_date} label="Purchase date" name="purchase_date" required>
            <input onChange={(event) => setForm((current) => ({ ...current, purchase_date: event.target.value }))} type="date" value={form.purchase_date} />
          </FormField>
        </form>
      </Modal>
    </section>
  )
}
