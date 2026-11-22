import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { api, salvarToken } from '../api';
import { e, cores } from '../estilos';

export default function Login({ aoEntrar }) {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro('');
    if (!email.trim() || !senha || (modoCadastro && !nome.trim())) {
      setErro('Preencha todos os campos.');
      return;
    }
    setCarregando(true);
    try {
      const r = modoCadastro
        ? await api.registrar(nome.trim(), email.trim(), senha)
        : await api.login(email.trim(), senha);
      await salvarToken(r.token);
      aoEntrar(r.nome);
    } catch (ex) {
      setErro(ex.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ScrollView style={e.tela} contentContainerStyle={[e.conteudo, { paddingTop: 80 }]}
                keyboardShouldPersistTaps="handled">
      <Text style={e.titulo}>ClimaCidadao</Text>
      <Text style={e.suave}>Clima, qualidade do ar e relatos de cidadãos.</Text>

      {modoCadastro && (
        <TextInput style={e.input} placeholder="Nome" value={nome} onChangeText={setNome} />
      )}
      <TextInput style={e.input} placeholder="E-mail" autoCapitalize="none"
                 keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={e.input} placeholder="Senha (mín. 6 caracteres)" secureTextEntry
                 value={senha} onChangeText={setSenha} />

      {!!erro && <Text style={e.erro}>{erro}</Text>}

      <TouchableOpacity style={e.botao} onPress={enviar} disabled={carregando}>
        {carregando ? <ActivityIndicator color="#fff" />
          : <Text style={e.botaoTxt}>{modoCadastro ? 'Criar conta' : 'Entrar'}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={e.botaoSec} onPress={() => { setModoCadastro(!modoCadastro); setErro(''); }}>
        <Text style={e.botaoSecTxt}>
          {modoCadastro ? 'Já tenho conta' : 'Criar uma conta'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
