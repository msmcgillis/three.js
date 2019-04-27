/**
 * @author thespite / http://clicktorelease.com/
 */

import { Cache } from './Cache.js';
import { DefaultLoadingManager } from './LoadingManager.js';


function ImageBitmapLoader( manager ) {

	if ( typeof createImageBitmap === 'undefined' ) {

		console.warn( 'THREE.ImageBitmapLoader: createImageBitmap() not supported.' );

	}

	if ( typeof fetch === 'undefined' ) {

		console.warn( 'THREE.ImageBitmapLoader: fetch() not supported.' );

	}

	this.manager = manager !== undefined ? manager : DefaultLoadingManager;
	this.options = undefined;
	this.responseType = 'imagebitmap';

}

ImageBitmapLoader.prototype = {

	constructor: ImageBitmapLoader,

	setOptions: function setOptions( options ) {

		this.options = options;

		return this;

	},

	load: function ( url, onLoad, onProgress, onError ) {

		if ( url === undefined ) url = '';

		if ( this.path !== undefined ) url = this.path + url;

		url = this.manager.resolveURL( url );

		return Cache.get( this, url, onLoad, onProgress, onError );

	},

	// must return XMLHttpRequest
	request: function ( url ) {

		var request = new XMLHttpRequest();

		request.open( 'GET', url, true);

		request.responseType = 'blob';

		return request;

	},

	// must return Promise
	cacheload: function ( data ) {

		var promise;

		if ( this.options === undefined ) {

			// Workaround for FireFox. It causes an error if you pass options.
			promise = createImageBitmap( data );

		} else {

			promise = createImageBitmap( data, this.options );

		}

		return promise;
        },

	setPath: function ( value ) {

		this.path = value;
		return this;

	}

};

export { ImageBitmapLoader };
