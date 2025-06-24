# FishCrewConnect App

This is a mobile application built with Expo/React Native for connecting fishermen with boat owners.

## Important: Backend Server Required

This app has been updated to use only real backend data - there is no more mock data usage. You must have the backend server running for the app to work properly.

## Get started

1. Start the backend server first

   ```bash
   cd ../FishCrewConnect-backend
   npm install
   npm start
   ```

2. Configure API connection (if needed)

   Edit `config/api.js` to set the correct server address for your environment.

3. Install dependencies for the frontend

   ```bash
   npm install
   ```

4. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code toconst socketOptions = {
  reconnectionAttempts: 15,
  reconnectionDelay: 2000,
  timeout: 20000,
  transports: ['polling', 'websocket'],
  autoConnect: false,
  forceNew: true
}; the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
