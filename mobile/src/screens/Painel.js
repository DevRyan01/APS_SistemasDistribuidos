import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { api } from '../api';
import { obterLocalizacao } from '../localizacao';
import { e } from '../estilos';
 
const RAIO_KM = 10;
const JANELA_MS = 24 * 60 * 60 * 1000; // últimas 24 horas
 
// Converte a data ISO da API em milissegundos. A API envia microssegundos
// (6 casas decimais); reduz para 3 casas para evitar falha de leitura no Hermes.
function paraMs(iso) {
  const normalizada = String(iso).replace(/(\.\d{3})\d+/, '$1');
  const ms = new Date(normalizada).getTime();
  return Number.isNaN(ms) ? null : ms;
}
 
// Conta as ocorrências das últimas 24 h e informa a distância da mais próxima.
export function resumirOcorrencias(lista, agora = Date.now()) {
  if (!Array.isArray(lista)) return null;
  const recentes = lista.filter((o) => {
    const ms = paraMs(o.criado_em);
    return ms !== null && agora - ms >= 0 && agora - ms <= JANELA_MS;
  });
  const maisProxima = recentes.length
    ? Math.min(...recentes.map((o) => o.distancia_km))
    : null;
  return { total: recentes.length, maisProxima };
}
 
export default function Painel({ nome }) {
  const [clima, setClima] = useState(null);
  const [ar, setAr] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [localPadrao, setLocalPadrao] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
 
  const carregar = useCallback(async () => {
    setErro('');
    setAtualizando(true);
    try {
      const { lat, lon, padrao } = await obterLocalizacao({ permitirPadrao: true });
      setLocalPadrao(!!padrao);
      const [c, a, o] = await Promise.all([
        api.clima(lat, lon),
        api.ar(lat, lon),
        // falha nas ocorrências não deve derrubar clima e ar
        api.listarOcorrencias(lat, lon, RAIO_KM).catch(() => null),
      ]);
      setClima(c);
      setAr(a);
      setResumo(resumirOcorrencias(o));
    } catch (ex) {
      setErro(ex.message);
    } finally {
      setAtualizando(false);
    }
  }, []);
 
  useEffect(() => { carregar(); }, [carregar]);
 
  const usandoMock = clima?.fonte === 'mock' || ar?.fonte === 'mock';
 
  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo}
                refreshControl={<RefreshControl refreshing={atualizando} onRefresh={carregar} />}>
      <Text style={e.titulo}>Olá, {nome}</Text>
 
      {!!erro && (
        <View style={e.card}>
          <Text style={e.erro}>{erro}</Text>
          <TouchableOpacity style={e.botaoSec} onPress={carregar}>
            <Text style={e.botaoSecTxt}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}
 
      {usandoMock && (
        <Text style={e.aviso}>
          Serviço de dados indisponível. Os valores abaixo são fictícios, apenas para demonstração.
        </Text>
      )}
 
      {localPadrao && (
        <Text style={e.aviso}>
          Localização do aparelho indisponível. Exibindo dados de São Paulo (centro).
        </Text>
      )}
 
      {clima && (
        <View style={e.card}>
          <Text style={e.subtitulo}>Clima</Text>
          <Text style={e.grande}>{clima.temperatura_c}°C</Text>
          <Text style={e.texto}>Precipitação agora: {clima.precipitacao_mm} mm</Text>
          <Text style={e.texto}>Maior probabilidade de chuva hoje: {clima.prob_chuva_max_pct}%</Text>
          <Text style={e.suave}>Fonte: {clima.fonte}{clima.cache ? ' (em cache)' : ''}</Text>
        </View>
      )}
 
      {ar && (
        <View style={e.card}>
          <Text style={e.subtitulo}>Qualidade do ar</Text>
          <Text style={e.grande}>{ar.indice_aqi_us ?? '--'}</Text>
          <Text style={e.texto}>{ar.classificacao}</Text>
          <Text style={e.texto}>PM2.5: {ar.pm2_5} · PM10: {ar.pm10} (µg/m³)</Text>
          <Text style={e.suave}>Fonte: {ar.fonte}{ar.cache ? ' (em cache)' : ''}</Text>
        </View>
      )}
 
      {clima && (
        <View style={e.card}>
          <Text style={e.subtitulo}>Ocorrências nas últimas 24 h</Text>
          {resumo === null ? (
            <Text style={e.suave}>Não foi possível consultar as ocorrências agora.</Text>
          ) : (
            <>
              <Text style={e.grande}>{resumo.total}</Text>
              <Text style={e.texto}>
                {resumo.total === 0
                  ? `Nenhum relato em um raio de ${RAIO_KM} km.`
                  : `${resumo.total === 1 ? 'relato' : 'relatos'} de moradores em um raio de ${RAIO_KM} km. ` +
                    `O mais próximo está a ${resumo.maisProxima} km.`}
              </Text>
              <Text style={e.suave}>Relatos de usuários, não verificados.</Text>
            </>
          )}
        </View>
      )}
 
      <Text style={e.suave}>
        Dados meteorológicos por{' '}
        <Text style={{ textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL('https://open-meteo.com/')}>
          Open-Meteo.com
        </Text>
        . Qualidade do ar: modelos CAMS (Copernicus), via Open-Meteo.
      </Text>
 
      <Text style={e.suave}>
        Este app não detecta alagamentos. Ele exibe dados meteorológicos e relatos de usuários,
        que não são verificados.
      </Text>
    </ScrollView>
  );
}
 

