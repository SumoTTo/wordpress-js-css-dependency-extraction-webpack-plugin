// noinspection JSUnresolvedFunction,JSUnresolvedVariable

const zlib = require( 'zlib' );

function urlEncodePath( filePath ) {
	// People use the filepath in quite unexpected ways.
	// Try to extract the first querystring of the url:
	// some+path/demo.html?value=abc?def
	const queryStringStart = filePath.indexOf( '?' );
	const urlPath = queryStringStart === -1 ? filePath : filePath.substr( 0, queryStringStart );
	const queryString = filePath.substr( urlPath.length );

	// Encode all parts except '/' which are not part of the querystring:
	const encodedUrlPath = urlPath.split( '/' ).map( encodeURIComponent ).join( '/' );

	return encodedUrlPath + queryString;
}

function getAssets( entrypoint, compilation ) {
	const assets = [];

	// Extract paths to .js, .mjs and .css files from the current compilation
	const entryPointPublicPathMap = {};
	const extensionRegexp = /\.(css|js|mjs)(\?|$)/;

	/** entryPointUnfilteredFiles - also includes hot module update files */
	const entryPointUnfilteredFiles = entrypoint.getFiles();

	const entryPointFiles = entryPointUnfilteredFiles.filter( ( chunkFile ) => {
		// compilation.getAsset was introduced in webpack 4.4.0
		// once the support pre webpack 4.4.0 is dropped please
		// remove the following guard:
		const asset = compilation.getAsset && compilation.getAsset( chunkFile );
		if ( ! asset ) {
			return true;
		}

		// Prevent hot-module files from being included:
		const assetMetaInformation = asset.info || {};

		return ! ( assetMetaInformation.hotModuleReplacement || assetMetaInformation.development );
	} );

	// Prepend the publicPath and append the hash depending on the
	// webpack.output.publicPath and hashOptions
	// E.g. bundle.js -> /bundle.js?hash
	const entryPointPublicPaths = entryPointFiles.map( ( chunkFile ) => urlEncodePath( chunkFile ) );

	const index = {
		js: 0,
		css: 0,
	};

	entryPointPublicPaths.forEach( ( entryPointPublicPath ) => {
		const extMatch = extensionRegexp.exec( entryPointPublicPath );

		// Skip if the public path is not a .css, .mjs or .js file
		if ( ! extMatch ) {
			return;
		}

		// Skip if this file is already known
		// (e.g. because of common chunk optimizations)
		if ( entryPointPublicPathMap[ entryPointPublicPath ] ) {
			return;
		}
		entryPointPublicPathMap[ entryPointPublicPath ] = true;

		// ext will contain .js or .css, because .mjs recognizes as .js
		const ext = extMatch[ 1 ] === 'mjs' ? 'js' : extMatch[ 1 ];
		const asset = compilation.getAsset( entryPointPublicPath );

		if ( asset ) {
			assets.push( {
				handle: entrypoint.options.name + ( index[ ext ] ? '-' + index[ ext ] : '' ),
				type: ext,
				src: entryPointPublicPath,
				ver: asset.info.contenthash || asset.info.chunkhash,
				gzip_size: zlib.gzipSync( asset.source.buffer() ).length,
			} );

			index[ ext ]++;
		}
	} );

	return assets;
}

module.exports = getAssets;
