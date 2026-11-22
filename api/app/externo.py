import time

import httpx

TIMEOUT_S = 5.0
CACHE_TTL_S = 600
_cache = {}

URL_CLIMA = "https://api.open-meteo.com/v1/forecast"
URL_AR = "https://air-quality-api.open-meteo.com/v1/air-quality"


def _chave(prefixo, lat, lon):
    # duas casas decimais dá uns 1 km, então pontos vizinhos dividem o cache
    return f"{prefixo}:{round(lat, 2)}:{round(lon, 2)}"


def _do_cache(chave):
    item = _cache.get(chave)
    if item and time.time() - item[0] < CACHE_TTL_S:
        return {**item[1], "cache": True}
    return None


async def _buscar(url, params):
    async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        return r.json()


def _mock_clima():
    return {"temperatura_c": 25.0, "precipitacao_mm": 0.0,
            "prob_chuva_max_pct": 30, "fonte": "mock", "cache": False}


def _mock_ar():
    return {"indice_aqi_us": 50, "pm10": 20.0, "pm2_5": 10.0,
            "classificacao": "Bom", "fonte": "mock", "cache": False}


def classificar_aqi(aqi):
    # faixas do US AQI
    if aqi <= 50:
        return "Bom"
    if aqi <= 100:
        return "Moderado"
    if aqi <= 150:
        return "Insalubre para grupos sensíveis"
    if aqi <= 200:
        return "Insalubre"
    if aqi <= 300:
        return "Muito insalubre"
    return "Perigoso"


async def obter_clima(lat, lon):
    chave = _chave("clima", lat, lon)
    if (c := _do_cache(chave)):
        return c
    try:
        j = await _buscar(URL_CLIMA, {
            "latitude": lat, "longitude": lon, "timezone": "auto",
            "current": "temperature_2m,precipitation",
            "hourly": "precipitation_probability", "forecast_days": 1,
        })
        probs = [p for p in j["hourly"]["precipitation_probability"] if p is not None]
        dado = {
            "temperatura_c": j["current"]["temperature_2m"],
            "precipitacao_mm": j["current"]["precipitation"],
            "prob_chuva_max_pct": max(probs) if probs else 0,
            "fonte": "open-meteo", "cache": False,
        }
        _cache[chave] = (time.time(), dado)
        return dado
    except (httpx.HTTPError, KeyError, ValueError):
        return _mock_clima()


async def obter_ar(lat, lon):
    chave = _chave("ar", lat, lon)
    if (c := _do_cache(chave)):
        return c
    try:
        j = await _buscar(URL_AR, {
            "latitude": lat, "longitude": lon, "timezone": "auto",
            "current": "us_aqi,pm10,pm2_5",
        })
        aqi = j["current"]["us_aqi"]
        dado = {
            "indice_aqi_us": aqi, "pm10": j["current"]["pm10"],
            "pm2_5": j["current"]["pm2_5"],
            "classificacao": classificar_aqi(aqi) if aqi is not None else "Indisponível",
            "fonte": "open-meteo", "cache": False,
        }
        _cache[chave] = (time.time(), dado)
        return dado
    except (httpx.HTTPError, KeyError, ValueError, TypeError):
        return _mock_ar()
