'use strict';

let http = require('http');
let Router = require('./lib/router');
let Server = require('./lib/server');
let Middleware = require('./lib/middleware');

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
        varal.get = varal.router.defaultGroup.get;
        varal.post = varal.router.defaultGroup.post;
        varal.group = varal.router.defaultGroup.group;
        varal.middleware = Middleware.createNew();
        varal.add = varal.middleware.add;
        varal.globalMiddleware = [];

        varal.error = function (err, app) {
            let errorMsg = err.stack || err.message || 'Unknown Error';
            console.log(errorMsg);
            if (app.resIsEnd === false)
                app.res.end('Something went wrong!');
        };

        varal.use = function (middleware) {
            varal.globalMiddleware = middleware;
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
                    middleware: varal.middleware,
                    globalMiddleware: varal.globalMiddleware
                };
                try {
                    Server.init(app);
                    if (app.hasForm !== true)
                        app.handle();
                } catch (err) {
                    varal.error(err, app)
                }
            }).listen(this.port);
            console.log("Varal Server '" + this.name + "' has started.");
        };

        return varal;
    }
};

exports = module.exports = Varal;