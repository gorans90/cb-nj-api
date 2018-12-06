const convict = require('convict');

let conf = convict({
    env: {
        doc: 'The applicaton environment.',
        format: ['production', 'development', 'qa'],
        default: 'development',
        env: 'NODE_ENV'
    },
    logging: {
        level: {
            doc: 'Enviroment logging level',
            format: String,
            default: 'debug'
        },
        sql: {
            doc: 'Log sql statements',
            format: Boolean,
            default: false
        }
    },
    server: {
        port: {
            doc: 'Enviroment logging level',
            format: Number,
            default: 3001
        }
    },
    database: {
        doc: 'Log sql statements',
        format: String,
        default: false
    }
});

conf.loadFile('./src/config/environments/' + conf.get('env') + '.config.json');
conf.validate({ strict: true });

module.exports = conf;