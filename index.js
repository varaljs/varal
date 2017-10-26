'use strict';

let http = require('http');
let Router = require('./lib/router');
let Server = require('./lib/server');

let Varal = {
    createNew: function (options) {
        let varal = {};
        options = options || {};
        varal.routesMap = [];
        varal.routeGroupsMap = [];
        varal.middlewareMap = [];
        varal.name = options.name || 'default';
        varal.port = options.port || 8888;
        varal.viewPath = options.viewPath || 'view';
        varal.controllerPath = options.controllerPath || 'controller';
        varal.staticPaths = options.staticPaths || ['public'];
        varal.run = function () {
            http.createServer(function (request, response) {
                let app = {
                    req: request,
                    res: response,
                    routesMap: varal.routesMap,
                    middlewareMap: varal.middlewareMap,
                    viewPath: varal.viewPath,
                    controllerPath: varal.controllerPath,
                    staticPaths: varal.staticPaths
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