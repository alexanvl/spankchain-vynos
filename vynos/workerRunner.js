// webpack relies on window, so the below construction is required.
self.window = self;

self.importScripts('commons.js');
self.importScripts('worker.js');
