# Shared Sektor and Nexus server

Without `?lan=1`, Sektor and Nexus use browser-local storage. Accounts and game data are available only in that browser on that device; this mode is not multiplayer.

With `?lan=1`, the app uses the Node server's shared data store. Sektor accounts, messages, and the Nexus world are shared by everyone connected to that server. Use the same server for both the app and its API.

## Play together on the same Wi-Fi

1. Install Node.js 18 or later on the computer that will host the server.
2. In this folder, run `node local-server.js`.
3. Open the `http://.../?lan=1` address printed by the command on the host computer and on each other device.
4. Open Nexus using the 🌐 link. Nexus opens on its own page; press **Connect to Nexus** to load the shared world. Create or log in to a Nexus account; players connected to this server share its marketplace, timed auctions, and chat.
5. Open **Inventory** from Nexus to manage items, create art, import audio or video, or start an auction. Marketplace listings and auctions are created from items in your inventory. Listings include compatible audio/video previews and deliver the selected media with the item. Auctions hold one inventory item until the selected duration ends. The highest bidder pays from their wallet; the seller receives the winning amount and the item goes to the winner. Outbid players are refunded, and an auction with no bids returns the item to its owner.
6. Keep the host computer and terminal running while others use the app. Stop the server with Ctrl+C.

The server stores data in `.sektor-lan-data.json` in this folder. Keep that file private. The basic server does not encrypt data or authenticate API access, so use it only on a trusted network. A firewall may need to allow incoming connections on port 3000. Set `PORT` to use a different port.

## Internet multiplayer

The app can connect to a shared server over the internet when it is hosted at a public HTTPS address and opened with `?lan=1`; the Node server must serve both the app and `/api` from the same origin. The current Node server is a prototype with no API authentication or access controls. **Do not expose it to the public internet or store real passwords or personal data there.** A secure internet deployment needs an authenticated, access-controlled backend before it is safe to use publicly.

Voice/video features may also require HTTPS; they are not provided by the basic HTTP LAN setup.
