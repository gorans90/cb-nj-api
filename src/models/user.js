import _ from 'lodash';
import { OrderedMap } from 'immutable';
// import { NumberInt } from 'mongodb';

export default class User {
    constructor(app) {
        this.app = app;

        this.users = new OrderedMap();
    }

    create(user) {
        const db = this.app.db;

        return new Promise((resolve, reject) => {
            // insert new user object to users collections
            db.collection('users').insertOne(user, (err) => {
                // check if error return error to user
                if (err) {
                    return reject({message: 'An error saving user.'});
                }
                // otherwise return user object to user.
                const userId = _.get(user, '_id').toString(); // this is OBJET ID
                this.users = this.users.set(userId, user);

                return resolve(user);
            });
        });
    }

    find(query = {}, options = {}) {
        return new Promise((resolve, reject) => {
            this.app.db.collection('users').find(query, options).toArray((err, users) => {
                return err ? reject(err) : resolve(users);
            });
        });
    }

    findById(id = {}) {
        return new Promise((resolve, reject) => {
            this.app.db.collection('users').findOne({id: Number(id)}, (error, results) => {
                return error || !results ? reject('Not found') : resolve(results);
            });
        });
    }

    search(text = '') {
        return new Promise((resolve, reject) => {
            const regex = new RegExp(text, 'i');
            const query = {
                $or: [
                    {sortName: {$regex: regex}},
                    {email: {$regex: regex}},
                ],
            };
            this.app.db.collection('users').find(query, {
                _id: true,
                id: true,
                sortName: true,
                avatar: true,
                email: true,
                created: true
            }).toArray((err, results) => {
                if (err || !results || !results.length) {
                    return reject({message: 'User not found.'});
                }
                return resolve(results);
            });
        });
    }

    updateUserStatus(userId, isOnline = false) {
        return new Promise((resolve, reject) => {
            this.users = this.users.update(userId, (user) => {
                if (user) {
                    user.online = isOnline;
                }
                return user;
            });
            const query = {id: userId};
            const updater = {$set: {online: isOnline}};
            this.app.db.collection('users').update(query, updater, (err, info) => {
                return err ? reject(err) : resolve(info);
            });
        });
    }
}