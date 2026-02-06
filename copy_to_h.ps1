$source = 'C:\Users\Will\crm-work\ReactCRM'
$dest = 'H:\scraper_backup\projects\ReactCRM'

# Get all items except node_modules and .git
$items = Get-ChildItem -Path $source -Force | Where-Object { $_.Name -notin 'node_modules', '.git' }

# Create destination
New-Item -Path $dest -ItemType Directory -Force | Out-Null

foreach ($item in $items) {
    Write-Output "Copying: $($item.Name)"
    Copy-Item -Path $item.FullName -Destination $dest -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Output 'ReactCRM copy complete (excluding node_modules and .git)'
