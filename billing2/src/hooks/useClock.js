import { useState, useEffect } from 'react';

export default function useClock() {
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-IN', { hour12: false })
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}
