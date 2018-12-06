import { OrderedMap } from 'immutable';
import { ObjectID } from 'mongodb';
import _ from 'lodash';

export default class Connection {
    constructor(app) {
        this.app = app;
        
        this.connections = OrderedMap();
        this.modelDidLoad();
    }

    modelDidLoad () {
        this.app.wss.on('connection', (ws) => {
            const socketId = new ObjectID().toString();
            const clientConnection = {
                _id: `${socketId}`,
                ws: ws,
                userId: null,
                isAuthenticated: false
            };

            // save this connection client to cache
            this.connections = this.connections.set(socketId, clientConnection);

            // listen any message from websocket client
            ws.on('message', (msg) => {
                const message = this.decodeMessage(msg);
                this.doTheJob(socketId, message);
            });

            ws.on('close', () => {
                const closeConnection = this.connections.get(socketId);
                const userId = _.toString(_.get(closeConnection, 'userId', null));

                // let remove this socket client from the cahce collection
                this.connections = this.connections.remove(socketId);

                if (userId) {
                    // now find all socekt clients matching wit userId
                    const userConnections = this.connections.filter((con) => _.toString(_.get(con, 'userId')) === userId);
                    if (userConnections.size === 0) {
                        // this mean no more socket clients is online with this userId. now user is offline.
                        this.sendToMembers(userId, {
                            action: 'user_offline',
                            payload: userId
                        });

                        // update user status into database
                        // this.app.models.user.updateUserStatus(userId, false);
                    }
                }
            });
        });
    }

    decodeMessage (message){
        let messageObject = null;

        try {
            messageObject = JSON.parse(message);
        } catch (error) {
            console.log('Something went wrong in decodeMessage: ' + message + ' and error is: ' + error);
        }

        return messageObject;
    }

    doTheJob (socketId, message) {
        const action = _.get(message, 'action');
        const payload = _.get(message, 'payload');
        const userConnection = this.connections.get(socketId);
        switch (action) {
        case 'create_message':
            /*if (userConnection.isAuthenticated) */ {
                let messageObject = payload;

                this.app.models.message.create(messageObject).then(() => {
                    const channelId = _.toString(_.get(messageObject, 'channelId'));
                    this.app.models.channel.load(channelId).then((channel) => {
                        const memberIds = _.get(channel, 'members', []);
                        _.each(memberIds, (memberId) => {
                            memberId = _.toString(memberId);
                            const memberConnections = this.connections.filter((c) => {
                                return c.userId === memberId;
                            });
                            memberConnections.forEach(connection => {
                                const ws = connection.ws;

                                this.send(ws, {
                                    action: 'message_added',
                                    payload: messageObject
                                });
                            });
                        });
                    });
                }).catch((error) => {
                    console.log('create_message error 1: ' + error);
                    const ws = userConnection.ws;
                    this.send(ws, {
                        action: 'create_message_error',
                        payload: payload,
                    });
                });
            }
            break;
        case 'create_channel':
        {
            let channel = payload;
            channel.userId = _.get(userConnection, 'userId');

            this.app.models.channel.create(channel).then((channelObject) => {
                // let send back to all members in this channel with new channel created
                const memberIds = _.get(channelObject, 'members', []);

                const query = {
                    _id: {$in: memberIds}
                };

                const queryOptions = {
                    _id: 1,
                    name: 1,
                    created: 1
                };

                this.app.models.user.find(query, queryOptions).then((users) => {
                    channelObject.users = users;

                    _.each(memberIds, (id) => {
                        const userId = _.toString(id);
                        const memberConnection = this.connections.filter((con) => `${con.userId}` === userId);

                        if (memberConnection.size) {
                            memberConnection.forEach(con => {
                                const ws = con.ws;
                                const obj = {
                                    action: 'channel_added',
                                    payload: channelObject
                                };

                                    // send to socket client matching userId in channel members
                                this.send(ws, obj);
                            });
                        }
                    });
                });
            });

            break;
        }
        case 'auth':
        {
            const userId = payload;
            let connection = this.connections.get(socketId);
            if (connection) {
                // let find user with this token and verify it.
                connection.isAuthenticated = true;
                connection.userId = `${userId}`;
                this.connections = this.connections.set(socketId, connection);
                // now send back to the client you are verified.
                const obj = {
                    action: 'auth_success',
                    payload: 'You are verified',
                };
                this.send(connection.ws, obj);
                //send to all socket clients connection
                // const userIdString = _.toString(userId);
                this.sendToMembers(userId, {
                    action: 'user_online',
                    payload: userId,
                });
                this.app.models.user.updateUserStatus(userId, true);
            }
            break;
        }
        default:
            break;
        }
    }

    sendAll(obj) {
        // send socket messages to all clients.
        this.connections.forEach((con) => {
            const ws = con.ws;
            this.send(ws, obj);
        });
    }

    send(ws, obj) {
        const message = JSON.stringify(obj);
        ws.send(message);
    }

    sendToMembers(userId, obj) {
        const query = [
            {
                $match: {
                    members: {$all: [userId]}
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'members',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            {
                $unwind: {
                    path: '$users'
                }
            },
            {
                $match: {'users.online': {$eq: true}}
            },
            {
                $group: {
                    _id: '$users._id'
                }
            }
        ];
        const users = [];
        this.app.db.collection('channels').aggregate(query, (err, results) => {
            if (err === null && results) {
                _.each(results, (result) => {
                    const uid = _.toString(_.get(result, '_id'));
                    if (uid) {
                        users.push(uid);
                    }
                });
                // this is list of all connections is chatting with current user
                const memberConnections = this.connections.filter((con) => _.includes(users, _.toString(_.get(con, 'userId'))));
                if (memberConnections.size) {
                    memberConnections.forEach((connection) => {
                        const ws = connection.ws;
                        this.send(ws, obj);
                    });
                }
            }
        });
    }
}