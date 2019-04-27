/**
 * @author mrdoob / http://mrdoob.com/
 */

// to detect duplicate requests we track all loading request in this hash
// by loading.<key>.load = [ {loader, onLoad, onProgress, onError}, ...  ]
// by loading.<key>.manager = [ <manager>, ... ]
var loading = {};

var dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;

var Cache = {

	enabled: false,

	files: {},

	add: function ( type, key, file ) {

		if ( this.enabled === false ) return;

		// console.log( 'THREE.Cache', 'Adding key:', key );

                if (! (type in this.files) ) this.files[ type ] = {};

		this.files[ type ][ key ] = file;

	},

	get: function ( loader, key, onLoad, onProgress, onError) {

		if ( this.enabled ) {

			// console.log( 'THREE.Cache', 'Checking key:', key );

			if (loader.constructor.name in this.files &&
			    key in this.files[loader.constructor.name]) {

				loader.manager.itemStart( key );

				var response = this.files[ loader.constructor.name ][ key ];

				setTimeout( function () {

					if ( onLoad ) onLoad( response );

					loader.manager.itemEnd( key );

				}, 0 );

				return response;
			}

		}

		// Check if request is duplicate

		if ( loading[ key ] !== undefined ) {

			if ( ! loading[ key ].manager.includes(loader.manager) ) {

				loader.manager.itemStart( key );

				loading[ key ].manager.push(loader.manager);

			}

			loading[ key ].load.push( {

				loader: loader,
				onLoad: onLoad,
				onProgress: onProgress,
				onError: onError

			} );

			return;

		}

		var dataUriRegexResult = key.match( dataUriRegex );

		if ( dataUriRegexResult ) {

			loader.manager.itemStart( key );

			this.dataURI(key, loader, onLoad, dataUriRegexResult);

			loader.manager.itemEnd( key );

			return;

		} else {

			// Initialize callback for duplicate request

			loading[ key ] = {
				manager: [],
				load: []
			};

			loading[ key ].manager.push( loader.manager );

			loading[ key ].load.push( {

				loader: loader,
				onLoad: onLoad,
				onProgress: onProgress,
				onError: onError

			} );

			// get key

			var request = loader.request( key );

			request.addEventListener( 'load', this.load.bind(this,key) );
			request.addEventListener( 'progress', this.progress.bind(this,key) );
			request.addEventListener( 'error', this.error.bind(this,key) );
			request.addEventListener( 'abort', this.abort.bind(this,key) );

			request.send( null );

			loader.manager.itemStart( key );

			return request;

		}

	},

	remove: function ( type, key ) {

		delete this.files[ type ][ key ];

	},

	clear: function () {

		this.files = {};

	},

	uniquetypes: function(key) {

		var unique = [], found = {};

		for (var i in loading[key].load) {

			if (! (loading[key].load[i].loader.constructor.name in found)) {

				unique.push(loading[key].load[i].loader);

				found[loading[key].load[i].loader.constructor.name]=1;

			}

		}

		return unique;

	},

	resultprocess: function ( loader, data ) {

		return loader.cacheload(data); // cacheload must return a promise

	},

	load: function ( key, event ) {

		if ( event.target.status === 200 || event.target.status === 0 ) {

			// Some browsers return HTTP Status 0 when using non-http protocol
			// e.g. 'file://' or 'data://'. Handle as success.

			if ( event.target.status === 0 ) console.warn( 'THREE.Cache: HTTP Status 0 received.' );

			var response = event.target.response;

			this.add( event.target.constructor.name, key, response );

			// perform each unique loader result processing

			var unique = this.uniquetypes(key);
                        var rp = this.resultprocess.bind(this);
                        var a = this.add.bind(this);

			Promise.all( unique.map( function(loader) { 
					return rp(loader,
						response).catch(function(error) {
						return error;
						});
					}
				)
			).then(function(results) {

				// all processed now do house keeping

				// index results by loader type
				var indexed = {};

				for (var i in results) {

					indexed[unique[i].constructor.name] = results[i];

					// cache all valid results
					if (! (results[i].constructor.name == 'Error')) {

						a( unique[i].constructor.name, key, results[i] );

					}

				}

				// generate all appropriate events for
				// managers/loaders based on key results
				var callbacks = loading[ key ];

				delete loading[ key ];

				for ( var i = 0, il = callbacks.load.length; i < il; i ++ ) {

					var callback = callbacks.load[ i ];

					if (indexed[callback.loader.constructor.name] == 'Error') {
						var error = indexed[callback.loader.constructor.name];
						if ( callback.onError ) callback.onError( error );

						callback.loader.manager.itemError( key );
					} else {
						var data = indexed[callback.loader.constructor.name];

						if ( callback.onLoad ) callback.onLoad( data );
					}

				}

				// notify managers we are done.
				for (var i = 0, il = callbacks.manager.length; i < il; i++) {

					var manager = callbacks.manager[ i ];
					manager.itemEnd( key );

				}


			});

		} else {

			var callbacks = loading[ key ];

			delete loading[ key ];

			for ( var i = 0, il = callbacks.load.length; i < il; i ++ ) {

				var callback = callbacks.load[ i ];
				if ( callback.onError ) callback.onError( event );

			}

			for (var i = 0, il = callbacks.manager.length; i < il; i++) {

				var manager = callbacks.manager[ i ];
				manager.itemError( key );
				manager.itemEnd( key );

			}

		}
	},

	progress: function ( key, event ) {

		var callbacks = loading[ key ];

		for ( var i = 0, il = callbacks.load.length; i < il; i ++ ) {

			var callback = callbacks.load[ i ];
			if ( callback.onProgress ) callback.onProgress( event );

		}

	},

	error: function ( key, event ) {

		var callbacks = loading[ key ];

		delete loading[ key ];

		for ( var i = 0, il = callbacks.load.length; i < il; i ++ ) {

			var callback = callbacks.load[ i ];
			if ( callback.onError ) callback.onError( event );

		}

		for (var i = 0, il = callbacks.manager.length; i < il; i++) {

			var manager = callbacks.manager[ i ];
			manager.itemError( key );
			manager.itemEnd( key );

		}

	},

	abort: function ( key, event ) {

		var callbacks = loading[ key ];

		delete loading[ key ];

		for ( var i = 0, il = callbacks.load.length; i < il; i ++ ) {

			var callback = callbacks.load[ i ];
			if ( callback.onError ) callback.onError( event );

		}

		for (var i = 0, il = callbacks.manager.length; i < il; i++) {

			var manager = callbacks.manager[ i ];
			manager.itemError( key );
			manager.itemEnd( key );

		}

	},


	dataURI: function ( key, loader, onLoad, result ) {

		var mimeType = result[ 1 ];
		var isBase64 = !! result[ 2 ];
		var data = result[ 3 ];

		data = decodeURIComponent( data );

		if ( isBase64 ) data = atob( data );

		try {

			var response;
			var responseType = ( loader.responseType || '' ).toLowerCase();

			switch ( responseType ) {

				case 'arraybuffer':
				case 'blob':

					var view = new Uint8Array( data.length );

					for ( var i = 0; i < data.length; i ++ ) {

						view[ i ] = data.charCodeAt( i );

					}

					if ( responseType === 'blob' ) {

						response = new Blob( [ view.buffer ], { type: mimeType } );

					} else {

						response = view.buffer;

					}

					break;

				case 'image':
				case 'imagebitmap':
					var i = document.createElement('img');
					i.src = key;
					response = i;

					break;
				case 'document':

					var parser = new DOMParser();
					response = parser.parseFromString( data, mimeType );

					break;

				case 'json':

					response = JSON.parse( data );

					break;

				default: // 'text' or other

					response = data;

					break;

			}


			// Wait for next browser tick like standard XMLHttpRequest event dispatching does
			setTimeout( function () {

				if ( onLoad ) onLoad( response );

				loader.manager.itemEnd( key );

			}, 0 );

		} catch ( error ) {

			// Wait for next browser tick like standard XMLHttpRequest event dispatching does
			setTimeout( function () {

				loader.manager.itemError( key );
				loader.manager.itemEnd( key );

			}, 0 );

		}

	}

};


export { Cache };
