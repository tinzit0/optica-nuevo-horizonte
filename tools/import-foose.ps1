param(
    [string]$Source = "assets\foose",
    [string]$Output = "assets\foose\catalogo"
)

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot $Source
$outputPath = Join-Path $projectRoot $Output
$oneDrivePath = Join-Path $sourcePath "OneDrive_1_10-08-2026"
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
Get-ChildItem -LiteralPath $outputPath -Filter *.jpg -File | Remove-Item -Force

function Test-HasRedX {
    param([System.Drawing.Bitmap]$Bitmap)
    $red = 0
    $samples = 0
    for ($y = 0; $y -lt $Bitmap.Height; $y += 6) {
        for ($x = 0; $x -lt $Bitmap.Width; $x += 6) {
            $pixel = $Bitmap.GetPixel($x, $y)
            if ($pixel.R -gt 205 -and $pixel.G -lt 75 -and $pixel.B -lt 75) { $red++ }
            $samples++
        }
    }
    return (($red / [Math]::Max($samples, 1)) -gt 0.012)
}

function Test-IsBlankVariant {
    param([System.Drawing.Bitmap]$Bitmap)
    $visible = 0
    $samples = 0
    $startY = [int]($Bitmap.Height * 0.34)
    $endY = [int]($Bitmap.Height * 0.80)
    for ($y = $startY; $y -lt $endY; $y += 6) {
        for ($x = 35; $x -lt ($Bitmap.Width - 35); $x += 6) {
            $pixel = $Bitmap.GetPixel($x, $y)
            $min = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
            $max = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
            if ($min -lt 218 -or ($max - $min) -gt 20) { $visible++ }
            $samples++
        }
    }
    return (($visible / [Math]::Max($samples, 1)) -lt 0.018)
}

function Remove-Barcode {
    param([System.Drawing.Bitmap]$Bitmap)
    $left = [int]($Bitmap.Width * 0.54)
    $right = [int]($Bitmap.Width * 0.96)
    $top = [int]($Bitmap.Height * 0.20)
    $bottom = [int]($Bitmap.Height * 0.39)
    $replacement = $Bitmap.GetPixel([Math]::Min($right + 8, $Bitmap.Width - 1), $top)
    for ($y = $top; $y -lt $bottom; $y++) {
        for ($x = $left; $x -lt $right; $x++) {
            $pixel = $Bitmap.GetPixel($x, $y)
            # Las barras y sus números son casi negros. La montura comienza
            # debajo de este rango, por lo que permanece completamente intacta.
            if ($pixel.R -lt 125 -and $pixel.G -lt 125 -and $pixel.B -lt 125) {
                $Bitmap.SetPixel($x, $y, $replacement)
            }
        }
    }
}

function Save-IndividualPhoto {
    param([string]$SourceFile, [string]$Destination, [bool]$HasVariantCode)
    $image = [System.Drawing.Bitmap]::FromFile($SourceFile)
    try {
        if ($HasVariantCode) {
            $graphics = [System.Drawing.Graphics]::FromImage($image)
            try {
                # En las fotografías individuales el código está aislado en
                # la esquina superior derecha, por encima de la patilla.
                $area = [System.Drawing.Rectangle]::new([int]($image.Width * 0.58), 0, [int]($image.Width * 0.41), [int]($image.Height * 0.14))
                for ($y = 0; $y -lt $area.Height; $y++) {
                    $sample = [System.Drawing.Color]::White
                    $bestScore = -1
                    for ($x = 4; $x -lt [int]($image.Width * 0.55); $x += 6) {
                        $candidate = $image.GetPixel($x, [Math]::Min($y, $image.Height - 1))
                        $spread = [Math]::Max($candidate.R, [Math]::Max($candidate.G, $candidate.B)) - [Math]::Min($candidate.R, [Math]::Min($candidate.G, $candidate.B))
                        $score = $candidate.R + $candidate.G + $candidate.B - ($spread * 3)
                        if ($score -gt $bestScore) { $bestScore = $score; $sample = $candidate }
                    }
                    $pen = [System.Drawing.Pen]::new($sample)
                    try { $graphics.DrawLine($pen, $area.Left, $y, $area.Right, $y) }
                    finally { $pen.Dispose() }
                }
            } finally { $graphics.Dispose() }
        }
        $image.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    } finally { $image.Dispose() }
}

function Save-ProductCrop {
    param(
        [System.Drawing.Bitmap]$SourceImage,
        [System.Drawing.Rectangle]$Rectangle,
        [string]$Destination
    )
    $crop = $SourceImage.Clone($Rectangle, $SourceImage.PixelFormat)
    try {
        if ((Test-HasRedX $crop) -or (Test-IsBlankVariant $crop)) { return $false }
        $clean = [System.Drawing.Bitmap]::new($crop.Width, $crop.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($clean)
        try {
            $graphics.Clear([System.Drawing.Color]::FromArgb(243, 239, 230))
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            # Omitir el borde superior y el pie de la celda. El armazón queda
            # centrado en un lienzo del color crema usado por la tienda.
            $sourceRect = [System.Drawing.Rectangle]::new(30, 95, $crop.Width - 60, $crop.Height - 129)
            $destRect = [System.Drawing.Rectangle]::new(12, 56, $crop.Width - 24, $crop.Height - 129)
            $matrix = [System.Drawing.Imaging.ColorMatrix]::new()
            $matrix.Matrix00 = 0.953
            $matrix.Matrix11 = 0.937
            $matrix.Matrix22 = 0.902
            $attributes = [System.Drawing.Imaging.ImageAttributes]::new()
            try {
                $attributes.SetColorMatrix($matrix)
                $graphics.DrawImage($crop, $destRect, $sourceRect.X, $sourceRect.Y, $sourceRect.Width, $sourceRect.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
            } finally { $attributes.Dispose() }
            # Cubrir sólo la zona editorial del código, que queda por encima
            # del cuerpo principal del lente en las láminas originales.
            $barcodeRect = [System.Drawing.Rectangle]::new(
                [int]($clean.Width * 0.54), 0,
                [int]($clean.Width * 0.42), [int]($clean.Height * 0.34)
            )
            # Usar el tono real del fondo ya tratado en cada fotografía evita
            # que la zona limpiada se perciba como un rectángulo superpuesto.
            $sampleColor = $clean.GetPixel([int]($clean.Width * 0.50), [int]($clean.Height * 0.18))
            $creamBrush = [System.Drawing.SolidBrush]::new($sampleColor)
            try { $graphics.FillRectangle($creamBrush, $barcodeRect) }
            finally { $creamBrush.Dispose() }
        } finally { $graphics.Dispose() }
        try { $clean.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Jpeg) }
        finally { $clean.Dispose() }
        return $true
    } finally {
        $crop.Dispose()
    }
}

$products = [System.Collections.Generic.List[object]]::new()
$excluded = [System.Collections.Generic.List[string]]::new()

# Las carpetas DSFO-047 a DSFO-055 ya contienen una foto por variante.
Get-ChildItem $sourcePath -Directory | Where-Object Name -ne "OneDrive_1_10-08-2026" | ForEach-Object {
    $folder = $_
    Get-ChildItem $folder.FullName -Filter *.jpg | Where-Object Name -NotMatch "DESCRIP" | ForEach-Object {
        $model = [regex]::Match($_.BaseName, 'D(?:SFO|FSO)-\d+').Value.Replace('DFSO', 'DSFO')
        if (-not $model) { return }
        $colorMatch = [regex]::Match($_.BaseName, 'C-(\d+)')
        $color = if ($colorMatch.Success) { "C-$($colorMatch.Groups[1].Value)" } else { "Principal" }
        $slug = (($model + '-' + $color).ToLower() -replace '[^a-z0-9-]', '-')
        $destination = Join-Path $outputPath "$slug.jpg"
        Save-IndividualPhoto -SourceFile $_.FullName -Destination $destination -HasVariantCode $colorMatch.Success
        $products.Add([ordered]@{
            id = "foose-$slug"; title = "$model $color"; brand = "FOOSE"; price = $null
            category = "optico"; gender = "unisex"; shape = ""; color = $color.ToLower()
            material = "metal"; features = @("nuevo"); image = "assets/foose/catalogo/$slug.jpg"
            description = "Armaz$([char]0x00F3)n $([char]0x00F3)ptico FOOSE, modelo $model, variante $color."
        })
    }
}

# Para el catálogo público usamos la toma frontal principal de cada lámina de
# OneDrive. Es la única fotografía sin código de barras ni marcas de stock y
# permite mostrar el armazón completo sin pintar o reconstruir ninguna pieza.
Get-ChildItem $oneDrivePath -Filter *.jpg | ForEach-Object {
    $sheet = [System.Drawing.Bitmap]::FromFile($_.FullName)
    try {
        $model = $_.BaseName
        $slug = $model.ToLower()
        $destination = Join-Path $outputPath "$slug.jpg"
        $heroRect = [System.Drawing.Rectangle]::new(55, 360, 1080, 405)
        $hero = $sheet.Clone($heroRect, $sheet.PixelFormat)
        try { $hero.Save($destination, [System.Drawing.Imaging.ImageFormat]::Jpeg) }
        finally { $hero.Dispose() }
        $material = if ($model -like 'XAPFO*') { 'acetato' } elseif ($model -like 'DSFO*') { 'metal' } else { '' }
        $products.Add([ordered]@{
            id = "foose-$slug"; title = $model; brand = "FOOSE"; price = $null
            category = "optico"; gender = "unisex"; shape = ""; color = ""
            material = $material; features = @("nuevo"); image = "assets/foose/catalogo/$slug.jpg"
            description = "Armaz$([char]0x00F3)n $([char]0x00F3)ptico FOOSE, modelo $model."
        })
    } finally {
        $sheet.Dispose()
    }
}

$catalogPath = Join-Path $projectRoot "data\productos.json"
$products | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $catalogPath -Encoding utf8
Write-Host "Productos generados: $($products.Count)"
Write-Host "Variantes con X excluidas: $($excluded.Count)"
if ($excluded.Count) { Write-Host ($excluded -join ', ') }
