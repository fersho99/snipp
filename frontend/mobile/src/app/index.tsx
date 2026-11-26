import { Redirect } from 'expo-router';

// The app opens in Inicio; without a session the layout sends to Entrar
// (RF-M01, RF-M02). The index of every screen is in /pantallas
// (development only).
export default function Start() {
  return <Redirect href="/inicio" />;
}
