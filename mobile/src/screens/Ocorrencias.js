import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View, TextInput, TouchableOpacity, RefreshControl,
         ActivityIndicator } from 'react-native';
import { api } from '../api';
import { obterLocalizacao } from '../localizacao';
import { e } from '../estilos';

const TIPOS = [
  ['alagamento', 'Alagamento'], ['enchente', 'Enchente'],
  ['bueiro_entupido', 'Bueiro entupido'], ['queda_de_arvore', 'Queda de árvore'],
  ['outro', 'Outro'],
];

export default function Ocorrencias() {
  const [tipo, setTipo] = useState('alagamento');
  const [descricao, setDescricao] = useState('');
  const [lista, setLista] = useState([]);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    setAtualizando(true);
    try {
      const { lat, lon } = await obterLocalizacao();
      setLista(await api.listarOcorrencias(lat, lon, 10));
      setErro('');
    } catch (ex) {
      setErro(ex.message);
    } finally {
      setAtualizando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function registrar() {
    setErro(''); setOk('');
    if (descricao.trim().length < 3) {
      setErro('Descreva a ocorrência (mínimo 3 caracteres).');
      return;
    }
    setEnviando(true);
    try {
      const { lat, lon } = await obterLocalizacao();
      await api.criarOcorrencia({ tipo, descricao: descricao.trim(), latitude: lat, longitude: lon });
      setDescricao('');
      setOk('Ocorrência registrada.');
      await carregar();
    } catch (ex) {
      setErro(ex.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={atualizando} onRefresh={carregar} />}>
      <Text style={e.titulo}>Ocorrências</Text>

      <View style={e.card}>
        <Text style={e.subtitulo}>Registrar na minha localização</Text>
        <View style={e.chips}>
          {TIPOS.map(([valor, rotulo]) => (
            <TouchableOpacity key={valor} onPress={() => setTipo(valor)}
                              style={[e.chip, tipo === valor && e.chipAtivo]}>
              <Text style={[e.chipTxt, tipo === valor && e.chipTxtAtivo]}>{rotulo}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={e.input} placeholder="Descrição (ex.: rua totalmente alagada)"
                   value={descricao} onChangeText={setDescricao} maxLength={300} multiline />
        {!!erro && <Text style={e.erro}>{erro}</Text>}
        {!!ok && <Text style={e.suave}>{ok}</Text>}
        <TouchableOpacity style={e.botao} onPress={registrar} disabled={enviando}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={e.botaoTxt}>Registrar</Text>}
        </TouchableOpacity>
      </View>

      <Text style={e.subtitulo}>Próximas de você (10 km)</Text>
      {lista.length === 0 && !atualizando && (
        <Text style={e.suave}>Nenhuma ocorrência registrada na região.</Text>
      )}
      {lista.map((o) => (
        <View key={o.id} style={e.card}>
          <Text style={e.texto}>
            {(TIPOS.find((t) => t[0] === o.tipo) || [0, o.tipo])[1]} · {o.distancia_km} km
          </Text>
          <Text style={e.texto}>{o.descricao}</Text>
          <Text style={e.suave}>{new Date(String(o.criado_em).replace(/(\.\d{3})\d+/, '$1')).toLocaleString('pt-BR')}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
