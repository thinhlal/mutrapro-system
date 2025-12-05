# ============================================
# Script PowerShell để Build và Push Docker Images lên Docker Hub
# ============================================
# Cách dùng:
#   1. Đăng nhập Docker Hub: docker login
#   2. Set DOCKER_HUB_USERNAME trong .env hoặc $env:DOCKER_HUB_USERNAME
#   3. Chạy: powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1
#
# Hoặc chạy từng service:
#   powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1 -Service api-gateway

param(
    [string]$Service = "",
    [string]$DockerHubUsername = "",
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

# Load .env file nếu có
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($name -and $value -and -not $name.StartsWith('#')) {
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
    }
}

# Docker Hub username
if (-not $DockerHubUsername) {
    $DockerHubUsername = $env:DOCKER_HUB_USERNAME
}
if (-not $DockerHubUsername) {
    $DockerHubUsername = "mutrapro"
}

# Danh sách services
$Services = @(
    "api-gateway",
    "identity-service",
    "project-service",
    "billing-service",
    "request-service",
    "notification-service",
    "specialist-service",
    "chat-service"
)

# Function để build và push một service
function Build-AndPush {
    param($service)
    
    $imageName = "${DockerHubUsername}/${service}:${ImageTag}"
    
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Building $service..." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    
    # Build image
    docker build `
        -f "backend/${service}/Dockerfile" `
        -t $imageName `
        --build-arg BUILDKIT_INLINE_CACHE=1 `
        ./backend
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build $service thành công!" -ForegroundColor Green
    } else {
        Write-Host "❌ Build $service thất bại!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Pushing $imageName to Docker Hub..." -ForegroundColor Yellow
    
    # Push image
    docker push $imageName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Push $service thành công!" -ForegroundColor Green
    } else {
        Write-Host "❌ Push $service thất bại!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
}

# Main
Write-Host "========================================" -ForegroundColor Green
Write-Host "MuTraPro - Build and Push Docker Images" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Docker Hub Username: $DockerHubUsername" -ForegroundColor Yellow
Write-Host "Image Tag: $ImageTag" -ForegroundColor Yellow
Write-Host ""

# Kiểm tra đã login Docker Hub chưa
$dockerConfigPath = Join-Path $env:USERPROFILE ".docker\config.json"
$isLoggedIn = $false

if (Test-Path $dockerConfigPath) {
    try {
        $dockerConfig = Get-Content $dockerConfigPath -Raw | ConvertFrom-Json
        if ($dockerConfig.PSObject.Properties.Name -contains "auths") {
            $auths = $dockerConfig.auths
            if ($auths.PSObject.Properties.Count -gt 0) {
                $isLoggedIn = $true
            }
        }
    } catch {
        # Nếu không parse được JSON, thử cách khác
    }
}

# Nếu không tìm thấy trong config, thử kiểm tra bằng docker info
if (-not $isLoggedIn) {
    $dockerInfo = docker info 2>&1 | Out-String
    if ($dockerInfo -match "Username") {
        $isLoggedIn = $true
    }
}

if (-not $isLoggedIn) {
    Write-Host "⚠️  Chưa đăng nhập Docker Hub" -ForegroundColor Yellow
    Write-Host "Vui lòng chạy lệnh sau để đăng nhập:" -ForegroundColor Yellow
    Write-Host "  docker login" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Hoặc nếu bạn chắc chắn đã đăng nhập, script sẽ thử push và báo lỗi nếu cần." -ForegroundColor Yellow
    Write-Host "Bạn có muốn tiếp tục? (Y/N): " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    if ($response -ne "Y" -and $response -ne "y") {
        exit 1
    }
}

# Nếu có Service argument, chỉ build service đó
if ($Service) {
    if ($Services -contains $Service) {
        Build-AndPush $Service
    } else {
        Write-Host "❌ Service không hợp lệ: $Service" -ForegroundColor Red
        Write-Host "Services hợp lệ: $($Services -join ', ')" -ForegroundColor Yellow
        exit 1
    }
} else {
    # Build tất cả services
    Write-Host "Sẽ build và push $($Services.Count) services..." -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($service in $Services) {
        Build-AndPush $service
    }
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Hoàn thành!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Images đã được push lên Docker Hub:"
foreach ($service in $Services) {
    Write-Host "  - ${DockerHubUsername}/${service}:${ImageTag}" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Trên EC2, chạy:"
Write-Host "  docker-compose -f docker-compose.prod.hub.yml pull" -ForegroundColor Cyan
Write-Host "  docker-compose -f docker-compose.prod.hub.yml up -d" -ForegroundColor Cyan

