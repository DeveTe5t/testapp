'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "version.json": "65a25868bc7d87a4d588522a4da35c97",
  "index.html": "23095fb58d3ff5971db67488a1f337ef",
  "/": "23095fb58d3ff5971db67488a1f337ef",
  "main.dart.js": "d67286a3d7c6bf2eac4296262f741ded",
  "flutter.js": "a85fcf6324d3c4d3ae3be1ae4931e9c5",
  "favicon.png": "abe24398b136e8e6fa99bff4af85702d",
  "icons/Icon-192.png": "e03c4d968043f4b50f1fe65d0127aef1",
  "icons/Icon-maskable-192.png": "25e666e23c4f541fe784e92f7f825a1a",
  "icons/Icon-maskable-512.png": "41baacaf6035dee0bdf0ae63e058d912",
  "icons/Icon-512.png": "8215c3962089ef6c54501bcd29834d75",
  "manifest.json": "cbf235f7b1c5a75150610bcedf121feb",
  "assets/AssetManifest.json": "1c54fb71cb76351f6794a00e6bb33284",
  "assets/NOTICES": "99e10e6576e27991ec6739d5137e9df8",
  "assets/FontManifest.json": "dc3d03800ccca4601324923c0b1d6d57",
  "assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "6d342eb68f170c97609e9da345464e5e",
  "assets/fonts/MaterialIcons-Regular.otf": "e7069dfd19b331be16bed984668fe080",
  "assets/images/icon_ubicacion-univim.webp": "dab3d36f143d62823583f0cca0850ed2",
  "assets/images/icon_whatsapp.webp": "6d64034cacbeb0151438366d6aeb4a75",
  "assets/images/icon_campus-virtual.webp": "6f13346cfacd34596de3a1d9b4bb4c8b",
  "assets/images/icon_sistema-de-tickets.webp": "2eeff1c9a58fb97b1f9504160c7def2e",
  "assets/images/icon_correo-institucional.webp": "62b6914697fbffe4d76afb69b6c7f9aa",
  "assets/images/logo.webp": "82370f03a204c6f303bfbf082ee6e23b",
  "assets/images/icon_ubicacion-uveus.webp": "202eea2456eebe2f48e770c97036cd61",
  "assets/images/icon_curso-propedeutico.webp": "a5d99c6c9135352f553d9a23bc89423a",
  "assets/images/icon_portal-web.webp": "d46a13bfe3f1457b068a4c62729b6f4c",
  "assets/images/icon_directorio-telefonico.webp": "35ca497a2261136b8380c9f9dc66566d",
  "assets/images/icon_servicios-escolares.webp": "61c32f5d20c1a6842e52964b8f753a15",
  "assets/data/menu_item.json": "2aee3e5b0d9ca207896195fb6895c495",
  "assets/data/contacts.json": "cbcde17e10b6b6c307d59582717c4d35",
  "canvaskit/canvaskit.js": "97937cb4c2c2073c968525a3e08c86a3",
  "canvaskit/profiling/canvaskit.js": "c21852696bc1cc82e8894d851c01921a",
  "canvaskit/profiling/canvaskit.wasm": "371bc4e204443b0d5e774d64a046eb99",
  "canvaskit/canvaskit.wasm": "3de12d898ec208a5f31362cc00f09b9e"
};

// The application shell files that are downloaded before a service worker can
// start.
const CORE = [
  "main.dart.js",
  "index.html",
  "assets/AssetManifest.json",
  "assets/FontManifest.json"];
// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value, { 'cache': 'reload' })));
    })
  );
});

// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function (event) {
  return event.waitUntil(async function () {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});

// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) => {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache only if the resource was successfully fetched.
        return response || fetch(event.request).then((response) => {
          if (response && Boolean(response.ok)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    })
  );
});

self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline') {
    downloadOffline();
    return;
  }
});

// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}

// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
