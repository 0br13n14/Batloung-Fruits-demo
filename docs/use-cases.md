# Role use cases

Administrator and Sales actions shown here reflect the route authorization and order-status rules in the application.

```mermaid
flowchart LR
    Administrator((Administrator))
    Sales((Sales))

    subgraph System["Batloung Fruits"]
        ViewDashboard(["View permitted dashboard"])
        ManageFruits(["Manage fruits and products"])
        ManageSuppliers(["Manage suppliers"])
        RecordPurchases(["Record purchases and adjust stock"])
        ViewStock(["View available stock"])
        ManageVendors(["Manage, edit and deactivate vendors"])
        RegisterVendor(["Register vendor"])
        CreateOrder(["Create order"])
        ViewOrders(["View orders"])
        UpdateOrder(["Advance order status"])
        CancelOrder(["Cancel Pending or Confirmed order"])
        ViewReports(["View, print and export reports"])
    end

    Administrator --> ViewDashboard
    Administrator --> ManageFruits
    Administrator --> ManageSuppliers
    Administrator --> RecordPurchases
    Administrator --> ViewStock
    Administrator --> ManageVendors
    Administrator --> CreateOrder
    Administrator --> ViewOrders
    Administrator --> UpdateOrder
    Administrator --> CancelOrder
    Administrator --> ViewReports

    Sales --> ViewDashboard
    Sales --> ViewStock
    Sales --> RegisterVendor
    Sales --> CreateOrder
    Sales --> ViewOrders
    Sales --> UpdateOrder
    Sales --> CancelOrder
```

Sales dashboard access excludes supplier totals, sales value and sales charts. Sales can view fruit and product records but cannot manage them; these read-only uses are reflected in the application navigation rather than as separate use-case bubbles.
