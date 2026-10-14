Add-Type -AssemblyName System.Drawing

$srcPath = "d:\meeshoapp\public\logo.png"
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

$destBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $p = $bmp.GetPixel($x, $y)
        
        # If transparent, keep transparent
        if ($p.A -eq 0) {
            $destBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            continue
        }

        # Check if the pixel belongs to the dark text "Shop"
        # The dark text has low saturation and low brightness (R,G,B are similar and < 80)
        # Whereas the orange/red gradient has high R and different G/B
        $isDarkText = ($p.R -lt 100 -and $p.G -lt 100 -and $p.B -lt 100)
        
        if ($isDarkText) {
            # Turn to pure white while preserving alpha
            $destBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($p.A, 255, 255, 255))
        } else {
            # Keep original gradient (orange/pink/red)
            $destBmp.SetPixel($x, $y, $p)
        }
    }
}

$destPath = "d:\meeshoapp\public\logo-white.png"
$destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved white-mode logo to $destPath"

$bmp.Dispose()
$destBmp.Dispose()
