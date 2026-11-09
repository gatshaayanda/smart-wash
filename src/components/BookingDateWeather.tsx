"use client";
import { useEffect, useState } from "react";

type Forecast = { code: number; high: number; low: number; rain: number };
type Props = { date: string; latitude?: number; longitude?: number; locationLabel?: string };

function describeWeather(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code === 45 || code === 48) return "Fog";
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return "Rain or drizzle";
  if ([95,96,99].includes(code)) return "Thunderstorms";
  return "Cloudy";
}

export default function BookingDateWeather({ date, latitude, longitude, locationLabel = "the wash location" }: Props) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "outside" | "unconfigured">("unconfigured");

  useEffect(() => {
    if (!date) return;
    if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setForecast(null);
      setState("unconfigured");
      return;
    }
    const selected = new Date(date + "T12:00:00Z");
    const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const today = new Date(todayKey + "T12:00:00Z");
    const daysAhead = Math.round((selected.getTime() - today.getTime()) / 86400000);
    if (daysAhead < 0 || daysAhead > 15) { setForecast(null); setState("outside"); return; }

    const controller = new AbortController();
    setState("loading");
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      start_date: date,
      end_date: date,
      timezone: "Africa/Gaborone",
    });
    fetch("https://api.open-meteo.com/v1/forecast?" + params.toString(), { signal: controller.signal, cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error("Unavailable"); return response.json(); })
      .then(data => {
        const daily = data?.daily;
        if (!daily || !Array.isArray(daily.weather_code) || typeof daily.weather_code[0] !== "number"
          || typeof daily.temperature_2m_max?.[0] !== "number" || typeof daily.temperature_2m_min?.[0] !== "number") throw new Error("Incomplete");
        setForecast({
          code: daily.weather_code[0],
          high: daily.temperature_2m_max[0],
          low: daily.temperature_2m_min[0],
          rain: typeof daily.precipitation_probability_max?.[0] === "number" ? daily.precipitation_probability_max[0] : -1,
        });
        setState("ready");
      })
      .catch(error => {
        if (error instanceof Error && error.name === "AbortError") return;
        setForecast(null);
        setState("unavailable");
      });
    return () => controller.abort();
  }, [date, latitude, longitude]);

  const icon = state === "ready" && forecast
    ? forecast.code >= 95 ? "⛈️" : forecast.code >= 51 && forecast.code <= 82 ? "🌧️" : forecast.code === 0 ? "☀️" : "🌤️"
    : "🌤️";
  return <div className="bb-selected-date-weather" aria-live="polite">
    <span aria-hidden="true">{icon}</span>
    {state === "loading" ? <small>Checking the {locationLabel} forecast for this date…</small>
      : state === "ready" && forecast ? <small><strong>{describeWeather(forecast.code)}</strong> · {Math.round(forecast.low)}–{Math.round(forecast.high)}°C{forecast.rain >= 0 ? " · " + forecast.rain + "% rain chance" : ""} <span>Forecast, may change.</span></small>
      : state === "outside" ? <small>Weather forecast not available this far ahead yet. Check again closer to your wash date.</small>
      : state === "unconfigured" ? <small>Local forecast is not set up yet. Your wash request can still be made.</small>
      : <small>{locationLabel} forecast is temporarily unavailable. Your wash request can still be made.</small>}
  </div>;
}
