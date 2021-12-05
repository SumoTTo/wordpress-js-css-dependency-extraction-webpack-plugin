/* eslint-disable jsdoc/valid-types */
// noinspection JSValidateJSDoc,JSUnresolvedVariable,JSUnresolvedFunction,JSMethodCanBeStatic

/**
 * @typedef {import('webpack').Compiler} WebpackCompiler
 */

const { resolve, relative } = require( 'path' );
const json2php = require( 'json2php' );
const webpack = require( 'webpack' );
const { RawSource } = webpack.sources;
const { defaultRequestToExternal, defaultRequestToHandle } = require( './util' );
const getAssets = require( './assets' );

class WordpressJsCssDependencyExtractionWebpackPlugin {
	constructor( options = {} ) {
		this.name = 'Wordpress Js Css Dependency Extraction Webpack Plugin';
		this.options = {
			injectPolyfill: options.injectPolyfill || false,
		};

		this.externalizedDeps = new Set();
		this.externalsPlugin = new webpack.ExternalsPlugin( 'window', this.#externalizeWpDeps.bind( this ) );
	}

	/**
	 *
	 * @see https://webpack.js.org/api/compiler-hooks/
	 * @see https://webpack.js.org/api/compilation-hooks/
	 *
	 * @param {WebpackCompiler} compiler
	 */
	apply( compiler ) {
		this.externalsPlugin.apply( compiler );

		compiler.hooks.thisCompilation.tap( this.name, ( compilation ) => {
			const parameters = {
				name: this.name,
				stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
			};
			compilation.hooks.processAssets.tap( parameters, () => this.#addAssetsPHP( compilation, compiler ) );
		} );
	}

	#externalizeWpDeps( { request }, callback ) {
		const externalRequest = defaultRequestToExternal( request );
		if ( externalRequest ) {
			this.externalizedDeps.add( request );

			return callback( null, externalRequest );
		}

		return callback();
	}

	#mapRequestToDependency( request ) {
		const scriptDependency = defaultRequestToHandle( request );
		if ( scriptDependency ) {
			return scriptDependency;
		}

		return request;
	}

	#getEntrypointExternalizedWpDeps( entrypoint, compilation ) {
		const entrypointExternalizedWpDeps = new Set();
		if ( this.options.injectPolyfill ) {
			entrypointExternalizedWpDeps.add( 'wp-polyfill' );
		}

		const processModule = ( { userRequest } ) => {
			if ( this.externalizedDeps.has( userRequest ) ) {
				entrypointExternalizedWpDeps.add( this.#mapRequestToDependency( userRequest ) );
			}
		};

		// Search for externalized modules in all chunks.
		for ( const chunk of entrypoint.chunks ) {
			const modulesIterable = compilation.chunkGraph.getChunkModules( chunk );
			for ( const chunkModule of modulesIterable ) {
				processModule( chunkModule );
				// loop through submodules of ConcatenatedModule
				if ( chunkModule.modules ) {
					for ( const concatModule of chunkModule.modules ) {
						processModule( concatModule );
					}
				}
			}
		}

		return entrypointExternalizedWpDeps;
	}

	#stringify( asset ) {
		// noinspection JSValidateTypes
		return `<?php\r\nreturn ${ json2php( JSON.parse( JSON.stringify( asset ) ) ) };\r\n`;
	}

	#addAssetsPHP( compilation, compiler ) {
		const combinedAssetsData = {
			js: {},
			css: {},
		};

		for ( const [ entrypointName, entrypoint ] of compilation.entrypoints.entries() ) {
			const entrypointExternalizedWpDeps = this.#getEntrypointExternalizedWpDeps( entrypoint, compilation );
			const assets = getAssets( entrypoint, compilation );

			for ( const asset of assets ) {
				const data = { deps: [], ...asset };
				if ( 'js' === asset.type ) {
					if ( asset.handle === entrypointName ) {
						data.deps = Array.from( entrypointExternalizedWpDeps ).sort();
					}
					data.in_footer = true;
				} else {
					data.media = 'all';
				}

				delete data.handle;
				delete data.type;

				combinedAssetsData[ asset.type ][ asset.handle ] = data;
			}
		}

		const outputFolder = compiler.options.output.path;
		const assetsFilePath = resolve( outputFolder, 'assets.php' );
		const assetsFilename = relative( outputFolder, assetsFilePath );

		compilation.assets[ assetsFilename ] = new RawSource( this.#stringify( combinedAssetsData ) );
	}
}

module.exports = WordpressJsCssDependencyExtractionWebpackPlugin;
