var url = require('url');
var fs = require('fs');
var hbs = require('handlebars');
var Router = {
    map: [],
    createNew: function (app) {
        app.path = url.parse(app.request.url).pathname;
        app.handle = function () {
            Router.map.forEach(function (value) {
                if (value.path === app.path) {
                    if (typeof value.callback === 'function')
                        value.callback(app);
                    else if(typeof value.callback === 'string') {
                        var action = value.callback.split('@');
                        var controller = require(process.cwd() + '/' + app.controller_path + '/' + action[0]);
                        controller[action[1]](app);
                    }
                } else {
                    app.response.writeHead(404, {"Content-Type": "text/html"});
                    app.response.end();
                }
            });
        };
        app.text = function (text) {
            app.response.writeHead(200, {"Content-Type": "text/plain"});
            app.response.write(text);
            app.response.end();
        };
        app.render = function (view, data) {
            var template = fs.readFileSync(process.cwd() + '/' + app.view_path + '/' + view + '.hbs', 'utf-8');
            var render = hbs.compile(template);
            app.response.writeHead(200, {"Content-Type": "text/html"});
            app.response.write(render(data));
            app.response.end();
        };
        return app;
    }
};

module.exports = Router;