$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = Join-Path $project '.env.local'
Write-Host 'Memmara email delivery setup' -ForegroundColor Cyan
Write-Host 'Paste the Resend API key for the verified memmara.com domain.'
$secure = Read-Host 'Resend API key' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($key)) { throw 'No API key was entered.' }
  $lines = if (Test-Path $envPath) { Get-Content $envPath } else { @() }
  $found = $false
  $updated = foreach ($line in $lines) {
    if ($line -match '^MEMMARA_RESEND_API_KEY=') { $found = $true; "MEMMARA_RESEND_API_KEY=$key" } else { $line }
  }
  if (-not $found) { $updated += "MEMMARA_RESEND_API_KEY=$key" }
  Set-Content -LiteralPath $envPath -Value $updated -Encoding utf8
  Write-Host 'Email delivery key saved locally. Restart Memmara to use it.' -ForegroundColor Green
} finally {
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  $key = $null
}
