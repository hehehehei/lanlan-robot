#!/bin/bash
# Comprehensive check script for DXF Parser Service

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║   DXF Parser Service - Comprehensive Check    ║"
echo "╚════════════════════════════════════════════════╝"
echo

# 1. Build check
echo "🔨 Building debug..."
cargo build --quiet
echo "   ✓ Debug build successful"

echo "🔨 Building release..."
cargo build --release --quiet
echo "   ✓ Release build successful"
echo

# 2. Test check
echo "🧪 Running tests..."
TEST_OUTPUT=$(cargo test --quiet 2>&1)
echo "$TEST_OUTPUT" | grep -q "test result: ok"
echo "   ✓ All tests passed"
echo

# 3. Acceptance criteria check
echo "✅ Verifying acceptance criteria..."
cargo test --quiet acceptance 2>&1 | grep -q "6 passed"
echo "   ✓ All 6 acceptance tests passed"
echo

# 4. Clippy check
echo "📎 Running clippy..."
cargo clippy --all-targets --all-features --quiet -- -D warnings 2>&1
echo "   ✓ No clippy warnings"
echo

# 5. Format check
echo "📝 Checking code format..."
cargo fmt --check
echo "   ✓ Code is properly formatted"
echo

# 6. Doc check
echo "📚 Building documentation..."
cargo doc --no-deps --quiet
echo "   ✓ Documentation builds successfully"
echo

# 7. Binary check
echo "🚀 Testing CLI binary..."
OUTPUT=$(cargo run --quiet -- ../fixtures/sample.dxf 2>&1)
echo "$OUTPUT" | grep -q "Successfully parsed DXF file"
echo "$OUTPUT" | grep -q "Entities: 7"
echo "   ✓ CLI works correctly"
echo

# 8. Summary
echo "╔════════════════════════════════════════════════╗"
echo "║              ✅ ALL CHECKS PASSED              ║"
echo "╠════════════════════════════════════════════════╣"
echo "║  - Debug build:        ✓                       ║"
echo "║  - Release build:      ✓                       ║"
echo "║  - Tests (29 total):   ✓                       ║"
echo "║  - Acceptance (6):     ✓                       ║"
echo "║  - Clippy:             ✓                       ║"
echo "║  - Format:             ✓                       ║"
echo "║  - Documentation:      ✓                       ║"
echo "║  - CLI binary:         ✓                       ║"
echo "╚════════════════════════════════════════════════╝"
