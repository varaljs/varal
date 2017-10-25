'use strict';

let url = require('url');
let fs = require('fs');
let hbs = require('handlebars');
let serveStatic = require('serve-static');
let stringify = require('json-stable-stringify');
let multiparty = require('multiparty');
let queryString = require('querystring');

let Server = {
    init: function (app) {

        // Response Part:
        app.handled = false;
        app.res_is_end = false;
        app.res_end_with = 'null';
        app.path = url.parse(app.req.url).pathname;
        app.handle = function () {
            if (app.handled === true)
                return;
            app.apply_routes();
            app.apply_static();
            app.res_end();
            app.handled = true;
        };
        app.apply_routes = function () {
            if (app.res_is_end === true)
                return;
            let i;
            let method_match;
            for (i = 0; i < app.routes_map.length; i += 1) {
                let value = app.routes_map[i];
                if (value.path === app.path) {
                    if (value.method === app.req.method) {
                        method_match = true;
                        if (typeof value.callback === 'function')
                            value.callback(app);
                        else if (typeof value.callback === 'string') {
                            let action = value.callback.split('@');
                            let controller = require(process.cwd() + '/' + app.controller_path + '/' + action[0]);
                            controller[action[1]](app);
                        }
                        app.res_end_with = 'route';
                        break;
                    } else {
                        method_match = false;
                    }
                }
            }
            if (method_match === true)
                app.res_end();
            if (method_match === false) {
                app.e405();
                app.res_end();
            }
        };
        app.apply_static = function () {
            if (app.res_is_end === true)
                return;
            let i;
            app.res_is_end = true;
            app.res_end_with = 'static';
            for (i = 0; i < app.static_paths.length; i += 1) {
                let static_path = serveStatic(app.static_paths[i]);
                static_path(app.req, app.res, function () {
                    app.e404();
                    app.res_end_with = 'null';
                });
            }
        };
        app.res_end = function () {
            if (app.res_is_end === false) {
                app.res_is_end = true;
                app.res.end();
            }
        };
        app.e404 = function () {
            if (app.res_is_end === true)
                return;
            app.res.writeHead(404, {'Content-Type': 'text/html'});
            app.res.write('404 Not Found');
        };
        app.e405 = function () {
            if (app.res_is_end === true)
                return;
            app.res.writeHead(405, {'Content-Type': 'text/html'});
            app.res.write('405 Method Not Allowed');
        };
        app.text = function (text) {
            app.res.writeHead(200, {'Content-Type': 'text/plain'});
            app.res.write(text);
        };
        app.json = function (data) {
            data = stringify(data);
            app.res.writeHead(200, {'Content-Type': 'application/json'});
            app.res.write(data);
        };
        app.render = function (view, data) {
            let template = fs.readFileSync(process.cwd() + '/' + app.view_path + '/' + view + '.hbs', 'utf-8');
            let render = hbs.compile(template);
            app.res.writeHead(200, {'Content-Type': 'text/html'});
            app.res.write(render(data));
        };

        // Request Part:
        let form = new multiparty.Form();
        app.fields = url.parse(app.req.url, true).query;
        app.contentType = app.req.headers['content-type'];
        if (app.req.method === 'POST') {
            if (app.contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
                app.hasForm = true;
                app.req.setEncoding('utf8');
                app.req.on('data', function (chunk) {
                    chunk = queryString.parse(chunk);
                    Object.assign(app.fields, chunk);
                });
                app.req.on('end', function(){
                    app.handle();
                });
            } else if (app.contentType.indexOf('multipart/form-data') >= 0) {
                app.hasForm = true;
                form.parse(app.req, function(err, fields, files) {
                    for (let value in fields) {
                        if (fields[value].length === 1)
                            fields[value] = fields[value][0];
                    }
                    Object.assign(app.fields, fields);
                    app.handle();
                });
            }
        }
    }
};

exports = module.exports = Server;