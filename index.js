'use strict';

let http = require('http');
let Router = require('./lib/router');
let Server = require('./lib/server');

let Varal = {
    createNew: function (options) {
        let varal = {};
        options = options || {};
        varal.name = options.name || 'default';
        varal.port = options.port || 8888;
        varal.viewPath = options.viewPath || 'view';
        varal.controllerPath = options.controllerPath || 'controller';
        varal.staticPath = options.staticPath || 'public';
        varal.router = Router.createNew();
        varal.middlewareMap = [];
        varal.get = function (path, callback) {
            varal.router.defaultGroup.add('GET', path, callback);
        };
        varal.post = function (path, callback) {
            varal.router.defaultGroup.add('POST', path, callback);
        };
        varal.group = function (options, callback) {
            varal.router.defaultGroup.group(options, callback);
        };
        varal.run = function () {
            http.createServer(function (request, response) {
                let app = {
                    req: request,
                    res: response,
                    viewPath: varal.viewPath,
                    controllerPath: varal.controllerPath,
                    staticPath: varal.staticPath,
                    router: varal.router,
                    middlewareMap: varal.middlewareMap
                };
                Server.init(app);
                if (app.hasForm !== true)
                    app.handle();
            }).listen(this.port);
            console.log("Varal Server '" + this.name + "' has started.");
        };

        return varal;
    }
};

exports = module.exports = Varal;