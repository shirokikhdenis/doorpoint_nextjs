# Загружаем CSV файл (уточните имя файла)
$csv = Import-Csv -Path "sku.csv" -Delimiter ';' -Encoding UTF8

# Проходим по каждой строке CSV
foreach ($row in $csv) {
    $oldName = $row.Title  # название из столбца А
    $newName = $row.SKU        # артикул из столбца B
    $extension = ".jpg"  # или .png, .jpeg - укажите ваше расширение
    
    # Ищем файл (можно добавить несколько расширений)
    $file = Get-ChildItem -Filter "$oldName*" | Select-Object -First 1
    
    if ($file) {
        $newPath = Join-Path $file.DirectoryName "$newName$($file.Extension)"
        Rename-Item -Path $file.FullName -NewName "$newName$($file.Extension)"
        Write-Host "Переименован: $oldName -> $newName" -ForegroundColor Green
    } else {
       Write-Host "`nНажмите Enter для выхода..."
Read-Host
    }
	
}
