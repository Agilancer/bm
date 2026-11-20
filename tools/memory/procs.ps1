param([string]$tag)
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like "*$tag*" } | ForEach-Object {
  $t = if ($_.CommandLine -match '--type=([a-z-]+)') { $Matches[1] } else { 'browser' }
  "$t $([math]::Round($_.WorkingSetSize/1MB)) $([math]::Round($_.PrivatePageCount/1MB))"
}
