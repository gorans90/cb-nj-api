import _ from 'lodash';

export const START_TIME = new Date();

export default class AppRouter {
    constructor(app) {
        this.app = app;

        this.setupRouter = this.setupRouter.bind(this);

        this.setupRouter();
    }

    setupRouter () {
        const app = this.app;

        /**
         * @endpoint: /api/users
         * @method: POST
         **/
        app.post('/api/users', (req, res, next) => {
            const body = req.body;
            app.models.user.create(body).then((user) => {
                return res.status(200).json(user);
            }).catch(err => {
                return res.status(503).json({error: err});
            });
        });

        /**
         * @endpoint: /api/channel
         * @method: POST
         */
        app.post('/api/channel', (req, res, next) => {
            const body = req.body;
            app.models.channel.create(body).then((channel) => {
                return res.status(200).json(channel);
            }).catch(err => {
                return res.status(500).json({error: err});
            });
        });

        /**
         * @endpoint: /api/user/:id
         * @method: GET
         */
        app.get('/api/user/:id', (req, res, next) => {
            app.models.user.findById(_.get(req, 'params.id')).then((results) => {
                return res.status(200).json(results);
            }).catch(err => {
                return res.status(500).json({error: err});
            });
        });
        /**
         * @endpoint: /api/channels/:id
         * @method: GET
         */
        app.get('/api/channels/:id', (req, res, next) => {
            const channelId = _.get(req, 'params.id');

            if (!channelId) {
                return res.status(404).json({error: {message: 'Channel not found.'}});
            }

            app.models.channel.load(channelId).then((channel) => {
                // fetch all uses belong to memberId
                const members = _.get(channel, 'members');
                const query = {
                    _id: {$in: members}
                };
                const options = {
                    _id: 1,
                    name: 1,
                    created: 1
                };

                app.models.user.find(query, options).then((users) => {
                    channel.users = users;
                    
                    return res.status(200).json(channel);
                }).catch(error => {
                    console.log(error);
                    return res.status(500).json({error: {message: 'Something went wrong in channel load -> user find'}});
                });
            }).catch(error => {
                console.log(error);
                return res.status(500).json({error: {message: 'Something went wrong in channel load'}});
            });
        });

        /**
         * @endpoint: /api/channels/:id/messages
         * @method: GET
         **/
        app.get('/api/channels/:id/messages', (req, res, next) => {     // TODO osmisliti ovo da ne postoji token model, nego da se token i user id prosledjuju
            let tokenId = req.get('authorization');
            if (!tokenId) {
                // get token from query
                return res.status(401).json({error: {message: 'You must be logged in'}});
            }
            const userId = req.get('userId');

            // make sure user are logged in
            // check if this user is inside of channel members. other retun 401.
            let filter = _.get(req, 'query.filter', null);
            if (filter) {
                filter = JSON.parse(filter);
                // console.log(filter);
            }
            const channelId = _.toString(_.get(req, 'params.id'));
            const limit = _.get(filter, 'limit', 50);
            const offset = _.get(filter, 'offset', 0);

            // load channel
            this.app.models.channel.load(channelId).then((c) => {
                const memberIds = _.get(c, 'members');
                const members = [];

                _.each(memberIds, (id) => {
                    members.push(_.toString(id));
                });

                if (!_.includes(members, _.toString(userId))) {
                    return res.status(401).json({error: {message: 'Access denied'}});
                }

                this.app.models.message.getChannelMessages(channelId, limit, offset).then((messages) => {
                    return res.status(200).json(messages);
                }).catch((err) => {
                    console.log(err);
                    return res.status(404).json({error: {message: 'Not found.'}});
                });
            }).catch((err) => {
                console.log(err);
                return res.status(404).json({error: {message: 'Not found.'}});
            });
        });


        /**
         * @endpoint: /api/me/channels
         * @method: GET
         **/
        app.get('/api/me/channels', (req, res, next) => {
            let tokenId = req.get('Authorization');
            if (!tokenId) {
                return res.status(401).json({error: {message: 'Unauthorized.'}});
            }

            const userId = Number(req.get('userId'));
            const query = [
                {
                    $lookup: {
                        from: 'users',
                        localField: 'members',
                        foreignField: 'id',
                        as: 'users',
                    }
                },
                {
                    $match: {
                        members: {$all: [userId]}
                    }
                },
                {
                    $project: {
                        _id: true,
                        title: true,
                        lastMessage: true,
                        created: true,
                        updated: true,
                        userId: true,
                        users: {
                            id: true,
                            sortName: true,
                            avatar: true,
                            online: true
                        },
                        members: true,
                    }
                },
                {
                    $sort: {updated: -1, created: -1}
                },
                {
                    $limit: 10,
                }
            ];
            // console.log('query: ' + query.toLocaleString());
            app.models.channel.aggregate(query).then((channels) => {
                return res.status(200).json(channels);
            }).catch((err) => {
                console.log(err);
                return res.status(404).json({error: {message: 'Not found.'}});
            });
        });

        /**
         * @endpoint: /api/users/search
         * @method: POST
         **/
        app.post('/api/users/search', (req, res, next) => {
            const keyword = _.get(req, 'body.search', '');
            app.models.user.search(keyword).then((results) => {
                return res.status(200).json(results);
            }).catch(() => {
                return res.status(404).json({
                    error: 'Not found.'
                });
            });
        });

    }

}