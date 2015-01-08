DiabloGL
=======
The goal of this project is to re-implement the original Diablo game using WebGL, so that it is playable in a modern web browser.

![markdown preview](https://raw.github.com/doggan/diablogl/screenshots/town_chests.gif)

## Usage
Coming soon. :sweat_drops:

## Technical Overview
1. [mpq-server](https://github.com/doggan/mpq-server) runs locally and serves data files via HTTP GET requests.
  * Data files are extracted from an MPQ archive on the user machine.
  * MPQ archive is used as-is from the original Diablo CD.
    * _MPQ archives contain data copyrighted by Blizzard Entertainment. As such, no MPQ data is distributed with this project. Users of this project must supply their own MPQ data after having legally purchased the associated product._
  * MPQ archive processing is handled via this dedicated server (as opposed to directly by the client) for the reasons listed below. In the future, it would be great if I could somehow eliminate this extra step, though.
    1. The MPQ archive is large (>500MB) and will exceed the browser memory limit if we try to load it all at once.
    1. MPQ archives have a lot of tricky encryption and compression that make them easier to process in a lower-level language like C++ (as opposed to JavaScript).
1. The DiabloGL client, running in a web browser, sends HTTP requests to the `mpq-server` and receives binary data (textures, map data, etc) in the response.
  * The client uses the [diablo-file-formats](https://github.com/doggan/diablo-file-formats) package to handle converting the raw binary data into easy to use run-time data structures.
  * All game logic is implemented directly by the client.
1. (Optional) For multi-player gameplay, a dedicated server (tentatively called DiabloGL-Server), handles routing of all client packets.

## Progress
At the time of this writing, this project is in its very early stages. Various pieces and core functionality are working, but there is no gameplay yet.

### Done
* MPQ data streaming over http + file loading.
* Town map rendering and collisions.
* Character rendering and animations.
* Player actions (point and click navigation, shift click attack, target attack, ...).
* Basic enemy actions (pathfinding, collision avoidance, idle/stun/death states).
* Basic networking via socket.io (player connect/disconnect, player ghosting and position sync).

### Remaining
* Everything else.
