#!/bin/bash

# DXF Parser Service Verification Script

set -e

echo "=== DXF Parser Service Verification ==="
echo

echo "1. Building project..."
cargo build --quiet
echo "   ✓ Build successful"
echo

echo "2. Running tests..."
cargo test --quiet
echo "   ✓ All tests passed"
echo

echo "3. Testing CLI with sample DXF..."
OUTPUT=$(cargo run --quiet -- ../fixtures/sample.dxf 2>&1)
echo "$OUTPUT" | grep -q "Successfully parsed DXF file"
echo "$OUTPUT" | grep -q "Entities: 7"
echo "$OUTPUT" | grep -q "Layers:"
echo "$OUTPUT" | grep -q "Bounding box:"
echo "   ✓ CLI parsing works correctly"
echo

echo "4. Checking documentation..."
cargo doc --no-deps --quiet
echo "   ✓ Documentation builds"
echo

echo "5. Checking code formatting..."
cargo fmt --check
echo "   ✓ Code is properly formatted"
echo

echo "=== All Verifications Passed! ==="
