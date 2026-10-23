$warning = @'
WARNING: This API flow test creates a supplier, product, purchase, vendor, and orders.
It leaves those records in the database after finishing; use a disposable test database
or manually remove the generated "API Flow" records when no longer needed.
'@
Write-Warning $warning

$ErrorActionPreference = 'Stop'
$baseUrl = 'http://127.0.0.1:3000/api'
$requiredCredentials = @(
  'API_ADMIN_EMAIL',
  'API_ADMIN_PASSWORD',
  'API_SALES_EMAIL',
  'API_SALES_PASSWORD'
)

foreach ($name in $requiredCredentials) {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
    throw "Set the $name environment variable before running this test."
  }
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    [string]$Token,
    [object]$Body
  )

  $parameters = @{
    Uri = "$baseUrl$Path"
    Method = $Method
    TimeoutSec = 15
  }
  if ($Token) {
    $parameters.Headers = @{ Authorization = "Bearer $Token" }
  }
  if ($null -ne $Body) {
    $parameters.ContentType = 'application/json'
    $parameters.Body = ConvertTo-Json -InputObject $Body -Depth 10 -Compress
  }
  Invoke-RestMethod @parameters
}

function Assert-Equal {
  param(
    [object]$Actual,
    [object]$Expected,
    [string]$Check
  )
  if ($Actual -ne $Expected) {
    throw "$Check failed. Expected '$Expected', got '$Actual'."
  }
  Write-Output "PASS: $Check"
}

$adminLogin = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{
  email = $env:API_ADMIN_EMAIL
  password = $env:API_ADMIN_PASSWORD
}
$adminToken = $adminLogin.accessToken
if (-not $adminToken) { throw 'Administrator login did not return an access token.' }
Write-Output 'PASS: Administrator login'

$salesLogin = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{
  email = $env:API_SALES_EMAIL
  password = $env:API_SALES_PASSWORD
}
$salesToken = $salesLogin.accessToken
if (-not $salesToken) { throw 'Sales login did not return an access token.' }
Write-Output 'PASS: Sales login'

$salesAccessDenied = $false
try {
  Invoke-Api -Method 'GET' -Path '/suppliers' -Token $salesToken | Out-Null
} catch {
  $status = [int]$_.Exception.Response.StatusCode
  if ($status -eq 403) {
    $salesAccessDenied = $true
  } else {
    throw
  }
}
Assert-Equal -Actual $salesAccessDenied -Expected $true -Check 'Sales is denied access to admin-only suppliers'

$fruits = (Invoke-Api -Method 'GET' -Path '/fruits' -Token $adminToken).fruits
$boxSizes = (Invoke-Api -Method 'GET' -Path '/box-sizes' -Token $adminToken).boxSizes
$existingProducts = (Invoke-Api -Method 'GET' -Path '/products' -Token $adminToken).products
$selectedFruit = $null
$selectedBoxSize = $null

foreach ($fruit in $fruits) {
  foreach ($boxSize in $boxSizes) {
    $combinationExists = @($existingProducts | Where-Object {
      [int]$_.fruit_id -eq [int]$fruit.id -and [int]$_.box_size_id -eq [int]$boxSize.id
    }).Count -gt 0
    if (-not $combinationExists) {
      $selectedFruit = $fruit
      $selectedBoxSize = $boxSize
      break
    }
  }
  if ($selectedFruit) { break }
}
if (-not $selectedFruit) {
  throw 'No unused fruit and box-size combination is available to create the test product.'
}
if (-not $selectedFruit.source_provinces -or $selectedFruit.source_provinces.Count -eq 0) {
  throw "Fruit '$($selectedFruit.name)' has no source province configured."
}

$duplicateCandidate = $selectedFruit.name -replace '(?i)(es|s)$', ''
if ($duplicateCandidate -eq $selectedFruit.name) {
  $duplicateCandidate = "$duplicateCandidate" + 'es'
}
$duplicateFruitRejected = $false
try {
  Invoke-Api -Method 'POST' -Path '/fruits' -Token $adminToken -Body @{
    name = $duplicateCandidate
  } | Out-Null
} catch {
  $status = [int]$_.Exception.Response.StatusCode
  if ($status -eq 409) {
    $duplicateFruitRejected = $true
  } else {
    throw
  }
}
Assert-Equal -Actual $duplicateFruitRejected -Expected $true -Check 'Fruit singular/plural duplicate is rejected'

$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$supplier = Invoke-Api -Method 'POST' -Path '/suppliers' -Token $adminToken -Body @{
  name = "API Flow Supplier $suffix"
  province_id = $selectedFruit.source_provinces[0].id
  contact_person = 'API Flow'
  telephone = '5550100'
  email = "api-flow-$suffix@example.test"
  physical_address = 'Test address'
}
Write-Output 'PASS: Supplier created in a fruit source province'

$product = Invoke-Api -Method 'POST' -Path '/products' -Token $adminToken -Body @{
  fruit_id = $selectedFruit.id
  box_size_id = $selectedBoxSize.id
  quantity_per_box = 10
  selling_price = 10.25
}
Write-Output 'PASS: Product created'

$purchase = Invoke-Api -Method 'POST' -Path '/stock' -Token $adminToken -Body @{
  supplier_id = $supplier.supplier.id
  product_id = $product.product.id
  quantity_boxes = 3
  unit_cost = 5.00
  purchase_date = (Get-Date).ToString('yyyy-MM-dd')
}
Assert-Equal -Actual ([int]$purchase.purchase.quantity_available) -Expected 3 -Check 'Purchase increased stock to three boxes'

$vendor = Invoke-Api -Method 'POST' -Path '/vendors' -Token $adminToken -Body @{
  vendor_name = "API Flow Vendor $suffix"
  business_name = 'API Flow'
  telephone = '5550101'
  location_area = 'Maseru test area'
  registration_date = (Get-Date).ToString('yyyy-MM-dd')
}
Write-Output 'PASS: Vendor created'

$order = Invoke-Api -Method 'POST' -Path '/orders' -Token $adminToken -Body @{
  vendor_id = $vendor.vendor.id
  items = @(@{ product_id = $product.product.id; quantity_boxes = 1 })
}
Assert-Equal -Actual $order.order.status -Expected 'Pending' -Check 'Order starts Pending'
$order = Invoke-Api -Method 'PUT' -Path "/orders/$($order.order.id)" -Token $salesToken -Body @{
  status = 'Confirmed'
}
Assert-Equal -Actual $order.order.status -Expected 'Confirmed' -Check 'Sales can move an order forward'

foreach ($status in @('Processing', 'Ready for Collection/Delivery', 'Completed')) {
  $order = Invoke-Api -Method 'PUT' -Path "/orders/$($order.order.id)" -Token $adminToken -Body @{
    status = $status
  }
}
Assert-Equal -Actual $order.order.status -Expected 'Completed' -Check 'Order followed the status flow to Completed'

$stockAfterCompletion = (Invoke-Api -Method 'GET' -Path '/stock' -Token $adminToken).stock |
  Where-Object { [int]$_.product_id -eq [int]$product.product.id }
Assert-Equal -Actual ([int]$stockAfterCompletion.quantity_available) -Expected 2 -Check 'Completed order reduced stock by one box'

$cancelledOrder = Invoke-Api -Method 'POST' -Path '/orders' -Token $salesToken -Body @{
  vendor_id = $vendor.vendor.id
  items = @(@{ product_id = $product.product.id; quantity_boxes = 1 })
}
$cancelledOrder = Invoke-Api -Method 'PUT' -Path "/orders/$($cancelledOrder.order.id)" -Token $salesToken -Body @{
  status = 'Cancelled'
}
Assert-Equal -Actual $cancelledOrder.order.status -Expected 'Cancelled' -Check 'Pending order can be cancelled'

$stockAfterCancellation = (Invoke-Api -Method 'GET' -Path '/stock' -Token $adminToken).stock |
  Where-Object { [int]$_.product_id -eq [int]$product.product.id }
Assert-Equal -Actual ([int]$stockAfterCancellation.quantity_available) -Expected 2 -Check 'Cancelled order left stock unchanged'

$dashboard = Invoke-Api -Method 'GET' -Path '/dashboard' -Token $adminToken
if ($null -eq $dashboard.summary -or $null -eq $dashboard.sales_by_fruit -or
    $null -eq $dashboard.orders_by_status -or $null -eq $dashboard.recent_orders) {
  throw 'Dashboard response is missing one or more required sections.'
}
Write-Output 'PASS: Dashboard returns summary, sales, status, and recent-order data'

$reportNames = @(
  'available-stock',
  'sales-by-fruit',
  'sales-by-box-size',
  'sales-by-vendor',
  'purchases-by-province',
  'pending-orders',
  'completed-orders',
  'total-sales-by-date'
)
$today = (Get-Date).ToString('yyyy-MM-dd')
foreach ($reportName in $reportNames) {
  $path = "/reports/$reportName"
  if ($reportName -eq 'total-sales-by-date') {
    $path = "$path`?from=$today&to=$today"
  }
  $report = Invoke-Api -Method 'GET' -Path $path -Token $adminToken
  if ($report.report -ne $reportName -or $null -eq $report.data) {
    throw "Report '$reportName' did not return the expected response."
  }
  switch ($reportName) {
    'available-stock' {
      $reportedProduct = $report.data | Where-Object { [int]$_.product_id -eq [int]$product.product.id }
      Assert-Equal -Actual ([int]$reportedProduct.quantity_available) -Expected 2 -Check 'Available-stock report matches remaining stock'
    }
    'sales-by-vendor' {
      $vendorSales = $report.data | Where-Object { [int]$_.vendor_id -eq [int]$vendor.vendor.id }
      Assert-Equal -Actual ([int]$vendorSales.boxes_sold) -Expected 1 -Check 'Vendor sales report excludes the cancelled order'
      Assert-Equal -Actual ([decimal]$vendorSales.sales_value) -Expected ([decimal]10.25) -Check 'Vendor sales report uses the completed order value'
    }
    'purchases-by-province' {
      $provincePurchases = $report.data | Where-Object {
        [int]$_.province_id -eq [int]$supplier.supplier.province_id
      }
      if ([int]$provincePurchases.boxes_purchased -lt 3 -or
          [decimal]$provincePurchases.total_cost -lt [decimal]15) {
        throw 'Purchases-by-province report does not include the recorded purchase.'
      }
      Write-Output 'PASS: Province purchase report includes the recorded purchase'
    }
    'pending-orders' {
      if (@($report.data | Where-Object { [int]$_.id -eq [int]$cancelledOrder.order.id }).Count -gt 0) {
        throw 'Pending-orders report contains the cancelled order.'
      }
      Write-Output 'PASS: Pending-orders report excludes the cancelled order'
    }
    'completed-orders' {
      if (@($report.data | Where-Object { [int]$_.id -eq [int]$order.order.id }).Count -ne 1) {
        throw 'Completed-orders report does not include the completed test order.'
      }
      Write-Output 'PASS: Completed-orders report includes the completed order'
    }
    'total-sales-by-date' {
      if (@($report.data | Where-Object { [decimal]$_.sales_value -ge [decimal]10.25 }).Count -eq 0) {
        throw 'Sales-by-date report does not include the completed order value.'
      }
      Write-Output 'PASS: Sales-by-date report includes completed sales'
    }
  }
  Write-Output "PASS: $reportName report"
}

Write-Output 'All API flow checks passed.'
