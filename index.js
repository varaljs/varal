'use strict';

let http = require('http');
let Router = require('./lib/router');
let Server = require('./lib/server');

let Varal = {
    createNew: function (options) {
        let varal = {};
        options = options || {};
        varal.routes_map = [];
        varal.route_groups_map = [];
        varal.middleware_map = [];
        varal.name = options.name || 'default';
        varal.port = options.port || 8888;
        varal.view_path = options.view_path || 'view';
        varal.controller_path = options.controller_path || 'controller';
        varal.static_paths = options.static_paths || ['public'];
        varal.run = function () {
            http.createServer(function (request, response) {
                let app = {
                    req: request,
                    res: response,
                    routes_map: varal.routes_map,
                    middleware_map: varal.middleware_map,
                    view_path: varal.view_path,
                    controller_path: varal.controller_path,
                    static_paths: varal.static_paths
                };
                Server.init(app);
                if (app.hasForm !== true)
                    app.handle();
            }).listen(this.port);
            console.log("Varal Server '" + this.name + "' has started.");
        };
        let router = Router.createNew(varal);
        varal.get = function (path, callback) {
            router.add('GET', path, callback);
        };
        varal.post = function (path, callback) {
            router.add('POST', path, callback);
        };
        return varal;
    }
};

exports = module.exports = Varal;