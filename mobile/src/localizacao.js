import * as Location from 'expo-location';

// Retorna { lat, lon } ou lança Error com mensagem amigável.
export async function obterLocalizacao() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permissão de localização negada. Ative nas configurações do celular.');
  }

  const ligado = await Location.hasServicesEnabledAsync();
  if (!ligado) {
    throw new Error('A localização do aparelho está desligada. Ligue o GPS e tente de novo.');
  }

  try {
    const p = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    });
    return { lat: p.coords.latitude, lon: p.coords.longitude };
  } catch (e) {
    throw new Error(`Não foi possível obter a localização. Detalhe: ${e.message}`);
  }
}