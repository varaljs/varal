var url = require('url');
var fs = require('fs');
var hbs = require('handlebars');
var serveStatic = require('serve-static');
var stringify = require('json-stable-stringify');

var Response = {
    createNew: function (app) {
        app.end = false;
        app.end_with = 'null';
        app.path = url.parse(app.request.url).pathname;
        app.handle = function () {
            app.apply_routes();
            app.apply_static();
            app.res_end();
        };
        app.apply_routes = function () {
            var i;
            for (i = 0; i < app.routes_map.length; i += 1) {
                var value = app.routes_map[i];
                if (value.path === app.path) {
                    if (typeof value.callback === 'function')
                        value.callback(app);
                    else if (typeof value.callback === 'string') {
                        var action = value.callback.split('@');
                        var controller = require(process.cwd() + '/' + app.controller_path + '/' + action[0]);
                        controller[action[1]](app);
                    }
                    app.end_with = 'route';
                    app.response.end();
                    app.end = true;
                }
            }
        };
        app.apply_static = function () {
            var i;
            if (app.end === false) {
                app.end = true;
                app.end_with = 'static';
                for (i = 0; i < app.static_paths.length; i += 1) {
                    var static_path = serveStatic(app.static_paths[i]);
                    static_path(app.request, app.response, function () {
                        app.e404(app);
                        app.end = false;
                        app.end_with = 'null';
                    });
                }
            }
        };
        app.res_end = function () {
            if (app.end === false) {
                app.response.end();
            }
        };
        app.e404 = function () {
            app.response.writeHead(404, {'Content-Type': 'text/html'});
            app.response.write('404 Not Found');
        };
        app.text = function (text) {
            app.response.writeHead(200, {'Content-Type': 'text/plain'});
            app.response.write(text);
        };
        app.json = function (data) {
            data = stringify(data);
            app.response.writeHead(200, {'Content-Type': 'application/json'});
            app.response.write(data);
        };
        app.render = function (view, data) {
            var template = fs.readFileSync(process.cwd() + '/' + app.view_path + '/' + view + '.hbs', 'utf-8');
            var render = hbs.compile(template);
            app.response.writeHead(200, {'Content-Type': 'text/html'});
            app.response.write(render(data));
        };
        return app;
    }
};

exports = module.exports = Response;