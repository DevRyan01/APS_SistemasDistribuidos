import { StyleSheet } from 'react-native';

export const cores = {
  fundo: '#f2f6fa', card: '#ffffff', primaria: '#1565c0', texto: '#1b2733',
  suave: '#5b6b7a', erro: '#c62828', aviso: '#ef6c00', borda: '#d5dde5',
};

export const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 16, gap: 12 },
  card: { backgroundColor: cores.card, borderRadius: 12, padding: 16, gap: 6,
          borderWidth: 1, borderColor: cores.borda },
  titulo: { fontSize: 22, fontWeight: '700', color: cores.texto },
  subtitulo: { fontSize: 16, fontWeight: '600', color: cores.texto },
  texto: { fontSize: 15, color: cores.texto },
  suave: { fontSize: 13, color: cores.suave },
  grande: { fontSize: 32, fontWeight: '700', color: cores.primaria },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: cores.borda,
           borderRadius: 8, padding: 12, fontSize: 15 },
  botao: { backgroundColor: cores.primaria, padding: 14, borderRadius: 8, alignItems: 'center' },
  botaoTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  botaoSec: { padding: 12, alignItems: 'center' },
  botaoSecTxt: { color: cores.primaria, fontWeight: '600' },
  erro: { color: cores.erro, fontSize: 14 },
  aviso: { color: cores.aviso, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16,
          borderWidth: 1, borderColor: cores.borda, backgroundColor: '#fff' },
  chipAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  chipTxt: { color: cores.texto, fontSize: 13 },
  chipTxtAtivo: { color: '#fff' },
  abas: { flexDirection: 'row', borderTopWidth: 1, borderColor: cores.borda, backgroundColor: '#fff' },
  aba: { flex: 1, padding: 14, alignItems: 'center' },
  abaTxt: { color: cores.suave, fontWeight: '600' },
  abaTxtAtiva: { color: cores.primaria },
});
