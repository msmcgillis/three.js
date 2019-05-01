/**
 * @author mrdoob / http://mrdoob.com/
 */

// to detect duplicate requests we track all loading request in this hash
// by loading.<key>.load = [ {loader, onLoad, onProgress, onError}, ...  ]
// by loading.<key>.manager = [ <manager>, ... ]
var loading = {};

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

		if ( loading[ key ] !== undefined ) {

			this.duplicate( loader, key, onLoad, onProgress, onError );

			return;

		}

		this.load(loader, key, onLoad, onProgress, onError);


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

	loaderload: function (key,data) {

		// perform each unique loader result processing

		var unique = this.uniquetypes(key);
                var alt = this;

		Promise.all( unique.map( function( loader ) {
			return alt.resultprocess(loader,data).catch(function(error){return error})})
		).then(function( results ) {

			// all processed now do house keeping

			// index results by loader type
			var indexed = {};

			for (var i in results) {

				indexed[unique[i].constructor.name] = results[i];

				// cache all valid results
				if (! (results[i].constructor.name == 'Error')) {

					alt.add( unique[i].constructor.name, key, results[i] );

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

	},

	xhrload: function ( key, event ) {

		if ( event.target.status === 200 || event.target.status === 0 ) {

			// Some browsers return HTTP Status 0 when using non-http protocol
			// e.g. 'file://' or 'data://'. Handle as success.

			if ( event.target.status === 0 ) console.warn( 'THREE.Cache: HTTP Status 0 received.' );

			var response = event.target.response;

			this.add( event.target.constructor.name, key, response );

			this.loaderload(key,response);

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

	duplicate: function ( loader, key, onLoad, onProgress, onError ) {

		// track duplicate requests

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

	},

	initloading: function ( loader, key, onLoad, onProgress, onError ) {

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

        },

	load: function ( loader, key, onLoad, onProgress, onError ) {

		this.initloading( loader, key, onLoad, onProgress, onError );

		loader.manager.itemStart( key );

		if ( 'XMLHttpRequest' in this.files &&
                     key in this.files.XMLHttpRequest ) {

			this.loaderload( key, this.files.XMLHttpRequest[key] );

		} else {

			// get key
			var request = loader.request( key );

			request.addEventListener( 'load', this.xhrload.bind(this,key) );
			request.addEventListener( 'progress', this.progress.bind(this,key) );
			request.addEventListener( 'error', this.error.bind(this,key) );
			request.addEventListener( 'abort', this.abort.bind(this,key) );

			request.send( null );

		}

	}

};


export { Cache };
