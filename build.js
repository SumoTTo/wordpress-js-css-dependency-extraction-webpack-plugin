const { minify } = require( 'terser' );
const { sync } = require( 'glob' );
const { basename } = require( 'path' );
const fs = require( 'fs' );

const options = {
	mangle: {
		properties: {
			regex: /^[#_]/,
			undeclared: true,
		},
	},
	module: true,
	nameCache: {},
};

const dist = './dist';

if ( ! fs.existsSync( dist ) ) {
	fs.mkdirSync( dist );
}

sync( './src/*.js' ).forEach( async function( path ) {
	const results = await minify( fs.readFileSync( path, 'utf8' ), options );
	if ( results.code ) {
		fs.writeFileSync( dist + '/' + basename( path ), results.code, 'utf8' );
	}
} );
