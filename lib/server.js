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
        app.resIsEnd = false;
        app.resEndWith = 'null';
        app.path = url.parse(app.req.url).pathname;
        app.handle = function () {
            if (app.handled === true)
                return;
            app.applyRoutes();
            app.applyStatic();
            app.resEnd();
            app.handled = true;
        };
        app.applyRoutes = function () {
            if (app.resIsEnd === true)
                return;
            let result = app.router.getCallback(app.req.method, app.path);
            if (result.path_match === true) {
                if (result.method_match === true) {
                    if (typeof result.callback === 'function')
                        result.callback(app);
                    else if (typeof result.callback === 'string') {
                        let action = result.callback.split('@');
                        let controller = require(process.cwd() + '/' + app.controllerPath + '/' + action[0]);
                        controller[action[1]](app);
                    }
                    app.resEndWith = 'route';
                    app.resEnd();
                }
                if (result.method_match === false) {
                    app.e405();
                    app.resEnd();
                }
            }
        };
        app.applyStatic = function () {
            if (app.resIsEnd === true)
                return;
            app.resIsEnd = true;
            app.resEndWith = 'static';
            let static_path = serveStatic(app.staticPath);
            static_path(app.req, app.res, function () {
                app.resIsEnd = false;
                app.resEndWith = 'null';
                app.e404();
                app.resEnd();
            });
        };
        app.resEnd = function () {
            if (app.resIsEnd === false) {
                app.resIsEnd = true;
                app.res.end();
            }
        };
        app.e404 = function () {
            // TODO : 抛出错误而不是阻止操作（下同）
            if (app.resIsEnd === true)
                return;
            app.res.writeHead(404, {'Content-Type': 'text/html'});
            app.res.write('404 Not Found');
        };
        app.e405 = function () {
            if (app.resIsEnd === true)
                return;
            app.res.writeHead(405, {'Content-Type': 'text/html'});
            app.res.write('405 Method Not Allowed');
        };
        app.text = function (text) {
            if (app.resIsEnd === true)
                return;
            app.res.writeHead(200, {'Content-Type': 'text/plain'});
            app.res.write(text);
        };
        app.json = function (data) {
            if (app.resIsEnd === true)
                return;
            data = stringify(data);
            app.res.writeHead(200, {'Content-Type': 'application/json'});
            app.res.write(data);
        };
        app.render = function (view, data) {
            if (app.resIsEnd === true)
                return;
            let template = fs.readFileSync(process.cwd() + '/' + app.viewPath + '/' + view + '.hbs', 'utf-8');
            let render = hbs.compile(template);
            app.res.writeHead(200, {'Content-Type': 'text/html'});
            app.res.write(render(data));
        };

        // Request Part:
        let form = new multiparty.Form();
        app.fields = url.parse(app.req.url, true).query;
        app.contentType = app.req.headers['content-type'] || '';
        if (app.req.method === 'POST') {
            if (app.contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
                app.hasForm = true;
                app.req.setEncoding('utf8');
                app.req.on('data', function (chunk) {
                    chunk = queryString.parse(chunk);
                    Object.assign(app.fields, chunk);
                });
                app.req.on('end', function () {
                    app.handle();
                });
            } else if (app.contentType.indexOf('multipart/form-data') >= 0) {
                app.hasForm = true;
                form.parse(app.req, function (err, fields) {
                    // TODO : Support files upload
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