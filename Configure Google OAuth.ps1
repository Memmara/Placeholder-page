$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = Join-Path $project '.env.local'
Write-Host 'Google OAuth secret setup for Memmara' -ForegroundColor Cyan
Write-Host 'First reset the exposed client secret in Google Cloud. Paste the NEW secret below.'
$secure = Read-Host 'New Google client secret' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($secret)) { throw 'No secret was entered.' }
  $lines = if (Test-Path $envPath) { Get-Content $envPath } else { @() }
  $found = $false
  $updated = foreach ($line in $lines) {
    if ($line -match '^MEMMARA_GOOGLE_CLIENT_SECRET=') { $found = $true; "MEMMARA_GOOGLE_CLIENT_SECRET=$secret" } else { $line }
  }
  if (-not $found) { $updated += "MEMMARA_GOOGLE_CLIENT_SECRET=$secret" }
  Set-Content -LiteralPath $envPath -Value $updated -Encoding utf8
  Write-Host 'Saved locally. Restart Memmara for Google sign-in to become available.' -ForegroundColor Green
} finally {
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  $secret = $null
}
