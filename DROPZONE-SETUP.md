# Separate Dropzone Firebase

`nexus-dropzone-bundle.zip` contains the Sektor/Nexus pages and the Dropzone game client. Dropzone can store match state in a second Firebase Realtime Database while Nexus account, inventory, balance, and progression data remain in the primary project.

## Configure the separate game project

1. Create a Firebase project and register a web app.
2. Enable **Authentication → Anonymous** for the project.
3. Create a Realtime Database.
4. Copy that project's web config into `dropzone-firebase-config.js` as the value of `window.DROPZONE_FIREBASE_CONFIG`.
5. Deploy `dropzone-database.rules.json` to that project with the Firebase CLI, or copy those rules into the Realtime Database Rules editor.
6. Host the included files over HTTPS, then open `dropzone.html` without `?lan=1`.

The main `firebase-config.js` remains the account project. This lets existing Nexus accounts sign in while the separate project stores `nexus/sharedWorld/war`. If you replace the main config too, that project needs its own Nexus accounts and account data.

The game rules allow authenticated users to read/write the war path. Anonymous auth is enabled so players can join without creating a second login. This is a prototype permission model, not protection against cheating; use it only for a trusted test project.
