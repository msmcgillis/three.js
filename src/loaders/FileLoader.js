/**
 * @author mrdoob / http://mrdoob.com/
 */

import { Cache } from './Cache.js';
import { DefaultLoadingManager } from './LoadingManager.js';

function FileLoader( manager ) {

	this.manager = ( manager !== undefined ) ? manager : DefaultLoadingManager;

}

Object.assign( FileLoader.prototype, {

	load: function ( url, onLoad, onProgress, onError ) {

		if ( url === undefined ) url = '';

		if ( this.path !== undefined ) url = this.path + url;

		url = this.manager.resolveURL( url );

		return Cache.get( this, url, onLoad, onProgress, onError );

	},

	// must return XMLHttpRequest
	request: function ( url ) {

		var request = new XMLHttpRequest();

		request.open( 'GET', url, true );

		if ( this.responseType !== undefined ) request.responseType = this.responseType;
		if ( this.withCredentials !== undefined ) request.withCredentials = this.withCredentials;

		if ( request.overrideMimeType ) request.overrideMimeType( this.mimeType !== undefined ? this.mimeType : 'text/plain' );

		for ( var header in this.requestHeader ) {

			request.setRequestHeader( header, this.requestHeader[ header ] );

		}

		return request;

	},

	// must return Promise
	cacheload: function ( data ) {

		return Promise.resolve(data);

	},

	setPath: function ( value ) {

		this.path = value;
		return this;

	},

	setResponseType: function ( value ) {

		this.responseType = value;
		return this;

	},

	setWithCredentials: function ( value ) {

		this.withCredentials = value;
		return this;

	},

	setMimeType: function ( value ) {

		this.mimeType = value;
		return this;

	},

	setRequestHeader: function ( value ) {

		this.requestHeader = value;
		return this;

	}

} );


export { FileLoader };
