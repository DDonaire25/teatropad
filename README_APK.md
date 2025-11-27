# Generar APK (Android) usando Capacitor

Estos son pasos recomendados para convertir la aplicación web (Vite + React) en una APK con Capacitor.

Requisitos previos:
- Tener Node.js y npm instalados.
- Tener Android Studio instalado (incluye el SDK y la herramienta de compilación Gradle) y configurar variables de entorno (ANDROID_HOME / ANDROID_SDK_ROOT).
- Tener Java JDK instalado.

Pasos:

1. Instalar dependencias (si no lo has hecho ya):

```bash
npm install
```

2. Instalar las dependencias de Capacitor (si no están instaladas) y agregar Android:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android --save
```

3. Inicializar Capacitor (sólo la primera vez):

```bash
npm run cap:init
```

4. Construir tu app web y copiar los assets al proyecto Capacitor:

```bash
npm run build
npm run cap:copy
```

5. Abrir el proyecto Android y compilar APK desde Android Studio:

```bash
npm run cap:open:android
```

6. Alternativamente, desde la carpeta `android` del proyecto puedes generar una APK con Gradle (en entornos CI/CLI):

```bash
cd android
./gradlew assembleDebug   # o assembleRelease
```

Notas:
- Si deseas que el APK use feature nativas o permisos (ej. acceso a micrófono), tendrás que añadir plugins de Capacitor y configurar permisos en `android/app/src/main/AndroidManifest.xml`.
- Para distribuir en Google Play usa `assembleRelease` y firma tu APK / genera un AAB.
