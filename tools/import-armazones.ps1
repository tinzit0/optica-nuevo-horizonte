param(
    [string]$Source = "assets\wetransfer_armazones_2026-08-13_2134",
    [string]$Output = "assets\catalogo"
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot $Source
$sourceChildren = @(Get-ChildItem -LiteralPath $sourcePath -Directory -ErrorAction SilentlyContinue)
if ($sourceChildren.Count -eq 1) { $sourcePath = $sourceChildren[0].FullName }
$outputPath = Join-Path $projectRoot $Output
$catalogPath = Join-Path $projectRoot 'data\productos.json'

if (-not (Test-Path -LiteralPath $sourcePath)) { throw "No existe el origen: $sourcePath" }

function ConvertTo-Slug([string]$Text) {
    $normalized = $Text.Normalize([Text.NormalizationForm]::FormD)
    $ascii = -join ($normalized.ToCharArray() | Where-Object { [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne 'NonSpacingMark' })
    return (($ascii.ToLowerInvariant() -replace '[^a-z0-9]+', '-') -replace '(^-|-$)', '')
}

function Get-Gender([string]$Path) {
    if ($Path -match '(?i)moodskids|kids|niñ|infantil') { return 'infantil' }
    if ($Path -match '(?i)mujer|dama') { return 'mujer' }
    if ($Path -match '(?i)hombre|var[oó]n') { return 'hombre' }
    return 'unisex'
}

function Get-Material([string]$Path, [string]$Model) {
    if ($Path -match '(?i)acetato' -or $Model -match '^(?i)XAP') { return 'acetato' }
    if ($Path -match '(?i)metal' -or $Model -match '^(?i)DS') { return 'metal' }
    return ''
}

function Get-Model([IO.FileInfo]$File) {
    $parent = $File.Directory.Name.Trim()
    if ($parent -match '\d' -and $parent -notmatch '(?i)hombre|mujer|metal|acetato|sol') { return $parent }
    $name = $File.BaseName -replace '(?i)\s+-\s+copia$', ''
    $name = $name -replace '(?i)\s+C[- ]?\d+[A-Z]?\b.*$', ''
    $name = $name -replace '\s+\d{2,3}-\d{2,3}-\d{2,3}$', ''
    return $name.Trim(' ', '-', '.')
}

$brandNames = @{
    'foose'='FOOSE'; 'Le Giro'='Le Giro'; 'Moodskids'='Moods Kids';
    'On deck'='On Deck'; 'Polo'='Polo'; 'Silmo'='Silmo';
    'Lente y antiparra de seguridad'='Seguridad'
}

$existing = if (Test-Path -LiteralPath $catalogPath) {
    @(Get-Content -Raw -LiteralPath $catalogPath | ConvertFrom-Json | Where-Object { $_.image -notlike 'assets/catalogo/*' })
} else { @() }
$byId = [ordered]@{}
foreach ($item in $existing) { $byId[[string]$item.id] = $item }
$seenHashes = @{}
$imported = 0
$duplicates = 0

Get-ChildItem -LiteralPath $sourcePath -Recurse -File | Where-Object {
    $_.Extension -match '^\.(jpg|jpeg|png|webp)$' -and $_.Name -notmatch '(?i)DESCRIP'
} | Sort-Object FullName | ForEach-Object {
    $file = $_
    $relative = $file.FullName.Substring($sourcePath.Length + 1)
    if ($relative -match '(?i)(^|[\\/])ESTUCHE([\\/]|$)') { return }
    $rootName = $relative.Split([IO.Path]::DirectorySeparatorChar)[0]
    $brand = if ($brandNames.ContainsKey($rootName)) { $brandNames[$rootName] } else { $rootName }
    $model = Get-Model $file
    if (-not $model) { return }
    $category = if ($relative -match '(?i)\bsol\b') { 'sol' } else { 'optico' }
    $gender = Get-Gender $relative
    $material = Get-Material $relative $model
    $colorMatch = [regex]::Match($file.BaseName, '(?i)\bC[- ]?(\d+[A-Z]?)\b')
    $color = if ($colorMatch.Success) { "c-$($colorMatch.Groups[1].Value.ToLowerInvariant())" } else { 'principal' }
    $brandSlug = ConvertTo-Slug $brand
    $modelSlug = ConvertTo-Slug $model
    $baseSlug = ConvertTo-Slug "$model-$color"
    $id = "$brandSlug-$baseSlug"
    $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    if ($seenHashes.ContainsKey($hash)) { $duplicates++; return }
    $seenHashes[$hash] = $id

    $destinationDir = Join-Path $outputPath (Join-Path $brandSlug $category)
    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
    $extension = $file.Extension.ToLowerInvariant()
    $destination = Join-Path $destinationDir "$baseSlug$extension"
    $suffix = 2
    while (Test-Path -LiteralPath $destination) {
        if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -eq $hash) { break }
        $destination = Join-Path $destinationDir "$baseSlug-$suffix$extension"; $suffix++
    }
    if (-not (Test-Path -LiteralPath $destination)) { Copy-Item -LiteralPath $file.FullName -Destination $destination }

    $audience = switch ($gender) { 'mujer' {'para mujer'} 'hombre' {'para hombre'} 'infantil' {'infantil'} default {'unisex'} }
    $typeText = if ($category -eq 'sol') { 'de sol' } else { 'óptico' }
    $materialText = if ($material) { ", elaborado en $material" } else { '' }
    $features = @('nuevo')
    if ($rootName -eq 'Lente y antiparra de seguridad') { $features += 'seguridad' }
    $relativeWeb = $destination.Substring($projectRoot.Length + 1).Replace('\','/')
    $record = [ordered]@{
        id=$id; title=if($color -eq 'principal'){$model}else{"$model $($color.ToUpperInvariant())"}; brand=$brand; price=$null
        category=$category; gender=$gender; shape=''; color=if($color -eq 'principal'){''}else{$color}; material=$material
        features=$features; image=$relativeWeb
        description="Armazon $typeText $brand, modelo $model, $audience$materialText. Diseno comodo y contemporaneo para el dia a dia."
    }
    $byId[$id] = [pscustomobject]$record
    $imported++
}

@($byId.Values) | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $catalogPath -Encoding utf8
Write-Host "Productos nuevos procesados: $imported"
Write-Host "Duplicados exactos omitidos: $duplicates"
Write-Host "Total del catálogo: $($byId.Count)"
