# export_json.ps1
$lines = Get-Content -Path "raw_ocr.txt" -Encoding UTF8
$reportDate = [DateTime]::ParseExact("30/09/2026", "dd/MM/yyyy", $null)

function Parse-Amount($str) {
    if ([string]::IsNullOrWhiteSpace($str)) { return 0 }
    $clean = $str.Trim().Replace(".", "").Replace(",", ".")
    $val = 0
    if ([double]::TryParse($clean, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$val)) {
        return [long]$val
    }
    return 0
}

function Parse-InvDate($dStr) {
    if ($dStr -match '(\d{2})/(\d{2})/(\d{2})') {
        $day = [int]$matches[1]
        $month = [int]$matches[2]
        $year = 2000 + [int]$matches[3]
        return New-Object DateTime($year, $month, $day)
    }
    return $null
}

$invoices = @()

foreach ($rawLine in $lines) {
    $line = $rawLine.Trim()
    if ($line -eq "" -or $line.StartsWith("==") -or $line.StartsWith("--") -or $line.StartsWith("Kode") -or $line.StartsWith("PT.") -or $line.StartsWith("Jl.") -or $line.StartsWith("Per ") -or $line.StartsWith("Grand Total")) {
        continue
    }

    if ($line -match '(\d{2}/\d{2}/\d{2})') {
        $dateStr = $matches[1]
        $parts = -split $line

        $dateIdx = -1
        for ($i = 0; $i -lt $parts.Length; $i++) {
            if ($parts[$i] -eq $dateStr) {
                $dateIdx = $i
                break
            }
        }

        if ($dateIdx -ge 2) {
            $kode = $parts[0]
            $noNota = $parts[$dateIdx - 1]
            $namaParts = @()
            for ($i = 1; $i -lt ($dateIdx - 1); $i++) {
                $namaParts += $parts[$i]
            }
            $namaToko = $namaParts -join " "
            if ($namaToko -eq "") {
                $namaToko = "TOKO " + $kode
            }

            $rem = @()
            for ($i = $dateIdx + 1; $i -lt $parts.Length; $i++) {
                $rem += $parts[$i]
            }

            if ($rem.Length -ge 6) {
                $b30 = Parse-Amount $rem[0]
                $b60 = Parse-Amount $rem[1]
                $b90 = Parse-Amount $rem[2]
                $b120 = Parse-Amount $rem[3]
                $bOver = Parse-Amount $rem[4]
                $jumlah = Parse-Amount $rem[5]
                
                $ket = ""
                if ($rem.Length -gt 6) {
                    $ketParts = @()
                    for ($k = 6; $k -lt $rem.Length; $k++) {
                        $ketParts += $rem[$k]
                    }
                    $ket = $ketParts -join " "
                }

                $invDate = Parse-InvDate $dateStr
                $ageDays = 0
                if ($invDate) {
                    $ageDays = [int]($reportDate - $invDate).TotalDays
                }

                if ($ket -match '(\d+)\s*hari') {
                    $ageDays = [int]$matches[1]
                }

                $catId = ""
                $catLabel = ""
                if ($b30 -gt 0) { $catId = "lt30"; $catLabel = "< 30 hari" }
                elseif ($b60 -gt 0) { $catId = "31_60"; $catLabel = "31 - 60 hari" }
                elseif ($b90 -gt 0) { $catId = "61_90"; $catLabel = "61 - 90 hari" }
                elseif ($b120 -gt 0) { $catId = "gt90"; $catLabel = "> 90 hari"; $subCat = "91 - 120 hari" }
                elseif ($bOver -gt 0) { $catId = "gt90"; $catLabel = "> 90 hari"; $subCat = "> 120 hari" }
                else {
                    if ($ageDays -le 30) { $catId = "lt30"; $catLabel = "< 30 hari" }
                    elseif ($ageDays -le 60) { $catId = "31_60"; $catLabel = "31 - 60 hari" }
                    elseif ($ageDays -le 90) { $catId = "61_90"; $catLabel = "61 - 90 hari" }
                    else { $catId = "gt90"; $catLabel = "> 90 hari" }
                }

                $invoices += [PSCustomObject]@{
                    kode = $kode
                    namaToko = $namaToko
                    noNota = $noNota
                    tanggalNota = $dateStr
                    umurHari = $ageDays
                    b30 = $b30
                    b60 = $b60
                    b90 = $b90
                    b120 = $b120
                    bOver120 = $bOver
                    jumlah = $jumlah
                    ket = $ket
                    catId = $catId
                    catLabel = $catLabel
                }
            }
        }
    }
}

# Group stores
$storeMap = @{}
foreach ($inv in $invoices) {
    if (-not $storeMap.ContainsKey($inv.kode)) {
        $storeMap[$inv.kode] = @{
            kode = $inv.kode
            namaToko = $inv.namaToko
            totalPiutang = 0
            invoiceCount = 0
            invoices = @()
            categories = @{
                "lt30" = @{ id = "lt30"; label = "< 30 hari"; total = 0; minAge = 99999; maxAge = 0; invoices = @() }
                "31_60" = @{ id = "31_60"; label = "31 - 60 hari"; total = 0; minAge = 99999; maxAge = 0; invoices = @() }
                "61_90" = @{ id = "61_90"; label = "61 - 90 hari"; total = 0; minAge = 99999; maxAge = 0; invoices = @() }
                "gt90"  = @{ id = "gt90";  label = "> 90 hari";  total = 0; minAge = 99999; maxAge = 0; invoices = @(); breakdown = @{ "b91_120" = 0; "bOver120" = 0 } }
            }
        }
    }

    $s = $storeMap[$inv.kode]
    # Update store name if previous was generic
    if ($s.namaToko.StartsWith("TOKO ") -and -not $inv.namaToko.StartsWith("TOKO ")) {
        $s.namaToko = $inv.namaToko
    }

    $s.totalPiutang += $inv.jumlah
    $s.invoiceCount++
    $s.invoices += $inv

    $c = $s.categories[$inv.catId]
    $c.total += $inv.jumlah
    if ($inv.umurHari -lt $c.minAge) { $c.minAge = $inv.umurHari }
    if ($inv.umurHari -gt $c.maxAge) { $c.maxAge = $inv.umurHari }
    $c.invoices += $inv

    if ($inv.catId -eq "gt90") {
        if ($inv.b120 -gt 0) { $c.breakdown["b91_120"] += $inv.b120 }
        if ($inv.bOver120 -gt 0) { $c.breakdown["bOver120"] += $inv.bOver120 }
    }
}

# Fix minAge for categories with 0 invoices
foreach ($k in $storeMap.Keys) {
    $s = $storeMap[$k]
    foreach ($catKey in $s.categories.Keys) {
        $c = $s.categories[$catKey]
        if ($c.invoices.Count -eq 0) {
            $c.minAge = 0
        }
    }
}

# Grand totals and categories summary
$catSummary = @{
    "lt30" = @{ id = "lt30"; label = "< 30 hari"; sublabel = "Usia 0 - 30 hari"; total = 0; invoiceCount = 0; stores = @() }
    "31_60" = @{ id = "31_60"; label = "31 - 60 hari"; sublabel = "Usia 31 - 60 hari"; total = 0; invoiceCount = 0; stores = @() }
    "61_90" = @{ id = "61_90"; label = "61 - 90 hari"; sublabel = "Usia 61 - 90 hari"; total = 0; invoiceCount = 0; stores = @() }
    "gt90"  = @{ id = "gt90";  label = "> 90 hari";  sublabel = "Usia lebih dari 90 hari"; total = 0; invoiceCount = 0; breakdown = @{ "b91_120" = 0; "bOver120" = 0 }; stores = @() }
}

foreach ($k in $storeMap.Keys) {
    $s = $storeMap[$k]
    foreach ($catId in @("lt30", "31_60", "61_90", "gt90")) {
        $sc = $s.categories[$catId]
        if ($sc.total -gt 0) {
            $cSum = $catSummary[$catId]
            $cSum.total += $sc.total
            $cSum.invoiceCount += $sc.invoices.Count
            $cSum.stores += @{
                kode = $s.kode
                namaToko = $s.namaToko
                total = $sc.total
                invoiceCount = $sc.invoices.Count
                minAge = $sc.minAge
                maxAge = $sc.maxAge
            }
            if ($catId -eq "gt90") {
                $cSum.breakdown["b91_120"] += $sc.breakdown["b91_120"]
                $cSum.breakdown["bOver120"] += $sc.breakdown["bOver120"]
            }
        }
    }
}

# Sort stores in each category by total descending
foreach ($catId in $catSummary.Keys) {
    $cSum = $catSummary[$catId]
    $cSum.stores = @($cSum.stores | Sort-Object -Property total -Descending)
}

# Store list sorted by total descending
$storesList = @($storeMap.Values | Sort-Object -Property totalPiutang -Descending)

$grandTotal = ($invoices | Measure-Object -Property jumlah -Sum).Sum

$db = @{
    meta = @{
        company = "PT. INDO BALI SATYA GRAHA"
        address = "Jl. Gatot Subroto Barat Denpasar"
        period = "30 September 2026"
        periodDate = "2026-09-30"
        grandTotal = $grandTotal
        totalInvoices = $invoices.Count
        totalStores = $storeMap.Count
    }
    categories = $catSummary
    stores = $storesList
}

$json = $db | ConvertTo-Json -Depth 10

[System.IO.File]::WriteAllText("data.json", $json, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("data.js", "window.PIUTANG_DATA = " + $json + ";", [System.Text.Encoding]::UTF8)

Write-Host "Export completed successfully!"
Write-Host "Stores: $($storeMap.Count)"
Write-Host "Invoices: $($invoices.Count)"
Write-Host "Grand Total: $grandTotal"
Write-Host "< 30 Hari Total : $($catSummary['lt30'].total)"
Write-Host "31-60 Hari Total: $($catSummary['31_60'].total)"
Write-Host "61-90 Hari Total: $($catSummary['61_90'].total)"
Write-Host "> 90 Hari Total : $($catSummary['gt90'].total)"
