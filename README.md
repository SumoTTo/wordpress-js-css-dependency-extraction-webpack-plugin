# WordPress CSS & JS Dependency Extraction Webpack Plugin

This plugin is based
on [WordPress Dependency Extraction Webpack Plugin](https://www.npmjs.com/package/@wordpress/dependency-extraction-webpack-plugin)

But it's different enough from him:

1) Removed settings, this is how they relate to this plugin:

- **outputFormat** - always generates PHP
- **combineAssets** - always combines dependencies
- **combinedOutputFile** - creates assets.php in the folder from webpack `output.path` settings
- **useDefaults** - always true
- **requestToExternal** - not supported
- **requestToHandle** - not supported

2) CSS files have been added to the assets output.

3) The format of assets output has been changed:

```injectablephp
<?php
return array(
	'js'  => array(
		'main' => array(
			'src'       => 'js/main-e365333869a288cf482d.js',
			'deps'      => array( 'wp-polyfill' ), // if option injectPolyfill true
			'ver'       => 'e365333869a288cf482d', // content hash
			'gzip_size' => 12345,
			'in_footer' => true, // always true
		),
	),
	'css' => array(
		'main' => array(
			'src'   => 'css/main-498365b8a8869c337582.css',
			'deps'  => array(), // always empty array for css 
			'ver'   => '498365b8a8869c337582', // chunk hash
			'gzip_size' => 12345,
			'media' => 'all', // always 'all'
		),
	),
);

```

4) In default request and default script handle transformation added `@wordpress/password-strength-meter`

## Installation

You can install the package as follows:

```sh
npm install @sumotto/wordpress-js-css-dependency-extraction-webpack-plugin --save-dev

# or

yarn add @sumotto/wordpress-js-css-dependency-extraction-webpack-plugin --dev
```

## Usage

Require the plugin in your Webpack config:

```js
const WordpressJsCssDependencyExtractionWebpackPlugin = require( '@sumotto/wordpress-js-css-dependency-extraction-webpack-plugin' );

// or

import WordpressJsCssDependencyExtractionWebpackPlugin from '@sumotto/wordpress-js-css-dependency-extraction-webpack-plugin';
```

Add the plugin to your webpack configuration's `plugins` array. As a rule, it should be the last plugin, or rather after
those plugins that generate dependencies.

```js
module.exports = {
	plugins: [
		new WordpressJsCssDependencyExtractionWebpackPlugin( { injectPolyfill: true /* default false */ } ),
	],
}
```

You can include dependencies for example in functions.php of your theme or in your plugin:

```injectablephp
<?php
define( 'THEME_OR_PLUGIN_DIST_PATH', plugin_dir_path( __FILE__ ) . 'dist/' );
define( 'THEME_OR_PLUGIN_DIST_URL', plugin_dir_url( __FILE__ ) . 'dist/' );

// or

define( 'THEME_OR_PLUGIN_DIST_PATH', get_stylesheet_directory() . '/dist/' );
define( 'THEME_OR_PLUGIN_DIST_URL', get_stylesheet_directory_uri() . '/dist/' );

add_action(
	'wp_enqueue_scripts',
	static function () {
		$assets_path = THEME_OR_PLUGIN_DIST_PATH . 'assets.php';
		if ( file_exists( $assets_path ) ) {
			$all_assets = include $assets_path;
			foreach ( $all_assets as $type => $assets ) {
				foreach ( $assets as $handle => $asset ) {
					if ( 'js' === $type ) {
						wp_enqueue_script(
							$handle,
							THEME_OR_PLUGIN_DIST_URL . $asset['src'],
							$asset['deps'],
							$asset['ver'],
							$asset['in_footer']
						);
					} else {
						if ( 14950 < $asset['gzip_size'] ) {
							wp_enqueue_style(
								$handle,
								THEME_OR_PLUGIN_DIST_URL . $asset['src'],
								$asset['deps'],
								$asset['ver'],
								$asset['media']
							);
						} else {
							// This is where we output styles, I don't know if we can properly escape them.
							// phpcs:disabled WordPress.Security.EscapeOutput.OutputNotEscaped
							printf(
								'<style id="%s" media="%s">%s</style>',
								$handle,
								$asset['media'],
								file_get_contents( THEME_OR_PLUGIN_DIST_PATH . $asset['src'] )
							);
							// phpcs:enabled WordPress.Security.EscapeOutput.OutputNotEscaped
						}
					}
				}
			}
		}
	}
);

```

## License

MIT License
