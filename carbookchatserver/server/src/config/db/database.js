import {MongoClient} from 'mongodb';
import CONF from '../apiConst';

const URL = CONF.DB_URL;

export default class Database{
    connect(){
        return new Promise((resolve, reject) => {
            MongoClient.connect(URL, (err, db) => {	
                return err ? reject(err) : resolve(db);
            });
        });
    }
}