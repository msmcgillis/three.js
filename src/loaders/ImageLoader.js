/**
 * @author mrdoob / http://mrdoob.com/
 */

import { Cache } from './Cache.js';
import { DefaultLoadingManager } from './LoadingManager.js';


function ImageLoader( manager ) {

	this.manager = ( manager !== undefined ) ? manager : DefaultLoadingManager;
	this.responseType = 'image';

}

Object.assign( ImageLoader.prototype, {

	load: function ( url, onLoad, onProgress, onError ) {

		if ( url === undefined ) url = '';

		if ( this.path !== undefined ) url = this.path + url;

		url = this.manager.resolveURL( url );

		return Cache.get( this, url, onLoad, onProgress, onError);

	},

	// must return XMLHttpRequest
	request: function ( url ) {

		var request = new XMLHttpRequest();

		request.open( 'GET', url, true );

		request.responseType = 'blob';

		return request;

	},

	// must return Promise
	cacheload: function ( data ) {

		var image = document.createElementNS('http://www.w3.org/1999/xhtml','img');

		var url = URL.createObjectURL(data);

                image.src = url;

                image.onload = function() {
                  URL.revokeObjectURL(url);
                };

		return Promise.resolve(image);

	},

	setPath: function ( value ) {

		this.path = value;
		return this;

	}

} );


export { ImageLoader };
