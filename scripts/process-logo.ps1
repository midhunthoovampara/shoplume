Add-Type -AssemblyName System.Drawing

$srcPath = "d:\meeshoapp\public\logo-original.png"
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Host "Width: $($bmp.Width), Height: $($bmp.Height)"

# Find bounding box of non-white pixels
# Consider background white if R > 240, G > 240, B > 240
$minX = $bmp.Width
$maxX = 0
$minY = $bmp.Height
$maxY = 0

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $p = $bmp.GetPixel($x, $y)
        # Check if not pure white
        if ($p.R -lt 245 -or $p.G -lt 245 -or $p.B -lt 245) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Bounding box: minX=$minX, maxX=$maxX, minY=$minY, maxY=$maxY"

# Add small padding
$pad = 10
$cropX = [Math]::Max(0, $minX - $pad)
$cropY = [Math]::Max(0, $minY - $pad)
$cropWidth = [Math]::Min($bmp.Width - $cropX, ($maxX - $minX) + ($pad * 2))
$cropHeight = [Math]::Min($bmp.Height - $cropY, ($maxY - $minY) + ($pad * 2))

Write-Host "Crop: X=$cropX, Y=$cropY, W=$cropWidth, H=$cropHeight"

# Create new cropped bitmap with 32-bit ARGB (transparent)
$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropWidth, $cropHeight)
$croppedBmp = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $cropHeight; $y++) {
    for ($x = 0; $x -lt $cropWidth; $x++) {
        $origX = $cropX + $x
        $origY = $cropY + $y
        $pixel = $bmp.GetPixel($origX, $origY)
        
        # Calculate brightness/whiteness for clean alpha blending
        # If very close to white, make transparent or smooth alpha
        $r = [int]$pixel.R
        $g = [int]$pixel.G
        $b = [int]$pixel.B
        $whiteness = ($r + $g + $b) / 3.0

        if ($whiteness -ge 250) {
            $croppedBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } elseif ($whiteness -ge 235) {
            # Smooth anti-aliased edge
            $alpha = [int]((250 - $whiteness) / 15.0 * 255.0)
            $alpha = [Math]::Max(0, [Math]::Min(255, $alpha))
            $croppedBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $r, $g, $b))
        } else {
            $croppedBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $r, $g, $b))
        }
    }
}

$destPath = "d:\meeshoapp\public\logo.png"
$croppedBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved transparent cropped logo to $destPath"

$bmp.Dispose()
$croppedBmp.Dispose()
