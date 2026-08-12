# Windows: 3000-portni tarmoqdan ochish (Administrator kerak)
$ruleName = "Kafe Next.js Dev 3000"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Firewall qoidasi allaqachon mavjud: $ruleName"
} else {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow | Out-Null
  Write-Host "Firewall qoidasi qo'shildi: $ruleName (port 3000)"
}
