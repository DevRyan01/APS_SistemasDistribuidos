import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

let token = null;
let aoExpirar = () => {};

export const definirAoExpirar = (fn) => { aoExpirar = fn; };
export async function carregarToken() {
  token = await AsyncStorage.getItem('token');
  return token;
}
export async function salvarToken(t) {
  token = t;
  if (t) await AsyncStorage.setItem('token', t);
  else await AsyncStorage.removeItem('token');
}

async function req(caminho, { method = 'GET', body } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(API_URL + caminho, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    let dados = null;
    try { dados = await res.json(); } catch { /* corpo vazio */ }
    if (!res.ok) {
      const e = new Error(dados?.erro?.mensagem || 'Erro ao comunicar com o servidor.');
      e.status = res.status;
      e.codigo = dados?.erro?.codigo;
      throw e;
    }
    return dados;
  } catch (e) {
    if (e.status) {
      if (['TOKEN_EXPIRADO', 'TOKEN_INVALIDO', 'NAO_AUTENTICADO'].includes(e.codigo)) {
        await salvarToken(null);
        aoExpirar();
      }
      throw e;
    }
    const err = new Error(
      e.name === 'AbortError'
        ? 'O servidor demorou a responder.'
        : 'Sem conexão com o servidor. Verifique a rede e o endereço da API.'
    );
    err.codigo = 'REDE';
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  login: (email, senha) => req('/auth/login', { method: 'POST', body: { email, senha } }),
  registrar: (nome, email, senha) =>
    req('/auth/register', { method: 'POST', body: { nome, email, senha } }),
  clima: (lat, lon) => req(`/clima?lat=${lat}&lon=${lon}`),
  ar: (lat, lon) => req(`/ar?lat=${lat}&lon=${lon}`),
  criarOcorrencia: (o) => req('/ocorrencias', { method: 'POST', body: o }),
  listarOcorrencias: (lat, lon, raio = 10) =>
    req(`/ocorrencias?lat=${lat}&lon=${lon}&raio_km=${raio}`),
};
