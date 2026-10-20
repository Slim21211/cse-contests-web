import { ChangeEvent, useState, useEffect } from 'react';

interface FileUploadProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  accept?: string;
}

export default function FileUpload({
  file,
  onChange,
  disabled,
  accept = 'image/*,video/*,.pdf,.doc,.docx,.txt',
}: FileUploadProps) {
  // 1. Храним объектный URL в состоянии
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // 2. Создаем и очищаем URL при изменении файла
  useEffect(() => {
    if (file) {
      // Создаем URL только один раз
      const url = URL.createObjectURL(file);
      setFileUrl(url);

      // Очистка: когда компонент размонтируется или file изменится
      return () => {
        URL.revokeObjectURL(url);
        setFileUrl(null); // Очищаем состояние
      };
    } else {
      setFileUrl(null);
    }
  }, [file]); // Зависит только от объекта файла

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onChange(selectedFile);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('document') || file.type.includes('text'))
      return '📝';
    return '📎';
  };

  return (
    <div className="file-upload">
      <div className="file-input-wrapper">
        <input
          type="file"
          id="file-input"
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
        />
        <label htmlFor="file-input" className="file-input-button">
          {file ? 'Изменить файл' : '📎 Выберите файл'}
        </label>
      </div>

      {file && (
        <div className="file-preview">
          <div className="file-info">
            <span>{getFileIcon(file)}</span>
            <span>{file.name}</span>
            <span>({(file.size / 1024 / 1024).toFixed(2)} МБ)</span>
          </div>

          {/* 3. Используем мемоизированный fileUrl */}
          {file.type.startsWith('image/') && fileUrl && (
            <img src={fileUrl} alt="Preview" />
          )}

          {file.type.startsWith('video/') && fileUrl && (
            <video controls src={fileUrl} />
          )}
        </div>
      )}
    </div>
  );
}
