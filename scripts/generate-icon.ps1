Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(128, 128)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'

# Gradient background
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.Point]::new(0, 0),
    [System.Drawing.Point]::new(128, 128),
    [System.Drawing.Color]::FromArgb(59, 130, 246),
    [System.Drawing.Color]::FromArgb(139, 92, 246)
)
$g.FillRectangle($brush, 0, 0, 128, 128)

# Round corners (fill corners with transparent-ish overlay)
# Skip for simplicity — square icon is fine for marketplace

# "TS" text
$font = New-Object System.Drawing.Font('Arial', 28, [System.Drawing.FontStyle]::Bold)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = 'Center'
$sf.LineAlignment = 'Center'
$rect = New-Object System.Drawing.RectangleF(0, 0, 128, 80)
$g.DrawString('TS', $font, [System.Drawing.Brushes]::White, $rect, $sf)

# Graph nodes (circles)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 2.5)
$g.DrawEllipse($pen, 30, 72, 20, 20)
$g.DrawEllipse($pen, 78, 72, 20, 20)
$g.DrawEllipse($pen, 54, 96, 20, 20)

# Filled centers
$g.FillEllipse([System.Drawing.Brushes]::White, 36, 78, 8, 8)
$g.FillEllipse([System.Drawing.Brushes]::White, 84, 78, 8, 8)
$g.FillEllipse([System.Drawing.Brushes]::White, 60, 102, 8, 8)

# Graph edges (lines)
$thinPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 255, 255, 255), 2)
$g.DrawLine($thinPen, 48, 88, 58, 100)
$g.DrawLine($thinPen, 80, 88, 70, 100)
$g.DrawLine($thinPen, 50, 82, 78, 82)

# Save
$g.Dispose()
$bmp.Save('c:\Users\51p50x\Documents\ts-visualizer\images\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host 'icon.png created successfully'
