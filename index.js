var http = require('http');
var Router = require('./lib/router');
var Nop = {
    createNew: function (options) {
        var nop = {};
        options = options || {};
        nop.name = options.name || 'default';
        nop.port = options.port || 8888;
        nop.view_path = options.view_path || 'view';
        nop.controller_path = options.controller_path || 'controller';
        nop.run = function () {
            http.createServer(function (request, response) {
                var app = {
                    request: request,
                    response: response,
                    view_path: nop.view_path,
                    controller_path: nop.controller_path
                };
                var router = Router.createNew(app);
                router.handle();
            }).listen(nop.port);
            console.log("Nop Server '" + nop.name + "' has started.");
        };
        nop.get = function (path, callback) {
            for (var key in Router.map) {
                if (Router.map[key].path === path) {
                    Router.map.splice(key, 1);
                }
            }
            Router.map.push({
                path: path,
                callback: callback
            })
        };
        return nop;
    }
};

module.exports = Nop;