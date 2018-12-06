module.exports = {
    "env": {
        "browser": true,
        "commonjs": false,
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 8,
        "ecmaFeatures": {
            "experimentalObjectRestSpread": true,
            "jsx": true
        },
        "sourceType": "module"
    },
    "rules": {
	    "no-console":0,
        "no-unused-vars": ["error", { "argsIgnorePattern": "next" }],
        "indent": [
            "error",
            4
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    },
    "globals": {
        "__DEV__"      : false,
        "__TEST__"     : false,
        "__PROD__"     : false,
        "__QA__"       : false,
        "__STAGING__"  : false,
        "__COVERAGE__" : false,
        "CONF"         : false,
        "ga"           : false,
        "gtag"         : false,
        "__insp"       : false,
        "__VARIABLES__" : {}
      }
};
