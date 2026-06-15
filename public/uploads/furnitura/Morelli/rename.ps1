$csvPath = "sku.csv"

if (-not (Test-Path $csvPath)) {
    Write-Host "ОШИБКА: Файл $csvPath не найден!" -ForegroundColor Red
    Write-Host "Нажмите Enter для выхода..."
    Read-Host
    exit 1
}

$csv = Import-Csv -Path $csvPath -Delimiter ';' -Encoding UTF8
$allFiles = Get-ChildItem -File
$renamedCount = 0

foreach ($row in $csv) {
    $fullTitle = $row.Title
    $newName = $row.SKU

    if ([string]::IsNullOrWhiteSpace($fullTitle) -or [string]::IsNullOrWhiteSpace($newName)) {
        Write-Host "Пропущена пустая строка" -ForegroundColor DarkYellow
        continue
    }

    $file = $allFiles | Where-Object { $fullTitle -match [regex]::Escape($_.BaseName) }

    if ($file) {
        $oldFullName = $file.Name
        $newFullName = "$newName$($file.Extension)"

        if (Test-Path $newFullName) {
            Write-Host "Конфликт: $newFullName уже существует, пропуск" -ForegroundColor Red
            continue
        }

        Rename-Item -Path $file.FullName -NewName $newFullName
        Write-Host "Переименован: $oldFullName -> $newFullName" -ForegroundColor Green
        $renamedCount++
    } else {
        Write-Host "Не найден файл для: '$fullTitle'" -ForegroundColor Yellow
    }
}

Write-Host "`nГотово! Переименовано файлов: $renamedCount" -ForegroundColor Cyan
Write-Host "Нажмите Enter для выхода..."
Read-Host