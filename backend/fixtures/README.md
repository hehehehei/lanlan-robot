# Test Fixtures

This directory contains sample DXF files for testing the file upload and charset detection functionality.

## Files

### sample_utf8.dxf
Standard UTF-8 encoded DXF file with basic entities (lines, text).
Contains English text.

### sample_gbk.dxf
DXF file with Chinese text encoded in GBK/GB2312.
Contains the text "测试文本" (test text).

## Usage

These files are used in integration tests to verify:
1. File upload functionality
2. Charset detection for different encodings
3. File storage and metadata recording

The charset detection library (chardetng) will detect:
- UTF-8
- GBK/GB2312 (Chinese Simplified)
- Big5 (Chinese Traditional)
- windows-1252 (Western European)
- And other common encodings

## Adding New Test Files

When adding new test fixtures:
1. Name files descriptively: `sample_{encoding}.{ext}`
2. Document the expected encoding and content
3. Keep files small (<100KB) for fast tests
4. Update integration tests to use new fixtures
