var http = require('http');
var Router = require('./lib/router');
var Response = require('./lib/response');
var Varal = {
    createNew: function (options) {
        var varal = {};
        options = options || {};
        varal.routes_map = [];
        varal.route_groups_map = [];
        varal.middleware_map = [];
        varal.name = options.name || 'default';
        varal.port = options.port || 8888;
        varal.view_path = options.view_path || 'view';
        varal.controller_path = options.controller_path || 'controller';
        varal.run = function () {
            http.createServer(function (request, response) {
                var app = {
                    request: request,
                    response: response,
                    routes_map: varal.routes_map,
                    middleware_map: varal.middleware_map,
                    view_path: varal.view_path,
                    controller_path: varal.controller_path
                };
                var res = Response.createNew(app);
                res.handle();
            }).listen(this.port);
            console.log("Varal Server '" + this.name + "' has started.");
        };
        varal.router = Router.createNew(varal);
        return varal;
    }
};

module.exports = Varal;