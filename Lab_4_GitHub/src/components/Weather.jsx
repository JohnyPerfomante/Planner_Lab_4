import { useEffect, useState } from 'react';

const url =
  'https://api.open-meteo.com/v1/forecast?latitude=50.45&longitude=30.52&current=temperature_2m,wind_speed_10m&timezone=Europe%2FKyiv';

export default function Weather() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let active = true;
    setError('');
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Погодний сервіс недоступний.');
        return response.json();
      })
      .then((value) => {
        if (
          !Number.isFinite(value.current?.temperature_2m) ||
          !Number.isFinite(value.current?.wind_speed_10m)
        )
          throw new Error('Некоректна відповідь погодного сервісу.');
        if (active) setData(value.current);
      })
      .catch(() => {
        if (active) setError('Не вдалося отримати погоду.');
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);
  return (
    <section className="weather">
      <div>
        <p className="eyebrow">ЗОВНІШНІ УМОВИ · КИЇВ</p>
        <h3>Погода для виїзних місій</h3>
        <p>Довідкові дані Open-Meteo</p>
      </div>
      {error ? (
        <div role="status">
          {error}
          <button
            className="text-button"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Повторити
          </button>
        </div>
      ) : data ? (
        <div className="weather-values">
          <strong>{data.temperature_2m} °C</strong>
          <span>
            Вітер {data.wind_speed_10m} км/год
            <small>Дані на {data.time.replace('T', ' ')}</small>
          </span>
        </div>
      ) : (
        <p role="status">Отримання погоди…</p>
      )}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
        Джерело: Open-Meteo
      </a>
    </section>
  );
}
