#!/usr/bin/env bash
###############################################################################
# bootstrap_troubleshooting.sh
#
# Installs all dependencies for the self-healing troubleshooting system:
# - Node.js dependencies + Playwright browsers
# - Python dependencies + security scanners (pip-audit, bandit, semgrep)
# - Validates Docker + Docker Compose
# - Creates required directories
#
# Usage:
#   ./scripts/bootstrap_troubleshooting.sh
#
# Exit codes:
#   0 - Success
#   1 - Missing required tool
#   2 - Installation failure
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

###############################################################################
# 1. Validate required tools
###############################################################################
log_info "Checking required tools..."

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
    log_success "$1 found: $(command -v "$1")"
}

check_command node
check_command npm
check_command python3
check_command pip3
check_command docker

# Check Docker Compose (v2 plugin or standalone)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
    log_success "Docker Compose v2 found"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
    log_success "Docker Compose standalone found"
else
    log_error "Docker Compose not found. Install docker-compose or Docker Desktop."
    exit 1
fi

# Verify Docker daemon is running
if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running. Start Docker first."
    exit 1
fi
log_success "Docker daemon is running"

###############################################################################
# 2. Create required directories
###############################################################################
log_info "Creating required directories..."

DIRS=(
    "artifacts"
    "artifacts/traces"
    "artifacts/screenshots"
    "artifacts/logs"
    "artifacts/reports"
    ".auth"
    "test-results"
    "e2e/tests"
    "tests/security_invariants"
)

for dir in "${DIRS[@]}"; do
    mkdir -p "$dir"
    log_success "Created: $dir"
done

# Ensure artifacts is in .gitignore
if ! grep -q "^artifacts/" .gitignore 2>/dev/null; then
    echo "artifacts/" >> .gitignore
    log_success "Added artifacts/ to .gitignore"
fi

###############################################################################
# 3. Install Node.js dependencies
###############################################################################
log_info "Installing Node.js dependencies..."

if [ -f "package-lock.json" ]; then
    npm ci --silent
else
    npm install --silent
fi
log_success "Node.js dependencies installed"

###############################################################################
# 4. Install Playwright and browsers
###############################################################################
log_info "Installing Playwright..."

# Install Playwright as dev dependency if not present
if ! grep -q '"@playwright/test"' package.json; then
    npm install -D @playwright/test --silent
    log_success "Playwright package installed"
fi

# Install browsers (chromium only for speed)
npx playwright install chromium --with-deps
log_success "Playwright browsers installed"

###############################################################################
# 5. Install Python dependencies
###############################################################################
log_info "Installing Python dependencies..."

# Create requirements file for troubleshooting tools
cat > requirements-troubleshooting.txt << 'EOF'
# Security scanners
pip-audit>=2.6.0
bandit>=1.7.0
safety>=2.3.0

# Testing
pytest>=7.4.0
pytest-asyncio>=0.21.0
httpx>=0.25.0
python-dotenv>=1.0.0

# For triage and orchestration
pyyaml>=6.0
jinja2>=3.1.0

# LLM clients
anthropic>=0.18.0
httpx>=0.25.0

# Utilities
rich>=13.0.0
EOF

pip3 install -r requirements-troubleshooting.txt --quiet
log_success "Python dependencies installed"

# Check if semgrep is available (optional, heavier install)
if command -v semgrep &> /dev/null; then
    log_success "Semgrep already installed"
else
    log_warn "Semgrep not installed. Installing..."
    pip3 install semgrep --quiet || log_warn "Semgrep installation failed (optional)"
fi

###############################################################################
# 6. Validate security scanner installation
###############################################################################
log_info "Validating security scanners..."

pip-audit --version &> /dev/null && log_success "pip-audit ready"
bandit --version &> /dev/null && log_success "bandit ready"

###############################################################################
# 7. Create .env template if missing
###############################################################################
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    log_warn "Created .env from .env.example - please configure"
fi

###############################################################################
# 8. Verify Docker Compose configuration
###############################################################################
log_info "Validating Docker Compose configuration..."

if [ -f "docker-compose.yml" ]; then
    $DOCKER_COMPOSE config --quiet && log_success "docker-compose.yml is valid"
else
    log_warn "docker-compose.yml not found - will create default"
fi

if [ -f "docker-compose.override.yml" ]; then
    log_success "docker-compose.override.yml found (test overrides)"
fi

###############################################################################
# 9. Summary
###############################################################################
echo ""
echo "=============================================="
log_success "Bootstrap complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Configure .env with required secrets"
echo "  2. Run: ./scripts/self_heal_run.sh --dry-run"
echo "  3. Or run tests directly: npx playwright test"
echo ""
echo "Directories created:"
echo "  - artifacts/     (test artifacts, ignored by git)"
echo "  - .auth/         (Playwright auth state)"
echo "  - test-results/  (Playwright results)"
echo ""
