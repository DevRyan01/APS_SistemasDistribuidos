import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { carregarToken, salvarToken, definirAoExpirar } from './src/api';
import Login from './src/screens/Login';
import Painel from './src/screens/Painel';
import Ocorrencias from './src/screens/Ocorrencias';
import { e } from './src/estilos';

export default function App() {
  const [iniciando, setIniciando] = useState(true);
  const [logado, setLogado] = useState(false);
  const [nome, setNome] = useState('');
  const [aba, setAba] = useState('painel');

  useEffect(() => {
    definirAoExpirar(() => setLogado(false));
    (async () => {
      const t = await carregarToken();
      const n = await AsyncStorage.getItem('nome');
      if (t) { setLogado(true); setNome(n || ''); }
      setIniciando(false);
    })();
  }, []);

  async function aoEntrar(n) {
    await AsyncStorage.setItem('nome', n);
    setNome(n);
    setAba('painel');
    setLogado(true);
  }

  async function sair() {
    await salvarToken(null);
    setLogado(false);
  }

  if (iniciando) {
    return <View style={[e.tela, { justifyContent: 'center' }]}><ActivityIndicator size="large" /></View>;
  }
  if (!logado) return <Login aoEntrar={aoEntrar} />;

  return (
    <SafeAreaView style={e.tela}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        {aba === 'painel' ? <Painel nome={nome} /> : <Ocorrencias />}
      </View>
      <View style={e.abas}>
        {[['painel', 'Painel'], ['ocorrencias', 'Ocorrências']].map(([k, r]) => (
          <TouchableOpacity key={k} style={e.aba} onPress={() => setAba(k)}>
            <Text style={[e.abaTxt, aba === k && e.abaTxtAtiva]}>{r}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={e.aba} onPress={sair}>
          <Text style={e.abaTxt}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
