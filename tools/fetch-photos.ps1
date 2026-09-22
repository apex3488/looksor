$pairs = @{
  'assets/images/products/platya-1.jpg' = 'https://picsum.photos/id/1011/900/1200'
  'assets/images/products/platya-2.jpg' = 'https://picsum.photos/id/1012/900/1200'
  'assets/images/products/top-1.jpg' = 'https://picsum.photos/id/64/900/1200'
  'assets/images/products/top-2.jpg' = 'https://picsum.photos/id/65/900/1200'
  'assets/images/products/pants-1.jpg' = 'https://picsum.photos/id/338/900/1200'
  'assets/images/products/pants-2.jpg' = 'https://picsum.photos/id/349/900/1200'
  'assets/images/products/skirt-1.jpg' = 'https://picsum.photos/id/823/900/1200'
  'assets/images/products/skirt-2.jpg' = 'https://picsum.photos/id/836/900/1200'
  'assets/images/products/suit-1.jpg' = 'https://picsum.photos/id/453/900/1200'
  'assets/images/products/suit-2.jpg' = 'https://picsum.photos/id/454/900/1200'
  'assets/images/products/coat-1.jpg' = 'https://picsum.photos/id/628/900/1200'
  'assets/images/products/coat-2.jpg' = 'https://picsum.photos/id/646/900/1200'
  'assets/images/products/shirt-1.jpg' = 'https://picsum.photos/id/177/900/1200'
  'assets/images/products/shirt-2.jpg' = 'https://picsum.photos/id/91/900/1200'
  'assets/images/products/jeans-1.jpg' = 'https://picsum.photos/id/1025/900/1200'
  'assets/images/products/jeans-2.jpg' = 'https://picsum.photos/id/1027/900/1200'
  'assets/images/products/knit-1.jpg' = 'https://picsum.photos/id/996/900/1200'
  'assets/images/products/knit-2.jpg' = 'https://picsum.photos/id/1005/900/1200'
  'assets/images/products/scarf-1.jpg' = 'https://picsum.photos/id/325/900/1200'
  'assets/images/products/scarf-2.jpg' = 'https://picsum.photos/id/326/900/1200'
  'assets/images/hero.jpg' = 'https://picsum.photos/id/1011/1600/1000'
  'assets/images/editorial.jpg' = 'https://picsum.photos/id/1012/1600/1000'
  'assets/images/cats/1.jpg' = 'https://picsum.photos/id/1011/1200/800'
  'assets/images/cats/2.jpg' = 'https://picsum.photos/id/64/1200/800'
  'assets/images/cats/3.jpg' = 'https://picsum.photos/id/996/1200/800'
  'assets/images/cats/4.jpg' = 'https://picsum.photos/id/823/1200/800'
  'assets/images/cats/5.jpg' = 'https://picsum.photos/id/453/1200/800'
  'assets/images/cats/6.jpg' = 'https://picsum.photos/id/628/1200/800'
  'assets/images/ig/1.jpg' = 'https://picsum.photos/id/1011/800/800'
  'assets/images/ig/2.jpg' = 'https://picsum.photos/id/64/800/800'
  'assets/images/ig/3.jpg' = 'https://picsum.photos/id/1012/800/800'
  'assets/images/ig/4.jpg' = 'https://picsum.photos/id/177/800/800'
  'assets/images/ig/5.jpg' = 'https://picsum.photos/id/338/800/800'
  'assets/images/ig/6.jpg' = 'https://picsum.photos/id/996/800/800'
}
foreach ($k in $pairs.Keys) {
  $dir = Split-Path $k
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  curl.exe -sL --max-time 25 -A "Mozilla/5.0" -o $k $pairs[$k]
  $len = (Get-Item $k).Length
  Write-Output "$k $len"
}
