import _ from 'lodash';
import { OrderedMap } from 'immutable';
import { ObjectID } from 'mongodb';

import { CHANNEL_MESSAGE_LIMIT, CHANNEL_MESSAGE_OFFSET, MESSAGE_COLLECTION, CHANNEL_COLLECTION } from '../helper/consts';

export default class Message {
    constructor(app) {
        this.app = app;
    
        this.messages = new OrderedMap();
    }

    create(obj) {
        return new Promise((resolve, reject) => {
            let id = _.get(obj, '_id', null);
            id = _.toString(id);

            const userId = _.get(obj, 'userId');
            const channelId = new ObjectID(_.get(obj, 'channelId'));

            const message = {
                _id: new ObjectID(id),
                body: _.get(obj, 'body', ''),
                userId: userId,
                channelId: channelId,
                created: new Date()
            };
            try {
                this.app.db.collection(MESSAGE_COLLECTION).insertOne(message, (error) => {
                    if (error) {
                        return reject(error);
                    }
    
                    // update last message for channel to this message
                    this.app.db.collection(CHANNEL_COLLECTION).findOneAndUpdate({_id: channelId}, {
                        $set: {
                            lastMessage: _.get(message, 'body', ''),
                            updated: new Date()
                        }
                    });
                    
                    return resolve(message);
                });
            } catch (error) {
                console.log('catch: ' + error);
                return reject(error);
            }
        });
    }

    getChannelMessages(channelId, limit = CHANNEL_MESSAGE_LIMIT, offset = CHANNEL_MESSAGE_OFFSET) {
        return new Promise((resolve, reject) => {
            channelId = new ObjectID(channelId);

            const query = [
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $match: {
                        'channelId': {$eq: channelId}
                    }
                },
                {
                    $project: {
                        _id: true,
                        channelId: true,
                        user: {$arrayElemAt: ['$user', 0]},
                        userId: true,
                        body: true,
                        created: true
                    }
                },
                {
                    $project: {
                        _id: true,
                        channelId: true,
                        user: {_id: true, name: true, created: true, online: true},
                        userId: true,
                        body: true,
                        created: true
                    }
                },
                {
                    $sort: {created:  -1}
                },
                {
                    $limit: limit
                },
                {
                    $skip: offset
                }
            ];
            this.app.db.collection(MESSAGE_COLLECTION).aggregate(query, (err, results) => {
                return err ? reject(err): resolve(_.reverse(results));
            });
        });
    } 
}