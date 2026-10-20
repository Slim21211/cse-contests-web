import { useState, useEffect } from 'react';

// Компонент для плавной прокрутки наверх
const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Функция для прокрутки наверх
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth', // Плавно прокручиваем
    });
  };

  // Отслеживание скролла
  useEffect(() => {
    // Порог, после которого кнопка появляется (например, 200px)
    const toggleVisibility = () => {
      if (window.scrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    // Очистка при размонтировании
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <button
      className={`scroll-to-top ${isVisible ? 'visible' : ''}`}
      onClick={scrollToTop}
      title="Наверх"
      aria-label="Наверх"
    >
      ↑
    </button>
  );
};

export default ScrollToTopButton;
