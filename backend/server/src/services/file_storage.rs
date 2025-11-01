use crate::error::{AppError, Result};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

pub struct FileStorage {
    root_path: PathBuf,
}

impl FileStorage {
    pub fn new(root_path: PathBuf) -> Self {
        Self { root_path }
    }

    pub fn root_path(&self) -> &PathBuf {
        &self.root_path
    }

    pub async fn store_file(
        &self,
        data: &[u8],
        original_filename: &str,
    ) -> Result<(PathBuf, String)> {
        let file_uuid = Uuid::new_v4();
        let file_dir = self.root_path.join(file_uuid.to_string());

        fs::create_dir_all(&file_dir).await?;

        let extension = Path::new(original_filename)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("dxf");

        let filename = format!("original.{}", extension);
        let file_path = file_dir.join(&filename);

        let mut file = fs::File::create(&file_path).await?;
        file.write_all(data).await?;
        file.flush().await?;

        let checksum = self.calculate_checksum(data);

        let relative_path = file_path
            .strip_prefix(&self.root_path)
            .map_err(|e| AppError::Internal(format!("Path error: {}", e)))?
            .to_path_buf();

        Ok((relative_path, checksum))
    }

    fn calculate_checksum(&self, data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    pub fn detect_encoding(&self, data: &[u8]) -> String {
        let mut detector = chardetng::EncodingDetector::new();
        detector.feed(data, true);
        let encoding = detector.guess(None, true);
        encoding.name().to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_store_file() {
        let temp_dir = tempdir().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf());

        let data = b"test file content";
        let (path, checksum) = storage
            .store_file(data, "test.dxf")
            .await
            .expect("Failed to store file");

        assert!(path.to_str().unwrap().contains("original.dxf"));
        assert!(!checksum.is_empty());
        assert_eq!(checksum.len(), 64);
    }

    #[tokio::test]
    async fn test_detect_encoding() {
        let storage = FileStorage::new(PathBuf::from("test"));

        let utf8_data = "Hello World".as_bytes();
        let encoding = storage.detect_encoding(utf8_data);
        assert_eq!(encoding, "UTF-8");

        let gbk_data = b"\xb2\xe2\xca\xd4";
        let encoding = storage.detect_encoding(gbk_data);
        assert!(
            encoding == "GBK" || encoding == "gb18030",
            "Detected encoding: {}",
            encoding
        );
    }
}
