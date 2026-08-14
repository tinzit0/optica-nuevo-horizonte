$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$directory = Join-Path $projectRoot 'assets\catalogo\le-giro\optico'
$created = 0

Get-ChildItem -LiteralPath $directory -File -Filter '*-principal.jpg' | Where-Object {
    $_.BaseName -notmatch '-1-principal$' -and $_.BaseName -notmatch '-catalogo$'
} | ForEach-Object {
    $source = $_
    $image = [Drawing.Bitmap]::FromFile($source.FullName)
    try {
        if ($image.Width -ne 2400 -or $image.Height -lt 2000) { return }
        $crop = $image.Clone([Drawing.Rectangle]::new(80, 315, 1040, 425), $image.PixelFormat)
        try {
            $canvas = [Drawing.Bitmap]::new(1200, 650)
            $graphics = [Drawing.Graphics]::FromImage($canvas)
            try {
                $graphics.Clear([Drawing.Color]::White)
                $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.DrawImage($crop, [Drawing.Rectangle]::new(55, 85, 1090, 445))
            } finally { $graphics.Dispose() }
            try {
                $destination = Join-Path $directory "$($source.BaseName)-catalogo.jpg"
                $canvas.Save($destination, [Drawing.Imaging.ImageFormat]::Jpeg)
                $created++
            } finally { $canvas.Dispose() }
        } finally { $crop.Dispose() }
    } finally { $image.Dispose() }
}

Write-Host "Fotos Le Giro normalizadas: $created"
