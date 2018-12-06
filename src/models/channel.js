import _ from 'lodash';
import { OrderedMap } from 'immutable';
import { ObjectID } from 'mongodb';

import { CHANNEL_COLLECTION } from '../helper/consts';
import { toString } from '../helper/methods';

export default class Channel {
    constructor(app) {
        this.app = app;
        this.channels = new OrderedMap();
    }

    aggregate(query) {
        return new Promise((resolve, reject) => {
            this.app.db.collection(CHANNEL_COLLECTION).aggregate(query, (error, results) => {
                return error ? reject(error) : resolve(results);
            });
        });
    }

    find(query, options = {}){
        return new Promise((resolve, reject) => {
            this.app.db.collection(CHANNEL_COLLECTION).find(query, options).toArray((error, results) => {
                return error ? reject(error) : resolve(results);
            });
        });
    }

    load(id) {
        return new Promise((resolve, reject) => {
            id = _.toString(id);

            // first check in cache
            const channelFromCache = this.channels.get(id);

            if (channelFromCache) {
                return resolve(channelFromCache);
            }

            // check in db
            this.findById(id).then((channel) => {
                this.channels = this.channels.set(id, channel);
                return resolve(channel);
            }).catch((error) => {
                return reject(error);
            });
        });
    }

    findById(id) {
        return new Promise((resolve, reject) => {
            this.app.db.collection(CHANNEL_COLLECTION).findOne({_id: new ObjectID(id)}, (error, results) => {
                return error || !results ? reject('Not found') : resolve(results);
            });
        });
    }

    create(channel) {
        return new Promise((resolve, reject) => {
            let id = toString(_.get(channel, '_id'));
            let idObject = id ? new ObjectID(id) : new ObjectID();
            let members = [];
            _.each(_.get(channel, 'members', []), (value, key) => {
                members.push(Number(key));
                    
            });
            let userId = _.get(channel, 'userId', null);
            const newChannel = {
                _id: idObject,
                title: _.get(channel, 'title', ''),
                lastMessage: _.get(channel, 'lastMessage', ''),
                created: new Date(),
                userId: userId,
                members: members,
                updated: new Date()
            };
            
            this.app.db.collection(CHANNEL_COLLECTION).insertOne(newChannel, (error) => {
                if (!error) {
                    const channelId = newChannel._id.toString();
                    this.channels = this.channels.set(channelId, newChannel);
                }
                return error ? reject(error) : resolve(channel);
            });
        });
    }
}