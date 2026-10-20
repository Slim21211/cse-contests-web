import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './lightbox.module.scss';

interface LightboxProps {
  imageUrl: string;
  rotation?: number;
  onClose: () => void;
}

const Lightbox = ({ imageUrl, rotation = 0, onClose }: LightboxProps) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const isRotated90or270 = rotation % 180 !== 0;

  const imageStyle: React.CSSProperties = {
    transform: `rotate(${rotation}deg)`,
    maxWidth: isRotated90or270 ? '100vh' : '100%',
    maxHeight: isRotated90or270 ? '100vw' : '100%',
  };

  // Рендерим напрямую в body через Portal
  return createPortal(
    <div className={styles.lightbox} onClick={onClose}>
      <button className={styles.closeButton} onClick={onClose}>
        ×
      </button>
      <img
        src={imageUrl}
        alt="Полноэкранный просмотр"
        className={styles.image}
        style={imageStyle}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
};

export default Lightbox;
