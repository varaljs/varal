var http = require('http');
var Router = require('./lib/router');
var Varal = {
    createNew: function (options) {
        var varal = {};
        options = options || {};
        varal.map = [];
        varal.name = options.name || 'default';
        varal.port = options.port || 8888;
        varal.view_path = options.view_path || 'view';
        varal.controller_path = options.controller_path || 'controller';
        varal.run = function () {
            http.createServer(function (request, response) {
                var app = {
                    request: request,
                    response: response,
                    view_path: varal.view_path,
                    controller_path: varal.controller_path
                };
                var router = Router.createNew(app);
                router.handle(varal.map);
            }).listen(varal.port);
            console.log("Varal Server '" + varal.name + "' has started.");
        };
        varal.get = function (path, callback) {
            for (var key in varal.map) {
                if (varal.map[key].path === path) {
                    varal.map.splice(key, 1);
                }
            }
            varal.map.push({
                path: path,
                callback: callback
            })
        };
        return varal;
    }
};

module.exports = Varal;