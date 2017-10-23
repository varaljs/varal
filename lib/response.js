var url = require('url');
var fs = require('fs');
var hbs = require('handlebars');
var Response = {
    createNew: function (app) {
        app.path = url.parse(app.request.url).pathname;
        app.handle = function () {
            for (var i = 0; i < app.routes_map.length; i += 1) {
                var value = app.routes_map[i];
                if (value.path === app.path) {
                    if (typeof value.callback === 'function')
                        value.callback(app);
                    else if (typeof value.callback === 'string') {
                        var action = value.callback.split('@');
                        var controller = require(process.cwd() + '/' + app.controller_path + '/' + action[0]);
                        controller[action[1]](app);
                    }
                } else {
                    app.response.writeHead(404, {"Content-Type": "text/html"});
                    app.response.write('404 Not Found');
                }
            }
            app.response.end();
        };
        app.text = function (text) {
            this.response.writeHead(200, {"Content-Type": "text/plain"});
            this.response.write(text);
        };
        app.render = function (view, data) {
            var template = fs.readFileSync(process.cwd() + '/' + app.view_path + '/' + view + '.hbs', 'utf-8');
            var render = hbs.compile(template);
            this.response.writeHead(200, {"Content-Type": "text/html"});
            this.response.write(render(data));
        };
        return app;
    }
};

module.exports = Response;