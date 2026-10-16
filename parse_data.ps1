# parse_data.ps1
$lines = Get-Content -Path "raw_ocr.txt" -Encoding UTF8

$reportDate = [DateTime]::ParseExact("30/09/2026", "dd/MM/yyyy", $null)

$invoices = @()
$currentKode = ""
$currentNama = ""

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
    # format DD/MM/YY
    if ($dStr -match '(\d{2})/(\d{2})/(\d{2})') {
        $day = [int]$matches[1]
        $month = [int]$matches[2]
        $year = 2000 + [int]$matches[3]
        return New-Object DateTime($year, $month, $day)
    }
    return $null
}

foreach ($rawLine in $lines) {
    $line = $rawLine.Trim()
    if ($line -eq "" -or $line.StartsWith("==") -or $line.StartsWith("--") -or $line.StartsWith("Kode") -or $line.StartsWith("PT.") -or $line.StartsWith("Jl.") -or $line.StartsWith("Per ") -or $line.StartsWith("Grand Total")) {
        continue
    }

    # Line formats:
    # 1) Kode NamaToko NoNota Tanggal B30 B60 B90 B120 BOver120 Jumlah [Bg] [Ket]
    # e.g.: 113001 OSCAR VRS 05487 28/09/26 3.596.400 0 0 0 0 3.596.400
    # or without store name: 113010 94671 09/12/17 0 0 0 0 3.391.665 3.391.665 3217hari
    # or subtotal line: 166.928.300 206.158.400 169.283.000 8.250.189 0 550.619.889
    # or all zeros: 0 0 0 0 0 0

    # Let's check if line contains a date DD/MM/YY
    if ($line -match '(\d{2}/\d{2}/\d{2})') {
        $dateStr = $matches[1]
        $parts = -split $line

        # find index of dateStr
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

            # Amounts follow dateIdx: B30, B60, B90, B120, BOver120, Jumlah, [Bg/Ket]
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

                # check Ket for explicit days like 125hari
                if ($ket -match '(\d+)\s*hari') {
                    $ageDays = [int]$matches[1]
                }

                # Determine bucket
                $bucket = ""
                if ($b30 -gt 0) { $bucket = "< 30 Hari" }
                elseif ($b60 -gt 0) { $bucket = "31-60 Hari" }
                elseif ($b90 -gt 0) { $bucket = "61-90 Hari" }
                elseif ($b120 -gt 0) { $bucket = "91-120 Hari" }
                elseif ($bOver -gt 0) { $bucket = "> 120 Hari" }
                else {
                    # based on ageDays
                    if ($ageDays -le 30) { $bucket = "< 30 Hari" }
                    elseif ($ageDays -le 60) { $bucket = "31-60 Hari" }
                    elseif ($ageDays -le 90) { $bucket = "61-90 Hari" }
                    elseif ($ageDays -le 120) { $bucket = "91-120 Hari" }
                    else { $bucket = "> 120 Hari" }
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
                    bucket = $bucket
                }
            }
        }
    }
}

Write-Host "Total invoices parsed: $($invoices.Count)"
$sumB30 = ($invoices | Measure-Object -Property b30 -Sum).Sum
$sumB60 = ($invoices | Measure-Object -Property b60 -Sum).Sum
$sumB90 = ($invoices | Measure-Object -Property b90 -Sum).Sum
$sumB120 = ($invoices | Measure-Object -Property b120 -Sum).Sum
$sumBOver = ($invoices | Measure-Object -Property bOver120 -Sum).Sum
$sumTotal = ($invoices | Measure-Object -Property jumlah -Sum).Sum

Write-Host "Calculated Sums:"
Write-Host "< 30 Hari  : $sumB30 (Expected: 5553323252)"
Write-Host "31-60 Hari : $sumB60 (Expected: 4768110414)"
Write-Host "61-90 Hari : $sumB90 (Expected: 3248508499)"
Write-Host "91-120 Hari: $sumB120 (Expected: 1654010739)"
Write-Host "> 120 Hari : $sumBOver (Expected: 2158278439)"
Write-Host "Grand Total: $sumTotal (Expected: 17382231343)"
