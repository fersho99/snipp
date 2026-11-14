// Push notifications with OneSignal (RF-M16). Not wired yet: the demo keeps
// the list in data/notifications.js. Real integration (phase 5 of the plan):
//
// 1. Install the SDK and its Expo config plugin:
//      npx expo install react-native-onesignal onesignal-expo-plugin
//    and add ["onesignal-expo-plugin", { "mode": "production" }] to the
//    plugins in app.json. It needs a development build or the APK, not Expo Go.
//
// 2. After login, link the device to the client so the API can target it:
//      import { OneSignal } from 'react-native-onesignal';
//      OneSignal.initialize(ONESIGNAL_APP_ID);
//      OneSignal.login(client.id);
//      OneSignal.Notifications.requestPermission(true); // Android 13+ asks the user
//
// 3. Open the related screen when the client taps a push. The API sends the
//    route in additionalData (same `route` the in-app list uses):
//      OneSignal.Notifications.addEventListener('click', (e) => {
//        const route = e.notification.additionalData?.route;
//        if (route) router.push(route);
//      });
//
// 4. The API (not the app) sends each push, the ones RF-M16 lists:
//    - confirmation when the client books;
//    - reminder 24 hours and 1 hour before the appointment;
//    - cancellation or update of an appointment, including a change of
//      employee and a cancellation by the business (RN-04, RF-W16);
//    - order ready for pickup (RF-W20).
//
// 5. On logout: OneSignal.logout().

export const PUSH_KINDS = ['confirmacion', 'recordatorio-24h', 'recordatorio-1h', 'cambio', 'cancelacion', 'reagendada', 'pedido-listo'];
