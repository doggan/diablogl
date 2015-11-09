DiabloGL
=======
[![Build Status](http://img.shields.io/travis/doggan/diablogl.svg?style=flat)](https://travis-ci.org/doggan/diablogl)
[![Dependency Status](https://david-dm.org/doggan/diablogl/status.svg?style=flat)](https://david-dm.org/doggan/diablogl)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://raw.githubusercontent.com/doggan/diablogl/master/LICENSE)

The goal of this project is to re-create Diablo 1 for modern web browsers using Node.js.

Open data formats will be utilized to allow moddability and customization.

<p align="center">
<img src="https://raw.github.com/doggan/diablogl/screenshots/town_chests.gif"/>
</p>

## Installation
1. Download a [release](https://github.com/doggan/diablogl/releases/) and unzip.
1. Download assets and unzip to `diablogl/client/assets/`.
 * Sample assets are attached to each release.
1. Start a local HTTP server.
 * `cd diablogl/client/ && python -m SimpleHTTPServer`
1. Navigate to localhost in a web browser.
 * `localhost:8000`

## Development
1. Clone.
 * `git clone git://github.com/doggan/diablogl.git`
1. Install.
 * `cd diablogl && npm install`
1. Run.
 * `npm run-script gulp`

## Goals / Progress
* ~~Basic [TMX file](http://www.mapeditor.org/) loading and isometric map rendering.~~
* Everything else.
 * Gameplay logic, large map rendering, multiplayer (socket.io), mod support, asset tools... :rocket:

## Disclaimer
- MPQ archives often contain data copyrighted by Blizzard Entertainment. As such, no MPQ data or other copyrighted assets are distributed with this package. Users of this package must supply their own MPQ data after having legally purchased the associated product.
