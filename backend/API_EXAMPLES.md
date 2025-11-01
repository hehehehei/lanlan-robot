# API Usage Examples

## File Upload Endpoint

### Upload a DXF file

```bash
curl -X POST http://localhost:3000/api/projects/1/files \
  -F "file=@/path/to/drawing.dxf"
```

### Upload a DWG file

```bash
curl -X POST http://localhost:3000/api/projects/1/files \
  -F "file=@/path/to/drawing.dwg"
```

### Success Response (201 Created)

```json
{
  "id": 42,
  "name": "drawing.dxf",
  "size": 12345,
  "checksum": "a3b5c7d9e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8",
  "storage_path": "550e8400-e29b-41d4-a716-446655440000/original.dxf",
  "encoding": "UTF-8",
  "status": "uploaded_awaiting_parse",
  "created_at": "2023-11-01T10:30:45.123456Z"
}
```

### Error Responses

#### Project Not Found (404)

```bash
curl -X POST http://localhost:3000/api/projects/99999/files \
  -F "file=@/path/to/drawing.dxf"
```

Response:
```json
{
  "error": "Project not found"
}
```

#### Invalid File Type (400)

```bash
curl -X POST http://localhost:3000/api/projects/1/files \
  -F "file=@/path/to/document.pdf"
```

Response:
```json
{
  "error": "Invalid file type"
}
```

#### File Too Large (413)

When uploading a file larger than 100MB:

```json
{
  "error": "File too large"
}
```

#### Storage Limit Exceeded (409)

Optional stub for future implementation:

```json
{
  "error": "Storage limit exceeded"
}
```

## Using with JavaScript/TypeScript

```typescript
async function uploadFile(projectId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api/projects/${projectId}/files`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}

// Usage
const file = document.getElementById('file-input').files[0];
try {
  const result = await uploadFile(1, file);
  console.log('Upload successful:', result);
} catch (error) {
  console.error('Upload failed:', error.message);
}
```

## Using with Python

```python
import requests

def upload_file(project_id, file_path):
    url = f'http://localhost:3000/api/projects/{project_id}/files'
    
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(url, files=files)
    
    if response.status_code == 201:
        return response.json()
    else:
        raise Exception(f"Upload failed: {response.json()['error']}")

# Usage
try:
    result = upload_file(1, '/path/to/drawing.dxf')
    print(f"Upload successful: {result}")
except Exception as e:
    print(f"Upload failed: {e}")
```

## Charset Detection

The API automatically detects the character encoding of uploaded DXF files. Supported encodings include:

- **UTF-8**: Most modern DXF files
- **GBK/GB2312**: Chinese Simplified
- **Big5**: Chinese Traditional
- **windows-1252**: Western European
- **Shift_JIS**: Japanese
- **EUC-KR**: Korean

The detected encoding is returned in the `encoding` field of the response and stored in the database for later use during parsing.

## File Storage

Uploaded files are stored on disk using the following structure:

```
storage/uploads/
└── {uuid}/
    └── original.{ext}
```

Example:
```
storage/uploads/
└── 550e8400-e29b-41d4-a716-446655440000/
    └── original.dxf
```

The storage path is relative to the configured `STORAGE_ROOT` and is recorded in the database for retrieval.

## Checksum Calculation

All uploaded files have a SHA-256 checksum calculated and stored. This can be used to:
- Verify file integrity
- Detect duplicate uploads
- Validate successful transfers

The checksum is a 64-character hexadecimal string.
